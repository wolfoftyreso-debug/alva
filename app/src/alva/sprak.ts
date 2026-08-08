// ALVA:s statusspråk.
//
// Tonen är varken mänsklig, trevlig eller otrevlig. Den är professionell,
// och det betyder något specifikt: systemet rapporterar tillstånd, det
// tilltalar inte användaren.
//
//   Inte "Nu ska vi felsöka bilen."   utan  "Diagnostic procedure initiated."
//   Inte "Testet lyckades."           utan  "Verification passed."
//   Inte "Det verkar som..."          utan  "Evidence indicates..."
//   Inte "Jag tror..."                utan  "Confidence level: 92%"
//
// Det sista paret är det viktigaste. "Jag tror" är en person som gissar.
// "Confidence level" är ett mätvärde som går att ifrågasätta, jämföra och
// dokumentera. Skillnaden är hela produktens existensberättigande.
//
// Katalogen är uttömmande med avsikt. Ett statusmeddelande som skrivs
// på plats i en komponent blir förr eller senare "Bra jobbat!" — därför
// finns bara det som står här, och ett test låser listan.

export type Status =
  | "pending"
  | "in_progress"
  | "complete"
  | "passed"
  | "failed"
  | "blocked"
  | "incomplete"
  | "not_applicable";

/**
 * Statusord. Versaler i gränssnittet; formen här är kanonisk och
 * översätts inte — se språkgränsen i system.ts.
 */
export const STATUS: Record<Status, string> = {
  pending: "PENDING",
  in_progress: "IN PROGRESS",
  complete: "COMPLETE",
  passed: "PASSED",
  failed: "FAILED",
  blocked: "BLOCKED",
  incomplete: "INCOMPLETE",
  not_applicable: "NOT APPLICABLE",
};

/**
 * Systemmeddelanden. Varje rad är ett konstaterande i presens eller
 * perfekt — aldrig en uppmaning med utropstecken, aldrig ett omdöme om
 * användarens arbete.
 */
export const MEDDELANDE = {
  procedur_startad: "Diagnostic procedure initiated.",
  procedur_avslutad: "Diagnostic procedure closed.",
  analys_klar: "Analysis complete.",
  lokalisering_klar: "Localization complete.",
  orsak_faststalld: "Root cause identified.",
  verifiering_godkand: "Verification passed.",
  verifiering_underkand: "Verification failed.",
  atgard_registrerad: "Corrective action recorded.",

  fortsatt_verifiering: "Proceed to verification.",
  fortsatt_atgard: "Proceed to corrective action.",

  underlag_saknas: "Inspection incomplete. Additional evidence required.",
  evidens_saknas: "Evidence not available.",
  matdon_ej_sparbart: "Measurement not traceable. Instrument identity required.",
  sparr_aktiv: "Procedure halted. Safety precondition not met.",
  grind_ej_passerad: "Closure blocked. Mandatory records incomplete.",

  kalla_ansluten: "Knowledge source connected.",
  kalla_ej_ansluten: "Knowledge source unavailable.",
  ingen_kalla: "No authorized knowledge source configured.",
} as const;

/**
 * Bedömning uttrycks som ett tal, aldrig som en åsikt.
 * `Evidence indicates ...` följt av `Confidence level: 92%`.
 */
export const bedomning = (påstående: string, konfidens: number): string =>
  `Evidence indicates ${påstående}. Confidence level: ${Math.round(konfidens * 100)}%.`;

/** Ord som aldrig får förekomma i produktens egen text. */
export const FORBJUDNA_ORD = [
  "amazing",
  "smart",
  "magic",
  "magisk",
  "revolutionary",
  "revolutionerande",
  "fantastisk",
  "grymt",
  "välkommen",
  "welcome",
  "bra jobbat",
  "well done",
  "oops",
  "hoppsan",
];

/** Ord som beskriver produkten. Om ett annat behövs saknas något. */
export const GODKANDA_ORD = [
  "verified",
  "repeatable",
  "traceable",
  "documented",
  "validated",
  "standardized",
  "operational",
  "engineering",
];
