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
  fraga_besvarad: { stegId: "text", frageId: "text", fraga: "text", svar: "text" },
  kontroll_utford: { stegId: "text", kontrollId: "text", text: "text" },
  observation: { text: "text" },
  matvarde: { beskrivning: "text", varde: "text" },
  hypotes: { text: "text", niva: ["medel", "lag"] },
  foto: { beskrivning: "text" },
  video: { beskrivning: "text" },
  matarstallning: { lage: ["ingaende", "utgaende"], varde: "text" },
  historik_kontrollerad: { kontrollerad: "boolean" },
  reproducering: { status: ["ja", "delvis", "nej"], beskrivning: "text" },
  felorsak: { avvikelse: "text", orsaker: "lista", underlag: "lista", sakerhet: ["hog", "medel", "lag"] },
  atgardsforslag: { text: "text" },
  kundbeslut: { utfall: ["godkant", "avbojt", "delvis"], kanal: "text" },
  atgard_utford: { text: "text" },
  kvalitetskontroll: { utfall: ["borta", "kvarstar", "delvis", "ej_verifierat"], beskrivning: "text" },
  kommentar: { text: "text" },
  kategori_byte: { kategori: "text" },
  inaktivitet_forklarad: { text: "text", minuter: "tal" },
  overlamning: { fran: "text" },
  ansvarig_satt: { ansvarig: "text" },
  ai_svar: { rader: "lista" },
  export_skapad: { format: "text", version: "tal" },
  arende_avslutat: {},
};

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
        ...(klientTid && klientTid !== nu.toISOString() ? { registrerad_tidpunkt: klientTid } : {}),
      },
    },
  };
}
