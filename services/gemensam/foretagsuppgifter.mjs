// ALVA-SPEC-050 · Företagsuppgifter och lagstadgad information.
//
// ---- Varför tyskt krav som golv ----------------------------------------
//
// Tyskland har den strängaste kravbilden på vad en näringsidkare måste
// hålla synligt: Impressumspflicht enligt § 5 DDG är namngiven,
// utkrävbar och avmahnbar på ett sätt som saknar motsvarighet i övriga
// EU. Bygger man för den listan uppfyller man i praktiken de andra
// marknadernas krav på köpet, och man slipper en andra genomgång per
// land. Det är därför listan nedan är tysk och inte svensk.
//
// ---- Vad modulen INTE gör -----------------------------------------------
//
// Den hittar inte på uppgifter. Ett Impressum med påhittad adress eller
// påhittat organisationsnummer är inte ett halvfärdigt Impressum utan ett
// vilseledande, och skadan är större än den tomma rutans.
//
// Osatta fält märks därför som osatta, och `saknade()` returnerar dem så
// att driften kan spärra en driftsättning på listan i stället för att
// upptäcka den när brevet kommer.
//
// ---- Två fällor som är aktuella just nu ---------------------------------
//
// ODR-LÄNKEN SKA BORT. Förordning (EU) 524/2013 upphävdes genom
// förordning (EU) 2024/3228 och plattformen stängdes 20 juli 2025.
// Länken till ec.europa.eu/odr har legat i tiotusentals fotnoter sedan
// 2016 och pekar numera ingenstans. Den som låtit den ligga kvar visar
// upp en död hänvisning som en lagstadgad upplysning.
//
// § 5 TMG HETER § 5 DDG. Telemediengesetz ersattes av
// Digitale-Dienste-Gesetz den 14 maj 2024. Innehållet i plikten är
// oförändrat; hänvisningen är det inte.

/** Fälten, med sin rättsliga grund. `kravs` styr vad `saknade()` larmar om. */
export const FALT = [
  {
    id: "foretagsnamn",
    rubrik: "Firma",
    grund: "§ 5 Abs. 1 Nr. 1 DDG",
    kravs: true,
    hjalp: "Fullständigt firmanamn inklusive bolagsform (GmbH, AB, Ltd).",
  },
  {
    id: "adress",
    rubrik: "Anschrift",
    grund: "§ 5 Abs. 1 Nr. 1 DDG",
    kravs: true,
    hjalp: "Gatuadress. En postbox räcker inte — adressen ska gå att delge på.",
  },
  {
    id: "foretradare",
    rubrik: "Vertretungsberechtigte",
    grund: "§ 5 Abs. 1 Nr. 1 DDG",
    kravs: true,
    hjalp: "Behörig företrädare, t.ex. verkställande direktör eller Geschäftsführer.",
  },
  {
    id: "epost",
    rubrik: "E-Mail",
    grund: "§ 5 Abs. 1 Nr. 2 DDG",
    kravs: true,
    hjalp: "En adress som läses. Ett kontaktformulär ersätter den inte.",
  },
  {
    id: "telefon",
    rubrik: "Telefon",
    grund: "§ 5 Abs. 1 Nr. 2 DDG",
    kravs: true,
    hjalp: "Snabb elektronisk kontakt ska vara möjlig; telefon är det som normalt godtas.",
  },
  {
    id: "register",
    rubrik: "Registergericht und -nummer",
    grund: "§ 5 Abs. 1 Nr. 4 DDG",
    kravs: true,
    hjalp: "Handelsregister och HRB-nummer, eller motsvarande register i hemlandet.",
  },
  {
    id: "momsnummer",
    rubrik: "Umsatzsteuer-Identifikationsnummer",
    grund: "§ 27a UStG",
    kravs: true,
    hjalp: "VAT-nummer, om ett sådant finns.",
  },
  {
    id: "tillsyn",
    rubrik: "Aufsichtsbehörde",
    grund: "§ 5 Abs. 1 Nr. 3 DDG",
    kravs: false,
    hjalp: "Endast om verksamheten kräver tillstånd. Diagnostikverktyg gör normalt inte det.",
  },
  {
    id: "ansvarig_innehall",
    rubrik: "Inhaltlich Verantwortlicher",
    grund: "§ 18 Abs. 2 MStV",
    kravs: false,
    hjalp: "Krävs för journalistiskt-redaktionellt innehåll. En produktwebbplats behöver det sällan.",
  },
  {
    id: "dataskyddsombud",
    rubrik: "Datenschutzbeauftragter",
    grund: "Art. 37 DSGVO",
    kravs: false,
    hjalp: "Krävs vid regelbunden och systematisk övervakning i stor omfattning, eller känsliga uppgifter i stor omfattning.",
  },
];

/**
 * Handlingar som ska finnas och nås från varje sida.
 *
 * `nar` säger när kravet inträder — flera av dem är nya, och en fot som
 * byggdes för två år sedan saknar dem utan att någon märkt det.
 */
export const HANDLINGAR = [
  {
    id: "impressum",
    rubrik: "Impressum",
    grund: "§ 5 DDG (ersatte § 5 TMG den 14 maj 2024)",
    kravs: true,
    nar: "Alltid, för kommersiella digitala tjänster.",
  },
  {
    id: "dataskydd",
    rubrik: "Datenschutzerklärung",
    grund: "Art. 13–14 DSGVO",
    kravs: true,
    nar: "Alltid när personuppgifter behandlas.",
  },
  {
    id: "villkor",
    rubrik: "Allgemeine Geschäftsbedingungen",
    grund: "§§ 305 ff. BGB",
    kravs: true,
    nar: "När standardvillkor används.",
  },
  {
    id: "tillganglighet",
    rubrik: "Erklärung zur Barrierefreiheit",
    grund: "BFSG (Barrierefreiheitsstärkungsgesetz), i kraft 28 juni 2025",
    kravs: true,
    nar: "Tjänster till konsument. Mikroföretag som endast tillhandahåller tjänster är undantagna.",
  },
  {
    id: "tvistlosning",
    rubrik: "Verbraucherstreitbeilegung",
    grund: "§ 36 VSBG",
    kravs: true,
    nar: "Besked om man deltar i tvistlösning inför konsumentskiljenämnd — även ett nej ska stå.",
  },
  {
    id: "visselblasare",
    rubrik: "Hinweisgeberkanal",
    grund: "HinSchG",
    kravs: false,
    nar: "Från 50 anställda.",
  },
];

/**
 * Vad som INTE ska stå i foten längre.
 *
 * En upphävd hänvisning är inte harmlös: den ser ut som en upplysning och
 * pekar ingenstans.
 */
export const AVSKAFFAT = [
  {
    id: "odr",
    rubrik: "Länk till EU:s ODR-plattform",
    grund: "Förordning (EU) 524/2013 upphävd genom förordning (EU) 2024/3228",
    text:
      "Plattformen togs ur drift den 20 juli 2025 och tog inte emot nya ärenden efter 20 mars 2025. Länken ska tas bort helt, inte bytas ut.",
  },
  {
    id: "tmg",
    rubrik: 'Hänvisning till "§ 5 TMG"',
    grund: "Telemediengesetz ersatt av Digitale-Dienste-Gesetz 14 maj 2024",
    text: "Plikten är oförändrad, men paragrafen heter § 5 DDG. Enklast är att inte hänvisa till paragrafen alls.",
  },
];

/**
 * Vilka obligatoriska fält som saknas.
 *
 * Driften kan spärra en driftsättning på den här listan i stället för att
 * upptäcka bristen när ett avmahnungsbrev kommer.
 */
export function saknade(uppgifter = {}) {
  return FALT.filter((f) => f.kravs && !String(uppgifter[f.id] ?? "").trim()).map((f) => ({
    id: f.id,
    rubrik: f.rubrik,
    grund: f.grund,
  }));
}

/** Är uppgifterna kompletta nog för att visas som ett riktigt Impressum? */
export function komplett(uppgifter = {}) {
  return saknade(uppgifter).length === 0;
}
