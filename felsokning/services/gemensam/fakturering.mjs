// ALVA-PROC-0001 · Fakturering.
//
// ---- Varför fakturan skapas här och inte hos en betalleverantör -------
//
// ALVA säljs inte över disk. Aktiveringssekvensen på webbplatsen säger
// det redan: ansökan granskas, faktura utfärdas, betalning registreras,
// organisationen aktiveras. Det finns ingen kassa att gå igenom, och
// därför ingen betalleverantör att fråga vad kunden ska betala.
//
// Det betyder att beloppet måste komma någonstans ifrån, och det enda
// hållbara stället är organisationens faktiska tillstånd: hur många
// aktiva användare den har, vilken licensperiod som gäller, vilka
// moduler som är påslagna. En summa någon skriver in för hand kan säga
// emot verkligheten. En summa som härleds kan inte det.
//
// Samma resonemang som sammanfattningen (ALVA-PROC-0030): härledd, inte
// inmatad. Det är också det som gör fakturan granskbar i efterhand —
// underlaget står i raderna, inte i någons minne.
//
// ---- Vad som INTE finns här -------------------------------------------
//
// Ingen betalningshantering, inga kortuppgifter, ingen extern tjänst.
// Betalning registreras av en administratör när pengarna kommit in.
// Systemet påstår aldrig att något är betalt utan att en människa sagt
// det, av samma skäl som en kontroll aldrig är verifierad utan evidens.
//
// ---- Oföränderlighet ---------------------------------------------------
//
// En utfärdad faktura ändras aldrig. Blev den fel utfärdas en
// kreditfaktura som pekar på den, och en ny. Det är samma regel som för
// händelseloggen: en felaktig post rättas inte, den bemöts.

/**
 * Prislistan.
 *
 * Beloppen är i minsta valutaenhet (öre) för att undvika flyttalsfel —
 * en faktura får aldrig avrunda fel åt något håll.
 *
 * VÄRDENA NEDAN ÄR PLATSHÅLLARE och ska sättas av produktägaren per
 * marknad. Mekanismen är oberoende av dem: byt siffror, och varje
 * kommande faktura följer med.
 */
export const PRISLISTA = {
  valuta: "SEK",
  /** Plattformslicens, per organisation och år. */
  plattform_ar: 2_400_000,
  /** Användarlicens, per aktiv användare och månad. */
  anvandare_manad: 39_000,
  /** Tillval, per modul och år. */
  moduler: {
    forsakringsrapportering: { namn: "Insurance reporting", ar: 600_000 },
    flottanalys: { namn: "Fleet analytics", ar: 960_000 },
    kunskapskallor_oem: { namn: "OEM knowledge sources", ar: 1_440_000 },
  },
  /** Mervärdesskatt. 25 % är svensk normalskattesats. */
  momssats: 0.25,
  /** Betalningsvillkor i dagar. */
  betalningsvillkor: 30,
};

/** Fakturans tillstånd. Ordningen är enkelriktad utom kredit. */
export const FAKTURASTATUS = ["utfardad", "betald", "krediterad"];

/**
 * Statusen är en projektion, inte en kolumn.
 *
 * Följden av att en utfärdad faktura aldrig ändras: "betald" kan inte
 * skrivas ovanpå "utfärdad". Betalningen är en händelse som inträffar
 * efteråt, och tillståndet härleds ur händelserna — samma förhållande
 * som mellan ärendets tillstånd och dess logg.
 *
 * Kreditering väger tyngst. En krediterad faktura som också hunnit bli
 * betald är fortfarande krediterad; det är återbetalningen som är kvar
 * att göra, och den frågan besvaras inte av ett statusfält.
 *
 * @param poster  [{ typ: "betald" | "krediterad", ... }]
 */
export function fakturastatus(poster = []) {
  if (poster.some((p) => p?.typ === "krediterad")) return "krediterad";
  if (poster.some((p) => p?.typ === "betald")) return "betald";
  return "utfardad";
}

/**
 * Granskar en fakturaperiod innan något härleds ur den.
 *
 * En bakvänd period ger noll månader i manaderMellan(), vilket tyst
 * skulle bli en faktura utan användarrad i stället för ett fel. Den
 * sortens tystnad är värre än ett avslag: fakturan ser rimlig ut.
 *
 * Returnerar en felsträng, eller null när perioden duger.
 */
export function granskaPeriod(period) {
  const datum = (v) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));
  if (!period || !datum(period.fran) || !datum(period.till)) {
    return "Perioden kräver fran och till som datum (ÅÅÅÅ-MM-DD).";
  }
  if (new Date(period.till) < new Date(period.fran)) {
    return "Perioden slutar före den börjar.";
  }
  // Ett tak finns för att ett skrivfel i årtalet inte ska bli en faktura
  // på nittio år. Fem år rymmer varje rimlig licensperiod.
  if (manaderMellan(period.fran, period.till) > 60) {
    return "Perioden är längre än fem år — kontrollera datumen.";
  }
  return null;
}

/**
 * Beräknar fakturarader ur organisationens tillstånd.
 *
 * Varje rad bär sitt underlag — antal, à-pris och vad antalet kommer
 * ifrån. En granskare ska kunna se varför summan blev den den blev utan
 * att fråga någon.
 *
 * @param org        { namn, licensstart, moduler: string[] }
 * @param aktiva     antal aktiva användare i organisationen
 * @param period     { fran: "2026-01-01", till: "2026-12-31" }
 * @param prislista  valfri; standard är PRISLISTA
 */
export function fakturarader(org, aktiva, period, prislista = PRISLISTA) {
  const rader = [];
  const månader = manaderMellan(period.fran, period.till);

  rader.push({
    benamning: "Platform license",
    underlag: `${org?.namn ?? "Organization"} · ${period.fran} – ${period.till}`,
    antal: 1,
    enhet: "organization/year",
    apris: prislista.plattform_ar,
    belopp: prislista.plattform_ar,
  });

  if (aktiva > 0 && månader > 0) {
    rader.push({
      benamning: "User licenses",
      // Antalet är inte en uppskattning: det är de konton som faktiskt
      // kan logga in när fakturan utfärdas.
      underlag: `${aktiva} active users × ${månader} months`,
      antal: aktiva * månader,
      enhet: "user/month",
      apris: prislista.anvandare_manad,
      belopp: aktiva * månader * prislista.anvandare_manad,
    });
  }

  for (const nyckel of org?.moduler ?? []) {
    const modul = prislista.moduler[nyckel];
    if (!modul) continue;
    rader.push({
      benamning: modul.namn,
      underlag: `Enterprise module · ${period.fran} – ${period.till}`,
      antal: 1,
      enhet: "module/year",
      apris: modul.ar,
      belopp: modul.ar,
    });
  }

  return rader;
}

/**
 * Sätter ihop en faktura.
 *
 * Returnerar ett objekt som är fullständigt i sig själv: raderna, summan,
 * momsen, förfallodagen och vad allt härleddes ur. Den som läser den om
 * två år ska inte behöva systemet för att förstå den.
 */
export function fakturera({ nummer, org, aktiva, period, utfardad, prislista = PRISLISTA }) {
  const rader = fakturarader(org, aktiva, period, prislista);
  const netto = rader.reduce((summa, r) => summa + r.belopp, 0);
  // Momsen räknas på nettosumman, inte per rad: radvis avrundning ger
  // ören som inte stämmer mot totalen.
  const moms = Math.round(netto * prislista.momssats);

  return {
    version: "ALVA-PROC-0001",
    beteckning: fakturabeteckning(nummer),
    organisation: org?.namn ?? "Organization",
    period,
    utfardad,
    forfaller: adderaDagar(utfardad, prislista.betalningsvillkor),
    valuta: prislista.valuta,
    rader,
    netto,
    momssats: prislista.momssats,
    moms,
    totalt: netto + moms,
    status: "utfardad",
    betalningssatt: "Invoice. No online payment is accepted.",
  };
}

/**
 * Kreditering.
 *
 * En utfärdad faktura ändras aldrig. Krediteringen är en egen post som
 * pekar tillbaka, med samma rader och omvänt tecken, och den kräver ett
 * skäl — av samma anledning som ett avslut kräver ett varför.
 */
export function kreditera(faktura, { nummer, utfardad, orsak }) {
  if (!orsak || orsak.trim().length < 10) {
    return { fel: "En kreditering kräver ett skäl som går att granska i efterhand." };
  }
  return {
    kredit: {
      ...faktura,
      beteckning: fakturabeteckning(nummer),
      utfardad,
      krediterar: faktura.beteckning,
      orsak: orsak.trim(),
      rader: faktura.rader.map((r) => ({ ...r, antal: -r.antal, belopp: -r.belopp })),
      netto: -faktura.netto,
      moms: -faktura.moms,
      totalt: -faktura.totalt,
      status: "krediterad",
    },
  };
}

/** ALVA-INV-0001 */
export const fakturabeteckning = (nummer) => `ALVA-INV-${String(nummer).padStart(4, "0")}`;

/** Hela månader mellan två datum, inklusive startmånaden. */
export function manaderMellan(fran, till) {
  const a = new Date(fran);
  const b = new Date(till);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime()) || b < a) return 0;
  return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth()) + 1;
}

function adderaDagar(datum, dagar) {
  const d = new Date(datum);
  if (Number.isNaN(d.getTime())) return datum;
  d.setDate(d.getDate() + dagar);
  return d.toISOString().slice(0, 10);
}

/**
 * Belopp för läsning. Öre in, sträng ut.
 *
 * Fast antal decimaler och hårt mellanslag som tusentalsavskiljare —
 * belopp jämförs oftare än de läses, precis som beteckningar.
 */
/** Hårt mellanslag: ett belopp får aldrig brytas över en radbrytning. */
const TUSENTAL = "\u00A0";

export function formateraBelopp(ore, valuta = PRISLISTA.valuta) {
  const negativt = ore < 0;
  const kronor = Math.abs(ore) / 100;
  const text = kronor
    .toFixed(2)
    .replace(".", ",")
    .replace(/\B(?=(\d{3})+(?!\d))/g, TUSENTAL);
  return `${negativt ? "−" : ""}${text} ${valuta}`;
}
