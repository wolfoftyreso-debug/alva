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
//   INTEGRATION_NYCKEL  32 byte (hex/base64) — krypterar kundernas leverantörsuppgifter
//   TILLATNA_URSPRUNG   kommaseparerade ursprung för CORS (utelämnad = "*")
//   TILLAT_INTERNA_UPPSLAG  "true" tillåter leverantörsuppslag mot privata nät
//   ECM_REGLER_FIL / INTEGRATIONER_FIL  sökvägar till utbytbar konfiguration
//   PORT                default 8080

import { createServer } from "node:http";
import crypto, { createCipheriv, createDecipheriv, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { readFileSync } from "node:fs";
import { lookup } from "node:dns/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import pg from "pg";
import { innehallsHash, mediatypGiltig, valjLager } from "./bilagor.mjs";
import { avsluta, logga, mätvärde, spårFrån, starta, traceparent } from "./observation.mjs";
import { tillPost } from "./handelser.mjs";
import { grinda, grindaArendetyp } from "./grind.mjs";
import { ALLA_METODIKER } from "./metodiker.mjs";
import { oversikt as statistikOversikt } from "./statistik.mjs";
import { KATEGORIER, UTGAENDE, protokollTillHandelser, signeraLeverans } from "./integration.mjs";
import { enrading, sammanfatta } from "./sammanfattning.mjs";
import {
  MASKERAT,
  gallringsdatum,
  skyddaHändelse,
  öppnaHändelse,
} from "./personuppgifter.mjs";

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

// Regelpaketet avgör vad systemet accepterar som ett compliant ärende.
// Den som kan skriva till namnrymden kunde tidigare ändra vad "compliant"
// betyder, utan signatur och utan godkännandespår (QUALITET M-6).
//
// Paketet verifieras nu mot en HMAC med ECM_REGLER_NYCKEL. Saknas nyckeln
// körs paketet i granskningsläge: det används, men varje spårbarhetspaket
// märks som osignerat, och driften larmar. Att vägra starta hade varit
// renare men gjort en säkerhetsförbättring till ett driftavbrott för alla
// befintliga installationer — det är så säkerhetsfunktioner blir
// avstängda.
const ECM_REGLER_NYCKEL = process.env.ECM_REGLER_NYCKEL ?? "";
const ECM_REGLER_SIGNATUR = process.env.ECM_REGLER_SIGNATUR ?? "";

function regelpaketetsStatus() {
  if (!ECM_REGLER_NYCKEL || !ECM_REGLER_SIGNATUR) return "osignerat";
  const väntad = createHmac("sha256", ECM_REGLER_NYCKEL).update(ECM_REGLER).digest("hex");
  const a = Buffer.from(ECM_REGLER_SIGNATUR);
  const b = Buffer.from(väntad);
  return a.length === b.length && timingSafeEqual(a, b) ? "signerat" : "ogiltig signatur";
}

const REGELPAKET_STATUS = regelpaketetsStatus();
if (REGELPAKET_STATUS !== "signerat") {
  logga("varning", "regelpaketets signatur", {
    status: REGELPAKET_STATUS,
    // Ett ogiltigt paket är värre än inget: det betyder att någon bytt
    // filen utan att kunna signera den.
    konsekvens:
      REGELPAKET_STATUS === "ogiltig signatur"
        ? "Paketet används INTE — inbyggt standardpaket gäller."
        : "Paketet används men märks som osignerat i spårbarheten.",
  });
}

// Register över märkesspecifika kopplingar — data, inte kod. Nya
// leverantörer läggs till i filen (eller via ConfigMap-mount) utan att
// applikationen byggs om.
const INTEGRATIONER = JSON.parse(
  readFileSync(
    process.env.INTEGRATIONER_FIL ?? join(dirname(fileURLToPath(import.meta.url)), "integrationer.json"),
    "utf8",
  ),
);

const PORT = Number(process.env.PORT ?? 8080);
const MAX_KROPP = 4 * 1024 * 1024;
// Bilagor får vara större än en händelse — ett videoklipp med ljud är
// evidens som inte går att skala ned hur långt som helst.
const MAX_BILAGA = 32 * 1024 * 1024;
const TOKEN_LIVSTID_S = 12 * 60 * 60;
const ROLLER = ["tekniker", "arbetsledare", "admin"];

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 10 });

// Poolens uttömning är den vanligaste orsaken till att allt blir
// långsamt samtidigt utan att någon enskild fråga är långsam.
setInterval(() => {
  mätvärde("Databaskopplingar", pool.totalCount, "Count", { Tjänst: "plattform" }, {
    lediga: pool.idleCount,
    väntande: pool.waitingCount,
  });
}, 60_000).unref();

// Var bilagornas innehåll hamnar. Felkonfigurerat s3-läge failar här,
// vid start, i stället för vid första uppladdningen.
const BILAGELAGER = valjLager(process.env, pool);

// Vilka ursprung som får anropa API:t från en webbläsare. I klusterdriften
// serveras klienten från samma domän som API:t, så listan kan hållas kort.
// TILLATNA_URSPRUNG="https://app.exempel.se,https://demo.exempel.se" —
// utelämnad betyder "*" (öppet), vilket bara hör hemma i utveckling.
const TILLATNA_URSPRUNG = (process.env.TILLATNA_URSPRUNG ?? "")
  .split(",")
  .map((u) => u.trim())
  .filter(Boolean);

function ursprungFor(req) {
  const ursprung = req.headers.origin;
  if (TILLATNA_URSPRUNG.length === 0) return "*";
  return ursprung && TILLATNA_URSPRUNG.includes(ursprung) ? ursprung : TILLATNA_URSPRUNG[0];
}

// Enkel takt-begränsning för den publika beslutsendpointen (per
// delningskod, i minnet). Räcker för en enda pod; bakom flera repliker
// kompletteras den av databasspärren "ett beslut per förslag".
const BESLUT_TAK = 5;
const BESLUT_FONSTER_MS = 60_000;
const beslutsForsok = new Map();

function forTataForsok(kod) {
  const nu = Date.now();
  const forsok = (beslutsForsok.get(kod) ?? []).filter((t) => nu - t < BESLUT_FONSTER_MS);
  forsok.push(nu);
  beslutsForsok.set(kod, forsok);
  // Enkel städning så kartan inte växer obegränsat.
  if (beslutsForsok.size > 5000) beslutsForsok.clear();
  return forsok.length > BESLUT_TAK;
}

// ---- Takt-begränsning på inloggning -----------------------------------
//
// Den i minnet (beslutsvägen ovan) räcker för en pod. Inloggningen skalar
// till flera repliker och behöver därför en gemensam räknare — den ligger
// i databasen. Två spärrar: per konto (skyddar en enskild användare) och
// per källa (stoppar den som betar av många konton från samma håll).

const INLOGG_FONSTER = "15 minutes";
const INLOGG_TAK_KONTO = 10;
const INLOGG_TAK_KALLA = 30;

function kallaFor(req) {
  // Bakom ingressen står klientens adress först i X-Forwarded-For.
  const vidarebefordrad = req.headers["x-forwarded-for"];
  const forsta = typeof vidarebefordrad === "string" ? vidarebefordrad.split(",")[0].trim() : "";
  return (forsta || req.socket?.remoteAddress || "").slice(0, 64);
}

async function inloggningSparrad(epost, kalla) {
  const rad = await pool.query(
    `select
       count(*) filter (where epost = $1) as konto,
       count(*) filter (where kalla = $2 and $2 <> '') as kalla
     from inloggningsforsok
     where lyckades = false and tidpunkt > now() - interval '${INLOGG_FONSTER}'`,
    [epost, kalla],
  );
  const { konto, kalla: franKalla } = rad.rows[0];
  return Number(konto) >= INLOGG_TAK_KONTO || Number(franKalla) >= INLOGG_TAK_KALLA;
}

async function loggaForsok(epost, kalla, lyckades) {
  await pool.query(
    `insert into inloggningsforsok (epost, kalla, lyckades) values ($1, $2, $3)`,
    [epost, kalla, lyckades],
  );
  // Städa bort det som inte längre kan påverka någon spärr. Billigt nog
  // att göra i skrivvägen och slipper ett schemalagt jobb.
  if (Math.random() < 0.02) {
    await pool.query(`delete from inloggningsforsok where tidpunkt < now() - interval '1 day'`);
  }
}

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

// ---- Integrationsuppgifter: kryptering i vila ------------------------
//
// Kundens egna leverantörsnycklar lagras krypterade med AES-256-GCM.
// Nyckeln kommer ur INTEGRATION_NYCKEL (32 byte, hex eller base64) och
// finns bara i driftens hemlighetshantering. Saknas nyckeln kan
// integrationer varken sparas eller användas — fail closed.

function integrationsNyckel() {
  const ra = process.env.INTEGRATION_NYCKEL;
  if (!ra) return null;
  const buf = /^[0-9a-fA-F]{64}$/.test(ra) ? Buffer.from(ra, "hex") : Buffer.from(ra, "base64");
  return buf.length === 32 ? buf : null;
}

export function kryptera(klartext, nyckel) {
  const iv = randomBytes(12);
  const chiffer = createCipheriv("aes-256-gcm", nyckel, iv);
  const data = Buffer.concat([chiffer.update(klartext, "utf8"), chiffer.final()]);
  return `${iv.toString("base64")}.${chiffer.getAuthTag().toString("base64")}.${data.toString("base64")}`;
}

export function dekryptera(paket, nyckel) {
  const [iv, tagg, data] = paket.split(".");
  const dechiffer = createDecipheriv("aes-256-gcm", nyckel, Buffer.from(iv, "base64"));
  dechiffer.setAuthTag(Buffer.from(tagg, "base64"));
  return Buffer.concat([dechiffer.update(Buffer.from(data, "base64")), dechiffer.final()]).toString("utf8");
}

// Hemliga fält lämnar aldrig servern i klartext — klienten ser bara att
// ett värde finns och dess sista tecken.
export function maskera(varde) {
  if (typeof varde !== "string" || varde.length === 0) return "";
  if (varde.length <= 4) return "••••";
  return `••••${varde.slice(-4)}`;
}

function leverantorsDef(id) {
  return INTEGRATIONER.leverantorer.find((l) => l.id === id);
}

// ---- Delningsfilter: tillåtelselista, inte nekalista ------------------
//
// Vilka händelsetyper som får lämna verkstaden är en integritetsgräns.
// Med en nekalista blir varje NY händelsetyp automatiskt synlig för
// kunden tills någon kommer ihåg att neka den — fel håll att fela åt.
// Här listas i stället uttryckligen vad som får delas; allt annat är
// internt tills det aktivt släpps fram. Testet i delning.test.ts kräver
// att varje händelsetyp i domänmodellen är klassificerad.
export const DELBART_KUND = [
  "objekt_identifierat",
  "arendetyp_satt",
  "felbeskrivning",
  "fraga_besvarad",
  "kontroll_utford",
  "observation",
  "matvarde",
  "foto",
  "video",
  "kommentar",
  "inaktivitet_forklarad",
  "overlamning",
  "historik_kontrollerad",
  "matarstallning",
  "reproducering",
  "felorsak",
  "atgardsforslag",
  "kundbeslut",
  "atgard_utford",
  "kvalitetskontroll",
  "export_skapad",
  // ALVA-RULE-200 · Teknikerns varför delas med kunden.
  //
  // Det är den enda raden som besvarar "varför kostade det här vad det
  // kostade", och den enda en försäkringsbedömare faktiskt behöver.
  // Att hålla den intern vore att bygga funktionen och sedan gömma den.
  //
  // Fältet "uteslutet" nämner hypoteser som förkastats. Det är inte
  // samma sak som att dela en öppen hypotes: en utesluten misstanke,
  // redovisad som utesluten, är stärkande — "vi kontrollerade hjullagret
  // och det var helt" är precis vad kunden betalade för att få veta.
  "slutsats",
  "arende_avslutat",
];

// Extern partner (försäkringsbolag, tillverkare) ser dessutom hypoteser
// — alltid märkta som ej verifierade.
export const DELBART_PARTNER = [...DELBART_KUND, "hypotes"];

// Aldrig utanför organisationen: arbetsledning, arbetsmaterial och
// underlag som kan läsas som konstateranden.
export const ENDAST_INTERNT = ["kategori_byte", "hypotes", "ai_svar", "ansvarig_satt", "arbetsorder_skannad"];

export function synligaTyper(niva) {
  if (niva === "intern") return null; // full insyn — ingen filtrering
  return niva === "partner" ? DELBART_PARTNER : DELBART_KUND;
}

// ---- Hjälpare ---------------------------------------------------------

function svara(res, status, kropp) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    // Ursprunget sätts en gång per anrop i hanteraren nedan.
    "Access-Control-Allow-Origin": res.ursprung ?? "*",
    Vary: "Origin",
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

async function lasBinart(req, tak) {
  const bitar = [];
  let storlek = 0;
  for await (const bit of req) {
    storlek += bit.length;
    if (storlek > tak) throw new Error("för stor kropp");
    bitar.push(bit);
  }
  return Buffer.concat(bitar);
}

// Delningskod. Förkastningsurval i stället för modulo: 256 är inte jämnt
// delbart med 36, så `b % 36` gör de fyra första tecknen ~14 % vanligare.
// Entropiförlusten är liten, men en snedfördelad kod i en säkerhetsväg är
// inte något man vill behöva förklara i en granskning (QUALITET m-1).
function nyKod(langd = 16) {
  const tecken = "abcdefghijklmnopqrstuvwxyz0123456789";
  const tak = 256 - (256 % tecken.length); // 252 — värden däröver kastas
  const ut = [];
  while (ut.length < langd) {
    for (const b of crypto.randomBytes(langd)) {
      if (b < tak && ut.length < langd) ut.push(tecken[b % tecken.length]);
    }
  }
  return ut.join("");
}

/**
 * Avslutsspärren. Läser hela loggen ur databasen, lägger de inkommande
 * händelserna ovanpå och utvärderar grinden mot det samlade underlaget —
 * annars skulle ett avslut i samma anrop som evidensen felaktigt nekas.
 */
async function grindHinder(pool, arendeId, nya) {
  const rader = await pool.query(
    `select h.handelse, a.metodik_id from felsokning_handelser h
     join felsokning_arenden a on a.id = h.arende_id
     where h.arende_id = $1 order by h.tidpunkt, h.id`,
    [arendeId],
  );
  const handelser = [...rader.rows.map((r) => r.handelse), ...nya.map((p) => p.handelse)];
  const metodik =
    ALLA_METODIKER.find((m) => m.id === rader.rows[0]?.metodik_id) ?? ALLA_METODIKER.at(-1);

  let regelpaket;
  if (REGELPAKET_STATUS === "ogiltig signatur") {
    return [{ id: "regelpaket", rubrik: "Regelpaketets signatur stämmer inte — avslut spärrat." }];
  }
  try {
    regelpaket = JSON.parse(ECM_REGLER);
  } catch {
    // Ett trasigt regelpaket får aldrig tolkas som "inga extra krav".
    return [{ id: "regelpaket", rubrik: "Regelpaketet gick inte att läsa — avslut spärrat." }];
  }
  return [...grinda(handelser, metodik), ...grindaArendetyp(handelser, regelpaket)];
}


// ---- Personuppgifter, gallring och åtkomstlogg -------------------------

/**
 * Hämtar eller skapar nyckeln för ett subjekt. Ett subjekt är normalt ett
 * fordon (regnr eller VIN) — det som en raderingsbegäran pekar ut.
 */
/**
 * Blindat index över en fordonsidentifierare.
 *
 * Samma fordon ger alltid samma värde, men värdet går inte att vända
 * tillbaka till ett registreringsnummer utan nyckeln. Det är det som gör
 * en raderingsbegäran genomförbar över hela fordonets historik trots att
 * identifieraren är krypterad i loggen (QUALITET C-3).
 */
function blindaIdentifierare(ident) {
  const nyckel = process.env.INTEGRATION_NYCKEL ?? process.env.JWT_SECRET ?? "";
  return createHmac("sha256", nyckel)
    .update(String(ident).trim().toUpperCase().replace(/\s+/g, ""))
    .digest("hex");
}

async function personnyckel(orgId, subjekt) {
  const rad = await pool.query(
    `insert into personnycklar (organisation_id, subjekt, nyckel)
     values ($1, $2, $3)
     on conflict (organisation_id, subjekt) do update set subjekt = excluded.subjekt
     returning id, nyckel, radering_begard`,
    [orgId, subjekt, randomBytes(32)],
  );
  return rad.rows[0];
}

/** Nycklar som fortfarande finns, för att öppna en logg vid läsning. */
async function nycklarFor(orgId) {
  const rader = await pool.query(
    `select id, nyckel from personnycklar where organisation_id = $1`,
    [orgId],
  );
  return new Map(rader.rows.map((r) => [r.id, r.nyckel]));
}

/**
 * Läslogg. Skrivningar loggades redan; läsningar gjorde det inte, vilket
 * gjorde det omöjligt att svara på vem som sett en kunds uppgifter
 * (QUALITET M-4). Misslyckas loggningen svarar vi ändå — en trasig
 * revisionslogg får inte bli ett driftavbrott, men den ska synas.
 */
function loggaAtkomst(req, res, { org, anvandare, arende, delningskod }) {
  pool
    .query(
      `insert into atkomstlogg (organisation_id, anvandare_id, arende_id, vag, kalla, delningskod)
       values ($1, $2, $3, $4, $5, $6)`,
      [org ?? null, anvandare ?? null, arende ?? null, req.url?.slice(0, 500) ?? "", kallaFor(req), delningskod ?? null],
    )
    .catch((fel) => logga("fel", "åtkomstlogg misslyckades", { spårId: res.spår.spårId, orsak: fel?.message }));
}

/**
 * Levererar en utgående händelse till organisationens prenumeranter.
 *
 * Leveransen är signerad och sker i bakgrunden: en mottagare som är nere
 * får inte hindra teknikern från att arbeta. Utfallet skrivs på
 * prenumerationen, så ett trasigt mottagarsystem syns i inställningarna
 * i stället för att tyst sluta få data (ALVA-SPEC-021).
 */
function leverera(orgId, handelse, nyttolast) {
  pool
    .query(
      `select id, url, hemlighet_krypt from prenumerationer
       where organisation_id = $1 and aktiv and $2 = any(handelser)`,
      [orgId, handelse],
    )
    .then(async ({ rows }) => {
      for (const p of rows) {
        const kropp = JSON.stringify({ handelse, tid: new Date().toISOString(), ...nyttolast });
        const t = Math.floor(Date.now() / 1000);
        let status = "ok";
        try {
          const svar = await fetch(p.url, {
            method: "POST",
            headers: {
              "content-type": "application/json",
              "alva-signatur": signeraLeverans(kropp, dekryptera(p.hemlighet_krypt), t, createHmac),
              "alva-handelse": handelse,
            },
            body: kropp,
            signal: AbortSignal.timeout(10_000),
          });
          if (!svar.ok) status = `HTTP ${svar.status}`;
        } catch (fel) {
          status = fel?.message?.slice(0, 200) ?? "okänt fel";
        }
        await pool.query(
          `update prenumerationer set senast_levererad = now(), senaste_status = $2 where id = $1`,
          [p.id, status],
        );
      }
    })
    .catch((fel) => logga("fel", "leverans misslyckades", { handelse, orsak: fel?.message }));
}

function kravAuth(req, hemlighet) {
  const auth = req.headers.authorization ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  return token ? verifieraJwt(token, hemlighet) : null;
}

// En giltig signatur räcker inte. Kontot måste fortfarande vara aktivt,
// och token-versionen måste stämma med kontots — annars har den
// återkallats. Ett uppslag på primärnyckeln per anrop, vilket gör
// återkallelsen omedelbar i stället för att gälla vid nästa utgång.
async function kontoGiltigt(anspr) {
  const rad = await pool.query(
    `select aktiv, token_version from anvandare where id = $1 and organisation_id = $2`,
    [anspr.sub, anspr.org],
  );
  if (rad.rowCount === 0) return false;
  if (rad.rows[0].aktiv === false) return false;
  return (anspr.tv ?? 0) === rad.rows[0].token_version;
}

// Verifierar att ärendet tillhör användarens organisation.
async function arendeIOrg(arendeId, organisationId) {
  const rader = await pool.query(
    `select 1 from felsokning_arenden where id = $1 and organisation_id = $2`,
    [arendeId, organisationId],
  );
  return rader.rowCount > 0;
}

// Adresser som aldrig får nås utifrån ett kundkonfigurerat uppslag:
// loopback, privata nät, link-local (inkl. molnens metadatatjänst),
// CGNAT och IPv6-motsvarigheterna.
export function arPrivatAdress(adress) {
  const v4 = adress.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const [a, b] = v4.slice(1).map(Number);
    return (
      a === 0 || a === 10 || a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      a >= 224
    );
  }
  const v6 = adress.toLowerCase().replace(/^\[|\]$/g, "");
  if (v6 === "::1" || v6 === "::") return true;
  // Unika lokala adresser (fc00::/7), link-local (fe80::/10) och
  // IPv4-mappade adresser som ::ffff:127.0.0.1.
  if (/^f[cd]/.test(v6) || /^fe[89ab]/.test(v6)) return true;
  const mappad = v6.match(/^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
  return mappad ? arPrivatAdress(mappad[1]) : false;
}

// Slår upp värdnamnet och avgör om något av svaren pekar inåt. Namn som
// resolvar till interna adresser fångas också — inte bara IP-literaler.
export async function pekarInat(url, slaUpp = lookup) {
  let vard;
  try {
    vard = new URL(url).hostname;
  } catch {
    return "ogiltig URL";
  }
  const bar = vard.replace(/^\[|\]$/g, "");
  if (/^[\d.]+$/.test(bar) || bar.includes(":")) {
    return arPrivatAdress(bar) ? bar : null;
  }
  if (bar === "localhost" || bar.endsWith(".localhost") || bar.endsWith(".internal") || bar.endsWith(".local")) {
    return bar;
  }
  try {
    const traffar = await slaUpp(bar, { all: true });
    const intern = traffar.find((t) => arPrivatAdress(t.address));
    return intern ? intern.address : null;
  } catch {
    // Namnet går inte att slå upp — låt anropet självt misslyckas i
    // stället för att påstå något om var det pekar.
    return null;
  }
}

// Generiskt uppslag mot en leverantör. All variation ligger i registret
// (URL-mall, autentiseringstyp, svarsmappning) — inga leverantörs-
// specifika kodgrenar.
export async function gorUppslag(def, uppgifter, identifierare, hamtare = fetch) {
  const u = def.uppslag ?? {};
  const mall = uppgifter[u.urlFalt ?? "bas_url"];
  if (typeof mall !== "string" || !/^https?:\/\//.test(mall)) {
    return { ok: false, fel: "Bas-URL saknas eller är ogiltig." };
  }
  let url = mall.replace(/\{vin\}/gi, encodeURIComponent(identifierare)).replace(/\{regnr\}/gi, encodeURIComponent(identifierare));

  // Bas-URL:en sätts av kundens administratör men anropet görs av vår
  // server. Utan spärr blir det en väg in i klustrets interna nät och
  // molnets metadatatjänst (169.254.169.254) — tenantens administratör
  // är inte infrastrukturens ägare. Interna mål tillåts bara när driften
  // uttryckligen öppnat för det (verkstäder med OEM-server på egna nätet).
  if (process.env.TILLAT_INTERNA_UPPSLAG !== "true") {
    const internt = await pekarInat(url);
    if (internt) return { ok: false, fel: `Bas-URL:en pekar på en intern adress (${internt}) och tillåts inte.` };
  }
  const headers = { Accept: "application/json" };

  if (u.auth === "bearer") headers.Authorization = `Bearer ${uppgifter[u.authFalt]}`;
  if (u.auth === "header") headers[u.authHeader ?? "X-Api-Key"] = uppgifter[u.authFalt];
  if (u.auth === "basic") {
    const par = `${uppgifter[u.authFalt]}:${uppgifter[u.authFalt2]}`;
    headers.Authorization = `Basic ${Buffer.from(par).toString("base64")}`;
  }
  if (u.auth === "query") {
    url += `${url.includes("?") ? "&" : "?"}${encodeURIComponent(u.authParam ?? "key")}=${encodeURIComponent(uppgifter[u.authFalt])}`;
  }

  try {
    const svarFran = await hamtare(url, { headers, signal: AbortSignal.timeout(10_000) });
    if (!svarFran.ok) return { ok: false, fel: `Leverantören svarade ${svarFran.status}.` };
    const data = await svarFran.json();
    const fordon = {};
    for (const [vart, deras] of Object.entries(u.svarsfalt ?? {})) {
      const varde = deras.split(".").reduce((niva, del) => (niva == null ? niva : niva[del]), data);
      if (varde !== undefined && varde !== null && `${varde}`.trim()) fordon[vart] = `${varde}`.trim();
    }
    if (Object.keys(fordon).length === 0) return { ok: false, fel: "Leverantören returnerade inga kända fält." };
    return { ok: true, fordon };
  } catch (fel) {
    return { ok: false, fel: fel?.name === "TimeoutError" ? "Leverantören svarade inte i tid." : "Anropet misslyckades." };
  }
}

// ---- Server -----------------------------------------------------------

// Lämnar ut innehållet — men bara efter att det kontrollerats mot
// hashen i loggen. Stämmer det inte säger vi det rakt ut i stället för
// att visa en bild som kan ha bytts ut.
async function skickaBilaga(res, rad) {
  const data = await res.spann.mät("bilaga_las", () => BILAGELAGER.hamta(rad.hash));
  if (!data) return svara(res, 404, { error: "Innehållet saknas i lagringen." });
  if (innehallsHash(data) !== rad.hash) {
    logga("fel", "bilagans innehåll stämmer inte med hashen i loggen", { hash: rad.hash });
    return svara(res, 409, { error: "Innehållet stämmer inte med det som dokumenterades." });
  }
  res.writeHead(200, {
    "Content-Type": rad.mediatyp,
    "Content-Length": data.length,
    // Innehållsadresserat — samma id ger alltid samma bytes.
    "Cache-Control": "private, max-age=31536000, immutable",
    "Access-Control-Allow-Origin": res.ursprung ?? "*",
    Vary: "Origin",
  });
  return res.end(data);
}

export function skapaServer() {
  function loggaIn(res, rad, hemlighet) {
    const nu = Math.floor(Date.now() / 1000);
    const token = skapaJwt(
      {
        sub: rad.id,
        namn: rad.namn,
        org: rad.organisation_id,
        roll: rad.roll,
        // Bärs med så att en återkallelse gör token ogiltig direkt.
        tv: rad.token_version ?? 0,
        // Modellanropen kan stängas av per organisation (QUALITET C-4).
        // Flaggan bärs i token så att orkestern kan neka utan att själv
        // behöva databasåtkomst — den vet redan vem som frågar.
        ai: rad.ai_tillaten !== false,
        iat: nu,
        exp: nu + TOKEN_LIVSTID_S,
      },
      hemlighet,
    );
    return svara(res, 200, { token, namn: rad.namn, roll: rad.roll, organisation: rad.org_namn });
  }

  return createServer(async (req, res) => {
    res.ursprung = ursprungFor(req);

    // Spåret följer med genom hela kedjan. Kommer inget huvud in startar
    // vi ett nytt — de flesta anrop kommer utifrån.
    res.spår = spårFrån(req.headers.traceparent);
    res.spann = starta("plattform", res.spår);
    res.setHeader("traceparent", traceparent(res.spår));

    res.on("finish", () => {
      avsluta(res.spann, {
        status: res.statusCode,
        // Ärende- och bilage-id ersätts så att vägen blir en dimension
        // med rimligt antal värden i stället för en per ärende.
        väg: (req.url ?? "/").split("?")[0].replace(/\/[A-Za-z0-9_-]{8,}/g, "/:id"),
        extra: { metod: req.method },
      });
    });
    if (req.method === "OPTIONS") {
      res.writeHead(204, {
        "Access-Control-Allow-Origin": res.ursprung,
        Vary: "Origin",
        "Access-Control-Allow-Headers": "authorization, content-type",
        "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
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
          "Access-Control-Allow-Origin": res.ursprung,
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
             returning id, namn, organisation_id, roll, token_version`,
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
        const normaliserad = (epost ?? "").trim().toLowerCase();
        const kalla = kallaFor(req);

        if (await inloggningSparrad(normaliserad, kalla)) {
          return svara(res, 429, { error: "För många misslyckade försök — vänta en stund och försök igen." });
        }

        const rader = await pool.query(
          `select a.id, a.namn, a.organisation_id, a.roll, a.aktiv, a.token_version, o.namn as org_namn,
                  coalesce((o.installningar->>'ai_tillaten')::boolean, true) as ai_tillaten
           from anvandare a join organisationer o on o.id = a.organisation_id
           where a.epost = $1 and a.losen_hash = crypt($2, a.losen_hash)`,
          [normaliserad, losenord ?? ""],
        );
        if (rader.rowCount === 0) {
          await loggaForsok(normaliserad, kalla, false);
          return svara(res, 401, { error: "Fel e-post eller lösenord." });
        }
        // Ett avaktiverat konto räknas som misslyckat försök: annars blir
        // svarstiden ett sätt att lista ut vilka konton som finns.
        if (rader.rows[0].aktiv === false) {
          await loggaForsok(normaliserad, kalla, false);
          return svara(res, 403, { error: "Kontot är avstängt — kontakta er administratör." });
        }
        await loggaForsok(normaliserad, kalla, true);
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
        const synliga = synligaTyper(niva);
        const handelser = synliga
          ? await pool.query(
              `select id, tidpunkt, anvandare, handelse from felsokning_handelser
               where arende_id = $1 and handelse->>'typ' = any($2)
               order by tidpunkt, id`,
              [arendeId, synliga],
            )
          : await pool.query(
              `select id, tidpunkt, anvandare, handelse from felsokning_handelser
               where arende_id = $1 order by tidpunkt, id`,
              [arendeId],
            );
        return svara(res, 200, { arende: arende.rows[0], handelser: handelser.rows, niva });
      }

      // Bilaga via delningslänk. Bilden får bara hämtas om den hör till
      // en händelse som nivån faktiskt får se — annars vore det en väg
      // runt delningsfiltret.
      const delatBilaga = vag.match(/^\/api\/delad\/([A-Za-z0-9_-]+)\/bilagor\/([A-Za-z0-9_-]+)$/);
      if (req.method === "GET" && delatBilaga) {
        const delning = await pool.query(
          `select arende_id, niva from delningar where kod = $1 and aterkallad is null`,
          [delatBilaga[1]],
        );
        if (delning.rowCount === 0) return svara(res, 404, { error: "Bilagan är inte tillgänglig." });
        const synliga = synligaTyper(delning.rows[0].niva);
        const rad = await pool.query(
          `select b.hash, b.mediatyp from bilagor b
           where b.id = $1 and b.arende_id = $2
             and exists (
               select 1 from felsokning_handelser h
               where h.arende_id = b.arende_id
                 and h.handelse->>'bilagaId' = b.id
                 and ($3::text[] is null or h.handelse->>'typ' = any($3))
             )`,
          [delatBilaga[2], delning.rows[0].arende_id, synliga],
        );
        if (rad.rowCount === 0) return svara(res, 404, { error: "Bilagan är inte tillgänglig." });
        return skickaBilaga(res, rad.rows[0]);
      }

      // -- Publikt kundgodkännande (den enda skrivande publika vägen) --
      //
      // Kunden svarar på ett åtgärdsförslag via sin delningslänk. Spärrar:
      //   1. endast delningar på kundnivå (partner/intern får inte svara
      //      åt kunden), och aldrig återkallade
      //   2. det måste finnas ett åtgärdsförslag att svara på
      //   3. ett beslut per ärende — svaret kan inte ändras i efterhand
      //   4. takt-begränsning per kod
      //   5. beslutet får bara vara godkant/avbojt/delvis + kort kommentar;
      //      inget annat kan skrivas till loggen den här vägen
      const beslutVag = vag.match(/^\/api\/delad\/([A-Za-z0-9_-]+)\/beslut$/);
      if (req.method === "POST" && beslutVag) {
        const kod = beslutVag[1];
        if (forTataForsok(kod)) return svara(res, 429, { error: "För många försök — vänta en stund." });

        const delning = await pool.query(
          `select arende_id, niva from delningar where kod = $1 and aterkallad is null`,
          [kod],
        );
        if (delning.rowCount === 0 || delning.rows[0].niva !== "kund") {
          return svara(res, 404, { error: "Delningen är inte tillgänglig." });
        }
        const arendeId = delning.rows[0].arende_id;

        const { beslut, kommentar } = await lasKropp(req);
        if (!["godkant", "avbojt", "delvis"].includes(beslut)) {
          return svara(res, 400, { error: "Ogiltigt beslut." });
        }
        if (kommentar !== undefined && (typeof kommentar !== "string" || kommentar.length > 500)) {
          return svara(res, 400, { error: "Kommentaren är för lång." });
        }

        const forslag = await pool.query(
          `select 1 from felsokning_handelser
           where arende_id = $1 and handelse->>'typ' = 'atgardsforslag' limit 1`,
          [arendeId],
        );
        if (forslag.rowCount === 0) {
          return svara(res, 409, { error: "Det finns inget åtgärdsförslag att svara på." });
        }
        const tidigare = await pool.query(
          `select 1 from felsokning_handelser
           where arende_id = $1 and handelse->>'typ' = 'kundbeslut' limit 1`,
          [arendeId],
        );
        if (tidigare.rowCount > 0) {
          return svara(res, 409, { error: "Ett besked är redan registrerat — kontakta verkstaden." });
        }

        const handelse = {
          typ: "kundbeslut",
          beslut,
          kanal: "Delningslänk",
          ...(kommentar?.trim() ? { kommentar: kommentar.trim() } : {}),
        };
        await pool.query(
          `insert into felsokning_handelser (id, arende_id, tidpunkt, anvandare, handelse)
           values ($1, $2, now(), $3, $4)`,
          [`kb-${nyKod()}`, arendeId, "Kund via delningslänk", handelse],
        );
        return svara(res, 200, { ok: true });
      }

      // -- Skyddade endpoints (organisationsknutna) --
      const anspr = kravAuth(req, hemlighet);
      if (!anspr?.org) return svara(res, 401, { error: "Inloggning krävs." });
      if (!(await kontoGiltigt(anspr))) {
        return svara(res, 401, { error: "Sessionen gäller inte längre — logga in på nytt." });
      }

      // Användarhantering: endast systemadministratör, endast egen org.
      if (vag === "/api/anvandare") {
        // Läsning: admin + arbetsledare (behövs för omfördelning).
        // Skapande: endast admin.
        if (anspr.roll === "tekniker") return svara(res, 403, { error: "Kräver arbetsledar- eller administratörsbehörighet." });
        if (req.method === "GET") {
          const rader = await pool.query(
            `select id, epost, namn, roll, aktiv from anvandare where organisation_id = $1 order by namn`,
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
             returning id, epost, namn, roll, aktiv`,
            [anspr.org, epost.trim(), losenord, namn.trim(), roll],
          );
          if (rad.rowCount === 0) return svara(res, 409, { error: "E-postadressen är redan registrerad." });
          return svara(res, 200, rad.rows[0]);
        }
      }

      // Stäng av eller öppna ett konto. Att stänga av höjer också
      // token-versionen, så pågående sessioner upphör direkt — annars
      // vore avstängningen verkningslös i upp till tolv timmar.
      const kontoVag = vag.match(/^\/api\/anvandare\/([0-9a-fA-F-]{36})\/(avaktivera|aktivera)$/);
      if (req.method === "POST" && kontoVag) {
        if (anspr.roll !== "admin") return svara(res, 403, { error: "Kräver administratörsbehörighet." });
        const [, id, atgard] = kontoVag;
        if (id === anspr.sub) {
          return svara(res, 400, { error: "Du kan inte stänga av ditt eget konto." });
        }
        const aktivera = atgard === "aktivera";
        const rad = await pool.query(
          `update anvandare
             set aktiv = $3,
                 token_version = token_version + case when $3 then 0 else 1 end
           where id = $1 and organisation_id = $2
           returning id, namn, aktiv`,
          [id, anspr.org, aktivera],
        );
        if (rad.rowCount === 0) return svara(res, 404, { error: "Användaren finns inte." });
        return svara(res, 200, rad.rows[0]);
      }

      // Logga ut på alla enheter — den egna vägen ut när en telefon
      // tappats bort. Höjer den egna token-versionen.
      if (req.method === "POST" && vag === "/api/auth/logga-ut-alla") {
        await pool.query(
          `update anvandare set token_version = token_version + 1 where id = $1 and organisation_id = $2`,
          [anspr.sub, anspr.org],
        );
        return svara(res, 200, { ok: true });
      }

      // -- Bilagor --
      // Innehållet ligger utanför händelsen; loggen bär referensen och
      // innehållets hash. Uppladdningen sker före händelsen skrivs, så
      // en händelse aldrig pekar på något som inte finns.
      const laddaUppVag = vag.match(/^\/api\/arenden\/([A-Za-z0-9_-]+)\/bilagor$/);
      if (req.method === "POST" && laddaUppVag) {
        if (!(await arendeIOrg(laddaUppVag[1], anspr.org))) {
          return svara(res, 404, { error: "Ärendet är inte tillgängligt." });
        }
        const mediatyp = (req.headers["content-type"] ?? "").split(";")[0].trim().toLowerCase();
        if (!mediatypGiltig(mediatyp)) {
          return svara(res, 415, { error: "Endast bilder och videoklipp kan laddas upp." });
        }
        let data;
        try {
          data = await lasBinart(req, MAX_BILAGA);
        } catch {
          return svara(res, 413, { error: `Bilagan är för stor (max ${MAX_BILAGA / 1024 / 1024} MB).` });
        }
        if (data.length === 0) return svara(res, 400, { error: "Bilagan är tom." });

        const hash = innehallsHash(data);
        await res.spann.mät("bilaga_skriv", () => BILAGELAGER.spara(hash, data));
        const id = `bil-${nyKod()}`;
        await pool.query(
          `insert into bilagor (id, organisation_id, arende_id, hash, mediatyp, storlek, laddad_av)
           values ($1, $2, $3, $4, $5, $6, $7)`,
          [id, anspr.org, laddaUppVag[1], hash, mediatyp, data.length, anspr.sub],
        );
        // Hashen går tillbaka till klienten och hamnar i händelsen —
        // därmed står den i den append-only-skyddade loggen.
        return svara(res, 200, { id, hash, mediatyp, storlek: data.length });
      }

      const bilagaVag = vag.match(/^\/api\/bilagor\/([A-Za-z0-9_-]+)$/);
      if (req.method === "GET" && bilagaVag) {
        const rad = await pool.query(
          `select hash, mediatyp from bilagor where id = $1 and organisation_id = $2`,
          [bilagaVag[1], anspr.org],
        );
        if (rad.rowCount === 0) return svara(res, 404, { error: "Bilagan finns inte." });
        return skickaBilaga(res, rad.rows[0]);
      }

      // ECM Knowledge Library: aktuellt regelpaket för inloggade klienter.
      if (req.method === "GET" && vag === "/api/ecm/regler") {
        res.setHeader("X-Regelpaket-Status", REGELPAKET_STATUS);
        res.writeHead(200, {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": res.ursprung,
        });
        return res.end(ECM_REGLER);
      }

      // -- Märkesspecifika kopplingar (integrationer) --
      // Registret läses av alla inloggade (så inställningssidan kan visa
      // vilka leverantörer som finns); uppgifterna hanteras endast av
      // systemadministratören och returneras alltid maskerade.
      if (req.method === "GET" && vag === "/api/integrationer/leverantorer") {
        return svara(res, 200, INTEGRATIONER);
      }

      if (vag === "/api/integrationer") {
        if (req.method === "GET") {
          if (anspr.roll !== "admin") return svara(res, 403, { error: "Kräver administratörsbehörighet." });
          const nyckel = integrationsNyckel();
          const rader = await pool.query(
            `select leverantor, uppgifter_krypt, aktiv, uppdaterad, senast_testad, senaste_status
             from integrationer where organisation_id = $1 order by leverantor`,
            [anspr.org],
          );
          const integrationer = rader.rows.map((rad) => {
            const def = leverantorsDef(rad.leverantor);
            let uppgifter = {};
            try {
              if (nyckel) uppgifter = JSON.parse(dekryptera(rad.uppgifter_krypt, nyckel));
            } catch {
              // Fel nyckel eller manipulerad rad — visa inga värden.
            }
            const maskerade = {};
            for (const falt of def?.falt ?? []) {
              const varde = uppgifter[falt.nyckel];
              maskerade[falt.nyckel] = falt.hemlig ? maskera(varde) : (varde ?? "");
            }
            return {
              leverantor: rad.leverantor,
              namn: def?.namn ?? rad.leverantor,
              aktiv: rad.aktiv,
              uppdaterad: rad.uppdaterad,
              senast_testad: rad.senast_testad,
              senaste_status: rad.senaste_status,
              uppgifter: maskerade,
            };
          });
          return svara(res, 200, { integrationer, krypteringKonfigurerad: !!nyckel });
        }
        if (req.method === "POST") {
          if (anspr.roll !== "admin") return svara(res, 403, { error: "Kräver administratörsbehörighet." });
          const nyckel = integrationsNyckel();
          if (!nyckel) {
            return svara(res, 503, {
              error: "Kryptering är inte konfigurerad (INTEGRATION_NYCKEL saknas) — uppgifter kan inte sparas.",
            });
          }
          const { leverantor, uppgifter, aktiv } = await lasKropp(req);
          const def = leverantorsDef(leverantor);
          if (!def) return svara(res, 400, { error: "Okänd leverantör." });
          if (!uppgifter || typeof uppgifter !== "object") {
            return svara(res, 400, { error: "Uppgifter saknas." });
          }
          // Endast leverantörens definierade fält sparas, och varje fält
          // måste ha ett värde — inga tomma nycklar i vila.
          const rena = {};
          for (const falt of def.falt) {
            const varde = uppgifter[falt.nyckel];
            if (typeof varde !== "string" || !varde.trim()) {
              return svara(res, 400, { error: `Fältet "${falt.etikett}" måste fyllas i.` });
            }
            if (varde.length > 2000) return svara(res, 400, { error: "Ett värde är för långt." });
            rena[falt.nyckel] = varde.trim();
          }
          await pool.query(
            `insert into integrationer (organisation_id, leverantor, uppgifter_krypt, aktiv)
             values ($1, $2, $3, $4)
             on conflict (organisation_id, leverantor)
             do update set uppgifter_krypt = excluded.uppgifter_krypt,
                           aktiv = excluded.aktiv,
                           uppdaterad = now(),
                           senast_testad = null,
                           senaste_status = null`,
            [anspr.org, leverantor, kryptera(JSON.stringify(rena), nyckel), aktiv !== false],
          );
          return svara(res, 200, { ok: true });
        }
      }

      const integrationVag = vag.match(/^\/api\/integrationer\/([a-z0-9_]+)$/);
      if (req.method === "DELETE" && integrationVag) {
        if (anspr.roll !== "admin") return svara(res, 403, { error: "Kräver administratörsbehörighet." });
        await pool.query(`delete from integrationer where organisation_id = $1 and leverantor = $2`, [
          anspr.org,
          integrationVag[1],
        ]);
        return svara(res, 200, { ok: true });
      }

      // Uppslag mot märkesspecifik koppling. Anropet görs alltid av
      // servern — kundens leverantörsnycklar når aldrig webbläsaren.
      const uppslagVag = vag.match(/^\/api\/integrationer\/([a-z0-9_]+)\/uppslag$/);
      if (req.method === "POST" && uppslagVag) {
        const nyckel = integrationsNyckel();
        const def = leverantorsDef(uppslagVag[1]);
        if (!def) return svara(res, 400, { error: "Okänd leverantör." });
        if (!nyckel) return svara(res, 503, { error: "Kryptering är inte konfigurerad." });

        const { identifierare } = await lasKropp(req);
        if (typeof identifierare !== "string" || !/^[A-Za-z0-9-]{4,20}$/.test(identifierare.trim())) {
          return svara(res, 400, { error: "Ogiltig identifierare." });
        }
        const rad = await pool.query(
          `select uppgifter_krypt from integrationer
           where organisation_id = $1 and leverantor = $2 and aktiv = true`,
          [anspr.org, uppslagVag[1]],
        );
        if (rad.rowCount === 0) return svara(res, 404, { error: "Kopplingen är inte konfigurerad." });

        let uppgifter;
        try {
          uppgifter = JSON.parse(dekryptera(rad.rows[0].uppgifter_krypt, nyckel));
        } catch {
          return svara(res, 500, { error: "Uppgifterna kunde inte läsas — spara om kopplingen." });
        }

        const resultat = await res.spann.mät("leverantorsuppslag", () =>
          gorUppslag(def, uppgifter, identifierare.trim().toUpperCase()),
        );
        await pool.query(
          `update integrationer set senast_testad = now(), senaste_status = $3
           where organisation_id = $1 and leverantor = $2`,
          [anspr.org, uppslagVag[1], resultat.ok ? "ok" : `fel: ${resultat.fel}`.slice(0, 200)],
        );
        if (!resultat.ok) return svara(res, 502, { error: resultat.fel });
        return svara(res, 200, { fordon: resultat.fordon });
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
        const { objekttyper, identifieringsmetoder, ai_tillaten } = await lasKropp(req);
        const giltigLista = (lista) =>
          Array.isArray(lista) && lista.length > 0 && lista.length <= 50 &&
          lista.every((v) => typeof v === "string" && v.length <= 100);
        if (!giltigLista(objekttyper) || !giltigLista(identifieringsmetoder)) {
          return svara(res, 400, { error: "Ange minst en objekttyp och en identifieringsmetod." });
        }
        await pool.query(
          `update organisationer set installningar = $2 where id = $1`,
          [
            anspr.org,
            JSON.stringify({
              objekttyper,
              identifieringsmetoder,
              // Modellanropen kan stängas av helt. Metodikmotorn fungerar
              // ensam, så en organisation som inte kan acceptera
              // överföringen till modelleverantören kan ändå använda
              // produkten (QUALITET C-4).
              ai_tillaten: ai_tillaten !== false,
            }),
          ],
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



      // ---- ALVA-REP-0100 · Analysunderlag ------------------------------
      //
      // En enda källa för både portalens analysvy och kvartalsrapporten,
      // så att skärmen och rapporten aldrig visar olika siffror för samma
      // period. Det är den vanligaste orsaken till att ingen litar på en
      // rapport.
      if (req.method === "GET" && vag.startsWith("/api/statistik/oversikt")) {
        if (anspr.roll === "tekniker") return svara(res, 403, { error: "Kräver arbetsledare eller administratör." });
        const rader = await pool.query(
          `select a.id, a.nummer,
                  coalesce(json_agg(json_build_object('tidpunkt', h.tidpunkt, 'handelse', h.handelse)
                    order by h.tidpunkt) filter (where h.id is not null), '[]') as handelser
           from felsokning_arenden a
           left join felsokning_handelser h on h.arende_id = a.id
           where a.organisation_id = $1
           group by a.id, a.nummer`,
          [anspr.org],
        );
        const nycklar = await nycklarFor(anspr.org);
        const arenden = rader.rows.map((r) => ({
          ...r,
          handelser: r.handelser.map((p) => ({ ...p, handelse: öppnaHändelse(p.handelse, nycklar) })),
        }));
        return svara(res, 200, statistikOversikt(arenden));
      }

      // ---- ALVA-SPEC-021 · Prenumerationer -----------------------------
      if (vag === "/api/integration/prenumerationer") {
        if (anspr.roll !== "admin") return svara(res, 403, { error: "Kräver administratörsbehörighet." });
        if (req.method === "GET") {
          const rader = await pool.query(
            `select id, namn, url, handelser, aktiv, senast_levererad, senaste_status
             from prenumerationer where organisation_id = $1 order by namn`,
            [anspr.org],
          );
          return svara(res, 200, { prenumerationer: rader.rows });
        }
        if (req.method === "POST") {
          const { namn, url, handelser, hemlighet } = await lasKropp(req);
          if (typeof namn !== "string" || !namn.trim() || typeof url !== "string") {
            return svara(res, 400, { error: "namn och url krävs." });
          }
          // Samma SSRF-gräns som leverantörsuppslagen: en prenumeration
          // får inte peka in i klustret.
          if (await pekarInat(url)) {
            return svara(res, 400, { error: "Adressen pekar mot ett internt nät." });
          }
          if (!Array.isArray(handelser) || handelser.some((h) => !(h in UTGAENDE))) {
            return svara(res, 400, { error: "handelser måste vara kända händelsetyper.", kanda: Object.keys(UTGAENDE) });
          }
          const rad = await pool.query(
            `insert into prenumerationer (organisation_id, namn, url, hemlighet_krypt, handelser)
             values ($1, $2, $3, $4, $5) returning id`,
            [anspr.org, namn.trim(), url, kryptera(String(hemlighet ?? nyKod(32))), handelser],
          );
          return svara(res, 200, { id: rad.rows[0].id });
        }
      }

      // ---- ALVA-PROC-0030 · Sammanfattning -----------------------------
      //
      // Härledd, inte genererad. En sammanfattning som en bedömare läser
      // blir en del av beslutsunderlaget — är den genererad måste den
      // granskas mot loggen varje gång, och då är den ingen genväg.
      const sammanfattningVag = vag.match(/^\/api\/arenden\/([A-Za-z0-9_-]+)\/sammanfattning$/);
      if (req.method === "GET" && sammanfattningVag) {
        if (!(await arendeIOrg(sammanfattningVag[1], anspr.org))) {
          return svara(res, 404, { error: "Ärendet är inte tillgängligt." });
        }
        const rader = await pool.query(
          `select tidpunkt, anvandare, handelse from felsokning_handelser
           where arende_id = $1 order by tidpunkt, id`,
          [sammanfattningVag[1]],
        );
        const nycklar = await nycklarFor(anspr.org);
        const arende = {
          id: sammanfattningVag[1],
          handelser: rader.rows.map((r) => ({ ...r, handelse: öppnaHändelse(r.handelse, nycklar) })),
        };
        loggaAtkomst(req, res, { org: anspr.org, anvandare: anspr.sub, arende: sammanfattningVag[1] });
        return svara(res, 200, { ...sammanfatta(arende), enrading: enrading(arende) });
      }

      // ---- ALVA-SPEC-020 · Integrationsgränssnitt ----------------------
      if (req.method === "GET" && vag === "/api/integration/kategorier") {
        return svara(res, 200, { kategorier: KATEGORIER, handelser: UTGAENDE });
      }

      // Inkommande diagnosprotokoll. Blir evidens, inte en bilaga — men
      // härkomsten följer med i varje händelse, så ett värde som kommit
      // utifrån aldrig ser ut som något teknikern själv mätt.
      const protokollVag = vag.match(/^\/api\/arenden\/([A-Za-z0-9_-]+)\/protokoll$/);
      if (req.method === "POST" && protokollVag) {
        if (!(await arendeIOrg(protokollVag[1], anspr.org))) {
          return svara(res, 404, { error: "Ärendet är inte tillgängligt." });
        }
        const { protokoll, profil, kalla } = await lasKropp(req);
        if (!protokoll || !profil || typeof kalla !== "string" || !kalla.trim()) {
          return svara(res, 400, { error: "protokoll, profil och kalla krävs." });
        }
        const handelser = protokollTillHandelser(protokoll, profil, kalla.trim().slice(0, 120));
        if (handelser.length === 0) {
          return svara(res, 422, {
            error: "Profilen gav inga händelser ur protokollet.",
            atgard: "Kontrollera att profilens sökvägar matchar leverantörens format.",
          });
        }
        const nyckel = await personnyckel(anspr.org, protokollVag[1]);
        let skrivna = 0;
        for (const [i, h] of handelser.entries()) {
          const { post, fel } = tillPost(
            { id: `prot-${Date.now()}-${i}`, handelse: h },
            anspr,
          );
          if (fel) continue;
          post.handelse = skyddaHändelse(post.handelse, nyckel.id, nyckel.nyckel);
          await pool.query(
            `insert into felsokning_handelser (id, arende_id, tidpunkt, anvandare, handelse)
             values ($1, $2, $3, $4, $5) on conflict (id) do nothing`,
            [post.id, protokollVag[1], post.tidpunkt, post.anvandare, post.handelse],
          );
          skrivna += 1;
        }
        return svara(res, 200, { handelser: skrivna, kalla });
      }

      // ---- Radering (dataskyddsförordningen art. 17) ------------------
      //
      // Krypto-shredding: nyckeln förstörs, loggen står kvar. Vad som
      // raderas är identifieringen — inte protokollet över vad som
      // kontrollerades, av vem och när. Det är den enda konstruktion där
      // bevisvärdet överlever en raderingsbegäran.
      if (req.method === "POST" && vag === "/api/radering") {
        if (anspr.roll !== "admin") return svara(res, 403, { error: "Kräver administratörsbehörighet." });
        const { subjekt, bekraftelse } = await lasKropp(req);
        if (typeof subjekt !== "string" || !subjekt.trim()) {
          return svara(res, 400, { error: "Ange vilket fordon eller vilken kund som avses." });
        }
        // Raderingen går inte att ångra. En bekräftelse som upprepar
        // subjektet gör det svårt att göra av misstag och lätt att göra
        // med avsikt.
        if (bekraftelse !== subjekt) {
          return svara(res, 400, { error: "Bekräftelsen måste upprepa subjektet exakt. Raderingen går inte att ångra." });
        }

        // Begäran gäller normalt ett fordon. Alla dess ärenden hittas via
        // det blindade indexet; ett enskilt ärende-id fungerar också.
        const arenden = await pool.query(
          `select id from felsokning_arenden
           where organisation_id = $1 and (identifierare_index = $2 or id = $3)`,
          [anspr.org, blindaIdentifierare(subjekt), subjekt],
        );
        const berorda = { rows: [{ antal: arenden.rowCount }] };
        const bort = await pool.query(
          `delete from personnycklar
           where organisation_id = $1 and subjekt = any($2::text[]) returning id`,
          [anspr.org, arenden.rows.map((r) => r.id)],
        );
        if (bort.rowCount === 0) {
          return svara(res, 404, { error: "Inget skyddat underlag finns för det subjektet." });
        }
        // Raderingen loggas — men loggen får inte själv bära uppgiften.
        await pool.query(
          `insert into raderingar (organisation_id, subjekt_hash, begard, begard_av, antal_arenden)
           values ($1, $2, now(), $3, $4)`,
          [anspr.org, innehallsHash(Buffer.from(subjekt)), anspr.namn, berorda.rows[0].antal],
        );
        logga("info", "radering verkställd", {
          spårId: res.spår.spårId,
          org: anspr.org,
          antalArenden: berorda.rows[0].antal,
        });
        return svara(res, 200, { ok: true, arenden: berorda.rows[0].antal, maskeras_som: MASKERAT });
      }

      if (req.method === "GET" && vag === "/api/radering") {
        if (anspr.roll !== "admin") return svara(res, 403, { error: "Kräver administratörsbehörighet." });
        const rader = await pool.query(
          `select subjekt_hash, begard, verkstalld, begard_av, antal_arenden
           from raderingar where organisation_id = $1 order by verkstalld desc limit 200`,
          [anspr.org],
        );
        return svara(res, 200, { raderingar: rader.rows });
      }

      // ---- Åtkomstlogg -----------------------------------------------
      if (req.method === "GET" && vag === "/api/atkomstlogg") {
        if (anspr.roll === "tekniker") return svara(res, 403, { error: "Kräver arbetsledare eller administratör." });
        const rader = await pool.query(
          `select l.tidpunkt, l.arende_id, l.vag, l.delningskod, a.namn as anvandare
           from atkomstlogg l left join anvandare a on a.id = l.anvandare_id
           where l.organisation_id = $1 order by l.tidpunkt desc limit 500`,
          [anspr.org],
        );
        return svara(res, 200, { atkomster: rader.rows });
      }

      // ---- Mätdon -----------------------------------------------------
      //
      // Ett mätvärde rankas som E4 — hög evidens. Utan kalibrerat
      // instrument är det inte lägre evidens utan ingen evidens alls
      // (QUALITET M-1). Registret gör påståendet kontrollerbart.
      if (vag === "/api/matdon") {
        if (req.method === "GET") {
          const rader = await pool.query(
            `select id, beteckning, serienummer, kalibrerad_till, aktiv,
                    (kalibrerad_till is not null and kalibrerad_till >= current_date) as giltig
             from matdon where organisation_id = $1 and aktiv order by beteckning`,
            [anspr.org],
          );
          return svara(res, 200, { matdon: rader.rows });
        }
        if (req.method === "POST") {
          if (anspr.roll === "tekniker") return svara(res, 403, { error: "Kräver arbetsledare eller administratör." });
          const { beteckning, serienummer, kalibrerad_till } = await lasKropp(req);
          if (typeof beteckning !== "string" || !beteckning.trim() || typeof serienummer !== "string" || !serienummer.trim()) {
            return svara(res, 400, { error: "Beteckning och serienummer krävs." });
          }
          if (kalibrerad_till && Number.isNaN(Date.parse(kalibrerad_till))) {
            return svara(res, 400, { error: "Kalibreringsdatum är ogiltigt." });
          }
          const rad = await pool.query(
            `insert into matdon (organisation_id, beteckning, serienummer, kalibrerad_till)
             values ($1, $2, $3, $4)
             on conflict (organisation_id, serienummer)
               do update set beteckning = excluded.beteckning,
                             kalibrerad_till = excluded.kalibrerad_till,
                             aktiv = true
             returning id`,
            [anspr.org, beteckning.trim(), serienummer.trim(), kalibrerad_till || null],
          );
          return svara(res, 200, { id: rad.rows[0].id });
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
          const nycklar = await nycklarFor(anspr.org);
          loggaAtkomst(req, res, { org: anspr.org, anvandare: anspr.sub, arende: handelserVag[1] });
          return svara(res, 200, {
            handelser: rader.rows.map((r) => ({ ...r, handelse: öppnaHändelse(r.handelse, nycklar) })),
          });
        }
        if (req.method === "POST") {
          const { handelser } = await lasKropp(req);
          if (!Array.isArray(handelser) || handelser.length > 500) {
            return svara(res, 400, { error: "Ogiltig händelselista." });
          }
          res.spann.spår.antalHandelser = handelser.length;

          // Härkomst och form avgörs här, inte av anroparen. Se
          // services/gemensam/handelser.mjs och QUALITET C-1/M-3.
          // Identifierande fält krypteras med en nyckel per fordon.
          // Radering sker sedan genom att nyckeln förstörs — loggen
          // förblir intakt, identifieringen försvinner (QUALITET C-3).
          const nyckel = await personnyckel(anspr.org, handelserVag[1]);
          const attSkriva = [];
          for (const post of handelser) {
            const { post: giltig, fel } = tillPost(post, anspr);
            if (fel) return svara(res, 400, { error: `Ogiltig händelse: ${fel}` });
            giltig.handelse = skyddaHändelse(giltig.handelse, nyckel.id, nyckel.nyckel);
            attSkriva.push(giltig);
          }

          // Avslut passerar kvalitetsgrinden på servern. Grinden fanns
          // tidigare bara i webbläsaren, vilket gjorde hela ECM till ett
          // råd i stället för en spärr (QUALITET C-2).
          if (attSkriva.some((p) => p.handelse.typ === "arende_avslutat")) {
            const hinder = await grindHinder(pool, handelserVag[1], attSkriva);
            if (hinder.length > 0) {
              return svara(res, 409, {
                error: "Ärendet kan inte avslutas — kvalitetsgrinden är inte passerad.",
                hinder,
              });
            }
          }

          // Gallringsdatum sätts vid avslut utifrån ärendetypen.
          // Retention är ett juridiskt ställningstagande, inte en teknisk
          // detalj: ett garantiärende måste kunna visas upp under hela
          // garantitiden, ett kontantärende inte (QUALITET C-3). Ett
          // ärende utan datum gallras aldrig automatiskt — det försiktiga
          // utfallet, eftersom för tidig gallring inte går att ångra.
          const avslut = attSkriva.find((p) => p.handelse.typ === "arende_avslutat");
          if (avslut) {
            const typrad = await pool.query(
              `select handelse->>'arendetyp' as typ from felsokning_handelser
               where arende_id = $1 and handelse->>'typ' = 'arendetyp_satt'
               order by tidpunkt desc limit 1`,
              [handelserVag[1]],
            );
            await pool.query(`update felsokning_arenden set gallras_efter = $2 where id = $1`, [
              handelserVag[1],
              gallringsdatum(typrad.rows[0]?.typ, avslut.tidpunkt),
            ]);
          }

          // Blindat index över fordonet, så en raderingsbegäran kan nå
          // hela historiken utan att identifieraren lagras i klartext.
          const objekt = attSkriva.find((p) => p.handelse.typ === "objekt_identifierat");
          if (objekt) {
            const ident = handelser.find((h) => h?.handelse?.typ === "objekt_identifierat")?.handelse?.objekt
              ?.identifierare;
            if (ident) {
              await pool.query(`update felsokning_arenden set identifierare_index = $2 where id = $1`, [
                handelserVag[1],
                blindaIdentifierare(ident),
              ]);
            }
          }

          for (const p of attSkriva) {
            // Append-only: on conflict do nothing — en befintlig händelse
            // skrivs aldrig över, och databastriggern stoppar allt annat.
            // Kollisionen räknas: ett id som redan finns är antingen en
            // ofarlig omsändning eller ett försök att blockera en framtida
            // post, och skillnaden syns bara om den mäts (QUALITET m-2).
            const skrivet = await pool.query(
              `insert into felsokning_handelser (id, arende_id, tidpunkt, anvandare, handelse)
               values ($1, $2, $3, $4, $5) on conflict (id) do nothing`,
              [p.id, handelserVag[1], p.tidpunkt, p.anvandare, p.handelse],
            );
            if (skrivet.rowCount === 0) res.spann.spår.kollisioner = (res.spann.spår.kollisioner ?? 0) + 1;
          }
          // Utgående integrationer underrättas efter att loggen skrivits,
          // aldrig före: en mottagare ska aldrig kunna se en händelse som
          // inte finns i loggen.
          for (const p of attSkriva) {
            if (p.handelse.typ === "arende_avslutat") {
              leverera(anspr.org, "arende.avslutat", { arende: handelserVag[1] });
            }
            if (p.handelse.typ === "slutsats") {
              leverera(anspr.org, "arende.slutsats", { arende: handelserVag[1] });
            }
            if (p.handelse.typ === "foto" || p.handelse.typ === "video") {
              leverera(anspr.org, "media.tillagt", { arende: handelserVag[1], typ: p.handelse.typ });
            }
          }
          return svara(res, 200, { ok: true });
        }
      }

      return svara(res, 404, { error: "Okänd resurs." });
    } catch (fel) {
      // Spår-id:t i raden gör att hela kedjan går att hitta i Logs
      // Insights utifrån larmet.
      logga("fel", "förfrågan misslyckades", {
        spårId: res.spår.spårId,
        väg: vag,
        metod: req.method,
        orsak: fel?.message ?? String(fel),
      });
      return svara(res, 500, { error: "Förfrågan misslyckades." });
    }
  });
}

if (process.env.NODE_ENV !== "test") {
  skapaServer().listen(PORT, () => {
    console.log(`plattform lyssnar på :${PORT}`);
  });
}
