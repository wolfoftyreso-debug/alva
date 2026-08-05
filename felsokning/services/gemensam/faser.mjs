// ALVA-modellen tillämpad på metodikbiblioteket.
//
// ALVA är en metod, inte ett gränssnitt. Om metoden bara fanns i
// marknadsföringen vore den en etikett på en wizard. Här är den den
// struktur som varje procedur faktiskt följer:
//
//   A  Analysis      Samla fakta. Inte hypoteser.
//   L  Localization  Avgränsa. Identifiera exakt område.
//   V  Verification  Verifiera orsaken. Inte symptomet.
//   A  Action        Utför korrigering. Verifiera resultat. Dokumentera.
//
// Varje steg i varje metodik hör till exakt en fas. Klassificeringen är
// data och inte en gissning i vyn, av två skäl: den ska gå att granska,
// och en procedur vars faser inte går ihop ska falla i test i stället
// för att se rätt ut på skärmen.
//
// ---- Varför just den här indelningen ---------------------------------
//
// Gränsen mellan L och V är den enda som är svår, och den är också den
// som bär hela metoden. Att mäta spänning vid en komponent är
// lokalisering — den avgränsar var felet finns. Att mäta spänningsfall
// över samma komponent under last är verifiering — den fastställer
// varför. Samma instrument, samma komponent, olika fas.
//
// Regeln vi tillämpar: ett steg är Verification när det kan avfärda en
// kandidatorsak. Kan det bara flytta uppmärksamheten är det Localization.

/** Steg-id → fas. Uttömmande; ett okänt steg-id faller i test. */
export const STEGFAS = {
  // ---- Analysis: vad hände, när, var. Inga slutsatser. ----------------
  sakerhet: "analysis", // Förutsättningen för att få samla fakta alls.
  symptom: "analysis",
  forutsattningar: "analysis",
  grund: "analysis",

  // ---- Localization: avgränsa området ---------------------------------
  visuell: "localization",
  felkoder: "localization",
  avlasning: "localization",
  koder: "localization",
  buss: "localization",
  inspelning: "localization",
  lokalisering: "localization",
  batteri: "localization",
  glapp: "localization",
  metod: "localization",

  // ---- Verification: fastställ orsaken --------------------------------
  matningar: "verification",
  kontroller: "verification",
  grundkontroller: "verification",
  rela: "verification",
  start: "verification",
  laddning: "verification",
  krypstrom: "verification",
  mekanik: "verification",
  tandning_bransle: "verification",
  packning: "verification",
  system: "verification",
  styrning: "verification",
  orsak: "verification",
  installning: "verification",

  // ---- Action: korrigera och verifiera resultatet ---------------------
  provkorning: "action",
  funktionstest: "action",
  kalibrering: "action",
};

export const FASORDNING = ["analysis", "localization", "verification", "action"];

/** Fasen för ett steg. Okänt steg → analysis, och testet faller. */
export const fasFor = (stegId) => STEGFAS[stegId] ?? "analysis";

/**
 * Faserna en metodik faktiskt innehåller, i ALVA-ordning.
 *
 * Alla metodiker innehåller inte alla fyra. En läckagemetodik som slutar
 * med lokalisering är inte ofullständig — läckan är hittad, åtgärden är
 * ett annat arbete. Att tvinga in ett Action-steg där hade varit att
 * fylla ut modellen i stället för att tillämpa den.
 */
export function faserI(metodik) {
  const funna = new Set((metodik?.steg ?? []).map((s) => fasFor(s.id)));
  return FASORDNING.filter((f) => funna.has(f));
}

/**
 * Klara faser givet loggen: en fas är klar när metodikens samtliga steg i
 * den fasen är dokumenterade.
 */
export function klaraFaser(metodik, handelser) {
  const besvarade = new Set();
  const utforda = new Set();
  for (const h of handelser) {
    if (h?.typ === "fraga_besvarad") besvarade.add(`${h.stegId}/${h.frageId}`);
    if (h?.typ === "kontroll_utford") utforda.add(`${h.stegId}/${h.kontrollId}`);
  }
  const klar = (steg) =>
    (steg.fragor ?? []).every((f) => besvarade.has(`${steg.id}/${f.id}`)) &&
    (steg.kontroller ?? []).every((k) => utforda.has(`${steg.id}/${k.id}`));

  return faserI(metodik).filter((fas) =>
    (metodik.steg ?? []).filter((s) => fasFor(s.id) === fas).every(klar),
  );
}
