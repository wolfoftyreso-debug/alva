// AI-handledning: Claude, driven av plattformen.
//
// AI:n hostas av tjänsten — inte av kunden. Klienten skickar ärendekontexten
// till plattformens backend (edge-funktionen felsokning-ai), som äger
// Claude API-nyckeln, systemprompten, modellvalet och svarsschemat.
// Inga AI-nycklar hanteras eller lagras någonsin i klienten.
//
// Kommunikationsmodellen är text in, text ut: teknikerns bekräftade
// inmatning skickas med ärendebriefen, och svaret kommer tillbaka strikt
// klassificerat enligt AI-reglerna — observation / verifierat / hypotes /
// rekommendation — plus ETT konkret nästa steg.

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

// Returnerar null i lokalt läge (ej inloggad) — AI:n är en del av tjänsten
// och nås via plattformens autentiserade backend.
export async function fragaAi(
  brief: Brief,
  metodikNamn: string,
  inmatning: string,
): Promise<AiSvar | null> {
  const { supabase } = await import("@/integrations/supabase/client");
  const { data } = await supabase.auth.getSession();
  if (!data.session) return null;

  const { data: svar, error } = await supabase.functions.invoke("felsokning-ai", {
    body: { prompt: byggAnvandarPrompt(brief, metodikNamn, inmatning) },
  });
  if (error) throw error;
  return tolkaAiSvar(svar);
}
