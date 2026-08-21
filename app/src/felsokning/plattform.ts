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
  aktiv: boolean;
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

// Stänga av eller öppna ett konto. En avstängning återkallar samtidigt
// pågående sessioner — annars vore den verkningslös tills token gick ut.
// Ljudreferensprofiler (ALVA-DOC-0012, lyft 5): särdrag skickas,
// aldrig ljud. Servern svarar ärligt när referensen inte räcker.
export interface Ljudjamforelse {
  anvandbar: boolean;
  orsak?: string;
  antalIReferens?: number;
  snittZ?: number;
  maxZ?: number;
  avvikande?: string[];
  bedomning?: "inom_referens" | "avvikande";
}

export async function tranaLjudprofil(
  fordon: string,
  sekvens: string,
  sardrag: Record<string, number>,
): Promise<{ antal: number; anvandbar: boolean }> {
  const res = await plattformFetch("/api/ljudprofiler/traning", {
    method: "POST",
    body: JSON.stringify({ fordon, sekvens, sardrag }),
  });
  if (!res.ok) throw new Error("The reference profile could not be updated.");
  return res.json();
}

export async function jamforLjudprofil(
  fordon: string,
  sekvens: string,
  sardrag: Record<string, number>,
): Promise<Ljudjamforelse> {
  const res = await plattformFetch("/api/ljudprofiler/jamfor", {
    method: "POST",
    body: JSON.stringify({ fordon, sekvens, sardrag }),
  });
  if (!res.ok) throw new Error("The comparison could not be performed.");
  return res.json();
}

export async function sattKontoAktiv(id: string, aktiv: boolean): Promise<void> {
  const res = await plattformFetch(`/api/anvandare/${id}/${aktiv ? "aktivera" : "avaktivera"}`, {
    method: "POST",
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error ?? `Fel ${res.status}`);
  }
}

// Logga ut på alla enheter — vägen ut när en telefon tappats bort.
export async function loggaUtAllaEnheter(): Promise<void> {
  const res = await plattformFetch("/api/auth/logga-ut-alla", { method: "POST" });
  if (!res.ok) throw new Error(`Fel ${res.status}`);
  loggaUtPlattform();
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

// Fordonshistorik: organisationens tidigare ärenden på samma objekt.
export interface FordonshistorikRad {
  id: string;
  nummer: number;
  skapad: string;
  avslutat: boolean;
  felbeskrivning: string | null;
  felorsaker: { avvikelse: string; orsaker: string[]; atgard: string }[];
}

export async function hamtaFordonshistorik(identifierare: string): Promise<FordonshistorikRad[]> {
  const res = await plattformFetch(`/api/fordon/${encodeURIComponent(identifierare)}/historik`);
  if (!res.ok) throw new Error(`Fel ${res.status}`);
  return ((await res.json()) as { arenden: FordonshistorikRad[] }).arenden;
}

// Organisationens nyckeltal, räknade av servern ur HELA organisationens
// logg (arbetsledare/admin). Analysvyn gjorde tidigare ett bart fetch mot
// en relativ väg utan Authorization — anropet kunde aldrig lyckas, och
// vyn föll tyst tillbaka på den här enhetens lokala ärenden och visade
// dem som organisationens. En tystnad som ser ut som data är värre än ett
// fel som syns, så den här kastar i stället.
export async function hamtaOrganisationsstatistik(): Promise<Record<string, unknown>> {
  const res = await plattformFetch("/api/statistik/oversikt");
  if (!res.ok) throw new Error(`Fel ${res.status}`);
  return (await res.json()) as Record<string, unknown>;
}

// Flottdata: felorsaksstatistik per orsakskategori (arbetsledare/admin).
export async function hamtaFelorsaksstatistik(): Promise<{ orsak: string; antal: number }[]> {
  const res = await plattformFetch("/api/statistik/felorsaker");
  if (!res.ok) throw new Error(`Fel ${res.status}`);
  return ((await res.json()) as { orsaker: { orsak: string; antal: number }[] }).orsaker;
}

// Organisationens fakturor (ALVA-PROC-0001). Läsning, aldrig mer:
// utfärdande och betalning hör till utfärdaren och har en egen nyckel som
// aldrig finns i en webbläsare.
//
// `status` är härledd på servern ur fakturahändelserna, inte lagrad —
// en utfärdad faktura ändras aldrig.
export interface Fakturarad {
  benamning: string;
  underlag: string;
  antal: number;
  enhet: string;
  apris: number;
  belopp: number;
}

export interface Faktura {
  id: string;
  beteckning: string;
  utfardad: string;
  forfaller: string;
  valuta: string;
  totalt: number;
  netto: number;
  moms: number;
  momssats: number;
  period: { fran: string; till: string };
  krediterar: string | null;
  status: "utfardad" | "betald" | "krediterad";
  betalningssatt: string;
  rader: Fakturarad[];
}

export async function hamtaFakturor(): Promise<Faktura[]> {
  const res = await plattformFetch("/api/fakturor");
  if (!res.ok) throw new Error(`Fel ${res.status}`);
  return ((await res.json()) as { fakturor: Faktura[] }).fakturor;
}

// Supportärenden (ALVA-PROC-0050). Anmälan sker från ärendet där felet
// uppstod; sammanhanget härleds av servern och skickas inte in.
export interface Supportinlagg {
  typ: "svar" | "status";
  text: string;
  status: string | null;
  fran: string;
  skapad: string;
}

export interface Supportarende {
  id: string;
  beteckning: string;
  arende_id: string | null;
  typ: string;
  rubrik: string;
  beskrivning: string;
  sammanhang: Record<string, string>;
  status: string;
  skapad: string;
  anmald_av: string | null;
  inlagg: Supportinlagg[];
}

export async function hamtaSupport(): Promise<Supportarende[]> {
  const res = await plattformFetch("/api/support");
  if (!res.ok) throw new Error(`Fel ${res.status}`);
  return ((await res.json()) as { arenden: Supportarende[] }).arenden;
}

export async function anmalSupport(anmalan: {
  typ: string;
  rubrik: string;
  beskrivning: string;
  arendeId?: string;
  sammanhang?: Record<string, string>;
}): Promise<{ beteckning: string }> {
  const res = await plattformFetch("/api/support", { method: "POST", body: JSON.stringify(anmalan) });
  const data = (await res.json().catch(() => ({}))) as { beteckning?: string; error?: string };
  if (!res.ok) throw new Error(data.error ?? `Fel ${res.status}`);
  return { beteckning: data.beteckning ?? "" };
}

// Abonnemang (ALVA-PROC-0002). Tillståndet härleds på servern ur
// organisationens förfallna fakturor — det lagras inte.
export interface Abonnemang {
  niva: string;
  nivanamn: string;
  tillstand: "aktiv" | "varning" | "last";
  dagarKvar: number | null;
  aldsta: string | null;
  besked: string | null;
  fakturaepost: string | null;
  registrerad: string;
  senast_fakturerad: string | null;
  behorighet: { lasa: boolean; exportera: boolean; nyttArende: boolean; dokumentera: boolean; avsluta: boolean };
}

export async function hamtaAbonnemang(): Promise<Abonnemang> {
  const res = await plattformFetch("/api/abonnemang");
  if (!res.ok) throw new Error(`Fel ${res.status}`);
  return (await res.json()) as Abonnemang;
}

export async function sattNiva(niva: string): Promise<void> {
  const res = await plattformFetch("/api/abonnemang/niva", { method: "POST", body: JSON.stringify({ niva }) });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error ?? `Fel ${res.status}`);
  }
}

export async function sattFakturaepost(epost: string): Promise<void> {
  const res = await plattformFetch("/api/abonnemang/fakturaepost", {
    method: "POST",
    body: JSON.stringify({ epost }),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error ?? `Fel ${res.status}`);
  }
}

/** Fakturans PDF. Kunden hämtar sitt eget underlag själv. */
/**
 * Hämtar fakturan som PDF och lämnar den till webbläsaren.
 *
 * Funktionen hette tidigare fakturaPdfUrl och byggde bara en länk. Den
 * kunde aldrig fungera: endpointen ligger bakom sessionen, och en
 * navigering kan inte bära en Authorization-header. Den var dessutom
 * inte anropad någonstans — kundens utlovade väg till sitt eget underlag
 * fanns alltså inte i gränssnittet alls.
 *
 * Nu hämtas dokumentet med sessionen, och blobben lämnas över som en
 * nedladdning med fakturans beteckning som filnamn.
 */
export async function laddaNerFakturaPdf(id: string, beteckning: string): Promise<void> {
  const res = await plattformFetch(`/api/fakturor/${id}/pdf`);
  if (!res.ok) throw new Error(`Fel ${res.status}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const lank = document.createElement("a");
  lank.href = url;
  lank.download = `${beteckning}.pdf`;
  document.body.appendChild(lank);
  lank.click();
  lank.remove();
  // Släpp objektet igen — annars ligger hela PDF:en kvar i minnet så
  // länge fliken lever.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

// Märkesspecifika kopplingar. Uppgifterna lagras krypterat på servern
// och returneras alltid maskerade — klienten ser aldrig hemligheterna.
export interface LeverantorsFalt {
  nyckel: string;
  etikett: string;
  hemlig: boolean;
}

export interface Leverantor {
  id: string;
  namn: string;
  beskrivning?: string;
  nyckeltyp?: string;
  falt: LeverantorsFalt[];
}

export interface Integration {
  leverantor: string;
  namn: string;
  aktiv: boolean;
  uppdaterad: string;
  senast_testad: string | null;
  senaste_status: string | null;
  uppgifter: Record<string, string>;
}

export async function hamtaLeverantorer(): Promise<Leverantor[]> {
  const res = await plattformFetch("/api/integrationer/leverantorer");
  if (!res.ok) throw new Error(`Fel ${res.status}`);
  return ((await res.json()) as { leverantorer: Leverantor[] }).leverantorer;
}

export async function hamtaIntegrationer(): Promise<{ integrationer: Integration[]; krypteringKonfigurerad: boolean }> {
  const res = await plattformFetch("/api/integrationer");
  if (!res.ok) throw new Error(`Fel ${res.status}`);
  return (await res.json()) as { integrationer: Integration[]; krypteringKonfigurerad: boolean };
}

export async function sparaIntegration(leverantor: string, uppgifter: Record<string, string>): Promise<void> {
  const res = await plattformFetch("/api/integrationer", {
    method: "POST",
    body: JSON.stringify({ leverantor, uppgifter }),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error ?? `Fel ${res.status}`);
  }
}

export async function taBortIntegration(leverantor: string): Promise<void> {
  const res = await plattformFetch(`/api/integrationer/${leverantor}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`Fel ${res.status}`);
}

// Uppslag mot leverantören — anropet görs av servern med organisationens
// krypterade uppgifter; klienten skickar bara identifieraren.
export async function gorUppslag(
  leverantor: string,
  identifierare: string,
): Promise<Record<string, string>> {
  const res = await plattformFetch(`/api/integrationer/${leverantor}/uppslag`, {
    method: "POST",
    body: JSON.stringify({ identifierare }),
  });
  const data = (await res.json().catch(() => ({}))) as { fordon?: Record<string, string>; error?: string };
  if (!res.ok) throw new Error(data.error ?? `Fel ${res.status}`);
  return data.fordon ?? {};
}

// W3C Trace Context. Klienten startar spåret så att en teknikers
// handling går att följa hela vägen — via plattformen till modellsvaret
// — i stället för att bli två orelaterade spår i loggen.
function slumphex(byte: number): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(byte)), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}

export function nyttSpar(): string {
  return `00-${slumphex(16)}-${slumphex(8)}-01`;
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
      traceparent: nyttSpar(),
      ...init?.headers,
      Authorization: `Bearer ${token}`,
    },
  });
  if (res.status === 401) loggaUtPlattform();
  return res;
}
