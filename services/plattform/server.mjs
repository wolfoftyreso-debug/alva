// Plattformstjänsten — självhostad backend för Guidad Felsökning.
//
// Ersätter Supabase i klustret: egen inloggning (HS256-JWT, lösenord
// hashade med pgcrypto/bcrypt i Postgres), händelse-API för synken och
// publik delningsendpoint för Live Share. Händelseloggen är append-only
// även i databasen (triggers) — den här tjänsten exponerar medvetet inga
// update/delete-operationer.
//
// Miljövariabler:
//   DATABASE_URL        Postgres-anslutning (krävs)
//   JWT_SECRET          HS256-hemlighet, delas med ai-orkestern (krävs)
//   REGISTRERING_OPPEN  "false" stänger självregistrering (default öppen, beta)
//   PORT                default 8080

import { createServer } from "node:http";
import { createHmac, timingSafeEqual } from "node:crypto";
import pg from "pg";

const PORT = Number(process.env.PORT ?? 8080);
const MAX_KROPP = 4 * 1024 * 1024;
const TOKEN_LIVSTID_S = 12 * 60 * 60;

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

function kravAuth(req, hemlighet) {
  const auth = req.headers.authorization ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  return token ? verifieraJwt(token, hemlighet) : null;
}

// ---- Server -----------------------------------------------------------

export function skapaServer() {
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

      const hemlighet = process.env.JWT_SECRET;
      if (!hemlighet) return svara(res, 503, { error: "Tjänsten är inte konfigurerad." });

      // -- Auth (öppna endpoints) --
      if (req.method === "POST" && vag === "/api/auth/registrera") {
        if (process.env.REGISTRERING_OPPEN === "false") {
          return svara(res, 403, { error: "Registrering är stängd." });
        }
        const { epost, losenord, namn } = await lasKropp(req);
        if (!epost?.includes("@") || !losenord || losenord.length < 8 || !namn?.trim()) {
          return svara(res, 400, { error: "Ogiltig e-post, namn eller för kort lösenord (minst 8 tecken)." });
        }
        const rader = await pool.query(
          `insert into anvandare (epost, losen_hash, namn)
           values (lower($1), crypt($2, gen_salt('bf')), $3)
           on conflict (epost) do nothing
           returning id, namn`,
          [epost.trim(), losenord, namn.trim()],
        );
        if (rader.rowCount === 0) return svara(res, 409, { error: "E-postadressen är redan registrerad." });
        return loggaIn(res, rader.rows[0], hemlighet);
      }

      if (req.method === "POST" && vag === "/api/auth/logga-in") {
        const { epost, losenord } = await lasKropp(req);
        const rader = await pool.query(
          `select id, namn from anvandare
           where epost = lower($1) and losen_hash = crypt($2, losen_hash)`,
          [epost ?? "", losenord ?? ""],
        );
        if (rader.rowCount === 0) return svara(res, 401, { error: "Fel e-post eller lösenord." });
        return loggaIn(res, rader.rows[0], hemlighet);
      }

      // -- Publik delning (Live Share via delningskod) --
      const delad = vag.match(/^\/api\/delad\/([a-z0-9-]+)$/);
      if (req.method === "GET" && delad) {
        const arende = await pool.query(
          `select id, nummer, skapad from felsokning_arenden where delningskod = $1`,
          [delad[1]],
        );
        if (arende.rowCount === 0) return svara(res, 404, { error: "Ärendet är inte tillgängligt." });
        const handelser = await pool.query(
          `select id, tidpunkt, anvandare, handelse from felsokning_handelser
           where arende_id = $1 and handelse->>'typ' not in ('kategori_byte','hypotes','ai_svar')
           order by tidpunkt, id`,
          [arende.rows[0].id],
        );
        return svara(res, 200, { arende: arende.rows[0], handelser: handelser.rows });
      }

      // -- Skyddade endpoints --
      const anspr = kravAuth(req, hemlighet);
      if (!anspr) return svara(res, 401, { error: "Inloggning krävs." });

      if (req.method === "POST" && vag === "/api/arenden") {
        const { id, nummer, skapad, delningskod, metodikId } = await lasKropp(req);
        if (typeof id !== "string" || typeof nummer !== "number" || !skapad) {
          return svara(res, 400, { error: "Ogiltigt ärende." });
        }
        await pool.query(
          `insert into felsokning_arenden (id, nummer, skapad, delningskod, metodik_id, skapad_av)
           values ($1, $2, $3, $4, $5, $6) on conflict (id) do nothing`,
          [id, nummer, skapad, delningskod ?? null, metodikId ?? null, anspr.sub],
        );
        return svara(res, 200, { ok: true });
      }

      const handelserVag = vag.match(/^\/api\/arenden\/([A-Za-z0-9_-]+)\/handelser$/);
      if (handelserVag && req.method === "GET") {
        const rader = await pool.query(
          `select id, tidpunkt, anvandare, handelse from felsokning_handelser
           where arende_id = $1 order by tidpunkt, id`,
          [handelserVag[1]],
        );
        return svara(res, 200, { handelser: rader.rows });
      }
      if (handelserVag && req.method === "POST") {
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

      return svara(res, 404, { error: "Okänd resurs." });
    } catch (fel) {
      console.error("plattform:", fel);
      return svara(res, 500, { error: "Förfrågan misslyckades." });
    }
  });

  function loggaIn(res, anvandare, hemlighet) {
    const nu = Math.floor(Date.now() / 1000);
    const token = skapaJwt(
      { sub: anvandare.id, namn: anvandare.namn, iat: nu, exp: nu + TOKEN_LIVSTID_S },
      hemlighet,
    );
    return svara(res, 200, { token, namn: anvandare.namn });
  }
}

if (process.env.NODE_ENV !== "test") {
  skapaServer().listen(PORT, () => {
    console.log(`plattform lyssnar på :${PORT}`);
  });
}
