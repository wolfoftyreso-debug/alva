// ALVA-SPEC-041 · Försäkringsvillkor som underlag.
//
// ---- Varför den här modulen aldrig svarar ja eller nej ------------------
//
// Den avgör ingenting. Den kan inte avgöra något, och en version som såg
// ut att göra det vore skadlig på ett sätt som inte märks förrän någon
// förlitat sig på den.
//
// Skälet är inte försiktighet utan sakförhållandet: vad som gäller
// bestäms av KUNDENS EGET försäkringsbrev och de villkor som gällde när
// avtalet tecknades — inte av vad ett bolag skriver på sin webbplats i
// dag, och inte av vad vi noterat. Samma bolag har flera produkter med
// olika gränser, gränserna ändras, och ett tecknat avtal följer sina egna
// villkor även efter att bolaget ändrat dem.
//
// Modulen ger därför tre saker och inte ett fjärde:
//
//   1. VAD SOM AVGÖR frågan — de villkorstyper som styr maskinskada,
//      oberoende av bolag. Den delen är stabil.
//   2. VAD REGISTRET SÄGER — noterade gränser per bolag och produkt, med
//      källa och datum. Underlag för ett samtal, inte ett besked.
//   3. VAD SOM MÅSTE KONTROLLERAS i det enskilda fallet.
//
// Det fjärde — ett utfall — finns inte, och `bedom()` returnerar med
// avsikt inget fält som liknar ett.
//
// ---- Registrets hållbarhet ----------------------------------------------
//
// Uppgifterna nedan är avlästa från bolagens egna sidor vid det datum som
// står på varje post. De åldras. En post äldre än GILTIGHETSTID_DAGAR
// märks som föråldrad i gränssnittet i stället för att tigas ihjäl —
// en gammal siffra som ser aktuell ut är värre än ingen siffra.
//
// Organisationen kan lägga till bolag och produkter. Ett register som
// bara vi fyller kommer aldrig att täcka de mindre bolagen.

/** En post äldre än så här märks som föråldrad. */
export const GILTIGHETSTID_DAGAR = 180;

/**
 * Vad som avgör en maskinskadefråga, oavsett bolag.
 *
 * Den här listan är modulens stabila del. Gränserna nedanför ändras;
 * frågorna gör det inte.
 */
export const AVGORANDE_VILLKOR = [
  {
    id: "alder",
    rubrik: "Vehicle age",
    fraga: "Is the vehicle within the age limit of the policy in force?",
    text: "Machine damage cover ends at an age limit that differs by insurer and by product tier within the same insurer.",
  },
  {
    id: "stracka",
    rubrik: "Odometer",
    fraga: "Is the recorded distance within the limit?",
    text: "Age and distance are alternative ceilings — whichever is reached first ends the cover. The odometer reading therefore has to be documented, not estimated.",
  },
  {
    id: "plotsligt",
    rubrik: "Sudden and unforeseen",
    fraga: "Is the failure sudden and unforeseen, rather than gradual?",
    text: "Machine damage cover is written for sudden internal failure. Gradual deterioration, wear and ageing are normally excluded — and this is the exclusion most claims turn on.",
  },
  {
    id: "komponent",
    rubrik: "Component in scope",
    fraga: "Is the failed component named in the policy's list?",
    text: "Cover is usually limited to an enumerated list — powertrain, steering, brake and electrical systems are common; wear parts, exhaust and bodywork usually are not.",
  },
  {
    id: "underhall",
    rubrik: "Maintenance history",
    fraga: "Has the vehicle been serviced according to the manufacturer's schedule?",
    text: "Neglected or undocumented servicing is a common ground for reduction or refusal. The service record is evidence, and its absence is also evidence.",
  },
  {
    id: "orsak",
    rubrik: "Excluded cause",
    fraga: "Was the failure caused by something the policy excludes?",
    text: "Wrong fuel, lack of oil or coolant, frost damage, tuning or modification, competition use and consequential damage from an earlier unrepaired fault are typical exclusions.",
  },
  {
    id: "sjalvrisk",
    rubrik: "Deductible",
    fraga: "What is the deductible, and does it exceed the repair cost?",
    text: "Deductibles are often graded by vehicle age. A claim below the deductible is not worth filing, and saying so early is part of the service.",
  },
];

/**
 * Noterade gränser per bolag och produkt.
 *
 * `kontrollerad` är avläsningsdatum, inte giltighetsdatum. Ingen post här
 * uttalar sig om vad som gäller för en enskild kund.
 */
export const BOLAG = [
  {
    id: "if",
    namn: "If",
    marknad: "SE",
    produkter: [
      { namn: "Maskinskadeförsäkring", maxAlderAr: 10, maxMil: 12_000 },
      { namn: "Stor bilförsäkring", maxAlderAr: 10, maxMil: 15_000 },
    ],
    kalla: "https://www.if.se/privat/forsakringar/bilforsakring/maskinskadeforsakring",
    kontrollerad: "2026-08-06",
  },
  {
    id: "folksam",
    namn: "Folksam",
    marknad: "SE",
    produkter: [
      { namn: "Maskinskadeförsäkring", maxAlderAr: 8, maxMil: 15_000 },
      { namn: "Bilförsäkring Stor", maxAlderAr: 10, maxMil: 15_000 },
    ],
    kalla: "https://www.folksam.se/forsakringar/bilforsakring/maskinskadeforsakring",
    kontrollerad: "2026-08-06",
  },
  {
    id: "trygghansa",
    namn: "Trygg-Hansa",
    marknad: "SE",
    produkter: [
      { namn: "Maskinskadeförsäkring", maxAlderAr: 8, maxMil: 12_000 },
      { namn: "Bilförsäkring stor / märkesförsäkring", maxAlderAr: 10, maxMil: 15_000 },
    ],
    kalla: "https://www.trygghansa.se/forsakringar/bilforsakring/maskinskadeforsakring",
    kontrollerad: "2026-08-06",
  },
  {
    id: "svedea",
    namn: "Svedea",
    marknad: "SE",
    produkter: [{ namn: "Maskinskadeförsäkring", maxAlderAr: 10, maxMil: 15_000 }],
    kalla: "https://www.svedea.se/bilforsakring/maskinskadeforsakring",
    kontrollerad: "2026-08-06",
  },
  {
    id: "watercircles",
    namn: "WaterCircles",
    marknad: "SE",
    produkter: [{ namn: "Maskinskadeförsäkring", maxAlderAr: 12, maxMil: 17_000 }],
    kalla: "https://www.watercircles.se/tips-och-rad/maskinskadeforsakring/10925/",
    kontrollerad: "2026-08-06",
  },
  {
    id: "hedvig",
    namn: "Hedvig",
    marknad: "SE",
    produkter: [{ namn: "Maskinskadeskydd", maxAlderAr: 8, maxMil: 12_000 }],
    kalla: "https://www.hedvig.com/se/forsakringar/bilforsakring/maskinskadeforsakring",
    kontrollerad: "2026-08-06",
  },
];

/** Är posten äldre än giltighetstiden? */
export function foraldrad(post, nu = new Date()) {
  const d = new Date(post.kontrollerad);
  if (Number.isNaN(d.getTime())) return true;
  return (nu - d) / 86_400_000 > GILTIGHETSTID_DAGAR;
}

/** Bredaste och smalaste noterade gräns — spannet, inte ett svar. */
export function spann(bolag = BOLAG) {
  const produkter = bolag.flatMap((b) => b.produkter);
  if (produkter.length === 0) return null;
  return {
    alderAr: { minsta: Math.min(...produkter.map((p) => p.maxAlderAr)), storsta: Math.max(...produkter.map((p) => p.maxAlderAr)) },
    mil: { minsta: Math.min(...produkter.map((p) => p.maxMil)), storsta: Math.max(...produkter.map((p) => p.maxMil)) },
  };
}

/**
 * Underlag för ett samtal med kunden. INTE ett utfall.
 *
 * Returnerar avsiktligt inget fält som säger täckt eller ej. Det som
 * returneras är: vilka noterade produkter fordonet ligger inom respektive
 * utanför, vilka frågor som återstår, och det obligatoriska nästa steget
 * — att läsa kundens eget försäkringsbrev.
 *
 * Ett fordon som ligger utanför SAMTLIGA noterade gränser får ändå inget
 * "nej". Registret kan vara ofullständigt, produkten kan vara en annan,
 * och villkoren vid tecknandet kan ha varit andra.
 */
export function bedom({ alderAr, mil, bolagId } = {}, register = BOLAG, nu = new Date()) {
  const urval = bolagId ? register.filter((b) => b.id === bolagId) : register;

  const inom = [];
  const utanfor = [];
  const oklart = [];

  for (const b of urval) {
    for (const p of b.produkter) {
      const post = { bolag: b.namn, produkt: p.namn, gransAr: p.maxAlderAr, gransMil: p.maxMil, kalla: b.kalla, foraldrad: foraldrad(b, nu) };
      const alderKant = typeof alderAr === "number";
      const milKant = typeof mil === "number";
      if (!alderKant && !milKant) {
        oklart.push(post);
        continue;
      }
      const overAlder = alderKant && alderAr > p.maxAlderAr;
      const overMil = milKant && mil > p.maxMil;
      if (overAlder || overMil) utanfor.push(post);
      else if (alderKant && milKant) inom.push(post);
      else oklart.push(post);
    }
  }

  return {
    inom,
    utanfor,
    oklart,
    // Frågorna som återstår oavsett vad gränserna säger. Ålder och
    // sträcka är bara två av sju, och de fem andra avgör oftare.
    kvarstaende: AVGORANDE_VILLKOR.filter((v) => !["alder", "stracka"].includes(v.id)),
    nastaSteg:
      "Read the customer's own policy document and the terms in force when it was taken out. The register is a starting point for the conversation, never the answer.",
  };
}

/** Förbehållet. Ska stå i varje vy som visar registret. */
export const FORBEHALL =
  "ALVA does not decide whether a claim is covered and cannot do so. Cover is determined by the customer's own " +
  "policy and the terms in force when it was taken out — not by this register, which records what insurers " +
  "published on the dates shown. Figures age, insurers differ between their own product tiers, and an existing " +
  "policy keeps its original terms. Use this to frame the conversation and the questions; the insurer decides.";
