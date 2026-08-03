// Självhostat läge: klienten pratar med plattformstjänsten i klustret
// (services/plattform) i stället för Supabase. Aktiveras vid bygget med
// VITE_PLATTFORM_URL; utan den används Supabase-läget precis som förut.

export const PLATTFORM_URL = (import.meta.env.VITE_PLATTFORM_URL as string | undefined)?.replace(/\/$/, "");

const TOKEN_NYCKEL = "gf-plattform-token";
const KONTO_NYCKEL = "gf-plattform-konto";

export type PlattformRoll = "tekniker" | "arbetsledare" | "admin";

export interface PlattformKonto {
  namn: string;
  roll: PlattformRoll;
  organisation: string;
}

export function plattformAktiv(): boolean {
  return !!PLATTFORM_URL;
}

export function plattformToken(): string | null {
  return localStorage.getItem(TOKEN_NYCKEL);
}

export function plattformKonto(): PlattformKonto | null {
  const rad = localStorage.getItem(KONTO_NYCKEL);
  if (!rad || !plattformToken()) return null;
  try {
    return JSON.parse(rad) as PlattformKonto;
  } catch {
    return null;
  }
}

export function loggaUtPlattform(): void {
  localStorage.removeItem(TOKEN_NYCKEL);
  localStorage.removeItem(KONTO_NYCKEL);
}

async function authAnrop(vag: string, kropp: object): Promise<PlattformKonto> {
  const res = await fetch(`${PLATTFORM_URL}${vag}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(kropp),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? `Fel ${res.status}`);
  const { token, namn, roll, organisation } = data as PlattformKonto & { token: string };
  localStorage.setItem(TOKEN_NYCKEL, token);
  const konto: PlattformKonto = { namn, roll, organisation };
  localStorage.setItem(KONTO_NYCKEL, JSON.stringify(konto));
  return konto;
}

export function loggaInPlattform(epost: string, losenord: string): Promise<PlattformKonto> {
  return authAnrop("/api/auth/logga-in", { epost, losenord });
}

// Registrering skapar en ny organisation med användaren som
// systemadministratör; övriga användare skapas av admin.
export function registreraPlattform(
  epost: string,
  losenord: string,
  namn: string,
  organisation: string,
): Promise<PlattformKonto> {
  return authAnrop("/api/auth/registrera", { epost, losenord, namn, organisation });
}

// Användarhantering (kräver admin-roll; servern verifierar).
export interface PlattformAnvandare {
  id: string;
  epost: string;
  namn: string;
  roll: PlattformRoll;
}

export async function hamtaAnvandare(): Promise<PlattformAnvandare[]> {
  const res = await plattformFetch("/api/anvandare");
  if (!res.ok) throw new Error(`Fel ${res.status}`);
  return ((await res.json()) as { anvandare: PlattformAnvandare[] }).anvandare;
}

export async function skapaAnvandare(
  epost: string,
  losenord: string,
  namn: string,
  roll: PlattformRoll,
): Promise<void> {
  const res = await plattformFetch("/api/anvandare", {
    method: "POST",
    body: JSON.stringify({ epost, losenord, namn, roll }),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error ?? `Fel ${res.status}`);
  }
}

// Live Share-delningar: återkallbara länkar med behörighetsnivå.
export type DelningsNiva = "kund" | "partner" | "intern";

export interface Delning {
  kod: string;
  niva: DelningsNiva;
  skapad: string;
  aterkallad: string | null;
}

export async function hamtaDelningar(arendeId: string): Promise<Delning[]> {
  const res = await plattformFetch(`/api/arenden/${arendeId}/delningar`);
  if (!res.ok) throw new Error(`Fel ${res.status}`);
  return ((await res.json()) as { delningar: Delning[] }).delningar;
}

export async function skapaDelning(arendeId: string, niva: DelningsNiva): Promise<string> {
  const res = await plattformFetch(`/api/arenden/${arendeId}/delningar`, {
    method: "POST",
    body: JSON.stringify({ niva }),
  });
  if (!res.ok) throw new Error(`Fel ${res.status}`);
  return ((await res.json()) as { kod: string }).kod;
}

export async function aterkallaDelning(kod: string): Promise<void> {
  const res = await plattformFetch(`/api/delningar/${kod}/aterkalla`, { method: "POST" });
  if (!res.ok) throw new Error(`Fel ${res.status}`);
}

// Organisationsöversikt (arbetsledare/admin; servern verifierar).
export interface OversiktsRad {
  id: string;
  nummer: number;
  skapad: string;
  delningskod: string | null;
  metodik_id: string | null;
  antal_handelser: number;
  forsta: string | null;
  senaste: string | null;
  avslutat: boolean;
  objekt: string | null;
  felbeskrivning: string | null;
  ansvarig: string | null;
  skapare: string | null;
  tekniker: string[] | null;
}

export async function hamtaOversikt(): Promise<OversiktsRad[]> {
  const res = await plattformFetch("/api/oversikt");
  if (!res.ok) throw new Error(`Fel ${res.status}`);
  return ((await res.json()) as { arenden: OversiktsRad[] }).arenden;
}

// Autentiserat anrop mot plattformen. En utgången token rensas (401) så
// att appen faller tillbaka till lokalt läge tills nästa inloggning.
export async function plattformFetch(vag: string, init?: RequestInit): Promise<Response> {
  const token = plattformToken();
  if (!token) throw new Error("Ej inloggad");
  const res = await fetch(`${PLATTFORM_URL}${vag}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
      Authorization: `Bearer ${token}`,
    },
  });
  if (res.status === 401) loggaUtPlattform();
  return res;
}
