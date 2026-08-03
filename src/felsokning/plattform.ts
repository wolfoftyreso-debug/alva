// Självhostat läge: klienten pratar med plattformstjänsten i klustret
// (services/plattform) i stället för Supabase. Aktiveras vid bygget med
// VITE_PLATTFORM_URL; utan den används Supabase-läget precis som förut.

export const PLATTFORM_URL = (import.meta.env.VITE_PLATTFORM_URL as string | undefined)?.replace(/\/$/, "");

const TOKEN_NYCKEL = "gf-plattform-token";
const NAMN_NYCKEL = "gf-plattform-namn";

export function plattformAktiv(): boolean {
  return !!PLATTFORM_URL;
}

export function plattformToken(): string | null {
  return localStorage.getItem(TOKEN_NYCKEL);
}

export function plattformNamn(): string | null {
  return localStorage.getItem(NAMN_NYCKEL);
}

export function loggaUtPlattform(): void {
  localStorage.removeItem(TOKEN_NYCKEL);
  localStorage.removeItem(NAMN_NYCKEL);
}

async function authAnrop(vag: string, kropp: object): Promise<string> {
  const res = await fetch(`${PLATTFORM_URL}${vag}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(kropp),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? `Fel ${res.status}`);
  const { token, namn } = data as { token: string; namn: string };
  localStorage.setItem(TOKEN_NYCKEL, token);
  localStorage.setItem(NAMN_NYCKEL, namn);
  return namn;
}

export function loggaInPlattform(epost: string, losenord: string): Promise<string> {
  return authAnrop("/api/auth/logga-in", { epost, losenord });
}

export function registreraPlattform(epost: string, losenord: string, namn: string): Promise<string> {
  return authAnrop("/api/auth/registrera", { epost, losenord, namn });
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
