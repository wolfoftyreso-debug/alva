// ALVA-SPEC-060 · Språk.
//
// ---- Två sorters text, och de behandlas olika ---------------------------
//
// GRÄNSSNITTSTEXT är etiketter, knappar, statusar och grindens hinder.
// Den är ändlig, den ändras sällan, och en engelsk sträng som slinker
// igenom till en tysk användare är irriterande men ofarlig.
//
// METODIKINNEHÅLL är instruktioner för arbete på ett fordon: "kontrollera
// bromsvätskans kokpunkt", "säkerställ att fordonet är spänningslöst".
// Där är en oöversatt eller halvöversatt sträng inte irriterande utan
// farlig, och en maskinöversättning som ingen fackman läst är värre än
// engelska — därför att engelska SYNS som ett annat språk, medan en
// felaktig översättning ser ut som en instruktion.
//
// Modulen behandlar dem därför olika. Gränssnittstext faller tillbaka på
// engelska tyst. Metodikinnehåll gör det ALDRIG tyst: det märks som
// oöversatt, med språk och granskningsstatus, så att teknikern vet att
// den läser något som inte är skrivet för dess marknad.
//
// ---- Källspråket är engelska --------------------------------------------
//
// Inte därför att engelska är bäst, utan därför att ALVA:s struktur redan
// är engelsk och oföränderlig (ALVA-SPEC-001 §2). Ett system där
// strukturen är engelsk och källtexten svensk har två källor att hålla
// synkade, och den ena vinner alltid tyst.
//
// ---- Katalogen är stängd -------------------------------------------------
//
// Varje nyckel måste finnas i varje språk. Ett test låser det, av samma
// skäl som händelseschemat är stängt: en saknad nyckel som tyst faller
// tillbaka blir aldrig upptäckt, och blir aldrig översatt.
//
// ---- Och en del av den får INTE översättas ------------------------------
//
// ALVA-SPEC-001 §2 slår fast att fasnamn och statusord är strukturen och
// skrivs likadant i varje land — precis som ett ISO-krav inte blir
// "internationell standard 9001" på svenska. En tysk rapport och en
// rumänsk ska visa samma fyra faser och samma statusord, så att en
// revisor kan läsa båda utan att veta vilket språk verkstaden arbetar på.
//
// Det hade gått att skriva in dem oöversatta i varje katalog och låsa
// dem med ett test. Det är svagare: en översättare som ser "Passed" i
// den polska filen översätter den, och testet blir en tvist i stället
// för en regel. I stället saknas nycklarna helt i översättningarna, och
// `t()` hämtar dem alltid ur engelskan. Då finns det ingenting att
// översätta fel.

import { EN } from "./en.mjs";
import { SV } from "./sv.mjs";
import { DE } from "./de.mjs";
import { FR } from "./fr.mjs";
import { ES } from "./es.mjs";
import { IT } from "./it.mjs";
import { PL } from "./pl.mjs";
import { NL } from "./nl.mjs";
import { PT } from "./pt.mjs";
import { RO } from "./ro.mjs";

/**
 * Språken.
 *
 * Urvalet är EU:s största modersmål plus svenska, som är hemmamarknaden.
 * `granskat` säger om en fackman har läst igenom METODIKINNEHÅLLET på
 * språket — inte gränssnittet. Se filhuvudet: det är den skillnaden som
 * betyder något.
 */
export const SPRAK = [
  { kod: "en", namn: "English", egetNamn: "English", granskat: true },
  { kod: "de", namn: "German", egetNamn: "Deutsch", granskat: false },
  { kod: "fr", namn: "French", egetNamn: "Français", granskat: false },
  { kod: "es", namn: "Spanish", egetNamn: "Español", granskat: false },
  { kod: "it", namn: "Italian", egetNamn: "Italiano", granskat: false },
  { kod: "pl", namn: "Polish", egetNamn: "Polski", granskat: false },
  { kod: "nl", namn: "Dutch", egetNamn: "Nederlands", granskat: false },
  { kod: "pt", namn: "Portuguese", egetNamn: "Português", granskat: false },
  { kod: "ro", namn: "Romanian", egetNamn: "Română", granskat: false },
  { kod: "sv", namn: "Swedish", egetNamn: "Svenska", granskat: true },
];

/** Standardspråket. Även källspråket. */
export const STANDARD = "en";

export const KATALOGER = { en: EN, sv: SV, de: DE, fr: FR, es: ES, it: IT, pl: PL, nl: NL, pt: PT, ro: RO };

/**
 * Nyckelområden som är ALVA:s struktur och därför aldrig översätts.
 *
 * `fas.` — de fyra faserna. `status.` — statusorden. Se filhuvudet.
 */
export const INVARIANTA = ["fas.", "status."];

/** Om nyckeln tillhör strukturen och alltid ska hämtas ur engelskan. */
export const arInvariant = (nyckel) => INVARIANTA.some((p) => String(nyckel).startsWith(p));

/**
 * Slår upp en gränssnittssträng.
 *
 * Invarianta nycklar hämtas alltid ur engelskan, oavsett språk och
 * oavsett vad en katalog råkar innehålla.
 *
 * Faller i övrigt tillbaka på engelska när nyckeln saknas i språket, och
 * på nyckeln själv när den saknas överallt — det sista ska aldrig hända
 * och fångas av testet, men en tom sträng i gränssnittet vore värre än
 * en synlig nyckel.
 *
 * `variabler` ersätter {namn} i strängen. Ingen ordning antas: språk
 * sätter satsdelar i olika ordning, och en översättning som tvingas följa
 * engelskans ordföljd blir fel svenska, tyska och polska på en gång.
 */
export function t(sprak, nyckel, variabler = {}) {
  const katalog = arInvariant(nyckel) ? EN : (KATALOGER[sprak] ?? EN);
  const rå = katalog[nyckel] ?? EN[nyckel] ?? nyckel;
  return String(rå).replace(/\{(\w+)\}/g, (_, n) => (n in variabler ? String(variabler[n]) : `{${n}}`));
}

/** Bunden variant, så en vy slipper skicka språket i varje anrop. */
export const oversattare = (sprak) => (nyckel, variabler) => t(sprak, nyckel, variabler);

/**
 * Vilka nycklar som saknas per språk.
 *
 * Används av testet — men är exporterad även för driften, som kan visa
 * täckningsgraden i stället för att påstå att ett språk är klart.
 */
export function saknade(katalog) {
  const nycklar = Object.keys(EN).filter((n) => !arInvariant(n));
  return nycklar.filter((n) => !(n in katalog) || !String(katalog[n]).trim());
}

/**
 * Invarianta nycklar som en katalog felaktigt definierar.
 *
 * Tom lista är det normala. En träff betyder att någon har översatt
 * strukturen, och det ska stoppa bygget — inte tyst ignoreras av `t()`,
 * även om `t()` ignorerar det.
 */
export function otillatna(katalog) {
  return Object.keys(katalog).filter(arInvariant);
}

/**
 * Nycklar som finns i katalogen men inte i engelskan.
 *
 * En sträng utan original. Den kan aldrig visas — `t()` slår upp mot
 * EN:s nycklar — så den är antingen ett stavfel eller en kvarleva.
 */
export function overflodiga(katalog) {
  return Object.keys(katalog).filter((n) => !arInvariant(n) && !(n in EN));
}

/** Andel av gränssnittet som finns på språket. */
export function tackning(kod) {
  const katalog = KATALOGER[kod];
  if (!katalog) return 0;
  const totalt = Object.keys(EN).filter((n) => !arInvariant(n)).length;
  return totalt === 0 ? 1 : (totalt - saknade(katalog).length) / totalt;
}

/**
 * Väljer språk ur det som finns att gå på.
 *
 * Ordningen är avsiktlig: användarens eget val väger tyngst, därefter
 * organisationens, därefter webbläsarens, sist engelska. Organisationen
 * går före webbläsaren därför att en verkstad i Tyskland med en polsk
 * tekniker ska kunna ha ett gemensamt dokumentationsspråk — rapporten ska
 * inte byta språk beroende på vem som råkade skriva raden.
 */
export function valjSprak({ anvandare, organisation, webblasare } = {}) {
  const kanda = new Set(SPRAK.map((s) => s.kod));
  const forsta = [anvandare, organisation, ...(webblasare ?? [])]
    .filter(Boolean)
    .map((k) => String(k).slice(0, 2).toLowerCase())
    .find((k) => kanda.has(k));
  return forsta ?? STANDARD;
}

/**
 * Besked om metodikinnehåll som inte är granskat på användarens språk.
 *
 * Returnerar null när allt är i sin ordning. Annars en text som säger
 * VAD som inte är granskat och VILKET språk texten faktiskt är på — inte
 * en allmän brasklapp, som ingen läser.
 */
export function metodikvarning(sprak) {
  const s = SPRAK.find((x) => x.kod === sprak);
  if (!s || s.granskat) return null;
  return t(sprak, "metodik.ogranskad", { sprak: s.egetNamn });
}
