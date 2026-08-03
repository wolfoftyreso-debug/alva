// Synkronisering mot backend. Append-only-modellen gör den konfliktfri:
// händelser flätas ihop per id och ingenting skrivs över — enheter kan
// arbeta offline och synka i efterhand utan att någon post går förlorad.
//
// Kräver inloggning (Supabase Auth). Utan session arbetar appen vidare
// i lokalt läge; synk återupptas när användaren loggat in.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Arende, Handelse, LoggPost } from "./domain";

// Deterministisk ihopflätning: dedupe per id, ordning per tidpunkt (id som
// stabil sekundärnyckel). Samma indata ger alltid samma resultat.
export function flataIhop(lokala: LoggPost[], fjarr: LoggPost[]): LoggPost[] {
  const perId = new Map<string, LoggPost>();
  for (const post of [...lokala, ...fjarr]) {
    if (!perId.has(post.id)) perId.set(post.id, post);
  }
  return [...perId.values()].sort(
    (a, b) => a.tidpunkt.localeCompare(b.tidpunkt) || a.id.localeCompare(b.id),
  );
}

export type SynkStatus = "lokal" | "synkar" | "synkad" | "offline";

export interface SynkResultat {
  status: SynkStatus;
  handelser?: LoggPost[];
}

interface FjarrHandelseRad {
  id: string;
  tidpunkt: string;
  anvandare: string;
  handelse: Handelse;
}

async function klient(): Promise<SupabaseClient | undefined> {
  try {
    const { supabase } = await import("@/integrations/supabase/client");
    // Tabellerna är nya — den genererade Database-typen regenereras av
    // Lovable/Supabase CLI; tills dess används klienten otypad här.
    return supabase as unknown as SupabaseClient;
  } catch {
    return undefined;
  }
}

// Självhostat läge: samma konfliktfria flätning, men mot plattformstjänsten.
async function synkroniseraMotPlattform(arende: Arende): Promise<SynkResultat> {
  const { plattformToken, plattformFetch } = await import("./plattform");
  if (!plattformToken()) return { status: "lokal" };
  try {
    await plattformFetch("/api/arenden", {
      method: "POST",
      body: JSON.stringify({
        id: arende.id,
        nummer: arende.nummer,
        skapad: arende.skapad,
        delningskod: arende.delningskod,
        metodikId: arende.metodikId,
      }),
    });
    const hamtat = await plattformFetch(`/api/arenden/${arende.id}/handelser`);
    if (!hamtat.ok) throw new Error(`Fel ${hamtat.status}`);
    const { handelser: fjarrRader } = (await hamtat.json()) as { handelser: FjarrHandelseRad[] };
    const fjarr: LoggPost[] = fjarrRader.map((rad) => ({
      id: rad.id,
      tidpunkt: new Date(rad.tidpunkt).toISOString(),
      anvandare: rad.anvandare,
      handelse: rad.handelse,
    }));
    const fjarrIds = new Set(fjarr.map((p) => p.id));
    const nya = arende.handelser.filter((p) => !fjarrIds.has(p.id));
    if (nya.length > 0) {
      const skrivet = await plattformFetch(`/api/arenden/${arende.id}/handelser`, {
        method: "POST",
        body: JSON.stringify({ handelser: nya }),
      });
      if (!skrivet.ok) throw new Error(`Fel ${skrivet.status}`);
    }
    return { status: "synkad", handelser: flataIhop(arende.handelser, fjarr) };
  } catch {
    const { plattformToken: kvarToken } = await import("./plattform");
    return { status: kvarToken() ? "offline" : "lokal" };
  }
}

export async function synkroniseraArende(arende: Arende): Promise<SynkResultat> {
  const { plattformAktiv } = await import("./plattform");
  if (plattformAktiv()) return synkroniseraMotPlattform(arende);

  const supabase = await klient();
  if (!supabase) return { status: "lokal" };
  try {
    const { data } = await supabase.auth.getSession();
    if (!data.session) return { status: "lokal" };

    const { error: arendeFel } = await supabase.from("felsokning_arenden").upsert(
      {
        id: arende.id,
        nummer: arende.nummer,
        skapad: arende.skapad,
        delningskod: arende.delningskod ?? null,
      },
      { onConflict: "id", ignoreDuplicates: true },
    );
    if (arendeFel) throw arendeFel;

    const { data: fjarrRader, error: lasFel } = await supabase
      .from("felsokning_handelser")
      .select("id,tidpunkt,anvandare,handelse")
      .eq("arende_id", arende.id);
    if (lasFel) throw lasFel;

    const fjarr: LoggPost[] = ((fjarrRader ?? []) as FjarrHandelseRad[]).map((rad) => ({
      id: rad.id,
      tidpunkt: new Date(rad.tidpunkt).toISOString(),
      anvandare: rad.anvandare,
      handelse: rad.handelse,
    }));

    const fjarrIds = new Set(fjarr.map((p) => p.id));
    const nya = arende.handelser
      .filter((p) => !fjarrIds.has(p.id))
      .map((p) => ({
        id: p.id,
        arende_id: arende.id,
        tidpunkt: p.tidpunkt,
        anvandare: p.anvandare,
        handelse: p.handelse,
      }));
    if (nya.length > 0) {
      const { error: skrivFel } = await supabase.from("felsokning_handelser").insert(nya);
      if (skrivFel) throw skrivFel;
    }

    return { status: "synkad", handelser: flataIhop(arende.handelser, fjarr) };
  } catch {
    return { status: "offline" };
  }
}
