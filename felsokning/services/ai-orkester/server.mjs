// AI-orkestern som fristående tjänst — plattformens K8s-native AI-endpoint.
//
// Samma orkester som edge-funktionen (supabase/functions/felsokning-ai),
// men körbar som pod i Kubernetes: Claude API-nyckeln och Supabase
// JWT-hemligheten kommer från secrets, hälsokontroll på /halsa, och
// tjänsten verifierar användarens JWT själv (HS256) eftersom den inte
// står bakom Supabase-gatewayen.
//
// Miljövariabler:
//   ANTHROPIC_API_KEY    Claude-nyckel (plattformshemlighet, krävs)
//   SUPABASE_JWT_SECRET  JWT-hemlighet för verifiering (krävs — fail closed)
//   PORT                 default 8080

import { createServer } from "node:http";
import { createHmac, timingSafeEqual } from "node:crypto";
import Anthropic from "@anthropic-ai/sdk";
import { avsluta, logga, mätvärde, spårFrån, starta } from "./observation.mjs";

const PORT = Number(process.env.PORT ?? 8080);
const MAX_PROMPT_LANGD = 40000;
// Rymmer en nedskalad arbetsorderbild som data-URL.
const MAX_KROPP = 4 * 1024 * 1024;
const MAX_BILD_LANGD = 3_000_000;

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
- Skriv aldrig "felet konstaterat" om symptomet varken reproducerats eller verifierats med dokumentation — skriv då "Kundens beskrivning kunde inte reproduceras under de förhållanden som rådde vid undersökningen."
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

// Fält som kan tolkas ur en skannad arbetsorder (samma katalog som
// edge-funktionen och klienten).
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

// Orkestern: en modell per uppgiftstyp (samma routing som edge-funktionen).
const ORKESTER = {
  handledning: {
    modell: "claude-sonnet-5",
    effort: "medium",
    maxTokens: 1024,
    system: `${GRUND_REGLER}\n\nUppgift: Du är teknikerns digitala felsökningshandledare. Teknikern har just dokumenterat något nytt — svara på det i ljuset av ärendebriefen. En kontroll i taget, inte långa utläggningar: max fyra rader plus nästa steg.`,
    schema: SVARS_SCHEMA,
  },
  granskning: {
    modell: "claude-opus-5",
    effort: "high",
    maxTokens: 2048,
    system: `${GRUND_REGLER}\n\nUppgift: Granska HELA underlaget i ärendet. Leta specifikt efter (1) motsägelser mellan observationer eller mätvärden, (2) luckor — kontroller som borde vara gjorda givet symptombilden men saknas, (3) förhastade slutsatser som saknar stöd. Rapportera motsägelser och luckor som "observation", möjliga felorsaker som underlaget antyder som "hypotes", och det viktigaste att åtgärda som "rekommendation". Max sex rader.`,
    schema: SVARS_SCHEMA,
  },
  sammanfattning: {
    modell: "claude-sonnet-5",
    effort: "low",
    maxTokens: 1024,
    system: `${GRUND_REGLER}\n\nUppgift: En tekniker lämnar över ärendet. Komplettera överlämningen med det som inte syns i checklistorna: risker och osäkerheter i underlaget, klassificerade som rader. "nastaSteg" är det första nästa tekniker bör göra. Max fyra rader.`,
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

// Minimal HS256-JWT-verifiering (Supabase legacy JWT secret) utan beroenden.
export function verifieraJwt(token, hemlighet) {
  const delar = token.split(".");
  if (delar.length !== 3) return null;
  const [huvud, kropp, signatur] = delar;
  const forvantad = createHmac("sha256", hemlighet)
    .update(`${huvud}.${kropp}`)
    .digest("base64url");
  const a = Buffer.from(signatur);
  const b = Buffer.from(forvantad);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const anspServer = JSON.parse(Buffer.from(kropp, "base64url").toString("utf8"));
    if (typeof anspServer.exp === "number" && anspServer.exp * 1000 < Date.now()) return null;
    return anspServer;
  } catch {
    return null;
  }
}

function svara(res, status, kropp) {
  const data = JSON.stringify(kropp);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, content-type",
  });
  res.end(data);
}

async function lasKropp(req) {
  const bitar = [];
  let storlek = 0;
  for await (const bit of req) {
    storlek += bit.length;
    if (storlek > MAX_KROPP) throw new Error("för stor kropp");
    bitar.push(bit);
  }
  return JSON.parse(Buffer.concat(bitar).toString("utf8"));
}

export function skapaServer() {
  return createServer(async (req, res) => {
    // Spåret kommer från plattformen, så ett långsamt teknikeranrop går
    // att följa hela vägen till modellsvaret.
    res.spår = spårFrån(req.headers.traceparent);
    res.spann = starta("ai-orkester", res.spår);
    res.on("finish", () =>
      avsluta(res.spann, { status: res.statusCode, väg: req.url ?? "/", extra: { metod: req.method } }),
    );

    if (req.method === "OPTIONS") {
      res.writeHead(204, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, content-type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      });
      return res.end();
    }
    if (req.method === "GET" && req.url === "/halsa") {
      return svara(res, 200, { status: "ok" });
    }
    if (req.method !== "POST" || req.url !== "/api/ai") {
      return svara(res, 404, { error: "Okänd resurs." });
    }

    const apiNyckel = process.env.ANTHROPIC_API_KEY;
    // JWT_SECRET i självhostat läge (delas med plattformstjänsten);
    // SUPABASE_JWT_SECRET när auth ligger hos Supabase.
    const jwtHemlighet = process.env.JWT_SECRET ?? process.env.SUPABASE_JWT_SECRET;
    if (!apiNyckel || !jwtHemlighet) {
      return svara(res, 503, { error: "AI-tjänsten är inte konfigurerad." });
    }

    const auth = req.headers.authorization ?? "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    if (!token || !verifieraJwt(token, jwtHemlighet)) {
      return svara(res, 401, { error: "Inloggning krävs." });
    }

    let uppgift, prompt, bild;
    try {
      ({ uppgift, prompt, bild } = await lasKropp(req));
    } catch {
      return svara(res, 400, { error: "Ogiltig förfrågan." });
    }
    const konfig = ORKESTER[uppgift];
    if (!konfig) return svara(res, 400, { error: "Okänd uppgift." });
    if (typeof prompt !== "string" || prompt.trim().length === 0) {
      return svara(res, 400, { error: "prompt saknas." });
    }
    if (prompt.length > MAX_PROMPT_LANGD) {
      return svara(res, 400, { error: "prompt är för lång." });
    }

    // Bilduppgifter: data-URL → image-block före textprompten.
    let innehall = prompt;
    if (konfig.bild) {
      const matchning =
        typeof bild === "string" && bild.length <= MAX_BILD_LANGD
          ? bild.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/)
          : null;
      if (!matchning) return svara(res, 400, { error: "bild saknas eller har fel format." });
      innehall = [
        { type: "image", source: { type: "base64", media_type: matchning[1], data: matchning[2] } },
        { type: "text", text: prompt },
      ];
    }

    try {
      const klient = new Anthropic({ apiKey: apiNyckel });
      const svar = await res.spann.mät(`modell_${uppgift}`, () =>
        klient.beta.messages.create({
        model: konfig.modell,
        max_tokens: konfig.maxTokens,
        output_config: {
          ...(konfig.effort ? { effort: konfig.effort } : {}),
          format: { type: "json_schema", schema: konfig.schema },
        },
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
          system: [{ type: "text", text: konfig.system, cache_control: { type: "ephemeral" } }],
          messages: [{ role: "user", content: innehall }],
        }),
      );
      // Modellval, token och latens per uppgift. Det är den här
      // uppdelningen som svarar på om en långsam session beror på
      // granskningen (Opus, hög effort) eller på något annat.
      mätvärde(
        "ModellTokens",
        (svar.usage?.input_tokens ?? 0) + (svar.usage?.output_tokens ?? 0),
        "Count",
        { Uppgift: uppgift, Modell: konfig.modell },
        {
          in: svar.usage?.input_tokens ?? 0,
          ut: svar.usage?.output_tokens ?? 0,
          cache_las: svar.usage?.cache_read_input_tokens ?? 0,
          spårId: res.spår.spårId,
        },
      );

      if (svar.stop_reason === "refusal") {
        logga("varning", "modellen avböjde", { uppgift, modell: konfig.modell, spårId: res.spår.spårId });
        mätvärde("ModellAvbojd", 1, "Count", { Uppgift: uppgift, Modell: konfig.modell });
      }
      if (svar.stop_reason === "refusal") {
        return svara(res, 502, { error: "AI-tjänsten avböjde förfrågan." });
      }
      const textBlock = svar.content.find((block) => block.type === "text");
      if (!textBlock) return svara(res, 502, { error: "AI-svaret saknade innehåll." });
      return svara(res, 200, { modell: konfig.modell, svar: JSON.parse(textBlock.text) });
    } catch (fel) {
      logga("fel", "AI-anropet misslyckades", {
        uppgift,
        modell: konfig.modell,
        spårId: res.spår.spårId,
        orsak: fel?.message ?? String(fel),
      });
      return svara(res, 500, { error: "AI-anropet misslyckades." });
    }
  });
}

if (process.env.NODE_ENV !== "test") {
  skapaServer().listen(PORT, () => {
    console.log(`ai-orkester lyssnar på :${PORT}`);
  });
}
