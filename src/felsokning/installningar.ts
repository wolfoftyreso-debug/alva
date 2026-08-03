// Organisationsinställningar: systemadministratören väljer vilka
// objekttyper och identifieringsmetoder som visas när ett ärende startas.
// På plattformen gäller valet hela organisationen (sparas på servern);
// i lokalt läge sparas valet på den här enheten. En cache i localStorage
// gör att vyerna kan rendera direkt och uppdateras när servern svarat.

import { plattformAktiv, plattformFetch, plattformToken } from "./plattform";

export const ALLA_OBJEKTTYPER = [
  "Fordon",
  "Lastbil/Buss",
  "Entreprenadmaskin",
  "Industrimaskin",
  "Elsystem",
  "Hydraulik",
  "Övrigt",
];

export const ALLA_IDENTIFIERINGSMETODER = [
  "Registreringsnummer",
  "VIN",
  "Serienummer",
  "Maskinnummer",
  "Manuell inmatning",
];

export interface Installningar {
  objekttyper: string[];
  identifieringsmetoder: string[];
}

const NYCKEL = "gf-installningar";

// Okända värden filtreras bort och en tom lista faller tillbaka till
// hela standardlistan — det går aldrig att låsa ute alla alternativ.
export function normalisera(data: unknown): Installningar {
  const rad = (varden: unknown, alla: string[]): string[] => {
    const valda = Array.isArray(varden) ? alla.filter((v) => varden.includes(v)) : [];
    return valda.length > 0 ? valda : [...alla];
  };
  const d = (data ?? {}) as Partial<Installningar>;
  return {
    objekttyper: rad(d.objekttyper, ALLA_OBJEKTTYPER),
    identifieringsmetoder: rad(d.identifieringsmetoder, ALLA_IDENTIFIERINGSMETODER),
  };
}

export function lastaInstallningar(): Installningar {
  try {
    return normalisera(JSON.parse(localStorage.getItem(NYCKEL) ?? "{}"));
  } catch {
    return normalisera({});
  }
}

export async function hamtaInstallningar(): Promise<Installningar> {
  if (plattformAktiv() && plattformToken()) {
    try {
      const res = await plattformFetch("/api/organisation");
      if (res.ok) {
        const { installningar } = (await res.json()) as { installningar: unknown };
        const inst = normalisera(installningar);
        localStorage.setItem(NYCKEL, JSON.stringify(inst));
        return inst;
      }
    } catch {
      // Nätverksfel: cachen/enhetens val gäller tills servern nås igen.
    }
  }
  return lastaInstallningar();
}

export async function sparaInstallningar(inst: Installningar): Promise<void> {
  const ren = normalisera(inst);
  localStorage.setItem(NYCKEL, JSON.stringify(ren));
  if (plattformAktiv() && plattformToken()) {
    const res = await plattformFetch("/api/organisation/installningar", {
      method: "POST",
      body: JSON.stringify(ren),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(data.error ?? `Fel ${res.status}`);
    }
  }
}
