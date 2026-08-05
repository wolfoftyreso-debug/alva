// ALVA-SPEC-020 · Integration interface.
//
// Verkstaden har redan system: ett DMS, ett diagnosinstrument som
// producerar protokoll, ett videooffertsystem. ALVA ska koppla in sig i
// dem — inte ersätta dem, och inte kräva att de anpassar sig.
//
// ---- Vad jag INTE bygger ---------------------------------------------
//
// Färdiga klienter mot namngivna leverantörer. Jag känner inte Beonodes
// eller ServiceCams faktiska API:er, och en uppfunnen endpoint som ser
// färdig ut är sämre än en tom: den ser ut att fungera tills någon
// försöker, och då är felet dyrare att hitta.
//
// I stället: ett stabilt gränssnitt med PROFILER. En profil beskriver
// vad en kategori av system förväntar sig — fältnamn, format, riktning —
// och valideras mot leverantören innan den märks som `validated`. Tills
// dess står den som `draft`, och det syns i gränssnittet.
//
// Det är samma princip som Knowledge Sources: leverantören är data.
//
// ---- Riktningar --------------------------------------------------------
//
//   IN   Diagnosprotokoll, arbetsorder, fordonsdata. Blir händelser i
//        loggen med källa och tidsstämpel bevarade.
//   UT   Ärendet, rapporten, slutsatsen, mediet. Levereras som webhook
//        eller hämtas via API.
//
// Riktningen är inte symmetrisk. Inkommande data blir evidens och måste
// därför bära sin härkomst hela vägen; utgående data är en projektion
// och kan formas fritt.

/** Kategorier av system. Namnen är generiska med avsikt. */
export const KATEGORIER = {
  diagnosprotokoll: {
    namn: "Diagnostic protocol",
    riktning: "in",
    beskrivning: "Fault codes, live data and readouts from a diagnostic instrument.",
    // Vad ALVA gör av det: varje avläsning blir evidens, inte en bilaga.
    blir: ["matvarde", "observation", "foto"],
  },
  dms: {
    namn: "Dealer management system",
    riktning: "bada",
    beskrivning: "Work orders in, completed cases and time records out.",
    blir: ["arbetsorder_skannad", "objekt_identifierat"],
  },
  videooffert: {
    namn: "Video quotation",
    riktning: "bada",
    beskrivning: "Video evidence in, the case record and closing statement out.",
    blir: ["video", "foto"],
  },
  fordonsdata: {
    namn: "Vehicle data",
    riktning: "in",
    beskrivning: "Identification, equipment level, service campaigns.",
    blir: ["objekt_identifierat"],
  },
  garanti: {
    namn: "Warranty administration",
    riktning: "ut",
    beskrivning: "Claim substantiation: evidence chain, closing statement, traceability package.",
    blir: [],
  },
  forsakring: {
    namn: "Insurance assessment",
    riktning: "ut",
    beskrivning: "Assessor-facing record: what was checked, what was ruled out, and why.",
    blir: [],
  },
  skadekalkyl: {
    namn: "Damage calculation",
    riktning: "bada",
    beskrivning:
      "Damage estimation systems used between workshops and insurers — CABAS is the Nordic standard. " +
      "In: damage assessment and vehicle identification. Out: the diagnostic record substantiating that " +
      "the damage was investigated rather than assumed.",
    blir: ["objekt_identifierat", "observation", "foto"],
    // Det ALVA tillför en skadekalkyl är inte fler poster utan
    // beviskedjan bakom dem: vad som kontrollerades, vad som uteslöts
    // och varför. Det är den enda del av kalkylen som i dag inte går
    // att granska i efterhand.
    tillfor: ["slutsats", "felorsak", "reproducering"],
  },
};

/**
 * Profilens mognad. Samma resonemang som konnektorernas livscykel:
 * "det finns kod" är inte samma sak som "det fungerar mot leverantören".
 */
export const MOGNAD = ["draft", "tested", "validated"];

/**
 * Utgående händelser. En integration prenumererar på det den behöver —
 * ett videooffertsystem bryr sig inte om varje mätvärde.
 */
export const UTGAENDE = {
  "arende.skapat": "A case was opened.",
  "arende.fas": "The case entered a new ALVA phase.",
  "arende.slutsats": "A closing statement was recorded.",
  "arende.avslutat": "The case was closed and passed the quality gate.",
  "media.tillagt": "Photo or video evidence was added.",
  "atgardsforslag.lamnat": "A repair proposal was issued to the customer.",
  "kundbeslut.registrerat": "The customer's decision was recorded.",
};

/**
 * Signerar en utgående leverans.
 *
 * HMAC över tidsstämpel och kropp, i det format nästan alla
 * webhook-mottagare redan förstår. Tidsstämpeln ingår i signaturen så
 * att en avlyssnad leverans inte går att spela upp igen.
 */
export function signeraLeverans(kropp, hemlighet, tidsstampel, hmac) {
  const underlag = `${tidsstampel}.${kropp}`;
  return `t=${tidsstampel},v1=${hmac("sha256", hemlighet).update(underlag).digest("hex")}`;
}

/**
 * Verifierar en inkommande leverans från oss.
 *
 * Exponerad så att mottagaren kan använda exakt samma kod som avsändaren
 * — de flesta integrationsfel uppstår i glappet mellan två
 * implementationer av samma signatur.
 */
export function verifieraLeverans(kropp, huvud, hemlighet, hmac, timingSafeEqual, nu = Date.now()) {
  const delar = Object.fromEntries(
    String(huvud ?? "")
      .split(",")
      .map((d) => d.split("=")),
  );
  if (!delar.t || !delar.v1) return { ok: false, orsak: "Malformed signature header." };
  // Fem minuter. Nog för klockglapp, kort nog att en fångad leverans
  // inte går att spela upp i morgon.
  if (Math.abs(nu - Number(delar.t) * 1000) > 300_000) return { ok: false, orsak: "Timestamp outside tolerance." };

  const väntad = hmac("sha256", hemlighet).update(`${delar.t}.${kropp}`).digest("hex");
  const a = Buffer.from(delar.v1);
  const b = Buffer.from(väntad);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return { ok: false, orsak: "Signature mismatch." };
  return { ok: true };
}

/**
 * Normaliserar ett inkommande diagnosprotokoll till händelser.
 *
 * Profilen beskriver var värdena ligger i leverantörens format; den här
 * funktionen gör dem till evidens. Härkomsten bevaras i varje händelse —
 * ett värde som kommit utifrån får aldrig se ut som något teknikern
 * själv mätt.
 */
export function protokollTillHandelser(protokoll, profil, kalla) {
  const ut = [];
  const plocka = (objekt, vag) => String(vag ?? "").split(".").reduce((o, n) => o?.[n], objekt);

  for (const kod of plocka(protokoll, profil?.felkoder?.vag) ?? []) {
    ut.push({
      typ: "observation",
      text: `${plocka(kod, profil.felkoder.kod) ?? "?"} — ${plocka(kod, profil.felkoder.text) ?? "utan beskrivning"}`,
      kalla,
    });
  }

  for (const värde of plocka(protokoll, profil?.matvarden?.vag) ?? []) {
    ut.push({
      typ: "matvarde",
      beskrivning: String(plocka(värde, profil.matvarden.beskrivning) ?? "Avläst värde"),
      varde: String(plocka(värde, profil.matvarden.varde) ?? ""),
      enhet: plocka(värde, profil.matvarden.enhet) ?? undefined,
      // Instrumentets identitet följer med när leverantören lämnar den.
      // Utan den nedgraderas värdet till E1 — ett avläst tal utan känt
      // instrument är inte en spårbar mätning (QUALITY-AUDIT M-1).
      matdonId: plocka(värde, profil.matvarden.instrumentId) ?? undefined,
      matdonBeteckning: plocka(värde, profil.matvarden.instrument) ?? undefined,
      kalla,
    });
  }

  return ut.filter((h) => h.typ !== "matvarde" || h.varde !== "");
}
