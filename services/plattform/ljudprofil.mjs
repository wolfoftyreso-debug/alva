// Ljudreferensprofiler (ALVA-DOC-0012, lyft 5).
//
// Mekanismen kommer ur serverkopians ljudtjänst: en profil per fordon
// och mätsekvens med medel och spridning per akustiskt särdrag, och en
// z-jämförelse mot profilen. Tre saker är andra här:
//
//   1. Ramverkslöst och delat: samma rena funktioner körs i klient och
//      server. Ingen Express, ingen SQLite, ingen ML-låda.
//   2. Servern jämför SÄRDRAG, aldrig ljud. Klienten räknar spektrumet
//      lokalt (ljuddiagnos.ts) och skickar en handfull tal — ingen
//      uppladdningsinfrastruktur, inga ljudfiler på servern.
//   3. Inga påhittade referenser. Kopians "tränade profiler" för
//      namngivna bilmodeller var syntetiska (identiska toppvärden,
//      inspelningar som aldrig gjorts). Här byggs en profil enbart av
//      organisationens egna, dokumenterade inspelningar — och under
//      MINSTA_INSPELNINGAR är den ingen referens alls.
//
// Spridningen uppdateras med Welfords metod: numeriskt stabil, en
// inspelning i taget, utan att råvärdena behöver sparas.

/** Under tre inspelningar är "referensen" en anekdot. Gränsen är hård. */
export const MINSTA_INSPELNINGAR = 3;

/** |z| över tröskeln räknas som avvikande särdrag. */
export const Z_AVVIKANDE = 2.5;

/** Bedömningen blir "avvikande" när snittet eller maxvärdet passerar. */
export const Z_SNITTGRANS = 2.0;
export const Z_MAXGRANS = 3.5;

export function nyProfil() {
  return { antal: 0, medel: {}, m2: {} };
}

/**
 * Lägger en inspelnings särdrag till profilen. Returnerar en NY profil
 * — den gamla röres inte, av samma skäl som händelseloggen är
 * append-only: det som legat till grund för en jämförelse ska gå att
 * peka på i efterhand.
 */
export function uppdateraProfil(profil, sardrag) {
  const antal = profil.antal + 1;
  const medel = { ...profil.medel };
  const m2 = { ...profil.m2 };
  for (const [nyckel, varde] of Object.entries(sardrag)) {
    if (typeof varde !== "number" || !Number.isFinite(varde)) continue;
    const forra = medel[nyckel] ?? 0;
    const delta = varde - forra;
    medel[nyckel] = forra + delta / antal;
    m2[nyckel] = (m2[nyckel] ?? 0) + delta * (varde - medel[nyckel]);
  }
  return { antal, medel, m2 };
}

/** Stickprovsstandardavvikelse för ett särdrag; 0 tills två värden finns. */
export function spridning(profil, nyckel) {
  if (profil.antal < 2) return 0;
  return Math.sqrt((profil.m2[nyckel] ?? 0) / (profil.antal - 1));
}

/**
 * Jämför en inspelnings särdrag mot profilen.
 *
 * Svaret säger alltid vad det vilar på: antalet inspelningar i
 * referensen och vilka särdrag som avviker. En obrukbar referens ger
 * `anvandbar: false` med orsak — aldrig en gissning klädd som svar.
 */
export function jamforMotProfil(profil, sardrag) {
  if (!profil || profil.antal < MINSTA_INSPELNINGAR) {
    return {
      anvandbar: false,
      orsak: `The reference holds ${profil?.antal ?? 0} recording(s) — at least ${MINSTA_INSPELNINGAR} are required before it says anything.`,
    };
  }
  const z = {};
  const avvikande = [];
  let summa = 0;
  let max = 0;
  let antal = 0;
  for (const [nyckel, referensMedel] of Object.entries(profil.medel)) {
    const varde = sardrag[nyckel];
    if (typeof varde !== "number" || !Number.isFinite(varde)) continue;
    // Spridningsgolv: en referens där alla inspelningar råkar vara
    // nästan identiska ska inte döma ut normala variationer.
    const s = Math.max(spridning(profil, nyckel), Math.abs(referensMedel) * 0.05, 1e-9);
    const varden = Math.abs(varde - referensMedel) / s;
    z[nyckel] = Number(varden.toFixed(2));
    summa += varden;
    max = Math.max(max, varden);
    antal++;
    if (varden > Z_AVVIKANDE) avvikande.push(nyckel);
  }
  if (antal === 0) return { anvandbar: false, orsak: "No comparable features in the recording." };
  const snitt = summa / antal;
  return {
    anvandbar: true,
    antalIReferens: profil.antal,
    z,
    snittZ: Number(snitt.toFixed(2)),
    maxZ: Number(max.toFixed(2)),
    avvikande,
    bedomning: snitt > Z_SNITTGRANS || max > Z_MAXGRANS ? "avvikande" : "inom_referens",
  };
}

/**
 * Fordonsnyckeln normaliseras så att "Volvo XC60" och "volvo xc60 "
 * är samma referens. Nyckeln är beskrivande text — registreringsnummer
 * hör inte hemma här, profiler är per fordonstyp, inte per individ.
 */
export function fordonsnyckel(text) {
  return String(text ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}
