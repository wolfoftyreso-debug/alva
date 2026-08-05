// ALVA — Analysis · Localization · Verification · Action
//
// ALVA är inte en assistent. ALVA är en metod.
//
// Skillnaden är inte kosmetisk och den är kodad här. Man säger inte
// "fråga ALVA" utan "följ ALVA", på samma sätt som man säger ISO 9001
// eller Six Sigma. Systemet hjälper inte till — det tillämpar en
// definierad metod för att stegvis eliminera osäkerhet.
//
// ---- Språkgränsen -----------------------------------------------------
//
// En avgränsning som styr hela produkten och som är värd att slå fast:
//
//   ALVA:s STRUKTUR är engelsk och oföränderlig. Fasnamn, statusord,
//   dokumenttyper och identifierare skrivs likadant i varje land och
//   varje översättning — precis som DIN 2014 heter DIN 2014 på svenska,
//   och ett ISO-krav inte översätts till "internationell standard 9001".
//
//   ALVA:s INNEHÅLL är på arbetsspråket. Frågan som ställs till
//   teknikern, kontrollpunktens text och teknikerns egna anteckningar är
//   svenska i en svensk verkstad och tyska i en tysk.
//
// Alternativet — att översätta VERIFICATION till "Verifiering" i den
// svenska versionen — hade gjort ALVA till ett ord för samma sak i varje
// land i stället för samma sak i varje land. Ramen ska vara invariant.
// Det är hela poängen med en standard.

export const ALVA = {
  namn: "ALVA",
  utlast: "Analysis · Localization · Verification · Action",
  position: "Guided Diagnostic Platform",
  /** Ingen slogan. Detta är den enda meningen som beskriver produkten. */
  definition:
    "Standardized diagnostic procedures for repeatable and verifiable troubleshooting.",
} as const;

// ---- Metoden ----------------------------------------------------------

export type Fas = "analysis" | "localization" | "verification" | "action";

export interface FasDefinition {
  id: Fas;
  bokstav: "A" | "L" | "V" | "A";
  namn: string;
  /** Vad fasen gör. En mening, imperativ, ingen utsmyckning. */
  syfte: string;
  /** Vad fasen uttryckligen INTE gör — det som skiljer den från nästa. */
  avgransning: string;
}

export const FASER: readonly FasDefinition[] = [
  {
    id: "analysis",
    bokstav: "A",
    namn: "Analysis",
    syfte: "Collect evidence.",
    avgransning: "Facts only. Hypotheses are not collected in this phase.",
  },
  {
    id: "localization",
    bokstav: "L",
    namn: "Localization",
    syfte: "Isolate the fault.",
    avgransning: "Narrow the area. The cause is not yet established.",
  },
  {
    id: "verification",
    bokstav: "V",
    namn: "Verification",
    syfte: "Confirm root cause.",
    avgransning: "The cause is verified — not the symptom.",
  },
  {
    id: "action",
    bokstav: "A",
    namn: "Action",
    syfte: "Execute corrective action.",
    avgransning: "Result verified and documented. Otherwise the phase is incomplete.",
  },
] as const;

export const fasDefinition = (fas: Fas): FasDefinition =>
  FASER.find((f) => f.id === fas) ?? FASER[0];

// ---- Nomenklatur ------------------------------------------------------
//
// Allt har ett ID. Det är inte administration för sin egen skull: ett
// system där varje ärende, regel, procedur och dokument går att hänvisa
// till i klartext är ett system man kan tala om i telefon, skriva i ett
// protokoll och slå upp två år senare.

export type Objektklass =
  | "CASE" // ett diagnostiskt ärende
  | "PROC" // en procedur (metodik)
  | "RULE" // en regel i regelmotorn
  | "DOC" // ett dokument i kunskapslagret
  | "COMP" // en komponent
  | "VAL" // en valideringskörning
  | "ORG" // en organisation
  | "USER" // en användare
  | "SRC" // en kunskapskälla
  | "REP"; // en rapport

const SIFFROR: Record<Objektklass, number> = {
  CASE: 5,
  PROC: 4,
  RULE: 3,
  DOC: 3,
  COMP: 3,
  VAL: 2,
  ORG: 4,
  USER: 4,
  SRC: 3,
  REP: 4,
};

/** ALVA-CASE-91821 · ALVA-PROC-0042 · ALVA-RULE-120 */
export function beteckning(klass: Objektklass, nummer: number): string {
  return `ALVA-${klass}-${String(nummer).padStart(SIFFROR[klass], "0")}`;
}

const BETECKNING = /^ALVA-([A-Z]{3,4})-(\d+)$/;

export function tolkaBeteckning(text: string): { klass: Objektklass; nummer: number } | null {
  const träff = text.trim().toUpperCase().match(BETECKNING);
  if (!träff || !(träff[1] in SIFFROR)) return null;
  return { klass: träff[1] as Objektklass, nummer: Number(träff[2]) };
}

/**
 * Ett ärende-id ur loggen är en ogenomskinlig sträng. Beteckningen är det
 * som skrivs på papper och sägs högt, så den härleds deterministiskt ur
 * ärendenumret — samma ärende får alltid samma beteckning.
 */
export const arendebeteckning = (nummer: number) => beteckning("CASE", nummer);

// ---- Dokumentklasser --------------------------------------------------
//
// Namnen är inte påhittade för att låta industriella. De motsvarar
// dokumenttyper som faktiskt har olika funktion och olika livslängd, och
// den som arbetat i en fordonsorganisation känner igen dem.

export const DOKUMENTKLASSER = [
  { id: "PROC", namn: "ALVA Procedure", syfte: "Executable diagnostic procedure." },
  { id: "SPEC", namn: "ALVA Specification", syfte: "Normative requirement on the platform." },
  { id: "SI", namn: "ALVA Service Instruction", syfte: "Instruction for a defined operation." },
  { id: "DR", namn: "ALVA Diagnostic Report", syfte: "Outcome of one diagnostic case." },
  { id: "VR", namn: "ALVA Validation Report", syfte: "Evidence that a procedure performs as specified." },
  { id: "IP", namn: "ALVA Inspection Protocol", syfte: "Recorded inspection against a checklist." },
  { id: "TB", namn: "ALVA Technical Bulletin", syfte: "Notice of a known condition and its handling." },
  { id: "RN", namn: "ALVA Release Notes", syfte: "Changes in a platform version." },
  { id: "ES", namn: "ALVA Engineering Standard", syfte: "Binding internal engineering rule." },
  { id: "RH", namn: "ALVA Revision History", syfte: "Change record for a controlled document." },
] as const;

// ---- Versionshantering ------------------------------------------------
//
// ALVA 1.0, ALVA 1.1, ALVA 2.0. Inte Summer Edition, inte AI Edition,
// inte Pro Max. En version är ett tillstånd av systemet, inte en
// marknadsföringshändelse.

export const PLATTFORMSVERSION = "ALVA 1.0";

// ---- Rutnät -----------------------------------------------------------
//
// 8 px. Varje mått i gränssnittet är en multipel. Undantagslöst — ett
// rutnät med undantag är inget rutnät.

export const RUTNÄT = 8;
export const steg = (antal: number) => `${antal * RUTNÄT}px`;
