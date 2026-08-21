// Synkronisering mot backend. Append-only-modellen gör den konfliktfri:
// händelser flätas ihop per id och ingenting skrivs över — enheter kan
// arbeta offline och synka i efterhand utan att någon post går förlorad.
//
// Kräver inloggning mot plattformstjänsten. Utan token arbetar appen
// vidare i lokalt läge; synk återupptas när användaren loggat in.

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

// Samma konfliktfria flätning, mot plattformstjänsten.
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
  // Demonstrationsärendet stannar på enheten — i BÅDA driftlägena. Utan
  // den här raden hamnade fejkbilen i organisationens ärendelista,
  // statistik och evidensunderlag vid första inloggningen, omöjlig för
  // servern att skilja från ett riktigt ärende eftersom ingenting i
  // loggen sade att den var påhittad.
  if (arende.demo) return { status: "lokal" };
  const { plattformAktiv } = await import("./plattform");
  // Utan konfigurerad plattformstjänst arbetar appen lokalt — ingen synk,
  // ingen dataförlust. Historiken flätas in när användaren loggat in.
  if (!plattformAktiv()) return { status: "lokal" };
  return synkroniseraMotPlattform(arende);
}
