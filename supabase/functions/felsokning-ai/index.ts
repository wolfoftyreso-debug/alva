// Plattformens AI-orkester för Guidad Felsökning.
//
// AI:n drivs av plattformen: Claude API-nyckeln är en serverhemlighet
// (ANTHROPIC_API_KEY) och lämnar aldrig backend. Vi kör flera modeller i
// vår infrastruktur och routar per uppgift — servern äger hela orkestern
// (modellval, effort, systemprompt, svarsschema), så routingen kan
// justeras utan klientändringar och AI-reglerna kan inte kringgås från
// klientsidan.
//
// Kräver inloggad användare (verify_jwt = true i config.toml).

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Anthropic from "npm:@anthropic-ai/sdk";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const MAX_PROMPT_LANGD = 40000;

const GRUND_REGLER = `Du arbetar i Guidad Felsökning, en professionell diagnostikplattform för tekniker. Du är inte en AI-mekaniker: du ersätter aldrig teknikerns kompetens eller tillverkarens dokumentation.

Absoluta regler:
- Hitta aldrig på fakta. Låtsas aldrig veta. Gissa aldrig.
- Presentera aldrig en hypotes som ett konstaterat fel.
- Skilj strikt mellan raderna du returnerar:
  - "verifierat": endast det som är belagt av mätvärden eller dokumenterade kontroller i underlaget.
  - "observation": det som konstaterats utan slutsats.
  - "hypotes": möjlig felorsak som KRÄVER verifiering — formulera alltid vad som skulle verifiera den.
  - "rekommendation": nästa verifierbara kontroll eller mätning.
- Om underlaget är otillräckligt: säg det uttryckligen i en observation och rekommendera vad som behöver dokumenteras.
- Skriv aldrig "OK", "kontrollerad", "inga fel" eller "åtgärdad" om evidens saknas i underlaget — skriv i stället "Evidens saknas" och begär rätt underlag: foto för det synliga, video med ljud för det som låter, video för det som rör sig, mätvärde för det som mäts, foto av skärmen när ett instrument eller en diagnosdator visar informationen.
- Svara på svenska, konsekvent, kortfattat och metodiskt. "nastaSteg" är EN konkret, verifierbar åtgärd.`;

const SVARS_SCHEMA = {
  type: "object",
  properties: {
    rader: {
      type: "array",
      items: {
        type: "object",
        properties: {
          typ: { type: "string", enum: ["observation", "verifierat", "hypotes", "rekommendation"] },
          text: { type: "string" },
        },
        required: ["typ", "text"],
        additionalProperties: false,
      },
    },
    nastaSteg: { type: "string" },
  },
  required: ["rader", "nastaSteg"],
  additionalProperties: false,
};

const METODIK_SCHEMA = {
  type: "object",
  properties: {
    metodikId: { type: "string", enum: ["vibration", "elsystem", "generisk"] },
  },
  required: ["metodikId"],
  additionalProperties: false,
};

// Fält som kan tolkas ur en skannad arbetsorder. Klienten har samma
// katalog (src/felsokning/ai.ts) och filtrerar dessutom okända id:n.
const ARBETSORDER_FALT_ID = [
  "kund_namn", "kund_foretag", "kund_telefon", "kund_epost",
  "fordon_regnr", "fordon_vin", "fordon_marke", "fordon_modell",
  "fordon_motor", "fordon_arsmodell", "fordon_matarstallning",
  "fordon_motorkod", "fordon_vaxellada",
  "ao_nummer", "ao_claim", "ao_skadenummer", "ao_referens", "ao_serviceradgivare", "ao_bokningsdatum",
  "felbeskrivning",
];

const ARBETSORDER_SCHEMA = {
  type: "object",
  properties: {
    falt: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string", enum: ARBETSORDER_FALT_ID },
          varde: { type: "string" },
          konfidens: { type: "number", minimum: 0, maximum: 1 },
          omrade: {
            type: "object",
            properties: {
              x: { type: "number" },
              y: { type: "number" },
              bredd: { type: "number" },
              hojd: { type: "number" },
            },
            required: ["x", "y", "bredd", "hojd"],
            additionalProperties: false,
          },
        },
        required: ["id", "varde", "konfidens"],
        additionalProperties: false,
      },
    },
  },
  required: ["falt"],
  additionalProperties: false,
};

const DOKUMENT_REGLER = `Du tolkar ett foto av en arbetsorder från en fordonsverkstad (OCR + layoutförståelse). Layouter varierar mellan verkstäder — identifiera fälten oavsett var de står, i tabeller såväl som fritext.

Regler:
- Returnera ENDAST fält som faktiskt går att läsa i dokumentet. Hitta aldrig på värden.
- "konfidens" är din läs-säkerhet 0–1: 1.0 endast vid helt entydig läsning; sänk vid oskarp text, handstil eller tvetydig layout.
- "omrade" anger ungefär var värdet står i bilden, normaliserat 0–1 (x, y = övre vänstra hörnet).
- Normalisera: registreringsnummer i versaler utan mellanslag, VIN med 17 tecken, datum som ÅÅÅÅ-MM-DD, mätarställning med enhet.
- "felbeskrivning" är kundens beskrivna problem/arbetsbegäran om en sådan finns i dokumentet.`;


// Visual-first: instrument och diagnosskärmar fotograferas i stället för
// att integreras — kameran är det universella gränssnittet.
const INSTRUMENT_SCHEMA = {
  type: "object",
  properties: {
    instrumenttyp: { type: "string" },
    varden: {
      type: "array",
      items: {
        type: "object",
        properties: {
          beskrivning: { type: "string" },
          varde: { type: "string" },
          enhet: { type: "string" },
          konfidens: { type: "number", minimum: 0, maximum: 1 },
        },
        required: ["beskrivning", "varde", "konfidens"],
        additionalProperties: false,
      },
    },
  },
  required: ["instrumenttyp", "varden"],
  additionalProperties: false,
};

const INSTRUMENT_REGLER = `Du läser av ett foto av ett instrument eller en skärm i en fordonsverkstad: multimeter, diagnosdator, oscilloskop, batteritestare, mätarkluster, manometer, utskrift eller etikett.

Regler:
- Identifiera instrumenttypen och extrahera ENDAST värden som faktiskt går att läsa i bilden. Hitta aldrig på värden.
- Varje värde får en beskrivning (t.ex. "Batterispänning", "Felkod P0301 – misständning cylinder 1"), värdet som text och enhet när den syns (V, A, Ω, bar, °C, rpm …).
- Felkoder returneras som egna värden med kod och klartext om skärmen visar den.
- "konfidens" är din läs-säkerhet 0–1; sänk vid oskarp bild, reflexer eller delvis skymda siffror.`;

const MAX_BILD_LANGD = 3_000_000;

interface UppgiftKonfig {
  modell: string;
  // effort utelämnas för modeller som saknar parametern (Haiku 4.5).
  effort?: "low" | "medium" | "high";
  maxTokens: number;
  system: string;
  schema: object;
  // Uppgiften tar en bifogad bild (data-URL) i stället för ren text.
  bild?: boolean;
}

// Orkestern: en modell per uppgiftstyp.
// - handledning körs vid varje dokumentation och är latenskänslig på
//   verkstadsgolvet → Sonnet 5 (nära Opus-kvalitet i realtid).
// - granskning läser hela underlaget och är kvalitetskritisk → Opus 5
//   med hög effort.
// - sammanfattning (överlämning) → Sonnet 5, låg effort.
// - metodikval är ren klassificering → Haiku 4.5.
const ORKESTER: Record<string, UppgiftKonfig> = {
  handledning: {
    modell: "claude-sonnet-5",
    effort: "medium",
    maxTokens: 1024,
    system: `${GRUND_REGLER}

Uppgift: Du är teknikerns digitala felsökningshandledare. Teknikern har just dokumenterat något nytt — svara på det i ljuset av ärendebriefen. En kontroll i taget, inte långa utläggningar: max fyra rader plus nästa steg.`,
    schema: SVARS_SCHEMA,
  },
  granskning: {
    modell: "claude-opus-5",
    effort: "high",
    maxTokens: 2048,
    system: `${GRUND_REGLER}

Uppgift: Granska HELA underlaget i ärendet. Leta specifikt efter (1) motsägelser mellan observationer eller mätvärden, (2) luckor — kontroller som borde vara gjorda givet symptombilden men saknas, (3) förhastade slutsatser som saknar stöd. Rapportera motsägelser och luckor som "observation", möjliga felorsaker som underlaget antyder som "hypotes", och det viktigaste att åtgärda som "rekommendation". Max sex rader.`,
    schema: SVARS_SCHEMA,
  },
  sammanfattning: {
    modell: "claude-sonnet-5",
    effort: "low",
    maxTokens: 1024,
    system: `${GRUND_REGLER}

Uppgift: En tekniker lämnar över ärendet. Komplettera överlämningen med det som inte syns i checklistorna: risker och osäkerheter i underlaget, klassificerade som rader. "nastaSteg" är det första nästa tekniker bör göra. Max fyra rader.`,
    schema: SVARS_SCHEMA,
  },
  metodikval: {
    modell: "claude-haiku-4-5",
    maxTokens: 256,
    system: `Du klassificerar en felbeskrivning från en verkstad till EN felsökningsmetodik:
- "vibration": vibrationer, skakningar eller obalans under körning.
- "elsystem": elektriska fel — reläer, säkringar, spänning, batteri, belysning, givare, strömförsörjning.
- "generisk": allt annat, eller när det är oklart.
Gissa inte: välj "generisk" om beskrivningen inte tydligt hör till en specifik metodik.`,
    schema: METODIK_SCHEMA,
  },
  // Ärendestart: teknikern fotograferar arbetsordern; vi läser dokumentet
  // och returnerar strukturerade fält med konfidens per värde.
  // Visual-first: foto av instrument/diagnosskärm → strukturerade värden.
  instrumentavlasning: {
    modell: "claude-sonnet-5",
    effort: "low",
    maxTokens: 1024,
    system: INSTRUMENT_REGLER,
    schema: INSTRUMENT_SCHEMA,
    bild: true,
  },
  dokumenttolkning: {
    modell: "claude-sonnet-5",
    effort: "low",
    maxTokens: 2048,
    system: DOKUMENT_REGLER,
    schema: ARBETSORDER_SCHEMA,
    bild: true,
  },
};

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  try {
    const apiNyckel = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiNyckel) {
      return svara(503, { error: "AI-tjänsten är inte konfigurerad." });
    }
    const { uppgift, prompt, bild } = await req.json();
    const konfig = ORKESTER[uppgift as string];
    if (!konfig) {
      return svara(400, { error: "Okänd uppgift." });
    }
    if (typeof prompt !== "string" || prompt.trim().length === 0) {
      return svara(400, { error: "prompt saknas." });
    }
    if (prompt.length > MAX_PROMPT_LANGD) {
      return svara(400, { error: "prompt är för lång." });
    }

    // Bilduppgifter: bilden skickas som data-URL och blir ett image-block
    // före textprompten i samma användarmeddelande.
    let innehall: unknown = prompt;
    if (konfig.bild) {
      const matchning =
        typeof bild === "string" && bild.length <= MAX_BILD_LANGD
          ? bild.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/)
          : null;
      if (!matchning) return svara(400, { error: "bild saknas eller har fel format." });
      innehall = [
        { type: "image", source: { type: "base64", media_type: matchning[1], data: matchning[2] } },
        { type: "text", text: prompt },
      ];
    }

    const klient = new Anthropic({ apiKey: apiNyckel });
    const svar = await klient.beta.messages.create({
      model: konfig.modell,
      max_tokens: konfig.maxTokens,
      output_config: {
        ...(konfig.effort ? { effort: konfig.effort } : {}),
        format: { type: "json_schema", schema: konfig.schema },
      },
      // Avböjer säkerhetsklassificerarna faller anropet automatiskt
      // tillbaka till Anthropics rekommenderade reservmodell.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: [{ type: "text", text: konfig.system, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: innehall }],
      // deno-lint-ignore no-explicit-any -- fallbacks/output_config ligger före SDK-typerna
    } as any);

    if (svar.stop_reason === "refusal") {
      return svara(502, { error: "AI-tjänsten avböjde förfrågan." });
    }
    const textBlock = svar.content.find((block: { type: string }) => block.type === "text");
    if (!textBlock) {
      return svara(502, { error: "AI-svaret saknade innehåll." });
    }
    return svara(200, {
      modell: konfig.modell,
      svar: JSON.parse((textBlock as { text: string }).text),
    });
  } catch (fel) {
    console.error("felsokning-ai:", fel);
    return svara(500, { error: "AI-anropet misslyckades." });
  }
});

function svara(status: number, kropp: object): Response {
  return new Response(JSON.stringify(kropp), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
