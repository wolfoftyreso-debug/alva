// Plattformstjänsten — självhostad backend för Guidad Felsökning.
//
// Multi-tenant: varje organisation är en egen tenant. Registrering skapar
// en organisation med en systemadministratör; admin skapar övriga
// användare (tekniker/arbetsledare) i sin organisation. All ärendedata
// är organisationsknuten — API:t släpper aldrig data över gränsen.
//
// Händelseloggen är append-only även i databasen (triggers) — den här
// tjänsten exponerar medvetet inga update/delete-operationer.
//
// Miljövariabler:
//   DATABASE_URL        Postgres-anslutning (krävs)
//   JWT_SECRET          HS256-hemlighet, delas med ai-orkestern (krävs)
//   REGISTRERING_OPPEN  "false" stänger nya organisationer (default öppen, beta)
//   PORT                default 8080

import { createServer } from "node:http";
import crypto, { createHmac, timingSafeEqual } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import pg from "pg";

// API-first: OpenAPI-specen är en versionerad artefakt och serveras live.
const OPENAPI = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "openapi.yaml"), "utf8");

// ECM Knowledge Library: regelpaketet är serverägd konfiguration — inte
// appkod. Uppdateras genom att byta filen (ECM_REGLER_FIL kan peka på en
// ConfigMap-mount i klustret) och starta om tjänsten; klienterna hämtar
// det nya paketet vid nästa inloggning/sidladdning.
const ECM_REGLER = readFileSync(
  process.env.ECM_REGLER_FIL ?? join(dirname(fileURLToPath(import.meta.url)), "ecm-regler.json"),
  "utf8",
);

const PORT = Number(process.env.PORT ?? 8080);
const MAX_KROPP = 4 * 1024 * 1024;
const TOKEN_LIVSTID_S = 12 * 60 * 60;
const ROLLER = ["tekniker", "arbetsledare", "admin"];

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 10 });

// ---- JWT (HS256, utan beroenden) --------------------------------------

const b64url = (data) => Buffer.from(data).toString("base64url");

export function skapaJwt(anspr, hemlighet) {
  const huvud = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const kropp = b64url(JSON.stringify(anspr));
  const signatur = createHmac("sha256", hemlighet).update(`${huvud}.${kropp}`).digest("base64url");
  return `${huvud}.${kropp}.${signatur}`;
}

export function verifieraJwt(token, hemlighet) {
  const delar = token.split(".");
  if (delar.length !== 3) return null;
  const forvantad = createHmac("sha256", hemlighet).update(`${delar[0]}.${delar[1]}`).digest("base64url");
  const a = Buffer.from(delar[2]);
  const b = Buffer.from(forvantad);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const anspr = JSON.parse(Buffer.from(delar[1], "base64url").toString("utf8"));
    if (typeof anspr.exp === "number" && anspr.exp * 1000 < Date.now()) return null;
    return anspr;
  } catch {
    return null;
  }
}

// ---- Hjälpare ---------------------------------------------------------

function svara(res, status, kropp) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, content-type",
  });
  res.end(JSON.stringify(kropp));
}

async function lasKropp(req) {
  const bitar = [];
  let storlek = 0;
  for await (const bit of req) {
    storlek += bit.length;
    if (storlek > MAX_KROPP) throw new Error("för stor kropp");
    bitar.push(bit);
  }
  return JSON.parse(Buffer.concat(bitar).toString("utf8"));
}

function nyKod() {
  const tecken = "abcdefghijklmnopqrstuvwxyz0123456789";
  const { randomBytes } = crypto;
  return Array.from(randomBytes(16), (b) => tecken[b % 36]).join("");
}

function kravAuth(req, hemlighet) {
  const auth = req.headers.authorization ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  return token ? verifieraJwt(token, hemlighet) : null;
}

// Verifierar att ärendet tillhör användarens organisation.
async function arendeIOrg(arendeId, organisationId) {
  const rader = await pool.query(
    `select 1 from felsokning_arenden where id = $1 and organisation_id = $2`,
    [arendeId, organisationId],
  );
  return rader.rowCount > 0;
}

// ---- Server -----------------------------------------------------------

export function skapaServer() {
  function loggaIn(res, rad, hemlighet) {
    const nu = Math.floor(Date.now() / 1000);
    const token = skapaJwt(
      { sub: rad.id, namn: rad.namn, org: rad.organisation_id, roll: rad.roll, iat: nu, exp: nu + TOKEN_LIVSTID_S },
      hemlighet,
    );
    return svara(res, 200, { token, namn: rad.namn, roll: rad.roll, organisation: rad.org_namn });
  }

  return createServer(async (req, res) => {
    if (req.method === "OPTIONS") {
      res.writeHead(204, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, content-type",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      });
      return res.end();
    }
    const url = new URL(req.url ?? "/", "http://intern");
    const vag = url.pathname;

    try {
      if (req.method === "GET" && vag === "/halsa") {
        return svara(res, 200, { status: "ok" });
      }
      if (req.method === "GET" && vag === "/api/openapi.yaml") {
        res.writeHead(200, {
          "Content-Type": "application/yaml; charset=utf-8",
          "Access-Control-Allow-Origin": "*",
        });
        return res.end(OPENAPI);
      }

      const hemlighet = process.env.JWT_SECRET;
      if (!hemlighet) return svara(res, 503, { error: "Tjänsten är inte konfigurerad." });

      // -- Registrering: skapar organisation + systemadministratör --
      if (req.method === "POST" && vag === "/api/auth/registrera") {
        if (process.env.REGISTRERING_OPPEN === "false") {
          return svara(res, 403, { error: "Registrering är stängd — kontakta er administratör." });
        }
        const { epost, losenord, namn, organisation } = await lasKropp(req);
        if (!epost?.includes("@") || !losenord || losenord.length < 8 || !namn?.trim() || !organisation?.trim()) {
          return svara(res, 400, {
            error: "Ange organisation, namn, e-post och lösenord (minst 8 tecken).",
          });
        }
        const klientDb = await pool.connect();
        try {
          await klientDb.query("begin");
          const org = await klientDb.query(
            `insert into organisationer (namn) values ($1) returning id, namn`,
            [organisation.trim()],
          );
          const rad = await klientDb.query(
            `insert into anvandare (organisation_id, epost, losen_hash, namn, roll)
             values ($1, lower($2), crypt($3, gen_salt('bf')), $4, 'admin')
             on conflict (epost) do nothing
             returning id, namn, organisation_id, roll`,
            [org.rows[0].id, epost.trim(), losenord, namn.trim()],
          );
          if (rad.rowCount === 0) {
            await klientDb.query("rollback");
            return svara(res, 409, { error: "E-postadressen är redan registrerad." });
          }
          await klientDb.query("commit");
          return loggaIn(res, { ...rad.rows[0], org_namn: org.rows[0].namn }, hemlighet);
        } catch (fel) {
          await klientDb.query("rollback");
          throw fel;
        } finally {
          klientDb.release();
        }
      }

      if (req.method === "POST" && vag === "/api/auth/logga-in") {
        const { epost, losenord } = await lasKropp(req);
        const rader = await pool.query(
          `select a.id, a.namn, a.organisation_id, a.roll, o.namn as org_namn
           from anvandare a join organisationer o on o.id = a.organisation_id
           where a.epost = lower($1) and a.losen_hash = crypt($2, a.losen_hash)`,
          [epost ?? "", losenord ?? ""],
        );
        if (rader.rowCount === 0) return svara(res, 401, { error: "Fel e-post eller lösenord." });
        return loggaIn(res, rader.rows[0], hemlighet);
      }

      // -- Publik delning (Live Share via delningskod) --
      // Behörighetsnivån styr filtreringen på serversidan:
      //   kund    – det kunddelbara (inga kategoribyten, hypoteser, AI-dialog)
      //   partner – försäkringsbolag/tillverkare: även hypoteser (tydligt märkta)
      //   intern  – full insyn
      const delad = vag.match(/^\/api\/delad\/([A-Za-z0-9_-]+)$/);
      if (req.method === "GET" && delad) {
        let arendeId = null;
        let niva = "kund";
        const delning = await pool.query(
          `select arende_id, niva from delningar where kod = $1 and aterkallad is null`,
          [delad[1]],
        );
        if (delning.rowCount > 0) {
          arendeId = delning.rows[0].arende_id;
          niva = delning.rows[0].niva;
        } else {
          // Bakåtkompatibelt: ärendets ursprungliga delningskod = kundnivå.
          const viaArende = await pool.query(
            `select id from felsokning_arenden where delningskod = $1`,
            [delad[1]],
          );
          if (viaArende.rowCount > 0) arendeId = viaArende.rows[0].id;
        }
        if (!arendeId) return svara(res, 404, { error: "Ärendet är inte tillgängligt." });

        const arende = await pool.query(
          `select id, nummer, skapad from felsokning_arenden where id = $1`,
          [arendeId],
        );
        const bortfiltrerat =
          niva === "intern" ? [] : niva === "partner" ? ["kategori_byte", "ai_svar", "ansvarig_satt", "arbetsorder_skannad"] : ["kategori_byte", "hypotes", "ai_svar", "ansvarig_satt", "arbetsorder_skannad"];
        const handelser = await pool.query(
          `select id, tidpunkt, anvandare, handelse from felsokning_handelser
           where arende_id = $1 and not (handelse->>'typ' = any($2))
           order by tidpunkt, id`,
          [arendeId, bortfiltrerat],
        );
        return svara(res, 200, { arende: arende.rows[0], handelser: handelser.rows, niva });
      }

      // -- Skyddade endpoints (organisationsknutna) --
      const anspr = kravAuth(req, hemlighet);
      if (!anspr?.org) return svara(res, 401, { error: "Inloggning krävs." });

      // Användarhantering: endast systemadministratör, endast egen org.
      if (vag === "/api/anvandare") {
        // Läsning: admin + arbetsledare (behövs för omfördelning).
        // Skapande: endast admin.
        if (anspr.roll === "tekniker") return svara(res, 403, { error: "Kräver arbetsledar- eller administratörsbehörighet." });
        if (req.method === "GET") {
          const rader = await pool.query(
            `select id, epost, namn, roll from anvandare where organisation_id = $1 order by namn`,
            [anspr.org],
          );
          return svara(res, 200, { anvandare: rader.rows });
        }
        if (req.method === "POST") {
          if (anspr.roll !== "admin") return svara(res, 403, { error: "Kräver administratörsbehörighet." });
          const { epost, losenord, namn, roll } = await lasKropp(req);
          if (!epost?.includes("@") || !losenord || losenord.length < 8 || !namn?.trim() || !ROLLER.includes(roll)) {
            return svara(res, 400, { error: "Ange namn, e-post, roll och lösenord (minst 8 tecken)." });
          }
          const rad = await pool.query(
            `insert into anvandare (organisation_id, epost, losen_hash, namn, roll)
             values ($1, lower($2), crypt($3, gen_salt('bf')), $4, $5)
             on conflict (epost) do nothing
             returning id, epost, namn, roll`,
            [anspr.org, epost.trim(), losenord, namn.trim(), roll],
          );
          if (rad.rowCount === 0) return svara(res, 409, { error: "E-postadressen är redan registrerad." });
          return svara(res, 200, rad.rows[0]);
        }
      }

      // ECM Knowledge Library: aktuellt regelpaket för inloggade klienter.
      if (req.method === "GET" && vag === "/api/ecm/regler") {
        res.writeHead(200, {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        });
        return res.end(ECM_REGLER);
      }

      // Organisationens inställningar: vad som visas när ett ärende
      // startas (objekttyper, identifieringsmetoder). Alla inloggade
      // läser; endast systemadministratören ändrar.
      if (req.method === "GET" && vag === "/api/organisation") {
        const rader = await pool.query(
          `select namn, installningar from organisationer where id = $1`,
          [anspr.org],
        );
        if (rader.rowCount === 0) return svara(res, 404, { error: "Organisationen finns inte." });
        return svara(res, 200, rader.rows[0]);
      }

      if (req.method === "POST" && vag === "/api/organisation/installningar") {
        if (anspr.roll !== "admin") return svara(res, 403, { error: "Kräver administratörsbehörighet." });
        const { objekttyper, identifieringsmetoder } = await lasKropp(req);
        const giltigLista = (lista) =>
          Array.isArray(lista) && lista.length > 0 && lista.length <= 50 &&
          lista.every((v) => typeof v === "string" && v.length <= 100);
        if (!giltigLista(objekttyper) || !giltigLista(identifieringsmetoder)) {
          return svara(res, 400, { error: "Ange minst en objekttyp och en identifieringsmetod." });
        }
        await pool.query(
          `update organisationer set installningar = $2 where id = $1`,
          [anspr.org, JSON.stringify({ objekttyper, identifieringsmetoder })],
        );
        return svara(res, 200, { ok: true });
      }

      // Fordonshistorik: organisationens tidigare ärenden på samma objekt
      // (regnr/VIN), med dokumenterade felorsaker — pre-diagnostikens
      // historiksteg och orsakskedjan. Organisationsgränsen gäller alltid.
      const fordonVag = vag.match(/^\/api\/fordon\/([^/]+)\/historik$/);
      if (req.method === "GET" && fordonVag) {
        const ident = decodeURIComponent(fordonVag[1]).trim().toUpperCase();
        if (!ident) return svara(res, 400, { error: "Identifierare saknas." });
        const rader = await pool.query(
          `select a.id, a.nummer, a.skapad,
                  coalesce(bool_or(h.handelse->>'typ' = 'arende_avslutat'), false) as avslutat,
                  (array_agg(h.handelse->>'text')
                     filter (where h.handelse->>'typ' = 'felbeskrivning'))[1] as felbeskrivning,
                  coalesce(json_agg(json_build_object(
                      'avvikelse', h.handelse->>'avvikelse',
                      'orsaker', h.handelse->'orsaker',
                      'atgard', h.handelse->>'atgard'))
                     filter (where h.handelse->>'typ' = 'felorsak'), '[]') as felorsaker
           from felsokning_arenden a
           join felsokning_handelser h on h.arende_id = a.id
           where a.organisation_id = $1
             and a.id in (
               select arende_id from felsokning_handelser
               where handelse->>'typ' = 'objekt_identifierat'
                 and upper(handelse->'objekt'->>'identifierare') = $2
             )
           group by a.id
           order by a.skapad desc
           limit 20`,
          [anspr.org, ident],
        );
        return svara(res, 200, { arenden: rader.rows });
      }

      // Flottdata: felorsaksstatistik per orsakskategori över hela
      // organisationen (arbetsledare/admin) — återkommande fel blir
      // synliga när orsakerna är strukturerad data.
      if (req.method === "GET" && vag === "/api/statistik/felorsaker") {
        if (anspr.roll !== "arbetsledare" && anspr.roll !== "admin") {
          return svara(res, 403, { error: "Kräver arbetsledar- eller administratörsbehörighet." });
        }
        const rader = await pool.query(
          `select orsak, count(*)::int as antal
           from felsokning_arenden a
           join felsokning_handelser h on h.arende_id = a.id,
                jsonb_array_elements_text(h.handelse->'orsaker') as orsak
           where a.organisation_id = $1 and h.handelse->>'typ' = 'felorsak'
           group by orsak
           order by antal desc`,
          [anspr.org],
        );
        return svara(res, 200, { orsaker: rader.rows });
      }

      // Organisationsöversikt för arbetsledare/admin: alla ärenden med
      // status, deltagande tekniker och sammanfattning — härlett ur
      // händelseloggen, aldrig lagrat separat.
      if (req.method === "GET" && vag === "/api/oversikt") {
        if (anspr.roll !== "arbetsledare" && anspr.roll !== "admin") {
          return svara(res, 403, { error: "Kräver arbetsledar- eller administratörsbehörighet." });
        }
        const rader = await pool.query(
          `select a.id, a.nummer, a.skapad, a.delningskod, a.metodik_id,
                  count(h.id)::int as antal_handelser,
                  min(h.tidpunkt) as forsta,
                  max(h.tidpunkt) as senaste,
                  coalesce(bool_or(h.handelse->>'typ' = 'arende_avslutat'), false) as avslutat,
                  (array_agg(h.handelse->'objekt'->>'beskrivning')
                     filter (where h.handelse->>'typ' = 'objekt_identifierat'))[1] as objekt,
                  (array_agg(h.handelse->>'text')
                     filter (where h.handelse->>'typ' = 'felbeskrivning'))[1] as felbeskrivning,
                  (array_agg(coalesce(h.handelse->>'ansvarig', h.handelse->>'till') order by h.tidpunkt desc)
                     filter (where h.handelse->>'typ' in ('ansvarig_satt', 'overlamning')
                             and coalesce(h.handelse->>'ansvarig', h.handelse->>'till') is not null))[1] as ansvarig,
                  (array_agg(h.anvandare order by h.tidpunkt asc))[1] as skapare,
                  array_agg(distinct h.anvandare) filter (where h.anvandare is not null) as tekniker
           from felsokning_arenden a
           left join felsokning_handelser h on h.arende_id = a.id
           where a.organisation_id = $1
           group by a.id
           order by max(h.tidpunkt) desc nulls last
           limit 200`,
          [anspr.org],
        );
        return svara(res, 200, { arenden: rader.rows });
      }

      if (req.method === "GET" && vag === "/api/arenden") {
        const rader = await pool.query(
          `select id, nummer, skapad, delningskod, metodik_id from felsokning_arenden
           where organisation_id = $1 order by skapad desc limit 200`,
          [anspr.org],
        );
        return svara(res, 200, { arenden: rader.rows });
      }

      if (req.method === "POST" && vag === "/api/arenden") {
        const { id, nummer, skapad, delningskod, metodikId } = await lasKropp(req);
        if (typeof id !== "string" || typeof nummer !== "number" || !skapad) {
          return svara(res, 400, { error: "Ogiltigt ärende." });
        }
        await pool.query(
          `insert into felsokning_arenden (id, organisation_id, nummer, skapad, delningskod, metodik_id, skapad_av)
           values ($1, $2, $3, $4, $5, $6, $7) on conflict (id) do nothing`,
          [id, anspr.org, nummer, skapad, delningskod ?? null, metodikId ?? null, anspr.sub],
        );
        return svara(res, 200, { ok: true });
      }

      // Delningslänkar: skapa/lista per ärende, återkalla per kod.
      // Verkstaden kontrollerar alltid delningen (organisationskravet).
      const delningarVag = vag.match(/^\/api\/arenden\/([A-Za-z0-9_-]+)\/delningar$/);
      if (delningarVag) {
        if (!(await arendeIOrg(delningarVag[1], anspr.org))) {
          return svara(res, 404, { error: "Ärendet är inte tillgängligt." });
        }
        if (req.method === "GET") {
          const rader = await pool.query(
            `select kod, niva, skapad, aterkallad from delningar where arende_id = $1 order by skapad desc`,
            [delningarVag[1]],
          );
          return svara(res, 200, { delningar: rader.rows });
        }
        if (req.method === "POST") {
          const { niva } = await lasKropp(req);
          if (!["kund", "partner", "intern"].includes(niva)) {
            return svara(res, 400, { error: "Ogiltig nivå." });
          }
          const kod = nyKod();
          await pool.query(
            `insert into delningar (kod, arende_id, niva, skapad_av) values ($1, $2, $3, $4)`,
            [kod, delningarVag[1], niva, anspr.sub],
          );
          return svara(res, 200, { kod, niva });
        }
      }

      const aterkalla = vag.match(/^\/api\/delningar\/([A-Za-z0-9_-]+)\/aterkalla$/);
      if (req.method === "POST" && aterkalla) {
        const rad = await pool.query(
          `update delningar d set aterkallad = now()
           from felsokning_arenden a
           where d.kod = $1 and d.arende_id = a.id and a.organisation_id = $2 and d.aterkallad is null
           returning d.kod`,
          [aterkalla[1], anspr.org],
        );
        if (rad.rowCount === 0) return svara(res, 404, { error: "Delningen är inte tillgänglig." });
        return svara(res, 200, { ok: true });
      }

      const handelserVag = vag.match(/^\/api\/arenden\/([A-Za-z0-9_-]+)\/handelser$/);
      if (handelserVag) {
        // Organisationsgränsen: ärendet måste tillhöra användarens org.
        if (!(await arendeIOrg(handelserVag[1], anspr.org))) {
          return svara(res, 404, { error: "Ärendet är inte tillgängligt." });
        }
        if (req.method === "GET") {
          const rader = await pool.query(
            `select id, tidpunkt, anvandare, handelse from felsokning_handelser
             where arende_id = $1 order by tidpunkt, id`,
            [handelserVag[1]],
          );
          return svara(res, 200, { handelser: rader.rows });
        }
        if (req.method === "POST") {
          const { handelser } = await lasKropp(req);
          if (!Array.isArray(handelser) || handelser.length > 500) {
            return svara(res, 400, { error: "Ogiltig händelselista." });
          }
          for (const post of handelser) {
            if (typeof post?.id !== "string" || !post.tidpunkt || typeof post.anvandare !== "string" || !post.handelse) {
              return svara(res, 400, { error: "Ogiltig händelse." });
            }
            // Append-only: on conflict do nothing — en befintlig händelse
            // skrivs aldrig över, och databastriggern stoppar allt annat.
            await pool.query(
              `insert into felsokning_handelser (id, arende_id, tidpunkt, anvandare, handelse)
               values ($1, $2, $3, $4, $5) on conflict (id) do nothing`,
              [post.id, handelserVag[1], post.tidpunkt, post.anvandare, post.handelse],
            );
          }
          return svara(res, 200, { ok: true });
        }
      }

      return svara(res, 404, { error: "Okänd resurs." });
    } catch (fel) {
      console.error("plattform:", fel);
      return svara(res, 500, { error: "Förfrågan misslyckades." });
    }
  });
}

if (process.env.NODE_ENV !== "test") {
  skapaServer().listen(PORT, () => {
    console.log(`plattform lyssnar på :${PORT}`);
  });
}
