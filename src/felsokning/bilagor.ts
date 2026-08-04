// Bilagor på klientsidan.
//
// Innehållet ligger inte längre i händelsen utan hämtas separat. Det gör
// synken lätt igen: en ärendesynk var femtonde sekund drar inte med sig
// hela bildmassan, och kundvyn laddar bara de bilder som faktiskt visas.
//
// I lokalt läge (ingen inloggning) finns ingen server att ladda upp till.
// Då används data-URL:en precis som förut — appen ska fungera utan
// backend, och en tekniker som dokumenterar offline får inte tappa något.

import type { Bilaga } from "./domain";

// Objekt-URL:er per bilage-id. Innehållsadresserat på servern, så en
// hämtad bilaga kan cachas obegränsat under sidans livstid.
const cache = new Map<string, Promise<string | null>>();

export function harBilaga(b: Bilaga | undefined): boolean {
  return !!b && (!!b.bilagaId || !!b.dataUrl);
}

/**
 * Laddar upp innehållet och returnerar referensen som ska sparas i
 * händelsen. Returnerar null i lokalt läge — då sparas data-URL:en i
 * stället.
 */
export async function laddaUppBilaga(
  arendeId: string,
  dataUrl: string,
): Promise<{ bilagaId: string; bilagaHash: string } | null> {
  const { plattformAktiv, plattformToken, PLATTFORM_URL } = await import("./plattform");
  if (!plattformAktiv() || !plattformToken()) return null;

  const svar = await fetch(dataUrl);
  const blob = await svar.blob();

  const res = await fetch(`${PLATTFORM_URL}/api/arenden/${arendeId}/bilagor`, {
    method: "POST",
    headers: {
      "Content-Type": blob.type || "application/octet-stream",
      Authorization: `Bearer ${plattformToken()}`,
    },
    body: blob,
  });
  if (!res.ok) throw new Error(`Bilagan kunde inte sparas (${res.status}).`);
  const { id, hash } = (await res.json()) as { id: string; hash: string };
  return { bilagaId: id, bilagaHash: hash };
}

/**
 * Bygger det som ska in i händelsen. Lyckas uppladdningen bär händelsen
 * en referens; annars data-URL:en. Det senare är inte ett fel utan
 * lokalt läge — dokumentationen får aldrig gå förlorad för att nätet
 * ligger nere.
 */
export async function bilageFalt(arendeId: string, dataUrl: string): Promise<Bilaga> {
  try {
    const referens = await laddaUppBilaga(arendeId, dataUrl);
    if (referens) return referens;
  } catch {
    // Faller igenom till inbäddning nedan.
  }
  return { dataUrl };
}

/**
 * Var innehållet finns att hämta. `delningskod` sätts i den publika
 * vyn — där går hämtningen via delningens egen väg, som filtrerar på
 * samma nivå som händelserna.
 */
export async function hamtaBilaga(b: Bilaga, delningskod?: string): Promise<string | null> {
  if (b.dataUrl) return b.dataUrl;
  if (!b.bilagaId) return null;

  const nyckel = `${delningskod ?? ""}:${b.bilagaId}`;
  const befintlig = cache.get(nyckel);
  if (befintlig) return befintlig;

  const hamtning = (async () => {
    const { PLATTFORM_URL, plattformToken } = await import("./plattform");
    if (!PLATTFORM_URL) return null;

    const url = delningskod
      ? `${PLATTFORM_URL}/api/delad/${delningskod}/bilagor/${b.bilagaId}`
      : `${PLATTFORM_URL}/api/bilagor/${b.bilagaId}`;
    const token = plattformToken();

    const res = await fetch(url, {
      headers: !delningskod && token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) return null;
    return URL.createObjectURL(await res.blob());
  })();

  cache.set(nyckel, hamtning);
  return hamtning;
}
