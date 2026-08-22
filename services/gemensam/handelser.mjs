// Händelsevalidering vid API-gränsen.
//
// Bakgrund: revisionen (docs/QUALITY-AUDIT.md, C-1 och M-3) fann att servern
// bara kontrollerade att `anvandare` var *en sträng* och `tidpunkt` *sanningsvärd*
// — inte att de var sanna — och att `handelse` togs emot som godtycklig JSON.
//
// Två skilda problem med samma botemedel:
//
//   Härkomst   Vem som utförde arbetet och när är det som gör loggen till en
//              bevis­kedja. Sätts de av anroparen är loggen en signerad behållare
//              för overifierade påståenden. Båda härleds nu ur den verifierade
//              token respektive serverns klocka.
//
//   Form       Loggen är append-only. En felaktig post kan aldrig rättas, bara
//              kommenteras. Därför måste formen kontrolleras *innan* skrivning —
//              efteråt är det för sent för alltid.
//
// Klientens klocka kastas inte bort. Vid offline-arbete är den det enda som
// finns, så den bevaras som `registrerad_tidpunkt` bredvid serverns
// mottagningstid. Glappet blir synligt i stället för osynligt.

/** Fält som aldrig får komma från klienten. */
export const SERVERÄGDA_FÄLT = ["anvandare", "tidpunkt"];

// Varje händelsetyp med sina obligatoriska fält. Listan är avsiktligt
// fullständig: en typ som inte står här avvisas, eftersom en okänd typ i en
// append-only-logg är permanent skräp.
export const HÄNDELSESCHEMA = {
  objekt_identifierat: { objekt: "objekt" },
  arbetsorder_skannad: { falt: "lista" },
  felbeskrivning: { text: "text" },
  arendetyp_satt: { arendetyp: "text" },
  // Vald metodik vid ärendestart. Metodiken avgör vilka krav grinden
  // ställer, och den måste därför vara HÄRLEDBAR UR DEN FÖRSEGLADE
  // LOGGEN — inte bara ur en kolumn som en databasadministratör kan ändra
  // utan att bryta kedjan. Den registreras som en händelse så att den som
  // verifierar förseglingen kan bevisa vilken metodiks krav som gällde.
  metodik_vald: { metodikId: "text" },
  // Metodikbyte. Ett byte är ingen inställning utan en händelse med ett
  // varför: ärendet bedöms från och med nu mot en annan uppsättning steg
  // och kontroller, och den som läser loggen ska se när och varför.
  metodik_byte: { metodikId: "text", motivering: "text" },
  fraga_besvarad: { stegId: "text", frageId: "text", fraga: "text", svar: "text" },
  kontroll_utford: { stegId: "text", kontrollId: "text", text: "text" },
  observation: { text: "text" },
  matvarde: { beskrivning: "text", varde: "text" },  // matdonId valfritt — se M-1
  hypotes: { text: "text", niva: ["medel", "lag"] },
  foto: { beskrivning: "text" },
  video: { beskrivning: "text" },
  matarstallning: { lage: ["ingaende", "utgaende"], varde: "text" },
  historik_kontrollerad: { kontrollerad: "boolean" },
  reproducering: { status: ["ja", "delvis", "nej"], beskrivning: "text" },
  felorsak: {
    avvikelse: "text",
    orsaker: "lista",
    underlag: "lista",
    sakerhet: ["hog", "medel", "lag"],
    atgard: "text",
  },
  atgardsforslag: { beskrivning: "text" },
  kundbeslut: { beslut: ["godkant", "avbojt", "delvis"], kanal: "text" },
  atgard_utford: { beskrivning: "text", utford: "boolean" },
  kvalitetskontroll: {
    resultat: ["symptomet_borta", "kvarstar", "delvis", "ej_verifierbar"],
    beskrivning: "text",
  },
  // FGS-1.0: betalarspåret, eskaleringen och reservdelen är händelser i
  // loggen — inte fritext i en kommentar — så att grinden kan räkna på dem.
  betalare: {
    spar: ["fabriksgaranti", "vagnskadegaranti", "forsakring", "extern_garanti", "leasing", "goodwill", "kund"],
    namn: "text",
  },
  eskalering: { status: ["oppnad", "besvarad"], beskrivning: "text" },
  reservdel: { artikelnummer: "text", beskrivning: "text" },
  kommentar: { text: "text" },
  kategori_byte: { kategori: "text" },
  inaktivitet_forklarad: { text: "text", minuter: "tal" },
  overlamning: { fran: "text" },
  ansvarig_satt: { ansvarig: "text" },
  ai_svar: { rader: "lista", nastaSteg: "text", modell: "text" },
  export_skapad: { format: "text", version: "tal" },
  // ALVA-RULE-200: teknikerns varför. Fälten valideras utöver formen i
  // services/gemensam/motivering.mjs — här kontrolleras bara att de finns.
  slutsats: { motivering: "text", uteslutet: "text", kvarstaende: "text" },
  arende_avslutat: {},
};

// ---- Valfria fält (QUALITY-AUDIT-2 · C-5) ------------------------------
//
// Schemat kontrollerade tidigare bara att de OBLIGATORISKA fälten fanns.
// Det itererade schemats nycklar, aldrig händelsens, så vilket okänt fält
// som helst passerade och sparades ordagrant.
//
// Två garantier vilade på motsatsen. Krypto-shreddingen skyddar en fast
// lista av fältNAMN: ett registreringsnummer på en vanlig observation
// kom aldrig in på listan, krypterades aldrig, och överlevde därför att
// nyckeln förstördes — medan raderingskvittot ändå sa att subjektet var
// raderat. Och delningsfiltret arbetar på typnivå, inte fältnivå, så
// samma fält gick ut i kundens delningslänk.
//
// Därför är listan nedan uttömmande och avvisningen hård. Ett fält som
// inte står här eller bland de obligatoriska finns inte, och en anropare
// som tror sig ha sparat något får aldrig veta att det gick bra.
export const VALFRIA_FÄLT = {
  // Bilagefälten ärvs via intersektion med Bilaga i domänmodellen.
  arbetsorder_skannad: ["bilagaId", "bilagaHash", "dataUrl"],
  // stegId/kontrollId binder bilden till den kontroll den dokumenterar.
  // Utan bindningen är ett foto bara "ett foto i ärendet" — och en
  // anmärkning kan då se dokumenterad ut av en bild på något annat.
  foto: ["bilagaId", "bilagaHash", "dataUrl", "stegId", "kontrollId"],
  video: ["bilagaId", "bilagaHash", "dataUrl", "stegId", "kontrollId"],
  matarstallning: ["undantag", "bilagaId", "bilagaHash", "dataUrl"],

  // anmarkning=true markerar att kontrollen FANN något. Det är den
  // kontroll som bär åtgärden och fakturan, och därför den som
  // ALVA-RULE-210 kräver visuellt bevis för.
  kontroll_utford: ["resultat", "undantag", "anmarkning"],
  betalare: ["referens", "godkannande"],
  eskalering: ["referens", "kanal"],
  reservdel: ["serienummer", "batch", "sparad"],
  // `kalla` bär härkomsten för värden som kommit in via ett
  // diagnosprotokoll (ALVA-SPEC-020). Fältet måste vara deklarerat:
  // integrationen fungerade tidigare bara därför att schemat var öppet.
  observation: ["kalla"],
  // `kalibreradVidMatning` är serverns stämpel av ett FAKTUM vid
  // mottagandet: gällde mätdonets kalibrering då? Grinden får inte
  // fråga klockan (samma logg ska alltid ge samma utfall), så faktumet
  // måste frysas när det fortfarande är ett faktum. Klientens värde
  // skrivs alltid över av mätdonsFakta (TÜV-2 T-13).
  matvarde: ["enhet", "matdonId", "matdonBeteckning", "matdonKalibreradTill", "kalibreradVidMatning", "kalla"],
  overlamning: ["till"],
  historik_kontrollerad: ["kommentar"],
  felorsak: ["motivering", "ytterligareKontroller"],
  atgardsforslag: ["uppskattadKostnad", "uppskattadTid"],
  kundbeslut: ["kommentar", "kontaktperson"],
  atgard_utford: ["delar", "motivering"],
  slutsats: ["atgardsval", "orsakFastställd"],
  // Versionen som gällde VID AVSLUTET. Ritningsstämpeln läste den ur
  // den aktuella konstanten, så ett ärende stängt under 1.0 visade 3.1 —
  // precis det stämpelns egen beskrivning säger att den inte ska göra.
  arende_avslutat: ["signatur", "plattformsversion"],
};

/**
 * Fält som systemet självt sätter efter valideringen.
 *
 * `anvandarId` skrivs av tillPost ur den verifierade token, och
 * `registrerad_tidpunkt` bevarar klientens klocka vid offline-arbete.
 * Bägge måste passera när en redan skriven händelse valideras om.
 */
export const SYSTEMFÄLT = ["typ", "anvandarId", "registrerad_tidpunkt"];

// Hypotesen får aldrig anta hög tillförlitlighet — samma regel som
// typsystemet upprätthåller i klienten, upprepad här därför att servern inte
// kan lita på att klienten är vår.
const GILTIG = {
  text: (v) => typeof v === "string" && v.length > 0 && v.length <= 20000,
  tal: (v) => typeof v === "number" && Number.isFinite(v),
  boolean: (v) => typeof v === "boolean",
  lista: (v) => Array.isArray(v) && v.length <= 500,
  objekt: (v) => v !== null && typeof v === "object" && !Array.isArray(v),
};

function fältFel(typ, nyckel, regel, värde) {
  if (Array.isArray(regel)) {
    return regel.includes(värde) ? null : `${typ}.${nyckel} måste vara en av: ${regel.join(", ")}`;
  }
  return GILTIG[regel](värde) ? null : `${typ}.${nyckel} har fel form (väntade ${regel})`;
}

/**
 * Validerar en händelses form. Returnerar null när den duger, annars en
 * förklaring avsedd att läsas av en människa som felsöker en integration.
 */
export function granskaHändelse(handelse) {
  if (handelse === null || typeof handelse !== "object" || Array.isArray(handelse)) {
    return "handelse måste vara ett objekt";
  }
  const schema = HÄNDELSESCHEMA[handelse.typ];
  if (!schema) {
    return `okänd händelsetyp: ${JSON.stringify(handelse.typ)}`;
  }
  for (const [nyckel, regel] of Object.entries(schema)) {
    const fel = fältFel(handelse.typ, nyckel, regel, handelse[nyckel]);
    if (fel) return fel;
  }

  // C-5: schemat är stängt. Allt som inte är deklarerat avvisas — annars
  // kan personuppgifter hängas på en vanlig händelse, undgå krypteringen
  // och följa med ut i delningslänken.
  const tillåtna = new Set([
    ...SYSTEMFÄLT,
    ...Object.keys(schema),
    ...(VALFRIA_FÄLT[handelse.typ] ?? []),
  ]);
  const okända = Object.keys(handelse).filter((n) => !tillåtna.has(n));
  if (okända.length > 0) {
    return `${handelse.typ}: okända fält avvisas (${okända.join(", ")})`;
  }

  // Valfria fält typkontrollerades tidigare inte alls — bara deras namn
  // stod i tillåtelselistan. Ett objekt eller en funktion i ett valfritt
  // fält passerade då granskningen och kunde krascha kvalitetsgrinden vid
  // varje anrop (t.ex. `kommentar`.trim()); eftersom loggen är append-only
  // gick ärendet då aldrig att avsluta. Alla valfria fält i domänmodellen
  // är primitiver (sträng/tal/boolean), så icke-primitiver avvisas här.
  const valfria = VALFRIA_FÄLT[handelse.typ] ?? [];
  for (const nyckel of valfria) {
    if (!(nyckel in handelse) || handelse[nyckel] === undefined || handelse[nyckel] === null) continue;
    const t = typeof handelse[nyckel];
    if (t !== "string" && t !== "number" && t !== "boolean") {
      return `${handelse.typ}.${nyckel} har fel form (valfria fält måste vara sträng, tal eller boolean)`;
    }
  }
  return null;
}

/**
 * Bygger den post som faktiskt skrivs.
 *
 * Härkomsten kommer härifrån och ingen annanstans: `anvandare` ur den
 * verifierade token, `tidpunkt` ur serverns klocka. Klientens tidsstämpel
 * bevaras separat när den finns, eftersom den är det enda som finns vid
 * offline-arbete — men den avgör aldrig när något anses ha skett.
 */
export function tillPost(post, anspr, nu = new Date()) {
  const fel = granskaHändelse(post?.handelse);
  if (fel) return { fel };
  if (typeof post.id !== "string" || !/^[A-Za-z0-9_:.-]{1,128}$/.test(post.id)) {
    return { fel: "id saknas eller har otillåtna tecken" };
  }

  const klient = typeof post.tidpunkt === "string" ? post.tidpunkt : null;
  const klientTid = klient && !Number.isNaN(Date.parse(klient)) ? klient : null;

  return {
    post: {
      id: post.id,
      tidpunkt: nu.toISOString(),
      anvandare: anspr.namn,
      handelse: {
        ...post.handelse,
        // Fälten nedan går inte att sätta utifrån; skrivs de över här är det
        // just poängen.
        anvandarId: anspr.sub,
        // Signaturen vid avslut var teknikerns egen text — ett fält som
        // HETER signatur men inte var en (panelgranskningen, Volvo-sätet).
        // Nu skrivs den ur verifierad token, precis som `anvandare`.
        // Vad den intygar är därmed exakt vad den kan intyga: vem som var
        // inloggad när avslutet togs emot. Kedjans försegling intygar
        // resten — att loggen är den som förelåg då.
        ...(post.handelse.typ === "arende_avslutat" ? { signatur: anspr.namn } : {}),
        ...(klientTid && klientTid !== nu.toISOString() ? { registrerad_tidpunkt: klientTid } : {}),
      },
    },
  };
}
