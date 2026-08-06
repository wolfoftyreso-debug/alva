// ALVA-PROC-0002 · Abonnemang.
//
// ---- Hållningen ---------------------------------------------------------
//
// Vi litar på kunden. Det är inte en artighet utan ett designbeslut med
// följder: inget kort krävs, ingen förskottsbetalning, ingen spärr innan
// någon fått veta att något är obetalt. Kunden är en verkstad med
// anställda och kunder i sin tur — den försvinner inte över natten, och
// att behandla den som om den kunde det gör produkten sämre för alla som
// betalar i tid.
//
// Vid utebliven betalning varnar vi, räknar ned synligt, och låser sedan.
//
// ---- Vad en låsning ALDRIG får göra -------------------------------------
//
// Låsning stänger nya ärenden. Den rör inte historiken, och den får inte
// göra det.
//
// Skälet är inte generositet. Ärendeloggen är verkstadens underlag i en
// garanti- eller försäkringstvist som gäller DERAS kund — en tredje part
// som inte har någon del i vår obetalda faktura. Att göra det underlaget
// oåtkomligt vore att använda någon annans rättsliga ställning som
// påtryckningsmedel. Läsning och export förblir därför öppna i låst läge,
// och det är inte förhandlingsbart.
//
// ---- Gratis är en nivå, inte en provperiod ------------------------------
//
// Kontot startar på Free och stannar där tills någon väljer annat. En
// provperiod som tyst börjar kosta är samma sorts fälla som produkten
// finns för att undvika. Fakturan skapas ändå vid registreringen — på
// noll kronor — därför att den etablerar serien och visar kunden exakt
// vad den inte betalar för.

import { PRISLISTA } from "./fakturering.mjs";

/** Dagar efter förfallodagen innan låsning. Synlig nedräkning hela tiden. */
export const RESPITDAGAR = 14;

/**
 * Nivåerna.
 *
 * `basavgift` och `anvandaravgift` är i öre, som resten av faktureringen.
 * Värdena är PLATSHÅLLARE på samma villkor som PRISLISTA — mekanismen är
 * oberoende av dem.
 */
export const NIVAER = [
  {
    id: "free",
    namn: "Free",
    basavgift: 0,
    anvandaravgift: 0,
    maxAnvandare: 2,
    text: "Full method, full evidence model, full report. Two accounts.",
    ingar: [
      "The complete ALVA methodology and quality gate",
      "Append-only case log and evidence report",
      "Two active accounts",
    ],
    saknas: ["Fleet analytics", "Outgoing integrations", "Knowledge source connectors"],
  },
  {
    id: "standard",
    namn: "Standard",
    basavgift: PRISLISTA.plattform_ar / 12,
    anvandaravgift: PRISLISTA.anvandare_manad,
    maxAnvandare: null,
    text: "Platform fee plus a fee per active account.",
    ingar: [
      "Everything in Free, without the account limit",
      "Fleet analytics and fault-cause statistics",
      "Live Share with customer, partner and internal levels",
      "Instrument register with calibration tracking",
    ],
    saknas: ["Outgoing integrations", "Knowledge source connectors"],
  },
  {
    id: "premium",
    namn: "Premium",
    basavgift: (PRISLISTA.plattform_ar / 12) * 2,
    anvandaravgift: PRISLISTA.anvandare_manad,
    maxAnvandare: null,
    text: "For workshops that report into someone else's system.",
    ingar: [
      "Everything in Standard",
      "Outgoing integrations and event subscriptions",
      "Protocol ingest from external test equipment",
      "Knowledge source connectors",
    ],
    saknas: ["Dedicated instance", "Custom methodology authoring"],
  },
  {
    id: "enterprise",
    namn: "Enterprise",
    basavgift: null, // Avtalas. Inte "kontakta oss" som prissignal — det finns inget listpris.
    anvandaravgift: null,
    maxAnvandare: null,
    text: "Chains and fleets. Priced per agreement because the scope is.",
    ingar: [
      "Everything in Premium",
      "Own methodologies and own rule package",
      "Dedicated instance, own key management",
      "Signed rule package and audit support",
    ],
    saknas: [],
  },
];

export const nivaFor = (id) => NIVAER.find((n) => n.id === id) ?? NIVAER[0];

/** Abonnemangets tillstånd. Härlett, aldrig lagrat. */
export const TILLSTAND = ["aktiv", "varning", "last"];

/**
 * Tillståndet, härlett ur fakturorna.
 *
 * Tre utfall och inget fjärde:
 *
 *   aktiv    Inget är förfallet.
 *   varning  Något är förfallet men respiten löper. Nedräkningen visas.
 *   last     Respiten är slut.
 *
 * En faktura på noll kronor kan inte försätta någon i varning. Free-nivån
 * fakturerar noll, och en obetald nollfaktura är inte en skuld — den är
 * en bokföringspost. Att låsa någon för den vore absurt, och det är
 * precis den sortens absurditet som uppstår när tillståndet räknas fram
 * utan att någon tänkt på specialfallet.
 *
 * @param fakturor  [{ forfaller, totalt, status }]
 * @param nu        tidpunkt; injicerad för testbarhet
 */
export function abonnemangstillstand(fakturor = [], nu = new Date()) {
  const obetalda = fakturor.filter(
    (f) => f.status === "utfardad" && Number(f.totalt) > 0 && new Date(f.forfaller) < nu,
  );
  if (obetalda.length === 0) return { tillstand: "aktiv", dagarKvar: null, aldsta: null };

  // Den äldsta förfallna styr. Betalar kunden den senaste men inte den
  // första har respiten ändå löpt sedan den första.
  const aldsta = obetalda.reduce((a, b) => (new Date(a.forfaller) < new Date(b.forfaller) ? a : b));
  const forfalloDygn = Math.floor((nu - new Date(aldsta.forfaller)) / 86_400_000);
  const dagarKvar = RESPITDAGAR - forfalloDygn;

  return {
    tillstand: dagarKvar > 0 ? "varning" : "last",
    dagarKvar: Math.max(0, dagarKvar),
    aldsta: aldsta.beteckning ?? null,
    belopp: obetalda.reduce((s, f) => s + Number(f.totalt), 0),
  };
}

/**
 * Vad ett tillstånd tillåter.
 *
 * Läsning och export är sanna i ALLA tillstånd. Se filhuvudet — det är
 * verkstadens kunds underlag, inte verkstadens, och inte vårt.
 */
export function behorighet(tillstand) {
    const last = tillstand === "last";
  return {
    lasa: true,
    exportera: true,
    nyttArende: !last,
    dokumentera: !last,
    avsluta: !last,
  };
}

/**
 * Beskedet till kunden. Rak text, ingen förhandling, inget hot.
 *
 * Statusspråket gäller även här: ett konstaterande och vad som händer
 * härnäst.
 */
export function besked(status) {
  if (status.tillstand === "aktiv") return null;
  if (status.tillstand === "varning") {
    return (
      `Invoice ${status.aldsta} is past due. New cases can be started for ${status.dagarKvar} more ` +
      `day${status.dagarKvar === 1 ? "" : "s"}. Reading and export are never affected.`
    );
  }
  return (
    `Invoice ${status.aldsta} is past due and the grace period has ended. New cases cannot be started. ` +
    "Existing cases remain readable and exportable — that record belongs to your customer, not to us."
  );
}

/**
 * Nästa fakturaperiod.
 *
 * Månadsvis från registreringsdagen, inte från den första i månaden: en
 * organisation som registrerar sig den 20:e ska inte få en faktura på
 * elva dagar som sin första upplevelse av produkten.
 */
export function nastaPeriod(registrerad, senastFakturerad = null) {
  const start = new Date(senastFakturerad ?? registrerad);
  if (Number.isNaN(start.getTime())) return null;
  const fran = new Date(start);
  if (senastFakturerad) fran.setMonth(fran.getMonth() + 1);
  const till = new Date(fran);
  till.setMonth(till.getMonth() + 1);
  till.setDate(till.getDate() - 1);
  return { fran: fran.toISOString().slice(0, 10), till: till.toISOString().slice(0, 10) };
}

/** Är det dags att fakturera perioden? */
export function forfallenFakturering(registrerad, senastFakturerad, nu = new Date()) {
  const period = nastaPeriod(registrerad, senastFakturerad);
  if (!period) return null;
  return new Date(period.fran) <= nu ? period : null;
}
