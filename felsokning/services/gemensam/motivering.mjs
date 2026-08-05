// ALVA-RULE-200 · Closing statement.
//
// Ett ärende stängs aldrig utan att teknikern har lämnat ett varför.
//
// Det låter enkelt och är det inte. En obligatorisk fritextruta blir
// "klart" på tredje ärendet, och då har vi bara gjort dokumentationen
// långsammare utan att göra den bättre. Ett varför som ska hålla i en
// garantitvist måste vara strukturerat, kopplat till evidensen, och
// kvalitetsgranskat mot det som faktiskt skrivs när någon har bråttom.
//
// ---- Vad ett varför faktiskt består av -------------------------------
//
// Fyra frågor med olika adressat. De blandas i dag ihop till en enda
// rad i en arbetsorder, och det är därför verkstadsprotokoll är svåra
// att använda i efterhand:
//
//   MOTIVERING    Varför följer slutsatsen av evidensen?
//                 Läses av: nästa tekniker, försäkringsbedömaren.
//                 Detta är den rad som saknas i varje system jag sett.
//                 Underlaget säger VAD som mättes. Slutsatsen säger VAD
//                 som är fel. Ingenting säger varför det ena medför det
//                 andra — och det är precis det steget en bedömare
//                 behöver granska.
//
//   UTESLUTET     Vad övervägdes och varför föll det bort?
//                 Läses av: försäkringsbolaget, garantihandläggaren.
//                 En felsökning utan uteslutna alternativ är en gissning
//                 som råkade stämma. Härleds delvis ur loggen: en
//                 hypotes som dokumenterats och inte blev slutsatsen
//                 MÅSTE bemötas.
//
//   ÅTGÄRDSVAL    Varför denna åtgärd och inte en annan?
//                 Läses av: kunden, kostnadsgranskaren.
//                 Byte eller justering? Varför hela enheten?
//
//   KVARSTÅENDE   Vad är fortfarande osäkert?
//                 Läses av: nästa tekniker, flottansvarig.
//                 Får vara "inget" — men det måste sägas aktivt.
//
// ---- Den ärliga vägen -------------------------------------------------
//
// Ibland vet teknikern inte varför. Systemet måste ha en väg för det som
// inte är en lögn: orsaken kunde inte fastställas, och varför den inte
// kunde det. Det är också ett varför, och ofta ett mer användbart än en
// påhittad orsak.

/** Fraser som ser ut som svar men inte är det. */
const ICKESVAR = [
  "klart",
  "ok",
  "okej",
  "åtgärdat",
  "atgardat",
  "fixat",
  "se ovan",
  "se logg",
  "enligt ovan",
  "som vanligt",
  "trasig",
  "defekt",
  "sliten",
  "utsliten",
  "behöver bytas",
  "behover bytas",
  "byttes",
  "bytt",
  "enligt kund",
  "kunden sa",
  "vet ej",
  "ingen aning",
  "diverse",
  "allmänt slitage",
  "-",
  "n/a",
  "na",
];

// Ett resonemang innehåller ett därför. Utan orsakssamband är texten en
// omformulering av slutsatsen, inte ett skäl för den.
const ORSAKSORD = [
  "eftersom",
  "därför",
  "darfor",
  "beror",
  "orsakas",
  "orsakade",
  "medför",
  "medfor",
  "leder till",
  "ledde till",
  "vilket",
  "på grund av",
  "pga",
  "resulterar",
  "resulterade",
  "innebär",
  "innebar",
  "följaktligen",
  "foljaktligen",
  "till följd av",
  "förklarar",
  "forklarar",
  "stämmer överens",
  "stammer overens",
  "bekräftas av",
  "bekraftas av",
  "visar att",
  "utesluter",
];

export const MINSTA_MOTIVERING = 40;
export const MINSTA_KORT = 15;

const normalisera = (text) => String(text ?? "").trim().toLowerCase().replace(/\s+/g, " ");

/** Är texten ett icke-svar? Jämför mot hela fältet, inte delsträngar. */
function ärIckesvar(text) {
  const n = normalisera(text).replace(/[.!]+$/, "");
  return ICKESVAR.includes(n);
}

function harOrsakssamband(text) {
  const n = normalisera(text);
  return ORSAKSORD.some((ord) => n.includes(ord));
}

/**
 * Refererar texten till dokumenterad evidens? Godtar både uttryckliga
 * ord för underlag och konkreta mätvärden med enhet — den som skriver
 * "12,4 V vid stift 14" hänvisar till en mätning även utan att säga
 * ordet "mätning".
 */
function refererarEvidens(text) {
  const n = normalisera(text);
  const ord = ["mät", "mat", "foto", "bild", "video", "felkod", "avläs", "avlas", "prov", "test", "dokument", "historik", "kontroll"];
  const värde = /\d+([.,]\d+)?\s*(v|volt|a|ampere|ω|ohm|bar|kpa|mpa|nm|°c|c|mm|km|mil|%|g|hz|rpm|varv)\b/;
  return ord.some((o) => n.includes(o)) || värde.test(n);
}

/**
 * Granskar ett fält i slutsatsen.
 * @returns null när fältet duger, annars en förklaring till teknikern.
 */
export function granskaFalt(namn, text, { minsta = MINSTA_KORT, kravOrsak = false } = {}) {
  const rå = String(text ?? "").trim();
  if (!rå) return `${namn} saknas.`;
  if (ärIckesvar(rå)) {
    return `${namn}: "${rå}" är inget skäl. Beskriv vad som faktiskt gäller och varför.`;
  }
  if (rå.length < minsta) {
    return `${namn} är för kort (${rå.length} av minst ${minsta} tecken) för att gå att granska i efterhand.`;
  }
  if (kravOrsak && !harOrsakssamband(rå) && !refererarEvidens(rå)) {
    return `${namn} anger vad, men inte varför. Knyt slutsatsen till underlaget — vad i evidensen gör att det här följer?`;
  }
  return null;
}

/**
 * Hypoteser som dokumenterats men inte blivit slutsatsen.
 *
 * Härleds ur loggen: den som skrivit ned en misstanke och sedan landat i
 * något annat måste säga varför den föll bort. Det är den enskilda regel
 * som gör underlaget användbart för en försäkringsbedömare — utan den är
 * en felsökning en gissning som råkade stämma.
 */
export function obemottaHypoteser(handelser, slutsats) {
  const hypoteser = handelser.filter((h) => h?.typ === "hypotes").map((h) => h.text);
  if (hypoteser.length === 0) return [];

  const uteslutet = normalisera(slutsats?.uteslutet);
  const orsak = normalisera(
    [slutsats?.motivering, ...(handelser.filter((h) => h?.typ === "felorsak").map((h) => h.avvikelse) ?? [])].join(" "),
  );

  // En hypotes är bemött om något meningsbärande ord ur den återkommer i
  // uteslutandet eller i den fastställda orsaken. Trubbigt, men det
  // fångar den som skriver "uteslutet: inget" med tre öppna hypoteser i
  // loggen.
  return hypoteser.filter((text) => {
    const ord = normalisera(text)
      .split(/[^a-zåäöéü0-9]+/)
      .filter((o) => o.length >= 5);
    if (ord.length === 0) return false;
    return !ord.some((o) => uteslutet.includes(o) || orsak.includes(o));
  });
}

/**
 * Granskar hela slutsatsen inför avslut.
 *
 * @param slutsats  händelsen av typ "slutsats"
 * @param handelser hela loggen, för de regler som härleds ur den
 * @returns lista med brister; tom lista betyder godkänd
 */
export function granskaSlutsats(slutsats, handelser = []) {
  const brister = [];
  const lägg = (fält, text) => text && brister.push({ falt: fält, text });

  if (!slutsats) {
    return [
      {
        falt: "slutsats",
        text: "Ärendet kan inte avslutas utan en slutsats. Motivera varför slutsatsen följer av underlaget.",
      },
    ];
  }

  const fastställd = slutsats.orsakFastställd !== false;

  if (fastställd) {
    lägg("motivering", granskaFalt("Motivering", slutsats.motivering, { minsta: MINSTA_MOTIVERING, kravOrsak: true }));
  } else {
    // Den ärliga vägen. Att orsaken inte kunnat fastställas är ett
    // giltigt utfall — men varför den inte kunnat det är fortfarande ett
    // varför, och det måste stå där.
    lägg(
      "motivering",
      granskaFalt("Skäl till att orsaken inte fastställts", slutsats.motivering, {
        minsta: MINSTA_MOTIVERING,
        kravOrsak: true,
      }),
    );
  }

  lägg("uteslutet", granskaFalt("Uteslutna alternativ", slutsats.uteslutet, { minsta: MINSTA_KORT }));
  lägg("kvarstaende", granskaFalt("Kvarstående osäkerhet", slutsats.kvarstaende, { minsta: 5 }));

  const utfördArbete = handelser.some((h) => h?.typ === "atgard_utford" && h.utford === true);
  if (utfördArbete) {
    lägg("atgardsval", granskaFalt("Val av åtgärd", slutsats.atgardsval, { minsta: MINSTA_KORT, kravOrsak: true }));
  }

  for (const text of obemottaHypoteser(handelser, slutsats)) {
    brister.push({
      falt: "uteslutet",
      text: `Hypotesen "${text}" finns i loggen men bemöts inte. Ange varför den uteslöts, eller varför den kvarstår.`,
    });
  }

  return brister;
}
