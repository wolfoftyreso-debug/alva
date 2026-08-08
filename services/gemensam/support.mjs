// ALVA-PROC-0050 · Felanmälan och supportärenden.
//
// ---- Varför anmälan sitter i ärendet ------------------------------------
//
// En felanmälan som skrivs någon annanstans än där felet uppstod tappar
// det som gör den användbar. Teknikern minns inte ärendenumret, vet inte
// vilken metodik som kördes, och kan inte plattformsversionen — så
// anmälan blir "det funkar inte" och supporten får börja med att fråga
// tillbaka. Två dagar går innan någon vet vad som hände.
//
// Sammanhanget HÄRLEDS därför i stället för att skrivas in: ärende,
// metodik, plattformsversion, spår-id och vilket steg som var öppet. Det
// är samma hållning som mot sammanfattningen och fakturan — det som går
// att härleda ska inte skrivas av.
//
// ---- Status är en projektion --------------------------------------------
//
// Anmälan är oföränderlig. Det som händer med den — svar, statusbyten —
// är egna poster, och statusen härleds ur dem. Samma skäl som för
// fakturan: en anmälan vars historia kan skrivas om är inte ett underlag
// när någon senare frågar hur länge felet var känt.

/** ALVA-SUP-0001 */
export const supportbeteckning = (nummer) => `ALVA-SUP-${String(nummer).padStart(4, "0")}`;

/**
 * Vad anmälan gäller.
 *
 * Skilt åt därför att de har olika brådska och olika mottagare. En
 * felanmälan om systemet mitt i ett ärende blockerar arbete just nu;
 * ett förbättringsförslag gör det inte, och att blanda dem gör att
 * bägge behandlas som det senare.
 */
export const TYPER = [
  { id: "felanmalan", rubrik: "Fault report", text: "The platform did something wrong, or stopped working." },
  { id: "fraga", rubrik: "Question", text: "The methodology or the rules are unclear in this case." },
  { id: "forbattring", rubrik: "Improvement", text: "Something works, but could work better." },
];

/**
 * Tillstånden. Ordningen är enkelriktad — utom att en stängd anmälan kan
 * öppnas igen, vilket händer när felet visar sig inte vara borta.
 */
export const STATUSAR = ["mottagen", "under_arbete", "atgardad", "stangd"];

/**
 * Statusen härleds ur inläggen, den lagras inte.
 *
 * Senaste statusposten gäller. Saknas statusposter är anmälan mottagen —
 * det är vad den är i det ögonblick den skapas, och ingenting behöver
 * skrivas för att det ska bli sant.
 */
export function supportstatus(inlagg = []) {
  const senaste = [...inlagg].filter((i) => i?.typ === "status" && STATUSAR.includes(i.status)).pop();
  return senaste?.status ?? "mottagen";
}

/**
 * Granskar en anmälan innan den tas emot.
 *
 * Kraven är låga med flit. En tröskel som gör det jobbigt att anmäla ger
 * färre anmälningar, inte färre fel — och de fel som inte anmäls är de
 * som lever längst. Men en rubrik som "fel" och en tom beskrivning gör
 * anmälan obrukbar för den som ska svara, så det finns ett golv.
 */
export function granskaAnmalan({ typ, rubrik, beskrivning } = {}) {
  if (!TYPER.some((t) => t.id === typ)) return "Ange vad anmälan gäller.";
  if (typeof rubrik !== "string" || rubrik.trim().length < 5) {
    return "Rubriken behöver säga vad det gäller — minst fem tecken.";
  }
  if (rubrik.trim().length > 200) return "Rubriken är för lång (max 200 tecken).";
  if (typeof beskrivning !== "string" || beskrivning.trim().length < 20) {
    return "Beskriv vad som hände och vad du väntade dig — minst tjugo tecken. Den som ska svara ser inte din skärm.";
  }
  if (beskrivning.length > 20_000) return "Beskrivningen är för lång (max 20 000 tecken).";
  return null;
}

/**
 * Sammanhanget, härlett ur det som redan finns.
 *
 * Fälten är medvetet få och tekniska. Ingenting identifierande om
 * fordonet eller kunden följer med: en supportanmälan är inte ett skäl
 * att flytta personuppgifter till ett annat system, och den som svarar
 * behöver dem inte för att läsa ett spår.
 */
export function sammanhang({ arendeId, metodikId, steg, plattformsversion, sparId, klient } = {}) {
  const ut = {};
  if (arendeId) ut.arende = String(arendeId);
  if (metodikId) ut.metodik = String(metodikId);
  if (steg) ut.steg = String(steg);
  if (plattformsversion) ut.plattform = String(plattformsversion);
  if (sparId) ut.spar = String(sparId);
  if (klient) ut.klient = String(klient).slice(0, 200);
  return ut;
}

/** Fälten som ALDRIG får följa med en anmälan. Låst av test. */
export const FORBJUDET_I_SAMMANHANG = [
  "identifierare",
  "regnr",
  "vin",
  "agare",
  "kund",
  "personnummer",
  "telefon",
  "epost",
];
