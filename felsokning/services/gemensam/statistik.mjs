// ALVA-REP-0100 · Operational metrics.
//
// Vilka siffror som visas avgör vad organisationen optimerar. Det är
// därför det här är ett produktbeslut och inte ett rapportjobb.
//
// Uteslutna med avsikt:
//
//   Ärenden per tekniker      Belönar snabbhet över noggrannhet. Den som
//                             hoppar över kontroller vinner.
//   Genomsnittlig ledtid      Samma sak, en gång till. Ett svårt fel
//                             SKA ta längre tid.
//   Inloggningar, aktivitet   Mäter användning, inte nytta.
//
// Medtagna, och varför var och en är handlingsbar:
//
//   VERIFIERINGSGRAD    Andel avslut med fastställd orsak. Sjunker den
//                       gissar organisationen mer. Det här är det enda
//                       måttet ett försäkringsbolag egentligen bryr sig
//                       om.
//   REPRODUKTIONSGRAD   Andel symptom som återskapats. Låg siffra
//                       förutsäger återkommande fordon — man kan inte
//                       åtgärda det man inte sett.
//   OMARBETNING         Samma fordon tillbaka med samma orsakskategori.
//                       Det dyraste felet i en verkstad, och det enda
//                       ingen mäter.
//   UNDANTAGSFREKVENS   Vilka kontroller hoppas över, per steg. Ett
//                       steg med hög frekvens är antingen fel skrivet
//                       eller kräver utrustning som saknas — bägge är
//                       åtgärdbara, ingetdera syns i dag.
//   EVIDENSPROFIL       Fördelning E0–E6. Visar om underlaget vilar på
//                       mätningar eller på observationer.
//   FASFÖRDELNING       Var tiden går i ALVA-termer.
//
// Alla funktioner är rena över (ärenden). Ingen databasåtkomst, ingen
// klocka — samma underlag ger samma siffra, vilket är förutsättningen
// för att en kvartalsrapport ska gå att granska i efterhand.

import { fasFor } from "./faser.mjs";

const handelserI = (arende) => (arende.handelser ?? []).map((p) => p.handelse ?? p);
const av = (handelser, typ) => handelser.filter((h) => h?.typ === typ);
const arAvslutat = (arende) => handelserI(arende).some((h) => h?.typ === "arende_avslutat");

/** Andel med en decimal, eller null när underlaget saknas. */
function andel(traffar, av_) {
  return av_ === 0 ? null : Math.round((traffar / av_) * 1000) / 10;
}

/**
 * Verifieringsgrad — andel avslutade ärenden där orsaken fastställdes.
 *
 * Att den inte är 100 % är friskt. En organisation som aldrig skriver
 * "orsaken kunde inte fastställas" ljuger antingen, eller får bara enkla
 * fel. Talet är intressant över tid, inte som absolut nivå.
 */
export function verifieringsgrad(arenden) {
  const avslutade = arenden.filter(arAvslutat);
  const fastställda = avslutade.filter((a) => {
    const s = av(handelserI(a), "slutsats").at(-1);
    return s && s.orsakFastställd !== false;
  });
  return { antal: avslutade.length, fastställda: fastställda.length, andel: andel(fastställda.length, avslutade.length) };
}

/** Reproduktionsgrad — andel ärenden där symptomet faktiskt återskapades. */
export function reproduktionsgrad(arenden) {
  const medSvar = arenden.filter((a) => av(handelserI(a), "reproducering").length > 0);
  const fördelning = { ja: 0, delvis: 0, nej: 0 };
  for (const a of medSvar) {
    const r = av(handelserI(a), "reproducering").at(-1);
    if (r?.status in fördelning) fördelning[r.status] += 1;
  }
  return { antal: medSvar.length, ...fördelning, andel: andel(fördelning.ja, medSvar.length) };
}

/**
 * Omarbetning — samma fordon tillbaka med samma orsakskategori.
 *
 * Det dyraste felet i en verkstad och det enda ingen mäter, eftersom det
 * kräver att man kopplar ihop två ärenden som ser fristående ut. Här är
 * kopplingen gratis: loggen bär fordonets identifierare och orsakens
 * kategori.
 *
 * @param inomDagar fönster; 90 dagar är en rimlig utgångspunkt men
 *                  varje verkstad har sin egen uppfattning.
 */
export function omarbetning(arenden, inomDagar = 90) {
  const perFordon = new Map();
  for (const a of arenden) {
    if (!arAvslutat(a)) continue;
    const ident = av(handelserI(a), "objekt_identifierat").at(-1)?.objekt?.identifierare;
    if (!ident) continue;
    const orsak = av(handelserI(a), "felorsak").at(-1);
    const avslut = (a.handelser ?? []).find((p) => (p.handelse ?? p)?.typ === "arende_avslutat")?.tidpunkt;
    if (!orsak || !avslut) continue;
    if (!perFordon.has(ident)) perFordon.set(ident, []);
    perFordon.get(ident).push({ tid: Date.parse(avslut), kategorier: orsak.orsaker ?? [], arende: a.id });
  }

  const fall = [];
  const fönster = inomDagar * 86400000;
  for (const [ident, poster] of perFordon) {
    poster.sort((a, b) => a.tid - b.tid);
    for (let i = 1; i < poster.length; i += 1) {
      const föregående = poster[i - 1];
      const nu = poster[i];
      const delad = nu.kategorier.filter((k) => föregående.kategorier.includes(k));
      if (delad.length > 0 && nu.tid - föregående.tid <= fönster) {
        fall.push({ identifierare: ident, kategorier: delad, dagar: Math.round((nu.tid - föregående.tid) / 86400000) });
      }
    }
  }
  const avslutade = arenden.filter(arAvslutat).length;
  return { antal: fall.length, andel: andel(fall.length, avslutade), fall: fall.slice(0, 20) };
}

/**
 * Undantagsfrekvens per metodiksteg.
 *
 * Ett steg som ofta hoppas över är antingen felskrivet eller kräver
 * utrustning verkstaden inte har. Bägge går att åtgärda — men bara om
 * man vet vilket steg det gäller, vilket ingen gör i dag.
 */
export function undantagsfrekvens(arenden) {
  const per = new Map();
  for (const a of arenden) {
    for (const h of av(handelserI(a), "kontroll_utford")) {
      const nyckel = `${h.stegId}/${h.kontrollId}`;
      if (!per.has(nyckel)) per.set(nyckel, { steg: h.stegId, kontroll: h.kontrollId, text: h.text, utforda: 0, undantag: 0 });
      const rad = per.get(nyckel);
      rad.utforda += 1;
      if ((h.undantag ?? "").trim()) rad.undantag += 1;
    }
  }
  return [...per.values()]
    .map((r) => ({ ...r, fas: fasFor(r.steg), andel: andel(r.undantag, r.utforda) }))
    .filter((r) => r.undantag > 0)
    .sort((a, b) => b.andel - a.andel || b.undantag - a.undantag);
}

/** Evidensprofil — fördelning av starkaste evidenstyp per ärende. */
export function evidensprofil(arenden) {
  const nivå = { E0: 0, E1: 0, E2: 0, E3: 0, E4: 0, E5: 0, E6: 0 };
  for (const a of arenden) {
    const h = handelserI(a);
    const har = {
      E5: av(h, "arbetsorder_skannad").length > 0,
      // Ett mätvärde räknas som E4 bara med spårbart mätdon; utan det är
      // det teknikerns observation av en siffra (QUALITY-AUDIT M-1).
      E4: av(h, "matvarde").some((m) => m.matdonId),
      E3: av(h, "video").length > 0,
      E2: av(h, "foto").length > 0,
      E1: av(h, "observation").length + av(h, "kontroll_utford").length > 0,
    };
    const källor = ["E2", "E3", "E4", "E5"].filter((n) => har[n]).length;
    const högsta = källor >= 2 ? "E6" : (["E5", "E4", "E3", "E2", "E1"].find((n) => har[n]) ?? "E0");
    nivå[högsta] += 1;
  }
  return nivå;
}

/** Fasfördelning — var tiden går, i ALVA-termer. */
export function fasfordelning(arenden) {
  const per = { analysis: 0, localization: 0, verification: 0, action: 0 };
  for (const a of arenden) {
    for (const h of handelserI(a)) {
      if (h?.stegId) per[fasFor(h.stegId)] += 1;
    }
  }
  const summa = Object.values(per).reduce((s, v) => s + v, 0);
  return Object.fromEntries(
    Object.entries(per).map(([fas, antal]) => [fas, { antal, andel: andel(antal, summa) }]),
  );
}

/** Orsakskategorier över flottan. */
export function orsakskategorier(arenden) {
  const per = new Map();
  for (const a of arenden) {
    for (const h of av(handelserI(a), "felorsak")) {
      for (const k of h.orsaker ?? []) per.set(k, (per.get(k) ?? 0) + 1);
    }
  }
  return [...per.entries()]
    .map(([kategori, antal]) => ({ kategori, antal }))
    .sort((a, b) => b.antal - a.antal);
}

/**
 * Hela underlaget för portalens analysvy och kvartalsrapporten.
 *
 * En enda funktion, så att skärmen och rapporten aldrig kan visa olika
 * siffror för samma period — det är den vanligaste orsaken till att
 * ingen litar på rapporten.
 */
export function oversikt(arenden, { omarbetningsfonster = 90 } = {}) {
  return {
    version: "ALVA-REP-0100",
    antal: { totalt: arenden.length, avslutade: arenden.filter(arAvslutat).length },
    verifiering: verifieringsgrad(arenden),
    reproduktion: reproduktionsgrad(arenden),
    omarbetning: omarbetning(arenden, omarbetningsfonster),
    undantag: undantagsfrekvens(arenden).slice(0, 10),
    evidens: evidensprofil(arenden),
    faser: fasfordelning(arenden),
    orsaker: orsakskategorier(arenden).slice(0, 12),
  };
}
