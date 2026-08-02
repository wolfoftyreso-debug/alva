// Domänmodell för Guidad Felsökning.
// Händelseloggen är append-only och är ärendets enda sanningskälla.
// Allt annat (brief, tidrapport, kundrapport) är projektioner av loggen.

export type Tillforlitlighet = "hog" | "medel" | "lag";

export const TILLFORLITLIGHET_LABEL: Record<Tillforlitlighet, string> = {
  hog: "🟢 Hög",
  medel: "🟡 Medel",
  lag: "🔴 Låg",
};

export type TidKategori =
  | "aktiv_felsokning"
  | "vantetid"
  | "administration"
  | "reservdelssokning"
  | "provkorning"
  | "kundkontakt"
  | "paus";

export const TIDKATEGORI_LABEL: Record<TidKategori, string> = {
  aktiv_felsokning: "Aktiv felsökning",
  vantetid: "Väntetid",
  administration: "Administration",
  reservdelssokning: "Reservdelssökning",
  provkorning: "Provkörning",
  kundkontakt: "Kundkontakt",
  paus: "Paus",
};

export interface Objekt {
  typ: string; // t.ex. "Fordon", "Industrimaskin"
  identifierare: string; // reg.nr, VIN, serienummer …
  identifieringsmetod: string; // "Registreringsnummer", "VIN", "Serienummer", "Manuell inmatning"
  beskrivning: string; // t.ex. "Volvo XC60 D4 2019"
  kund?: string;
}

// Varje händelse är en av dessa typer. Ingen händelse ändras eller tas bort.
export type Handelse =
  | { typ: "objekt_identifierat"; objekt: Objekt }
  | { typ: "felbeskrivning"; text: string }
  | { typ: "fraga_besvarad"; stegId: string; frageId: string; fraga: string; svar: string }
  | { typ: "kontroll_utford"; stegId: string; kontrollId: string; text: string; resultat?: string }
  | { typ: "observation"; text: string }
  | { typ: "matvarde"; beskrivning: string; varde: string; enhet?: string }
  | { typ: "hypotes"; text: string; niva: Exclude<Tillforlitlighet, "hog"> }
  | { typ: "foto"; beskrivning: string; dataUrl: string }
  | { typ: "kommentar"; text: string }
  | { typ: "kategori_byte"; kategori: TidKategori }
  | { typ: "inaktivitet_forklarad"; text: string; minuter: number }
  | { typ: "overlamning"; fran: string; till?: string }
  | { typ: "arende_avslutat" };

export interface LoggPost {
  id: string;
  tidpunkt: string; // ISO 8601
  anvandare: string;
  handelse: Handelse;
}

export interface Arende {
  id: string;
  nummer: number;
  skapad: string; // ISO 8601
  handelser: LoggPost[];
}

let raknare = 0;

export function nyLoggPost(anvandare: string, handelse: Handelse, tidpunkt?: string): LoggPost {
  raknare += 1;
  return {
    id: `${Date.now().toString(36)}-${raknare.toString(36)}`,
    tidpunkt: tidpunkt ?? new Date().toISOString(),
    anvandare,
    handelse,
  };
}

export function handelseRubrik(post: LoggPost): string {
  const h = post.handelse;
  switch (h.typ) {
    case "objekt_identifierat":
      return `Objekt identifierat: ${h.objekt.beskrivning} (${h.objekt.identifierare})`;
    case "felbeskrivning":
      return `Felbeskrivning registrerad`;
    case "fraga_besvarad":
      return `${h.fraga} — ${h.svar}`;
    case "kontroll_utford":
      return h.resultat ? `${h.text} — ${h.resultat}` : `${h.text} — utförd`;
    case "observation":
      return `Observation: ${h.text}`;
    case "matvarde":
      return `Mätvärde: ${h.beskrivning} = ${h.varde}${h.enhet ? ` ${h.enhet}` : ""}`;
    case "hypotes":
      return `Hypotes (${TILLFORLITLIGHET_LABEL[h.niva]}): ${h.text}`;
    case "foto":
      return `Foto: ${h.beskrivning}`;
    case "kommentar":
      return h.text;
    case "kategori_byte":
      return `Arbetskategori: ${TIDKATEGORI_LABEL[h.kategori]}`;
    case "inaktivitet_forklarad":
      return `Komplettering (${h.minuter} min utan aktivitet): ${h.text}`;
    case "overlamning":
      return h.till ? `Arbete överlämnat från ${h.fran} till ${h.till}` : `Arbete överlämnat av ${h.fran}`;
    case "arende_avslutat":
      return "Felsökning avslutad";
  }
}
