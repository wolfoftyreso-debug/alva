// Domänmodell för Guidad Felsökning.
// Händelseloggen är append-only och är ärendets enda sanningskälla.
// Allt annat (brief, tidrapport, kundrapport) är projektioner av loggen.

export type Tillforlitlighet = "hog" | "medel" | "lag";

export const TILLFORLITLIGHET_LABEL: Record<Tillforlitlighet, string> = {
  hog: "Hög",
  medel: "Medel",
  lag: "Låg",
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

// Kvalitetskontrollens utfall efter utförd åtgärd.
export const KVALITETSKONTROLL_LABEL: Record<
  "symptomet_borta" | "kvarstar" | "delvis" | "ej_verifierbar",
  string
> = {
  symptomet_borta: "Symptomet är borta",
  kvarstar: "Symptomet kvarstår",
  delvis: "Symptomet delvis kvar",
  ej_verifierbar: "Kunde inte verifieras",
};

// Fordonsobjektet är den röda tråden genom hela ärendet: identiteten
// registreras en gång och återanvänds i felsökning, Live Share, rapport
// och export. Ärendereferenserna (AO/claim/skadenummer) hör till objektet
// så att de följer med i alla vyer utan att kunduppgifter läcker.
export interface Objekt {
  typ: string; // t.ex. "Personbil", "Industrimaskin"
  identifierare: string; // reg.nr, VIN, serienummer …
  identifieringsmetod: string; // "Regnr", "VIN", "Serienummer", "Manuell inmatning"
  beskrivning: string; // t.ex. "Volvo XC60 D4 2019"
  kund?: string;
  vin?: string;
  miltal?: string;
  arbetsorder?: string;
  claim?: string;
  skadenummer?: string;
}

// Ett fält tolkat ur en skannad arbetsorder, med AI:ns läs-säkerhet.
export interface ArbetsorderFalt {
  id: string;
  etikett: string;
  varde: string;
  konfidens: number; // 0–1
}

// Varje händelse är en av dessa typer. Ingen händelse ändras eller tas bort.
export type Handelse =
  | { typ: "objekt_identifierat"; objekt: Objekt }
  | { typ: "arbetsorder_skannad"; falt: ArbetsorderFalt[]; dataUrl?: string }
  | { typ: "felbeskrivning"; text: string }
  | { typ: "fraga_besvarad"; stegId: string; frageId: string; fraga: string; svar: string }
  // undantag: underlaget kunde inte tas fram — obligatorisk orsak i stället
  // för evidens. Kontrollen räknas som hanterad men flaggas i brief/rapport.
  | { typ: "kontroll_utford"; stegId: string; kontrollId: string; text: string; resultat?: string; undantag?: string }
  | { typ: "observation"; text: string }
  | { typ: "matvarde"; beskrivning: string; varde: string; enhet?: string }
  | { typ: "hypotes"; text: string; niva: Exclude<Tillforlitlighet, "hog"> }
  | { typ: "foto"; beskrivning: string; dataUrl: string }
  // Video med ljud (E3-evidens): för det som låter eller rör sig —
  // motorljud, hjullager, fjädringsrörelse. Kort och komprimerad;
  // originalfilen bevaras som evidens precis som foton.
  | { typ: "video"; beskrivning: string; dataUrl: string }
  | { typ: "kommentar"; text: string }
  | { typ: "kategori_byte"; kategori: TidKategori }
  | { typ: "inaktivitet_forklarad"; text: string; minuter: number }
  | { typ: "overlamning"; fran: string; till?: string }
  | { typ: "ansvarig_satt"; ansvarig: string }
  // Ärendetypen styr vilka dokumentationskrav ECM ställer (garanti,
  // försäkring, reklamation …).
  | { typ: "arendetyp_satt"; arendetyp: string }
  // Pre-diagnostik: fordonshistoriken kontrollerad — eller motiverat
  // varför inte (kvalitetsvarning).
  | { typ: "historik_kontrollerad"; kontrollerad: boolean; kommentar?: string }
  // Officiell mätarställning in/ut, normalt med foto av instrumentpanelen.
  | { typ: "matarstallning"; lage: "ingaende" | "utgaende"; varde: string; dataUrl?: string; undantag?: string }
  // Symptomverifiering (SVP): kundens beskrivning är inte ett konstaterat
  // fel förrän den reproducerats — eller dokumenterats som ej
  // reproducerbar med motivering.
  | { typ: "reproducering"; status: "ja" | "delvis" | "nej"; beskrivning: string }
  // Felorsaksanalys: varje konstaterat fel kräver avvikelse, bedömd
  // grundorsak, underlag och säkerhetsnivå — eller motivering till
  // varför orsaken inte kunnat fastställas.
  | {
      typ: "felorsak";
      avvikelse: string;
      orsaker: string[];
      underlag: string[];
      sakerhet: Tillforlitlighet;
      atgard: string;
      motivering?: string;
      ytterligareKontroller?: string;
    }
  // Åtgärdsfasen: vad som faktiskt gjordes — eller varför ingen åtgärd
  // utfördes (kunden avböjde, väntar på delar …). Kopplas till den
  // felorsak åtgärden svarar mot.
  | {
      typ: "atgard_utford";
      beskrivning: string;
      delar?: string;
      utford: boolean;
      motivering?: string;
    }
  // Kvalitetskontroll efter åtgärd: är symptomet borta? Slutar loopen
  // som symptomverifieringen (SVP) öppnade.
  | {
      typ: "kvalitetskontroll";
      resultat: "symptomet_borta" | "kvarstar" | "delvis" | "ej_verifierbar";
      beskrivning: string;
    }
  | { typ: "export_skapad"; format: string; version: number }
  | {
      typ: "ai_svar";
      rader: { typ: "observation" | "verifierat" | "hypotes" | "rekommendation"; text: string }[];
      nastaSteg: string;
      modell: string;
    }
  // Avslutet signeras av teknikern — slutsatsen får en ansvarig avsändare.
  | { typ: "arende_avslutat"; signatur?: string };

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
  // Slumpad kod för Live Share-länken; sätts vid skapande och kan aldrig
  // ändras (ärenderaden är append-only även i databasen).
  delningskod?: string;
  // Explicit vald metodik (t.ex. via AI-klassificering vid skapandet).
  // Saknas den härleds metodiken ur felbeskrivningen.
  metodikId?: string;
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
    case "arbetsorder_skannad":
      return `Arbetsorder skannad — ${h.falt.length} fält tolkade`;
    case "felbeskrivning":
      return `Felbeskrivning registrerad`;
    case "fraga_besvarad":
      return `${h.fraga} — ${h.svar}`;
    case "kontroll_utford":
      if (h.undantag) return `${h.text} — underlag kunde inte tas fram: ${h.undantag}`;
      return h.resultat ? `${h.text} — ${h.resultat}` : `${h.text} — utförd`;
    case "observation":
      return `Observation: ${h.text}`;
    case "matvarde":
      return `Mätvärde: ${h.beskrivning} = ${h.varde}${h.enhet ? ` ${h.enhet}` : ""}`;
    case "hypotes":
      return `Hypotes (${TILLFORLITLIGHET_LABEL[h.niva]}): ${h.text}`;
    case "foto":
      return `Foto: ${h.beskrivning}`;
    case "video":
      return `Video: ${h.beskrivning}`;
    case "kommentar":
      return h.text;
    case "kategori_byte":
      return `Arbetskategori: ${TIDKATEGORI_LABEL[h.kategori]}`;
    case "inaktivitet_forklarad":
      return `Komplettering (${h.minuter} min utan aktivitet): ${h.text}`;
    case "overlamning":
      return h.till ? `Arbete överlämnat från ${h.fran} till ${h.till}` : `Arbete överlämnat av ${h.fran}`;
    case "ansvarig_satt":
      return `Ansvarig tekniker: ${h.ansvarig}`;
    case "arendetyp_satt":
      return `Ärendetyp: ${h.arendetyp}`;
    case "historik_kontrollerad":
      return h.kontrollerad
        ? `Fordonshistorik kontrollerad${h.kommentar ? `: ${h.kommentar}` : ""}`
        : `Fordonshistorik EJ kontrollerad — orsak: ${h.kommentar ?? "saknas"}`;
    case "matarstallning":
      if (h.undantag) return `Mätarställning (${h.lage === "ingaende" ? "in" : "ut"}) kunde inte dokumenteras: ${h.undantag}`;
      return `Mätarställning ${h.lage === "ingaende" ? "in" : "ut"}: ${h.varde}`;
    case "reproducering":
      return h.status === "ja"
        ? `Symptomet reproducerat: ${h.beskrivning}`
        : h.status === "delvis"
          ? `Symptomet delvis reproducerat: ${h.beskrivning}`
          : `Symptomet kunde inte reproduceras — ${h.beskrivning}`;
    case "felorsak":
      return `Felorsak (${TILLFORLITLIGHET_LABEL[h.sakerhet]}): ${h.avvikelse} — ${h.orsaker.join(", ")}`;
    case "atgard_utford":
      return h.utford
        ? `Åtgärd utförd: ${h.beskrivning}${h.delar ? ` (delar: ${h.delar})` : ""}`
        : `Ingen åtgärd utförd — ${h.motivering ?? "orsak saknas"}`;
    case "kvalitetskontroll":
      return `Kvalitetskontroll: ${KVALITETSKONTROLL_LABEL[h.resultat]} — ${h.beskrivning}`;
    case "export_skapad":
      return `Export skapad: ${h.format}, version ${h.version}`;
    case "ai_svar": {
      const forsta = h.rader[0];
      return `AI: ${forsta ? `${forsta.text} ` : ""}— Nästa steg: ${h.nastaSteg}`;
    }
    case "arende_avslutat":
      return h.signatur ? `Felsökning avslutad — signerad av ${h.signatur}` : "Felsökning avslutad";
  }
}
