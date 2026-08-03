// Plattformens AI-endpoint för Guidad Felsökning.
//
// AI:n drivs av plattformen, inte av kunden: Claude API-nyckeln är en
// serverhemlighet (ANTHROPIC_API_KEY) och lämnar aldrig backend. Klienten
// skickar ärendekontexten som text; servern äger systemprompt, modellval
// och svarsschema, så AI-reglerna kan inte kringgås från klientsidan.
//
// Kräver inloggad användare (verify_jwt = true i config.toml).

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Anthropic from "npm:@anthropic-ai/sdk";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const AI_MODELL = "claude-opus-5";
const MAX_PROMPT_LANGD = 20000;

const SYSTEM_PROMPT = `Du är en digital felsökningshandledare för professionella tekniker i plattformen Guidad Felsökning. Du är inte en AI-mekaniker: du ersätter aldrig teknikerns kompetens eller tillverkarens dokumentation — du säkerställer att arbetet sker metodiskt och dokumenteras korrekt.

Absoluta regler:
- Hitta aldrig på fakta. Låtsas aldrig veta. Gissa aldrig.
- Presentera aldrig en hypotes som ett konstaterat fel.
- Skilj strikt mellan raderna du returnerar:
  - "verifierat": endast det som är belagt av mätvärden eller dokumenterade kontroller i underlaget.
  - "observation": det som konstaterats utan slutsats.
  - "hypotes": möjlig felorsak som KRÄVER verifiering — formulera alltid vad som skulle verifiera den.
  - "rekommendation": nästa verifierbara kontroll eller mätning.
- Om underlaget är otillräckligt: säg det uttryckligen i en observation och rekommendera vad som behöver dokumenteras.

Arbetssätt: en kontroll i taget, inte långa utläggningar. Svara på svenska, konsekvent, kortfattat och metodiskt — max fyra rader plus nästa steg. "nastaSteg" är EN konkret, verifierbar åtgärd.`;

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

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  try {
    const apiNyckel = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiNyckel) {
      return svara(503, { error: "AI-tjänsten är inte konfigurerad." });
    }
    const { prompt } = await req.json();
    if (typeof prompt !== "string" || prompt.trim().length === 0) {
      return svara(400, { error: "prompt saknas." });
    }
    if (prompt.length > MAX_PROMPT_LANGD) {
      return svara(400, { error: "prompt är för lång." });
    }

    const klient = new Anthropic({ apiKey: apiNyckel });
    const svar = await klient.beta.messages.create({
      model: AI_MODELL,
      max_tokens: 1024,
      // Verkstadsgolvet är latenskänsligt och uppgiften väl avgränsad
      // av ärendebriefen — medium balanserar svarstid mot kvalitet.
      output_config: {
        effort: "medium",
        format: { type: "json_schema", schema: SVARS_SCHEMA },
      },
      // Avböjer säkerhetsklassificerarna faller anropet automatiskt
      // tillbaka till Anthropics rekommenderade reservmodell.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: prompt }],
      // deno-lint-ignore no-explicit-any -- fallbacks/output_config ligger före SDK-typerna
    } as any);

    if (svar.stop_reason === "refusal") {
      return svara(502, { error: "AI-tjänsten avböjde förfrågan." });
    }
    const textBlock = svar.content.find((block: { type: string }) => block.type === "text");
    if (!textBlock) {
      return svara(502, { error: "AI-svaret saknade innehåll." });
    }
    return new Response((textBlock as { text: string }).text, {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
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
