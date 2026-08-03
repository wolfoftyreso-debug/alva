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
// - handledning      → Claude Sonnet 5  (realtidssvar på varje dokumentation)
// - granskning       → Claude Opus 5    (motsägelser/luckor i hela underlaget)
// - sammanfattning   → Claude Sonnet 5  (överlämning: risker & osäkerheter)
// - metodikval       → Claude Haiku 4.5 (klassificering av felbeskrivning)
// - dokumenttolkning → Claude Sonnet 5  (vision: skannad arbetsorder → fält)

import type { Arende } from "./domain";
import { handelseRubrik } from "./domain";
import type { Metodik } from "./metodik";
import { METODIKER } from "./metodik";
import type { Brief } from "./projektioner";
import { brief } from "./projektioner";

export type AiUppgift =
  | "handledning"
  | "granskning"
  | "sammanfattning"
  | "metodikval"
  | "dokumenttolkning"
  | "instrumentavlasning";

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

// ---- Arbetsorderskanning (dokumenttolkning) ---------------------------
// Teknikern fotograferar arbetsorderns framsida; AI:n läser dokumentet
// (OCR + layoutförståelse) och returnerar strukturerade fält med
// konfidens per värde. Bara osäkra fält behöver granskas.

export type ArbetsorderGrupp = "Kund" | "Personbil" | "Verkstad" | "Ärende";

export interface TolkatFalt {
  id: string;
  etikett: string;
  grupp: ArbetsorderGrupp;
  varde: string;
  konfidens: number; // 0–1
  // Ungefärlig position i den skannade bilden, normaliserad 0–1.
  omrade?: { x: number; y: number; bredd: number; hojd: number };
}

export const ARBETSORDER_FALT: { id: string; grupp: ArbetsorderGrupp; etikett: string }[] = [
  { id: "kund_namn", grupp: "Kund", etikett: "Namn" },
  { id: "kund_foretag", grupp: "Kund", etikett: "Företag" },
  { id: "kund_telefon", grupp: "Kund", etikett: "Telefon" },
  { id: "kund_epost", grupp: "Kund", etikett: "E-post" },
  { id: "fordon_regnr", grupp: "Personbil", etikett: "Regnr" },
  { id: "fordon_vin", grupp: "Personbil", etikett: "VIN" },
  { id: "fordon_marke", grupp: "Personbil", etikett: "Märke" },
  { id: "fordon_modell", grupp: "Personbil", etikett: "Modell" },
  { id: "fordon_motor", grupp: "Personbil", etikett: "Motor" },
  { id: "fordon_arsmodell", grupp: "Personbil", etikett: "Årsmodell" },
  { id: "fordon_matarstallning", grupp: "Personbil", etikett: "Mätarställning" },
  { id: "fordon_motorkod", grupp: "Personbil", etikett: "Motorkod" },
  { id: "fordon_vaxellada", grupp: "Personbil", etikett: "Växellåda" },
  { id: "ao_nummer", grupp: "Verkstad", etikett: "Arbetsordernr" },
  { id: "ao_claim", grupp: "Verkstad", etikett: "Claim-/garantinr" },
  { id: "ao_skadenummer", grupp: "Verkstad", etikett: "Skadenummer" },
  { id: "ao_referens", grupp: "Verkstad", etikett: "Intern referens" },
  { id: "ao_serviceradgivare", grupp: "Verkstad", etikett: "Servicerådgivare" },
  { id: "ao_bokningsdatum", grupp: "Verkstad", etikett: "Bokningsdatum" },
  { id: "felbeskrivning", grupp: "Ärende", etikett: "Felbeskrivning" },
];

const ARBETSORDER_PROMPT =
  "Tolka den bifogade arbetsordern från en fordonsverkstad och extrahera fälten.";

// Rensar AI-svaret: okända fält-id filtreras, konfidens klipps till 0–1,
// tomma värden tas bort och etikett/grupp slås upp ur katalogen.
export function normaliseraArbetsorder(data: unknown): TolkatFalt[] {
  const rader = (data as { falt?: unknown }).falt;
  if (!Array.isArray(rader)) throw new Error("Oväntat tolkningsformat");
  const resultat: TolkatFalt[] = [];
  for (const rad of rader as Partial<TolkatFalt>[]) {
    const def = ARBETSORDER_FALT.find((f) => f.id === rad?.id);
    if (!def || typeof rad.varde !== "string" || !rad.varde.trim()) continue;
    if (resultat.some((f) => f.id === def.id)) continue;
    const konfidens = typeof rad.konfidens === "number" ? Math.min(1, Math.max(0, rad.konfidens)) : 0;
    const o = rad.omrade;
    const omrade =
      o && [o.x, o.y, o.bredd, o.hojd].every((v) => typeof v === "number" && v >= 0 && v <= 1)
        ? o
        : undefined;
    resultat.push({ id: def.id, etikett: def.etikett, grupp: def.grupp, varde: rad.varde.trim(), konfidens, omrade });
  }
  return resultat;
}

export async function tolkaArbetsorder(
  dataUrl: string,
): Promise<{ falt: TolkatFalt[]; modell: string } | null> {
  const resultat = await anropa("dokumenttolkning", ARBETSORDER_PROMPT, { bild: dataUrl });
  return resultat ? { falt: normaliseraArbetsorder(resultat.svar), modell: resultat.modell } : null;
}

// ---- Instrumentavläsning (visual-first) -------------------------------
// Kameran är det universella gränssnittet: när ett instrument, en
// diagnosdator eller ett dokument visar information fotograferas det —
// systemet extraherar värden, enheter och felkoder med konfidens per
// värde. Originalbilden bevaras alltid som evidens.

export interface InstrumentVarde {
  beskrivning: string;
  varde: string;
  enhet?: string;
  konfidens: number; // 0–1
}

export interface InstrumentTolkning {
  instrumenttyp: string;
  varden: InstrumentVarde[];
}

export function normaliseraInstrument(data: unknown): InstrumentTolkning {
  const d = data as Partial<InstrumentTolkning>;
  if (!d || typeof d.instrumenttyp !== "string" || !Array.isArray(d.varden)) {
    throw new Error("Oväntat avläsningsformat");
  }
  const varden: InstrumentVarde[] = [];
  for (const rad of d.varden as Partial<InstrumentVarde>[]) {
    if (typeof rad?.beskrivning !== "string" || typeof rad.varde !== "string" || !rad.varde.trim()) continue;
    varden.push({
      beskrivning: rad.beskrivning.trim(),
      varde: rad.varde.trim(),
      enhet: typeof rad.enhet === "string" && rad.enhet.trim() ? rad.enhet.trim() : undefined,
      konfidens: typeof rad.konfidens === "number" ? Math.min(1, Math.max(0, rad.konfidens)) : 0,
    });
  }
  return { instrumenttyp: d.instrumenttyp.trim() || "instrument", varden };
}

export async function lasAvInstrument(
  dataUrl: string,
): Promise<{ tolkning: InstrumentTolkning; modell: string } | null> {
  const resultat = await anropa(
    "instrumentavlasning",
    "Läs av instrumentet/skärmen i den bifogade bilden.",
    { bild: dataUrl },
  );
  return resultat ? { tolkning: normaliseraInstrument(resultat.svar), modell: resultat.modell } : null;
}

// I Kubernetes-driften pekar VITE_AI_ORKESTER_URL på orkestertjänsten
// (services/ai-orkester); utan den används Supabase-edge-funktionen.
const ORKESTER_URL = (import.meta.env.VITE_AI_ORKESTER_URL as string | undefined)?.replace(/\/$/, "");

// Returnerar null i lokalt läge (ej inloggad) — orkestern nås via
// plattformens autentiserade backend.
async function anropa(
  uppgift: AiUppgift,
  prompt: string,
  extra?: Record<string, unknown>,
): Promise<{ modell: string; svar: unknown } | null> {
  const { plattformAktiv, plattformToken, PLATTFORM_URL } = await import("./plattform");

  let token: string | null = null;
  if (plattformAktiv()) {
    // Självhostat: plattformens egen JWT — samma hemlighet verifieras
    // av AI-orkestern i klustret.
    token = plattformToken();
    if (!token) return null;
  } else {
    const { supabase } = await import("@/integrations/supabase/client");
    const { data } = await supabase.auth.getSession();
    if (!data.session) return null;
    token = data.session.access_token;
  }

  let resultat: unknown;
  const bas = ORKESTER_URL ?? (plattformAktiv() ? PLATTFORM_URL : undefined);
  if (bas) {
    const res = await fetch(`${bas}/api/ai`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ uppgift, prompt, ...extra }),
    });
    if (!res.ok) throw new Error(`AI-orkestern svarade ${res.status}`);
    resultat = await res.json();
  } else {
    const { supabase } = await import("@/integrations/supabase/client");
    const { data: svar, error } = await supabase.functions.invoke("felsokning-ai", {
      body: { uppgift, prompt, ...extra },
    });
    if (error) throw error;
    resultat = svar;
  }
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
