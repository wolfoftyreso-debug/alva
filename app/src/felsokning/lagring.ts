// Lagringen bakom storen — och de tre sätt den kunde tappa arbete på.
//
// ---- 1. Flera fönster skrev över varandra -----------------------------
//
// Diagnosrutan uppmuntrar flera fönster ("ett ärende per bil", öppnade i
// nya flikar). Varje fönster höll HELA storen i minnet, och varje
// skrivning skrev hela storen. Det som flik B skrev försvann därför när
// flik A skrev härnäst — i en append-only-logg som är verkstadens
// underlag i en tvist.
//
// Rättelsen bygger på samma egenskap som gör synken konfliktfri: loggen
// LÄGGER bara till. Två fönsters bilder av samma ärende kan alltid flätas
// ihop per händelse-id. Före varje skrivning läses därför det som redan
// ligger i lagringen och flätas med det som ska skrivas, och ett
// storage-event från ett annat fönster flätas in i minnesbilden.
//
// ---- 2. Full lagring tappade arbete tyst ------------------------------
//
// Bilagor bäddas in som data-URL i lokalt läge, och en video på 2,5 MB
// räcker för att spränga webbläsarens kvot. setItem kastade då rakt upp
// genom store-aktionen, minnet uppdaterades men ingenting skrevs, och
// teknikern såg en fungerande app tills sidan laddades om. Nu fångas
// felet, det syns, och arbetet finns kvar i minnet under tiden.
//
// ---- 3. En trasig post nollställde allt -------------------------------
//
// Utan version och migrate startade appen tom vid en trasig post — och
// första skrivningen skrev över det som kanske gick att rädda.

import type { StateStorage } from "zustand/middleware";
import type { Arende, LoggPost } from "./domain";
import { flataIhop } from "./synk";

export const LAGRINGSNYCKEL = "guidad-felsokning";

/** Sant när skrivningen misslyckades för att lagringen är full. */
export type Lagringsfel = "full" | "otillganglig" | null;

let sistaFelet: Lagringsfel = null;
const lyssnare = new Set<() => void>();

export const lagringsfel = (): Lagringsfel => sistaFelet;

export function paLagringsfel(meddela: () => void): () => void {
  lyssnare.add(meddela);
  return () => lyssnare.delete(meddela);
}

function sattFel(fel: Lagringsfel): void {
  if (sistaFelet === fel) return;
  sistaFelet = fel;
  for (const meddela of lyssnare) meddela();
}

interface Lagrat {
  state?: { arenden?: Record<string, Arende>; nastaNummer?: number; anvandare?: string };
  version?: number;
}

/**
 * Flätar två lagrade tillstånd.
 *
 * Ärenden unionsbildas, händelser flätas per id (append-only gör det
 * säkert), och nastaNummer tar det högsta så två fönster inte delar ut
 * samma ärendenummer.
 */
export function flatIhopTillstand(a: Lagrat, b: Lagrat): Lagrat {
  const arendenA = a.state?.arenden ?? {};
  const arendenB = b.state?.arenden ?? {};
  const arenden: Record<string, Arende> = { ...arendenA };
  for (const [id, arende] of Object.entries(arendenB)) {
    const fanns = arendenA[id];
    arenden[id] = fanns
      ? { ...fanns, handelser: flataIhop(fanns.handelser as LoggPost[], arende.handelser as LoggPost[]) }
      : arende;
  }
  return {
    version: Math.max(a.version ?? 0, b.version ?? 0),
    state: {
      ...a.state,
      ...b.state,
      arenden,
      nastaNummer: Math.max(a.state?.nastaNummer ?? 1, b.state?.nastaNummer ?? 1),
    },
  };
}

function tolka(rå: string | null): Lagrat | null {
  if (!rå) return null;
  try {
    const t = JSON.parse(rå) as Lagrat;
    return t && typeof t === "object" ? t : null;
  } catch {
    // En trasig post nollställer inte längre allt tyst — den lämnas
    // orörd i lagringen tills något faktiskt skrivs över den.
    return null;
  }
}

/**
 * Lagringen storen använder.
 *
 * setItem flätar mot det som redan finns, så ett annat fönsters
 * skrivningar aldrig går förlorade.
 */
export const flikSakerLagring: StateStorage = {
  getItem: (namn) => {
    try {
      return localStorage.getItem(namn);
    } catch {
      sattFel("otillganglig");
      return null;
    }
  },
  setItem: (namn, varde) => {
    try {
      const befintligt = tolka(localStorage.getItem(namn));
      const nytt = tolka(varde);
      const attSkriva = befintligt && nytt ? JSON.stringify(flatIhopTillstand(befintligt, nytt)) : varde;
      localStorage.setItem(namn, attSkriva);
      sattFel(null);
    } catch (fel) {
      // Kvotfel är det vanliga: en video plus några foton räcker. Arbetet
      // finns kvar i minnet, och vyn får veta att det inte är sparat.
      const namnPaFelet = (fel as { name?: string })?.name ?? "";
      sattFel(/quota|QUOTA/i.test(namnPaFelet) ? "full" : "otillganglig");
    }
  },
  removeItem: (namn) => {
    try {
      localStorage.removeItem(namn);
    } catch {
      sattFel("otillganglig");
    }
  },
};
