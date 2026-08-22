// Domänmodell för Guidad Felsökning.
// Händelseloggen är append-only och är ärendets enda sanningskälla.
// Allt annat (brief, tidrapport, kundrapport) är projektioner av loggen.

export type Tillforlitlighet = "hog" | "medel" | "lag";

export const TILLFORLITLIGHET_LABEL: Record<Tillforlitlighet, string> = {
  hog: "High",
  medel: "Medium",
  lag: "Low",
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
  aktiv_felsokning: "Active diagnosis",
  vantetid: "Waiting time",
  administration: "Administration",
  reservdelssokning: "Parts search",
  provkorning: "Road test",
  kundkontakt: "Customer contact",
  paus: "Break",
};

// Kundens besked på ett lämnat åtgärdsförslag.
export const KUNDBESLUT_LABEL: Record<"godkant" | "avbojt" | "delvis", string> = {
  godkant: "Approved",
  avbojt: "Declined",
  delvis: "Partly approved",
};

// Kvalitetskontrollens utfall efter utförd åtgärd.
export const KVALITETSKONTROLL_LABEL: Record<
  "symptomet_borta" | "kvarstar" | "delvis" | "ej_verifierbar",
  string
> = {
  symptomet_borta: "Symptom is gone",
  kvarstar: "Symptom remains",
  delvis: "Symptom partly remains",
  ej_verifierbar: "Could not be verified",
};

// Fordonsobjektet är den röda tråden genom hela ärendet: identiteten
// registreras en gång och återanvänds i felsökning, Live Share, rapport
// och export. Ärendereferenserna (AO/claim/skadenummer) hör till objektet
// så att de följer med i alla vyer utan att kunduppgifter läcker.
export interface Objekt {
  typ: string; // t.ex. "Passenger car", "Industrial machine"
  identifierare: string; // reg.nr, VIN, serienummer …
  identifieringsmetod: string; // "Reg. no.", "VIN", "Serial number", "Manual entry"
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
// Bilagans innehåll ligger utanför händelsen: loggen bär referensen och
// innehållets SHA-256. Hashen står därmed i den append-only-skyddade
// loggen och en utbytt bild går att upptäcka.
//
// dataUrl finns kvar och kommer alltid att finnas kvar. Loggen är
// append-only, så händelser som skrevs när bilden låg inbäddad måste
// gå att läsa för alltid. Lokalt läge (utan inloggning) använder den
// också — där finns ingen server att ladda upp till.
export interface Bilaga {
  bilagaId?: string;
  bilagaHash?: string;
  dataUrl?: string;
}

// FGS-1.0 §3: betalarspåren. Datavärdena är invarianta (svenska tokens i
// loggen, precis som "godkant"/"ingaende"); etiketterna är gränssnitt.
export type Betalarspar =
  | "fabriksgaranti"
  | "vagnskadegaranti"
  | "forsakring"
  | "extern_garanti"
  | "leasing"
  | "goodwill"
  | "kund";

export const BETALARSPAR_LABEL: Record<Betalarspar, string> = {
  fabriksgaranti: "Factory warranty",
  vagnskadegaranti: "Body damage warranty",
  forsakring: "Insurance",
  extern_garanti: "External warranty",
  leasing: "Leasing or fleet",
  goodwill: "Goodwill",
  kund: "Customer pays",
};

export type Handelse =
  | { typ: "objekt_identifierat"; objekt: Objekt }
  | ({ typ: "arbetsorder_skannad"; falt: ArbetsorderFalt[] } & Bilaga)
  | { typ: "felbeskrivning"; text: string }
  | { typ: "fraga_besvarad"; stegId: string; frageId: string; fraga: string; svar: string }
  // undantag: underlaget kunde inte tas fram — obligatorisk orsak i stället
  // för evidens. Kontrollen räknas som hanterad men flaggas i brief/rapport.
  | {
      typ: "kontroll_utford";
      stegId: string;
      kontrollId: string;
      text: string;
      resultat?: string;
      undantag?: string;
      // ALVA-RULE-210: kontrollen FANN något. Bär åtgärden och fakturan, och
      // kräver därför visuellt bevis bundet till samma stegId/kontrollId.
      anmarkning?: boolean;
    }
  | { typ: "observation"; text: string }
  | {
      typ: "matvarde";
      beskrivning: string;
      varde: string;
      enhet?: string;
      /**
       * Vilket mätdon som användes. Ett mätvärde rankas som E4 — hög
       * evidens — och utan kalibrerat instrument är det inte lägre
       * evidens utan ingen evidens alls (QUALITY-AUDIT M-1). Fältet är
       * valfritt i typen därför att loggen är append-only och äldre
       * poster saknar det; evidensmotorn nedgraderar dem i stället.
       */
      matdonId?: string;
      matdonBeteckning?: string;
      matdonKalibreradTill?: string;
      /** Serverns stämpel: gällde kalibreringen vid mottagandet? Fryses
          vid skrivningen — grinden får aldrig fråga klockan. */
      kalibreradVidMatning?: boolean;
      /**
       * Härkomst när värdet inte skrevs in av teknikern själv — en
       * modelltolkad instrumentavläsning, eller en importerad protokollrad
       * (TÜV T-5). Ett bekräftat maskinläst värde är riktigt men inte
       * spårbart utan det här: rapporten ska kunna svara på hur siffran
       * kom dit, inte bara vilken den blev.
       */
      kalla?: string;
    }
  | { typ: "hypotes"; text: string; niva: Exclude<Tillforlitlighet, "hog"> }
  | ({ typ: "foto"; beskrivning: string; stegId?: string; kontrollId?: string } & Bilaga)
  // Video med ljud (E3-evidens): för det som låter eller rör sig —
  // motorljud, hjullager, fjädringsrörelse. Kort och komprimerad;
  // originalfilen bevaras som evidens precis som foton.
  | ({ typ: "video"; beskrivning: string; stegId?: string; kontrollId?: string } & Bilaga)
  | { typ: "kommentar"; text: string }
  | { typ: "kategori_byte"; kategori: TidKategori }
  | { typ: "inaktivitet_forklarad"; text: string; minuter: number }
  | { typ: "overlamning"; fran: string; till?: string }
  | { typ: "ansvarig_satt"; ansvarig: string }
  // Ärendetypen styr vilka dokumentationskrav ECM ställer (garanti,
  // försäkring, reklamation …).
  | { typ: "arendetyp_satt"; arendetyp: string }
  /**
   * Metodikbyte.
   *
   * Metodiken valdes vid ärendestart ur felbeskrivningen och kunde
   * sedan aldrig ändras. "Vibrerar när jag bromsar" träffar
   * vibrationsmetodiken före bromsmetodiken — och vibrations-
   * metodikens egen text säger att bromsvibration ska köras som
   * bromsärende. Teknikern fick alltså rådet men inte vägen, och
   * satt fast i fel procedur hela ärendet.
   *
   * Bytet kräver ett varför, eftersom det ändrar vilka krav grinden
   * ställer. Kontroller från den gamla metodiken står kvar i loggen.
   */
  /**
   * Vald metodik vid ärendestart, registrerad som händelse så att
   * grindens grund kan bevisas ur den förseglade loggen och inte
   * bara ur en kolumn en databasadministratör kan ändra.
   */
  | { typ: "metodik_vald"; metodikId: string }
  | { typ: "metodik_byte"; metodikId: string; motivering: string }
  // FGS-1.0: betalarspåret. Vem som ersätter arbetet avgör beviskraven —
  // fabrik, vagnskadegaranti, försäkringsbolag, extern garantigivare,
  // leasing/fleet, goodwill eller kunden själv. Referensen är claim-,
  // skade- eller policynummer; godkännandet är betalarens klartecken.
  | { typ: "betalare"; spar: Betalarspar; namn: string; referens?: string; godkannande?: string }
  // Teknisk eskalering (DISS-mönstret): öppnad förfrågan till tillverkare
  // eller garantigivare. En öppnad eskalering utan besvarad spärrar
  // avslutet — svaret ska inväntas och dokumenteras.
  | { typ: "eskalering"; status: "oppnad" | "besvarad"; beskrivning: string; referens?: string; kanal?: string }
  // Reservdelsdokumentation: artikelnummer och spårbarhet för utbytt del.
  // `sparad` betyder att den demonterade delen behålls i väntan på
  // garantibeslut eller revision.
  | { typ: "reservdel"; artikelnummer: string; beskrivning: string; serienummer?: string; batch?: string; sparad?: boolean }
  // Pre-diagnostik: fordonshistoriken kontrollerad — eller motiverat
  // varför inte (kvalitetsvarning).
  | { typ: "historik_kontrollerad"; kontrollerad: boolean; kommentar?: string }
  // Officiell mätarställning in/ut, normalt med foto av instrumentpanelen.
  | ({ typ: "matarstallning"; lage: "ingaende" | "utgaende"; varde: string; undantag?: string } & Bilaga)
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
  // Kundkommunikation: åtgärdsförslag lämnat till kund för godkännande
  // innan arbetet påbörjas. Kunddelbart — visas i Live Share.
  | {
      typ: "atgardsforslag";
      beskrivning: string;
      uppskattadKostnad?: string;
      uppskattadTid?: string;
    }
  // Kundens besked på förslaget, med kanal och tidpunkt (loggposten bär
  // vem i verkstaden som tog emot beskedet).
  | {
      typ: "kundbeslut";
      beslut: "godkant" | "avbojt" | "delvis";
      kanal: string;
      kommentar?: string;
      /**
       * Vem hos kunden som lämnade beskedet. Personuppgift: krypteras per
       * ärendenyckel och försvinner vid radering (IDENTIFIERANDE i
       * services/gemensam/personuppgifter.mjs). Fältet stod tidigare i
       * krypteringslistan utan att finnas i modellen — nu stämmer
       * modellen, schemat och krypteringen överens.
       */
      kontaktperson?: string;
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
  /**
   * ALVA-RULE-200 · Teknikerns varför.
   *
   * Fyra frågor med olika adressat, som i dag blandas ihop till en rad i
   * en arbetsorder — vilket är varför verkstadsprotokoll är svåra att
   * använda i efterhand. Fälten valideras i
   * services/gemensam/motivering.mjs och spärrar avslutet.
   */
  | {
      typ: "slutsats";
      /** Varför följer slutsatsen av evidensen? */
      motivering: string;
      /** Vad övervägdes och varför föll det bort? */
      uteslutet: string;
      /** Vad är fortfarande osäkert? Får vara "inget" — men aktivt sagt. */
      kvarstaende: string;
      /** Varför denna åtgärd och inte en annan? Krävs när arbete utförts. */
      atgardsval?: string;
      /**
       * Falskt när orsaken inte kunnat fastställas. Det är ett giltigt
       * utfall — men varför den inte kunde det är fortfarande ett varför.
       */
      orsakFastställd?: boolean;
    }
  | {
      typ: "arende_avslutat";
      signatur?: string;
      /**
       * Versionen som gällde vid avslutet. Ritningsstämpeln läste den ur
       * den aktuella konstanten, så ett ärende stängt under 1.0 visade
       * 3.1 — precis det stämpelns egen beskrivning säger att den inte
       * ska göra.
       */
      plattformsversion?: string;
    };

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
  /**
   * Sant för det inbyggda demonstrationsärendet.
   *
   * Demoärendet låg tidigare i samma store som riktiga ärenden utan att
   * vara märkt, och synkades därför upp till organisationen vid
   * inloggning: fejkbilen hamnade i arbetsledarens statistik och bland
   * organisationens "bevismaterial", där servern omöjligt kunde skilja
   * den från ett riktigt ärende. Flaggan stannar lokalt — synken hoppar
   * över ärendet i stället för att skicka det.
   */
  demo?: boolean;
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
  const h = post?.handelse;
  // En post utan händelse (skadad lagring/serverdata) får aldrig kasta.
  if (!h || typeof h !== "object") return "Log entry could not be rendered";
  switch (h.typ) {
    case "objekt_identifierat":
      return `Object identified: ${h.objekt?.beskrivning ?? "—"} (${h.objekt?.identifierare ?? "?"})`;
    case "arbetsorder_skannad":
      return `Work order scanned — ${h.falt?.length ?? 0} fields interpreted`;
    case "felbeskrivning":
      return `Fault description recorded`;
    case "fraga_besvarad":
      return `${h.fraga} — ${h.svar}`;
    case "kontroll_utford":
      if (h.undantag) return `${h.text} — evidence could not be produced: ${h.undantag}`;
      return h.resultat ? `${h.text} — ${h.resultat}` : `${h.text} — performed`;
    case "observation":
      return `Observation: ${h.text}`;
    case "matvarde":
      return `Measurement: ${h.beskrivning} = ${h.varde}${h.enhet ? ` ${h.enhet}` : ""}`;
    case "hypotes":
      return `Hypothesis (${TILLFORLITLIGHET_LABEL[h.niva]}): ${h.text}`;
    case "foto":
      return `Photo: ${h.beskrivning}`;
    case "video":
      return `Video: ${h.beskrivning}`;
    case "kommentar":
      return h.text;
    case "kategori_byte":
      return `Work category: ${TIDKATEGORI_LABEL[h.kategori]}`;
    case "inaktivitet_forklarad":
      return `Addendum (${h.minuter} min without activity): ${h.text}`;
    case "overlamning":
      return h.till ? `Work handed over from ${h.fran} to ${h.till}` : `Work handed over by ${h.fran}`;
    case "ansvarig_satt":
      return `Responsible technician: ${h.ansvarig}`;
    case "metodik_vald":
      return `Methodology selected: ${h.metodikId}`;
    case "metodik_byte":
      return `Methodology changed to ${h.metodikId}: ${h.motivering}`;
    case "arendetyp_satt":
      return `Case type: ${h.arendetyp}`;
    case "betalare":
      return `Payer: ${BETALARSPAR_LABEL[h.spar]} — ${h.namn}${h.referens ? ` (ref ${h.referens})` : ""}${h.godkannande ? ` — approval ${h.godkannande}` : ""}`;
    case "eskalering":
      return h.status === "oppnad"
        ? `Escalation opened${h.kanal ? ` via ${h.kanal}` : ""}${h.referens ? ` (${h.referens})` : ""}: ${h.beskrivning}`
        : `Escalation answered${h.referens ? ` (${h.referens})` : ""}: ${h.beskrivning}`;
    case "reservdel":
      return `Part documented: ${h.artikelnummer} — ${h.beskrivning}${h.serienummer ? `, s/n ${h.serienummer}` : ""}${h.batch ? `, batch ${h.batch}` : ""}${h.sparad ? " — old part retained" : ""}`;
    case "historik_kontrollerad":
      return h.kontrollerad
        ? `Vehicle history checked${h.kommentar ? `: ${h.kommentar}` : ""}`
        : `Vehicle history NOT checked — reason: ${h.kommentar ?? "missing"}`;
    case "matarstallning":
      if (h.undantag) return `Odometer reading (${h.lage === "ingaende" ? "in" : "out"}) could not be documented: ${h.undantag}`;
      return `Odometer ${h.lage === "ingaende" ? "in" : "out"}: ${h.varde}`;
    case "reproducering":
      return h.status === "ja"
        ? `Symptom reproduced: ${h.beskrivning}`
        : h.status === "delvis"
          ? `Symptom partially reproduced: ${h.beskrivning}`
          : `Symptom could not be reproduced — ${h.beskrivning}`;
    case "felorsak":
      return `Root cause (${TILLFORLITLIGHET_LABEL[h.sakerhet]}): ${h.avvikelse} — ${(h.orsaker ?? []).join(", ")}`;
    case "atgardsforslag":
      return `Proposed action for the customer: ${h.beskrivning}${h.uppskattadKostnad ? ` — estimated cost ${h.uppskattadKostnad}` : ""}`;
    case "kundbeslut":
      return `Customer decision (${h.kanal}): ${KUNDBESLUT_LABEL[h.beslut]}${h.kommentar ? ` — ${h.kommentar}` : ""}`;
    case "atgard_utford":
      return h.utford
        ? `Action performed: ${h.beskrivning}${h.delar ? ` (parts: ${h.delar})` : ""}`
        : `No action performed — ${h.motivering ?? "reason missing"}`;
    case "kvalitetskontroll":
      return `Quality check: ${KVALITETSKONTROLL_LABEL[h.resultat]} — ${h.beskrivning}`;
    case "export_skapad":
      return `Export created: ${h.format}, version ${h.version}`;
    case "ai_svar": {
      const forsta = h.rader?.[0];
      return `AI: ${forsta ? `${forsta.text} ` : ""}— Next step: ${h.nastaSteg}`;
    }
    case "slutsats":
      return `Conclusion${h.orsakFastställd === false ? " (cause not established)" : ""}: ${h.motivering ?? "—"}`;
    case "arende_avslutat":
      return h.signatur ? `Diagnosis closed — signed by ${h.signatur}` : "Diagnosis closed";
    default:
      // Okänd/framtida händelsetyp får en märkt rad i stället för att
      // returnera undefined (som förr blev en tom rad i loggen och
      // "anna: undefined" i AI-prompten).
      return `Log entry: ${(h as { typ?: string }).typ ?? "unknown"}`;
  }
}
