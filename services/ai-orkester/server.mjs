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

const PORT = Number(process.env.PORT ?? 8080);
const MAX_PROMPT_LANGD = 40000;
const MAX_KROPP = 256 * 1024;

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

    let uppgift, prompt;
    try {
      ({ uppgift, prompt } = await lasKropp(req));
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

    try {
      const klient = new Anthropic({ apiKey: apiNyckel });
      const svar = await klient.beta.messages.create({
        model: konfig.modell,
        max_tokens: konfig.maxTokens,
        output_config: {
          ...(konfig.effort ? { effort: konfig.effort } : {}),
          format: { type: "json_schema", schema: konfig.schema },
        },
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        system: [{ type: "text", text: konfig.system, cache_control: { type: "ephemeral" } }],
        messages: [{ role: "user", content: prompt }],
      });
      if (svar.stop_reason === "refusal") {
        return svara(res, 502, { error: "AI-tjänsten avböjde förfrågan." });
      }
      const textBlock = svar.content.find((block) => block.type === "text");
      if (!textBlock) return svara(res, 502, { error: "AI-svaret saknade innehåll." });
      return svara(res, 200, { modell: konfig.modell, svar: JSON.parse(textBlock.text) });
    } catch (fel) {
      console.error("ai-orkester:", fel);
      return svara(res, 500, { error: "AI-anropet misslyckades." });
    }
  });
}

if (process.env.NODE_ENV !== "test") {
  skapaServer().listen(PORT, () => {
    console.log(`ai-orkester lyssnar på :${PORT}`);
  });
}
