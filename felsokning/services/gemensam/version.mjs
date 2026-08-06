// ALVA-SPEC-002 · Utgåvor.
//
// ---- Varför versionen är en egen modul ---------------------------------
//
// Den stod som en sträng i gränssnittskoden och räknades aldrig upp.
// Systemet påstod "ALVA 1.0" efter att kvalitetsgrinden flyttats till
// servern, schemat stängts, faktureringen byggts, portalen stängts och
// tre revisioner härdats. Versionen sa alltså ingenting om vad man fick.
//
// Historiken nedan är HÄRLEDD UR VAD SOM FAKTISKT LEVERERATS, inte
// skriven för att se ut som en produkt med lång historia. Varje post
// pekar på den commit där arbetet finns. En utgåva som inte går att peka
// på hör inte hemma i listan — en påhittad ändringslogg är samma sorts
// obefogade säkerhet som produkten finns för att undvika.
//
// ---- Vad som gör en utgåva stor -----------------------------------------
//
// Andra siffran räcker för ny funktion. Första siffran höjs bara när
// GARANTIERNA ändras — vad systemet lovar om ett underlag. Det har hänt
// två gånger: när fakturan blev ett härlett dokument i systemet, och när
// TÜV-härdningen ändrade vad loggen garanterar.

export const UTGAVOR = [
  {
    version: "3.4",
    datum: "2026-08-06",
    commit: "c1c56e6",
    rubrik: "Kedjesvep, registret gäller alla vägar, och ett fynd svepet gjorde själv",
    andringar: [
      "Kedjesvepet: driftens nattliga fråga \"är allt fortfarande sant?\". Varje kedja och försegling i varje organisation verifieras — på begäran av arbetsledaren, nattligen av driften, med felkod vid brott så larmet är gratis.",
      "Svepet hittade en riktig bugg första gången det kördes: leverantörshändelser bröt sina egna kedjelänkar därför att den kanoniska formen behandlade undefined som null medan databasen släpper nyckeln. Kanonisk form är nu exakt den form som överlever rundresan.",
      "Kalibreringsfaktumet fryses vid mottagandet: taket \"hög\" kräver ett mätdon vars kalibrering gällde när mätningen togs — inte bara ett mätdon.",
      "Mätdonsregistret gäller även leverantörsprotokoll. Okänt instrument nedgraderas öppet i stället för att tros på.",
      "Säkerhetshuvuden på varje API-svar, ärlig 413 för för stora kroppar, och startvarning vid oförseglad drift.",
    ],
  },
  {
    version: "3.3",
    datum: "2026-08-06",
    commit: "9378089",
    rubrik: "Härdning: kedjad logg, förseglat avslut, härledd säkerhetsnivå",
    andringar: [
      "Varje händelse bär en hash av sitt innehåll och föregående händelses hash, beräknad av servern. Den som ändrar en rad i efterhand — även med full databasbehörighet — bryter varje efterföljande länk, och brottet pekar ut sig självt.",
      "Avslut förseglas: kedjans rot och en HMAC med en nyckel som aldrig finns i databasen. En omräknad kedja kan inte förseglas om.",
      "Verifieringen säger vad den bevisar och inte: innehållet är oförändrat sedan mottagandet — ingenting om tiden före, ingenting om sanningshalten.",
      "Signaturen vid avslut skrivs ur verifierad token i stället för att tas emot som text. Fältet intygar nu exakt vad det kan intyga.",
      "Säkerhetsnivån i felorsaksanalysen är ett tak härlett ur underlaget: hög kräver reproducerat symptom och spårbart mätvärde. Teknikern kan sänka — ärlig osäkerhet är information — men aldrig höja.",
    ],
  },
  {
    version: "3.2",
    datum: "2026-08-06",
    commit: "af27275",
    rubrik: "Engelska som standard, tio EU-språk, och en regel som gällde på ett",
    andringar: [
      "Engelska är standard- och källspråk. Nio översättningar: tyska, franska, spanska, italienska, polska, nederländska, portugisiska, rumänska och svenska.",
      "Gränssnittstext faller tillbaka på engelska tyst. Metodikinnehåll gör det aldrig tyst — en ogranskad översättning av en säkerhetsinstruktion är sämre än en engelsk, därför att engelska SYNS som ett annat språk.",
      "Metodens struktur översätts inte. Fasnamn och statusord står likadant i varje land, så att en revisor kan läsa en rumänsk och en tysk rapport utan att veta vilket språk verkstaden arbetar på.",
      "Kvalitetsgrindens hinder följer organisationens språk. En spärr på fel språk är en spärr utan väg förbi.",
      "ALVA-RULE-200 gällde bara på svenska: en tekniker som skrev \"erledigt\" eller \"done\" i motiveringsfältet passerade filtret för icke-svar. Rättat på tio språk — det var ett hål i regeln, inte en översättningsbrist.",
    ],
  },
  {
    version: "3.1",
    datum: "2026-08-06",
    commit: "a94c228",
    rubrik: "Regelverk, försäkringsunderlag och support i ärendet",
    andringar: [
      "Garantiregimer för EU och USA med källa och kontrolldatum per post — och skiljelinjen mellan lagstadgat och avtalat, som förväxlas åt bägge håll.",
      "Försäkringsvillkor som underlag för ett samtal. Modulen avgör ingenting och kan inte avgöra något.",
      "Felanmälan i varje ärende, med härlett sammanhang. Ett regnr kan inte smugglas med.",
      "Mätarställningen ska vara fotograferad, inte bara inskriven — kravet fanns bara i gränssnittet och var därmed en vana, inte en spärr.",
    ],
  },
  {
    version: "3.0",
    datum: "2026-08-06",
    commit: "b147694",
    rubrik: "TÜV-revision och härdning av integritetsgarantierna",
    stor: true,
    andringar: [
      "Händelsenyckeln skopad till ärendet: en organisation kan inte längre hindra en annan från att skriva historik.",
      "Mätkedjan slås upp i mätdonsregistret — E4 var tidigare ett påstående klienten gjorde om sig själv.",
      "Personnycklarna kuverteras under en huvudnyckel utanför databasen.",
      "Gallringen verkställs av ett eget jobb i stället för att bara vara ett datum ingen läste.",
      "Åtkomstloggen och raderingsregistret är append-only.",
    ],
  },
  {
    version: "2.1",
    datum: "2026-08-06",
    commit: "3b83fc9",
    rubrik: "Portalen stängd på riktigt",
    andringar: [
      "Inloggningen autentiserar mot plattformen och portalen är oåtkomlig utan giltig session.",
      "Fakturavyn läser organisationens egna fakturor; ett misslyckat anrop visar felet, inte exemplet.",
    ],
  },
  {
    version: "2.0",
    datum: "2026-08-06",
    commit: "b457543",
    rubrik: "Fakturering i systemet",
    stor: true,
    andringar: [
      "Fakturan härleds ur organisationens tillstånd i stället för att skrivas in.",
      "Utfärdad faktura är oföränderlig; betalning är en händelse och statusen en projektion.",
      "Nummerserie utan luckor. Ingen betalleverantör är inblandad.",
    ],
  },
  {
    version: "1.3",
    datum: "2026-08-05",
    commit: "6676262",
    rubrik: "Egen typografi och läsbarhet på telefon",
    andringar: [
      "Inbäddad typografi enligt ALVA-SPEC-001 — inga externa hämtningar.",
      "Ritningsstämpel på rapporten, räta hörn, tätare spärrning.",
    ],
  },
  {
    version: "1.2",
    datum: "2026-08-05",
    commit: "86d553b",
    rubrik: "Sviten körs faktiskt",
    andringar: [
      "ALVA:s tester lades in i CI. De hade passerat bara när någon körde dem för hand — ett test som ingen kör är dokumentation, inte en spärr.",
      "Genomgången blev ett incheckat test.",
    ],
  },
  {
    version: "1.1",
    datum: "2026-08-05",
    commit: "31727a4",
    rubrik: "Leverantörsrevision 2 och härdning",
    andringar: [
      "Händelseschemat stängt: okända fält avvisas i stället för att lagras.",
      "Kvalitetsregeln finns på ett ställe — klienten frågar grinden i stället för att ha en egen åsikt.",
    ],
  },
  {
    version: "1.0",
    datum: "2026-08-04",
    commit: "590fab3",
    rubrik: "ALVA-metoden",
    andringar: [
      "Analys · Lokalisering · Verifiering · Åtgärd som metod, inte som assistent.",
      "Kvalitetsgrinden serverauktoritativ. Avslutssats enligt ALVA-RULE-200.",
    ],
  },
];

/** Nuvarande utgåva. Enda stället siffran finns. */
export const NUVARANDE = UTGAVOR[0];

/** Så versionen skrivs i gränssnittet och i ritningsstämpeln. */
export const PLATTFORMSVERSION = `ALVA ${NUVARANDE.version}`;

/**
 * Versionen som gällde när ett ärende stängdes.
 *
 * Ritningsstämpeln ska visa vad som gällde VID AVSLUTET, inte vad som
 * gäller den dag rapporten läses — det står i stämpelns egen beskrivning,
 * och gällde ändå inte för versionen, som lästes ur den aktuella
 * konstanten. Ett ärende stängt under 1.0 visade 3.1.
 *
 * Avslutshändelsen bär numera versionen. Äldre ärenden saknar den, och då
 * sägs det uttryckligen i stället för att dagens siffra lånas ut.
 */
export function versionVidAvslut(avslutshandelse) {
  const v = avslutshandelse?.plattformsversion;
  return typeof v === "string" && v.trim() ? v : "Ej registrerad (stängt före ALVA 3.1)";
}
