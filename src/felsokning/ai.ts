// AI-motor: Claude som diagnostikhandledare.
//
// Kommunikationsmodellen är text in, text ut: teknikerns (bekräftade)
// inmatning skickas tillsammans med ärendebriefen, och Claude svarar
// kortfattat och klassificerat enligt AI-reglerna i Master Prompt —
// observation / verifierat / hypotes / rekommendation. Svaret är
// schema-bundet (structured outputs), så det kan aldrig komma tillbaka
// som fritext som råkar läsas som ett konstaterat fel.
//
// MVP: tenantens egen API-nyckel används direkt från klienten
// (dangerouslyAllowBrowser). I produktionsversionen flyttas anropet
// bakom plattformens backend så att nycklar aldrig lämnar servern.

import Anthropic from "@anthropic-ai/sdk";
import type { Brief } from "./projektioner";

export const AI_MODELL = "claude-opus-5";

export type AiRadTyp = "observation" | "verifierat" | "hypotes" | "rekommendation";

export const AI_RADTYP_LABEL: Record<AiRadTyp, string> = {
  observation: "Observation",
  verifierat: "Verifierat",
  hypotes: "🔴 Hypotes",
  rekommendation: "Rekommendation",
};

export interface AiRad {
  typ: AiRadTyp;
  text: string;
}

export interface AiSvar {
  rader: AiRad[];
  nastaSteg: string;
}

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
} as const;

// Fryst systemprompt (cachas mellan anrop) — all ärendespecifik kontext
// ligger i användarmeddelandet.
export const SYSTEM_PROMPT = `Du är en digital felsökningshandledare för professionella tekniker i plattformen Guidad Felsökning. Du är inte en AI-mekaniker: du ersätter aldrig teknikerns kompetens eller tillverkarens dokumentation — du säkerställer att arbetet sker metodiskt och dokumenteras korrekt.

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

export function byggAnvandarPrompt(brief: Brief, metodikNamn: string, inmatning: string): string {
  const rader: string[] = [];
  rader.push(`Metodik: ${metodikNamn}`);
  if (brief.objekt) rader.push(`Objekt: ${brief.objekt.beskrivning} (${brief.objekt.identifierare})`);
  if (brief.felbeskrivning) rader.push(`Felbeskrivning: ${brief.felbeskrivning}`);
  if (brief.utfordaKontroller.length > 0) {
    rader.push("Utförda kontroller:");
    for (const k of brief.utfordaKontroller) rader.push(`- ${k.text}${k.resultat ? `: ${k.resultat}` : ""}`);
  }
  if (brief.observationer.length > 0) {
    rader.push("Observationer och mätvärden:");
    for (const o of brief.observationer) rader.push(`- ${o}`);
  }
  if (brief.ejKontrollerat.length > 0) {
    rader.push(`Ej kontrollerat enligt metodiken: ${brief.ejKontrollerat.join("; ")}`);
  }
  rader.push("");
  rader.push(`Teknikerns nya inmatning: ${inmatning}`);
  return rader.join("\n");
}

export function tolkaAiSvar(data: unknown): AiSvar {
  const svar = data as AiSvar;
  if (!svar || !Array.isArray(svar.rader) || typeof svar.nastaSteg !== "string") {
    throw new Error("Oväntat AI-svarsformat");
  }
  const giltiga: AiRadTyp[] = ["observation", "verifierat", "hypotes", "rekommendation"];
  const rader = svar.rader.filter(
    (rad): rad is AiRad => !!rad && giltiga.includes(rad.typ) && typeof rad.text === "string",
  );
  return { rader, nastaSteg: svar.nastaSteg };
}

export async function fragaAi(
  apiNyckel: string,
  brief: Brief,
  metodikNamn: string,
  inmatning: string,
): Promise<AiSvar> {
  const klient = new Anthropic({ apiKey: apiNyckel, dangerouslyAllowBrowser: true });
  const svar = await klient.beta.messages.create({
    model: AI_MODELL,
    max_tokens: 1024,
    // Verkstadsgolvet är latenskänsligt och uppgiften är väl avgränsad
    // av briefen — medium balanserar svarstid mot kvalitet.
    output_config: {
      effort: "medium",
      format: { type: "json_schema", schema: SVARS_SCHEMA },
    },
    // Avböjer säkerhetsklassificerarna faller anropet automatiskt
    // tillbaka till Anthropics rekommenderade reservmodell.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: byggAnvandarPrompt(brief, metodikNamn, inmatning) }],
  } as Parameters<typeof klient.beta.messages.create>[0]);

  if (svar.stop_reason === "refusal") {
    throw new Error("AI-tjänsten avböjde förfrågan.");
  }
  const textBlock = svar.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("AI-svaret saknade innehåll.");
  }
  return tolkaAiSvar(JSON.parse(textBlock.text));
}
