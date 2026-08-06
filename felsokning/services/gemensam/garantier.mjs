// ALVA-SPEC-040 · Garantiregimer, EU och USA.
//
// ---- Vad den här modulen är, och inte är -------------------------------
//
// Den är beslutsstöd för verkstaden, inte juridisk rådgivning. Varje regel
// bär sin källa och det datum uppgiften kontrollerades, så att den som
// lutar sig mot den kan gå till originaltexten i stället för att tro på
// oss. En regel utan källa hör inte hemma här.
//
// ---- Den skiljelinje allt annat hänger på ------------------------------
//
// LAGSTADGAT och AVTALAT är inte samma sak, och blandas ihop dagligen i
// verkstadsledet.
//
//   Lagstadgat   Följer av lag eller förordning. Gäller oavsett vad någon
//                skrivit i ett garantihäfte. Går inte att avtala bort mot
//                en konsument.
//
//   Avtalat      Tillverkarens frivilliga löfte. Villkoren är dess egna
//                och varierar mellan märken, marknader och årsmodeller.
//
// Det som förvånar är hur lite av det verkstaden dagligen kallar "garanti"
// som faktiskt är lagstadgat:
//
//   NYBILSGARANTI      avtalad. Ingen lag i EU eller USA kräver den.
//   ROSTSKYDDSGARANTI  avtalad. Ingen lag kräver den, någonstans.
//   LACKGARANTI        avtalad.
//   DRIVLINEGARANTI    avtalad.
//   AVGASGARANTI       LAGSTADGAD i bägge jurisdiktionerna, med olika
//                      längd, och den är den enda av dem som är det.
//
// Att påstå att en rostskyddsgaranti är lagstadgad är alltså fel, och att
// tro att en avgasgaranti bara är en tillverkarutfästelse är fel åt andra
// hållet — det andra felet kostar kunden pengar.
//
// ---- Vad som INTE finns här --------------------------------------------
//
// Inga märkesvillkor. De är tusentals, ändras per årsmodell och marknad,
// och en föråldrad siffra här vore värre än ingen siffra alls. Modulen
// säger vad LAGEN kräver som golv och vilka kategorier av avtalade
// garantier som brukar finnas — inte vad ett visst märke lovar.

/** Datum då uppgifterna nedan senast kontrollerades mot källorna. */
export const KONTROLLERAD = "2026-08-06";

/**
 * Regimerna.
 *
 * `grund` skiljer lagstadgat från avtalat. `bärare` säger VEM som svarar —
 * en fråga verkstaden behöver besvara innan den ringer någon: säljaren
 * (EU:s konsumentköp) är sällan tillverkaren.
 */
export const REGIMER = [
  // ---- EU, lagstadgat ---------------------------------------------------
  {
    id: "EU-KONFORMITET",
    jurisdiktion: "EU",
    grund: "lag",
    bärare: "säljaren",
    rubrik: "Legal guarantee of conformity",
    kortform: "2 years minimum, seller liable",
    källa: "Directive (EU) 2019/771, Art. 10–11",
    källänk: "https://eur-lex.europa.eu/eli/dir/2019/771/oj/eng",
    period: { år: 2 },
    text:
      "The seller is liable for any lack of conformity existing at delivery that becomes apparent within two years. A lack of conformity appearing within one year is presumed to have existed at delivery — the seller must prove otherwise. Member States may set longer periods and may extend the reversed burden of proof to two years.",
    // Det här är det fel verkstaden gör oftast: skickar kunden till
    // tillverkaren för något som är säljarens ansvar.
    anmärkning:
      "This is a claim against the SELLER, not the manufacturer, and it exists independently of any manufacturer warranty.",
    avvikelser: [
      { marknad: "Sverige", text: "Three years (konsumentköplagen 2022:260), reversed burden of proof two years." },
      { marknad: "Frankrike, Portugal", text: "Reversed burden of proof extended to the full two years." },
    ],
  },
  {
    id: "EU-MVBER",
    jurisdiktion: "EU",
    grund: "lag",
    bärare: "tillverkaren",
    rubrik: "Servicing outside the authorised network does not void the warranty",
    kortform: "Independent servicing is protected",
    källa:
      "Regulation (EU) 461/2010, prolonged to 31 May 2028 by Regulation (EU) 2023/822; Supplementary Guidelines 2010/C 138/05",
    källänk: "https://eur-lex.europa.eu/eli/reg/2023/822/oj/eng",
    period: null,
    text:
      "A manufacturer may not make its warranty conditional on the vehicle being serviced within the authorised network for work not covered by the warranty, nor on the exclusive use of its own branded parts for such work. Warranty cover therefore survives servicing by an independent workshop, provided the work follows the manufacturer's specification and uses parts of matching quality.",
    anmärkning:
      "The rule that matters most to an independent workshop. Document the specification followed and the part quality — that documentation is what makes the protection usable if the claim is later contested.",
    avvikelser: [],
  },
  {
    id: "EU-AVGAS-EURO6",
    jurisdiktion: "EU",
    grund: "lag",
    bärare: "tillverkaren",
    rubrik: "Emissions durability — Euro 5/6",
    kortform: "5 years / 100 000 km in-service conformity",
    källa: "Regulation (EC) No 715/2007, Art. 4(2) and Annex VII",
    källänk: "https://eur-lex.europa.eu/eli/reg/2007/715/oj/eng",
    period: { år: 5, km: 100_000 },
    text:
      "In-service conformity is checked for up to 5 years or 100 000 km, whichever comes first. Durability testing of pollution control devices for type approval covers 160 000 km.",
    anmärkning:
      "A durability requirement on the manufacturer's type approval — not a consumer warranty in the US sense. It gives no direct claim to the owner; the corresponding owner-facing cover is contractual.",
    avvikelser: [],
  },
  {
    id: "EU-AVGAS-EURO7",
    jurisdiktion: "EU",
    grund: "lag",
    bärare: "tillverkaren",
    rubrik: "Emissions durability — Euro 7",
    kortform: "8 years / 160 000 km, plus 25 % additional lifetime",
    källa: "Regulation (EU) 2024/1257, Art. 5 and Annex IV",
    källänk: "https://eur-lex.europa.eu/eli/reg/2024/1257/oj/eng",
    period: { år: 8, km: 160_000 },
    text:
      "The main lifetime for M1 and N1 rises from 5 years/100 000 km to 8 years/160 000 km, with an additional lifetime of a further 25 % (to 10 years/200 000 km) governed by durability multipliers.",
    anmärkning:
      "Applies to new types from 29 November 2026 and to all new vehicles from 29 November 2027. A vehicle registered before those dates keeps the Euro 6 regime.",
    avvikelser: [],
  },
  {
    id: "EU-BATTERI-EURO7",
    jurisdiktion: "EU",
    grund: "lag",
    bärare: "tillverkaren",
    rubrik: "Battery durability — Euro 7",
    kortform: "≥80 % at 5 y/100 000 km, ≥72 % at 8 y/160 000 km",
    källa: "Regulation (EU) 2024/1257, Art. 8 and Annex VII",
    källänk: "https://eur-lex.europa.eu/eli/reg/2024/1257/oj/eng",
    period: { år: 8, km: 160_000 },
    text:
      "For passenger cars (M1) the battery must retain at least 80 % of its energy storage capability after 5 years or 100 000 km, and not fall below 72 % after 8 years or 160 000 km.",
    anmärkning:
      "A type-approval durability requirement. A measured State of Health below the threshold is evidence in a claim, not a claim in itself — and it must be measured with a traceable instrument to carry that weight.",
    avvikelser: [],
  },

  // ---- USA, lagstadgat --------------------------------------------------
  {
    id: "US-AVGAS-PRESTANDA",
    jurisdiktion: "US",
    grund: "lag",
    bärare: "tillverkaren",
    rubrik: "Federal emissions performance warranty",
    kortform: "2 years / 24 000 miles",
    källa: "Clean Air Act § 207, 42 U.S.C. § 7541; 40 CFR Part 85 Subpart V",
    källänk: "https://www.ecfr.gov/current/title-40/chapter-I/subchapter-C/part-85/subpart-V",
    period: { år: 2, miles: 24_000 },
    text:
      "The manufacturer must repair, at no cost, a vehicle that fails an approved emissions test during the first 2 years or 24 000 miles because of a defect in an emission control component.",
    anmärkning:
      "Runs from the date of sale to the first owner and follows the vehicle — a later owner inherits the remaining period.",
    avvikelser: [],
  },
  {
    id: "US-AVGAS-HUVUDDELAR",
    jurisdiktion: "US",
    grund: "lag",
    bärare: "tillverkaren",
    rubrik: "Federal warranty — specified major emission control components",
    kortform: "8 years / 80 000 miles",
    källa: "Clean Air Act § 207(i); 40 CFR § 85.2103",
    källänk: "https://www.ecfr.gov/current/title-40/chapter-I/subchapter-C/part-85/subpart-V/section-85.2103",
    period: { år: 8, miles: 80_000 },
    text:
      "Specified major emission control components carry 8 years or 80 000 miles. For light-duty vehicles, light-duty trucks and medium-duty passenger vehicles these include catalytic converters, SCR catalysts and related components, and particulate filters and traps, on both spark-ignition and compression-ignition engines.",
    anmärkning:
      "Routinely missed. A catalytic converter on a six-year-old vehicle is frequently quoted to the customer as a paid repair when it is not one.",
    avvikelser: [],
  },
  {
    id: "US-MMWA",
    jurisdiktion: "US",
    grund: "lag",
    bärare: "tillverkaren",
    rubrik: "No tie-in: aftermarket parts and independent service",
    kortform: "Warranty cannot require branded parts or dealer service",
    källa: "Magnuson–Moss Warranty Act, 15 U.S.C. § 2302(c)",
    källänk: "https://www.law.cornell.edu/uscode/text/15/2302",
    period: null,
    text:
      "A warrantor may not condition a written or implied warranty on the consumer using an article or service identified by brand or corporate name, unless it is provided free of charge or the FTC has granted a waiver.",
    anmärkning:
      "The US counterpart to the MVBER rule. Denying a claim requires the manufacturer to show that a specific part actually caused the failure — which is a question of evidence, and therefore a question of what the workshop documented.",
    avvikelser: [],
  },
  {
    id: "US-CA-AVGAS",
    jurisdiktion: "US-CA",
    grund: "lag",
    bärare: "tillverkaren",
    rubrik: "California emissions warranty",
    kortform: "3 y/50 000 mi, high-priced parts 7 y/70 000 mi",
    källa: "13 CCR §§ 2035–2039 (CARB)",
    källänk: "https://www.law.cornell.edu/regulations/california/13-CCR-2039",
    period: { år: 3, miles: 50_000 },
    text:
      "Emission-related parts are warranted 3 years or 50 000 miles. A single warranted part above an annually indexed cost threshold is covered 7 years or 70 000 miles. The threshold was USD 770 for model year 2025.",
    anmärkning:
      "Applies in California and in the states that have adopted CARB standards — always check which regime the individual vehicle was certified to before quoting the federal figures.",
    avvikelser: [],
  },
  {
    id: "US-CA-BATTERI",
    jurisdiktion: "US-CA",
    grund: "lag",
    bärare: "tillverkaren",
    rubrik: "California ZEV battery warranty — Advanced Clean Cars II",
    kortform: "≥70 % SoH at 8 y/100 000 mi (MY2026–2030)",
    källa: "Advanced Clean Cars II, 13 CCR § 1962.4 (CARB)",
    källänk: "https://ww2.arb.ca.gov/resources/fact-sheets/california-vehicle-and-emissions-warranty-periods",
    period: { år: 8, miles: 100_000 },
    text:
      "For model years 2026–2030 the battery must be warranted to retain at least 70 % of certified State of Health for 8 years or 100 000 miles; from model year 2031 the floor rises to 75 %. Propulsion-related parts follow the 3 y/50 000 mi and 7 y/70 000 mi structure.",
    anmärkning: "Separate from the durability requirement that range be retained over 10 years/150 000 miles.",
    avvikelser: [],
  },

  // ---- Avtalade kategorier ----------------------------------------------
  //
  // Ingen av dem har lagstöd. De tas med därför att de är vad kunden MENAR
  // när den säger garanti, och verkstaden måste kunna säga vilket slag av
  // löfte den talar om. Spannen är vad som förekommer på marknaden, inte
  // vad något märke utfäster.
  {
    id: "AVTAL-NYBIL",
    jurisdiktion: "EU/US",
    grund: "avtal",
    bärare: "tillverkaren",
    rubrik: "New-vehicle warranty",
    kortform: "Typically 2–7 years — contractual, not statutory",
    källa: "Manufacturer's own warranty terms",
    källänk: null,
    period: null,
    text:
      "The manufacturer's general warranty against defects. Length, mileage cap and exclusions are set by the manufacturer and vary by brand, market and model year.",
    anmärkning:
      "No law in the EU or the US requires it. In the EU it sits on top of the statutory conformity right against the seller and cannot reduce it.",
    avvikelser: [],
  },
  {
    id: "AVTAL-ROST",
    jurisdiktion: "EU/US",
    grund: "avtal",
    bärare: "tillverkaren",
    rubrik: "Corrosion / anti-perforation warranty",
    kortform: "Typically 6–12 years — contractual, not statutory",
    källa: "Manufacturer's own warranty terms",
    källänk: null,
    period: null,
    text:
      "Cover against rust perforation from the inside out. Usually excludes surface corrosion, stone-chip damage and rust caused by unrepaired accident damage, and is commonly conditioned on documented periodic inspection.",
    anmärkning:
      "There is no statutory corrosion warranty anywhere in the EU or the US. The inspection condition is the usual reason a claim is refused — which makes the inspection record the decisive evidence.",
    avvikelser: [],
  },
  {
    id: "AVTAL-LACK",
    jurisdiktion: "EU/US",
    grund: "avtal",
    bärare: "tillverkaren",
    rubrik: "Paint warranty",
    kortform: "Typically 2–3 years — contractual, not statutory",
    källa: "Manufacturer's own warranty terms",
    källänk: null,
    period: null,
    text: "Cover against paint defects. Normally separate from, and shorter than, the corrosion warranty.",
    anmärkning: "",
    avvikelser: [],
  },
  {
    id: "AVTAL-DRIVLINA",
    jurisdiktion: "EU/US",
    grund: "avtal",
    bärare: "tillverkaren",
    rubrik: "Powertrain warranty",
    kortform: "Varies — contractual, not statutory",
    källa: "Manufacturer's own warranty terms",
    källänk: null,
    period: null,
    text:
      "Engine, transmission and driveline cover, often longer than the general new-vehicle warranty and frequently conditioned on servicing at the prescribed intervals.",
    anmärkning:
      "The service-interval condition is legitimate — what is not legitimate is requiring that the service be performed by the authorised network (MVBER; Magnuson–Moss § 2302(c)).",
    avvikelser: [],
  },
  {
    id: "AVTAL-BATTERI",
    jurisdiktion: "EU/US",
    grund: "avtal",
    bärare: "tillverkaren",
    rubrik: "Traction battery warranty",
    kortform: "Commonly 8 years / 160 000 km with a State of Health floor",
    källa: "Manufacturer's own warranty terms",
    källänk: null,
    period: null,
    text:
      "Commercial cover for the traction battery, usually expressed as a period plus a retained State of Health, often around 70 %.",
    anmärkning:
      "Sits alongside the statutory durability requirements (Euro 7 in the EU, ACC II in California) and is frequently more generous than them.",
    avvikelser: [],
  },
];

/** Jurisdiktioner som går att välja. `US-CA` ärver de federala reglerna. */
export const JURISDIKTIONER = [
  { id: "EU", namn: "European Union" },
  { id: "US", namn: "United States (federal)" },
  { id: "US-CA", namn: "United States — California / CARB states" },
];

/**
 * Regimer som gäller för en jurisdiktion.
 *
 * Kalifornien ÄRVER de federala reglerna och lägger sina egna ovanpå.
 * Att visa enbart de kaliforniska hade utelämnat Magnuson–Moss, som är
 * den regel verkstaden behöver mest av alla.
 */
export function regimerFor(jurisdiktion) {
  const gäller = (r) => {
    if (r.jurisdiktion === "EU/US") return true;
    if (jurisdiktion === "US-CA") return r.jurisdiktion === "US" || r.jurisdiktion === "US-CA";
    return r.jurisdiktion === jurisdiktion;
  };
  return REGIMER.filter(gäller);
}

/**
 * Vilka LAGSTADGADE regimer ett visst fordon fortfarande ligger inom.
 *
 * Returnerar tre listor i stället för ett filtrerat urval, därför att
 * "utanför" och "går inte att avgöra" är olika besked och bara det ena
 * betyder att kunden ska betala. Saknas ålder eller mätarställning
 * hamnar regimen under `oklart` — aldrig under `utanfor`. Att påstå att
 * en garanti har gått ut när underlaget inte räcker är precis den sortens
 * obefogade säkerhet produkten finns för att undvika.
 *
 * @param jurisdiktion  "EU" | "US" | "US-CA"
 * @param fordon        { alderAr?, km?, miles? }
 */
export function mojligenGallande(jurisdiktion, fordon = {}) {
  const inom = [];
  const utanfor = [];
  const oklart = [];

  for (const r of regimerFor(jurisdiktion)) {
    if (r.grund !== "lag") continue;
    if (!r.period) {
      // Regler utan tidsgräns — MVBER, Magnuson–Moss — gäller alltid.
      inom.push(r);
      continue;
    }

    const bedömningar = [];
    if (typeof r.period.år === "number") {
      bedömningar.push(typeof fordon.alderAr === "number" ? fordon.alderAr <= r.period.år : null);
    }
    if (typeof r.period.km === "number") {
      const km = fordon.km ?? (typeof fordon.miles === "number" ? fordon.miles * 1.609344 : null);
      bedömningar.push(typeof km === "number" ? km <= r.period.km : null);
    }
    if (typeof r.period.miles === "number") {
      const miles = fordon.miles ?? (typeof fordon.km === "number" ? fordon.km / 1.609344 : null);
      bedömningar.push(typeof miles === "number" ? miles <= r.period.miles : null);
    }

    // Perioderna är "whichever comes first": ett överskridet mått räcker
    // för att regimen ska vara passerad, oavsett vad det andra säger.
    if (bedömningar.some((b) => b === false)) utanfor.push(r);
    else if (bedömningar.some((b) => b === null)) oklart.push(r);
    else inom.push(r);
  }

  return { inom, utanfor, oklart };
}

/**
 * Det verkstaden behöver få veta oavsett ärende.
 *
 * Bägge jurisdiktionerna har en regel som säger samma sak: att arbetet
 * utförs här upphäver inte garantin. Den är värd att lyfta separat,
 * eftersom motsatsen ofta påstås — och ibland av kunden själv.
 */
export function skyddadReparation(jurisdiktion) {
  return regimerFor(jurisdiktion).find((r) => r.id === (jurisdiktion === "EU" ? "EU-MVBER" : "US-MMWA")) ?? null;
}

/** Förbehållet. Står i varje vy som visar regimerna. */
export const FORBEHALL =
  "Decision support, not legal advice. Figures are statutory minimums verified against the cited sources on " +
  `${KONTROLLERAD}; contractual warranties are set by the manufacturer and are not reproduced here. ` +
  "Verify against the current text of the cited instrument before relying on it in a dispute.";
