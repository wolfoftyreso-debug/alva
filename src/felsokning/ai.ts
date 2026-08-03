// AI-handledning: Claude-orkestern, driven av plattformen.
//
// Vi kör flera modeller i plattformens infrastruktur och routar per
// uppgift. Klienten skickar bara uppgiftstyp + underlag till backend
// (edge-funktionen felsokning-ai); servern äger modellval, effort,
// systemprompt och svarsschema. Inga AI-nycklar hanteras eller lagras
// någonsin i klienten, och svaret kommer alltid tillbaka strikt
// klassificerat enligt AI-reglerna.
//
// Orkestern (serverns routing):
// - handledning     → Claude Sonnet 5  (realtidssvar på varje dokumentation)
// - granskning      → Claude Opus 5    (motsägelser/luckor i hela underlaget)
// - sammanfattning  → Claude Sonnet 5  (överlämning: risker & osäkerheter)
// - metodikval      → Claude Haiku 4.5 (klassificering av felbeskrivning)

import type { Arende } from "./domain";
import { handelseRubrik } from "./domain";
import type { Metodik } from "./metodik";
import { METODIKER } from "./metodik";
import type { Brief } from "./projektioner";
import { brief } from "./projektioner";

export type AiUppgift = "handledning" | "granskning" | "sammanfattning" | "metodikval";

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

export interface AiSvarMedModell extends AiSvar {
  modell: string;
}

export function byggAnvandarPrompt(brief: Brief, metodikNamn: string, inmatning?: string): string {
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
  if (inmatning) {
    rader.push("");
    rader.push(`Teknikerns nya inmatning: ${inmatning}`);
  }
  return rader.join("\n");
}

// Granskningen får hela arbetsloggen, inte bara briefen.
export function byggGranskningsPrompt(arende: Arende, metodik: Metodik): string {
  const kontext = byggAnvandarPrompt(brief(arende, metodik), metodik.namn);
  const logg = arende.handelser
    .map((p) => `${p.tidpunkt.slice(11, 16)} ${p.anvandare}: ${handelseRubrik(p)}`)
    .join("\n");
  return `${kontext}\n\nFullständig arbetslogg:\n${logg}`;
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

// Returnerar null i lokalt läge (ej inloggad) — orkestern nås via
// plattformens autentiserade backend.
async function anropa(uppgift: AiUppgift, prompt: string): Promise<{ modell: string; svar: unknown } | null> {
  const { supabase } = await import("@/integrations/supabase/client");
  const { data } = await supabase.auth.getSession();
  if (!data.session) return null;

  const { data: resultat, error } = await supabase.functions.invoke("felsokning-ai", {
    body: { uppgift, prompt },
  });
  if (error) throw error;
  const { modell, svar } = resultat as { modell?: string; svar?: unknown };
  if (typeof modell !== "string") throw new Error("Oväntat svar från AI-endpointen");
  return { modell, svar };
}

export async function fragaAi(
  briefData: Brief,
  metodikNamn: string,
  inmatning: string,
): Promise<AiSvarMedModell | null> {
  const resultat = await anropa("handledning", byggAnvandarPrompt(briefData, metodikNamn, inmatning));
  return resultat ? { ...tolkaAiSvar(resultat.svar), modell: resultat.modell } : null;
}

export async function granskaUnderlag(arende: Arende, metodik: Metodik): Promise<AiSvarMedModell | null> {
  const resultat = await anropa("granskning", byggGranskningsPrompt(arende, metodik));
  return resultat ? { ...tolkaAiSvar(resultat.svar), modell: resultat.modell } : null;
}

export async function sammanfattaOverlamning(
  arende: Arende,
  metodik: Metodik,
): Promise<AiSvarMedModell | null> {
  const resultat = await anropa("sammanfattning", byggGranskningsPrompt(arende, metodik));
  return resultat ? { ...tolkaAiSvar(resultat.svar), modell: resultat.modell } : null;
}

// Klassificerar felbeskrivningen till en metodik; null om lokalt läge,
// anropet misslyckas eller svaret inte är en känd metodik.
export async function valjMetodikMedAi(felbeskrivning: string): Promise<string | null> {
  try {
    const resultat = await anropa("metodikval", felbeskrivning);
    if (!resultat) return null;
    const { metodikId } = resultat.svar as { metodikId?: string };
    return METODIKER.some((m) => m.id === metodikId) ? (metodikId as string) : null;
  } catch {
    return null;
  }
}
