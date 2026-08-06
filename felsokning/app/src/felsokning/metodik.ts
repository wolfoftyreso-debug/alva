// Metodikmotor: deterministiska felsökningsflöden.
// Systemet presenterar aldrig en hypotes som ett konstaterat fel —
// motorn föreslår nästa verifierbara steg utifrån vad som redan är dokumenterat.
//
// Här bor motorn: typerna, valet av metodik och härledningen av nästa
// steg. Själva metodikerna ligger i ./metodiker — de växer i antal, och
// motorn ska inte behöva ändras när de gör det.

import type { Arende } from "./domain";
import { ALLA_METODIKER, ELSYSTEM, GENERISK, VIBRATION } from "./metodiker";

export interface Fraga {
  id: string;
  text: string;
  svarstyp: "janej" | "text" | "val";
  val?: string[];
}

// Minimikrav enligt modulen Verifierade checklistor: en kontrollpunkt är
// inte slutförd enbart genom en kryssruta — den samlar bevis och kontext.
export type KontrollKrav = "matvarde" | "kommentar" | "foto";

export interface Kontroll {
  id: string;
  text: string;
  krav?: KontrollKrav;
}

export interface MetodikSteg {
  id: string;
  rubrik: string;
  beskrivning?: string;
  fragor?: Fraga[];
  kontroller?: Kontroll[];
}

export interface Metodik {
  id: string;
  namn: string;
  /** Fordonets system, för gruppering i listor. */
  omrade: string;
  /**
   * Ord ur kundens eller teknikerns språk, inte ur konstruktörens.
   * Används enbart för att välja ingång — aldrig för att dra en slutsats
   * om vad felet är.
   */
  nyckelord: string[];
  steg: MetodikSteg[];
}

// ---- Biblioteket ---------------------------------------------------------
//
// Metodikerna definieras i ./metodiker. Namnen nedan finns kvar för att
// äldre kod och tester ska fortsätta fungera oförändrat.

export {
  ALLA_METODIKER,
  VIBRATION,
  BROMSAR,
  STYRNING_FJADRING,
  ELSYSTEM,
  START_LADDNING,
  MOTOR_DRIFT,
  KYLSYSTEM,
  DRIVLINA,
  AVGAS_EMISSION,
  KLIMAT,
  HOGVOLT,
  DIAGNOS_NATVERK,
  LACKAGE,
  MISSLJUD,
  ADAS,
  GENERISK,
} from "./metodiker";

export const VIBRATION_METODIK = VIBRATION;
export const ELSYSTEM_METODIK = ELSYSTEM;
export const GENERISK_METODIK = GENERISK;
export const METODIKER = ALLA_METODIKER;

export function metodikForId(id: string): Metodik {
  return ALLA_METODIKER.find((m) => m.id === id) ?? GENERISK;
}

// ---- Val av metodik ------------------------------------------------------

// Korta ord matchas som helt ord, längre som ordstam. Annars skulle "ac"
// träffa "acceleration" och en vibration hamna i klimatanläggningen.
const HELT_ORD = 3;
const ORDTECKEN = "a-z0-9åäöéèü";

const monsterCache = new Map<string, RegExp>();

function monster(nyckelord: string): RegExp {
  let m = monsterCache.get(nyckelord);
  if (!m) {
    const bokstavligt = nyckelord.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const slut = nyckelord.length <= HELT_ORD ? `(?![${ORDTECKEN}])` : "";
    m = new RegExp(`(?<![${ORDTECKEN}])${bokstavligt}${slut}`, "i");
    monsterCache.set(nyckelord, m);
  }
  return m;
}

/**
 * Poäng för hur väl en metodik matchar en fritext.
 *
 * Ett långt nyckelord väger tyngre än ett kort: "traktionsbatteri" säger
 * mer om vart ärendet hör hemma än "batteri" gör. Poängen är exponerad
 * för att valet ska gå att granska — inte bara att lita på.
 */
export function metodikPoang(metodik: Metodik, text: string): number {
  const normaliserad = text.toLowerCase();
  let poang = 0;
  for (const ord of metodik.nyckelord) {
    if (monster(ord).test(normaliserad)) poang += ord.length;
  }
  return poang;
}

/**
 * Väljer ingång utifrån felbeskrivningen.
 *
 * Detta är ett val av *frågeordning*, inte en diagnos. Träffar ingenting
 * blir det GENERISK — som är strukturellt komplett och därmed ett ärligt
 * svar på "vi vet inte var vi ska börja" — och anropande kod kan då låta
 * klassificeraren i orkestern försöka i stället.
 */
export function valjMetodik(felbeskrivning: string): Metodik {
  let bast = GENERISK;
  let basta = 0;
  for (const metodik of ALLA_METODIKER) {
    const poang = metodikPoang(metodik, felbeskrivning);
    // Strikt större: vid lika poäng vinner den som står först i
    // biblioteket, så valet blir stabilt mellan körningar.
    if (poang > basta) {
      basta = poang;
      bast = metodik;
    }
  }
  return bast;
}

export interface NastaSteg {
  steg: MetodikSteg;
  fraga?: Fraga;
  kontroll?: Kontroll;
  klart: boolean;
  /**
   * Satt när metodiken är stoppad av en säkerhetsspärr. Metodiken går
   * inte vidare förrän förutsättningen är uppfylld — svaret är inte ett
   * varningsmeddelande utan ett hinder.
   */
  sparr?: { orsak: string; atgard: string };
}

/**
 * Frågor som måste besvaras jakande innan arbetet får fortsätta.
 *
 * Revisionen (docs/QUALITY-AUDIT.md, M-2) fann att högvoltssteget gick
 * att svara nej på och ändå fortsätta: `nastaSteg` gick vidare oavsett
 * svar. En tekniker som ärligt uppgav sig sakna behörighet leddes alltså
 * in i nästa steg av en procedur som kan döda.
 *
 * Regeln bor i data, inte i en if-sats i vyn, så att den gäller överallt
 * där metodiken körs — och så att nästa farliga metodik bara behöver en
 * rad här.
 */
export const SPARRFRAGOR: Record<string, { orsak: string; atgard: string }> = {
  "hogvolt/sakerhet/behorighet": {
    orsak: "Work on high-voltage systems requires documented authorisation.",
    atgard: "Hand the case to an authorised technician. Work must not begin without authorisation.",
  },
  "hogvolt/sakerhet/avstangt": {
    orsak: "The vehicle is not de-energised per the manufacturer's procedure.",
    atgard: "De-energise the vehicle per the manufacturer's instruction before any work begins.",
  },
};

// Nästa steg = första obesvarade frågan, därefter första ej utförda kontrollen,
// i metodikens ordning. Helt härlett ur händelseloggen.
export function nastaSteg(arende: Arende, metodik: Metodik): NastaSteg {
  const besvarade = new Set<string>();
  const svar = new Map<string, string>();
  const utforda = new Set<string>();
  for (const post of arende.handelser) {
    const h = post.handelse;
    if (h.typ === "fraga_besvarad") {
      besvarade.add(`${h.stegId}/${h.frageId}`);
      svar.set(`${h.stegId}/${h.frageId}`, h.svar);
    }
    if (h.typ === "kontroll_utford") utforda.add(`${h.stegId}/${h.kontrollId}`);
  }
  for (const steg of metodik.steg) {
    for (const fraga of steg.fragor ?? []) {
      if (!besvarade.has(`${steg.id}/${fraga.id}`)) return { steg, fraga, klart: false };
      // Säkerhetsspärr: ett nekande svar stoppar metodiken här i stället
      // för att räknas som besvarat och släppa fram nästa steg.
      const sparr = SPARRFRAGOR[`${metodik.id}/${steg.id}/${fraga.id}`];
      if (sparr && svar.get(`${steg.id}/${fraga.id}`) !== "Yes") {
        return { steg, fraga, klart: false, sparr };
      }
    }
    for (const kontroll of steg.kontroller ?? []) {
      if (!utforda.has(`${steg.id}/${kontroll.id}`)) return { steg, kontroll, klart: false };
    }
  }
  const sista = metodik.steg[metodik.steg.length - 1];
  return { steg: sista, klart: true };
}
