// Projektioner: alla vyer (ärendebrief, tidrapport, kundrapport) är rena
// funktioner av händelseloggen. De kan alltid regenereras — loggen vinner
// om en vy och loggen skulle säga olika saker.

import type { Arende, Bilaga, LoggPost, Objekt, TidKategori, Tillforlitlighet } from "./domain";
import { TIDKATEGORI_LABEL } from "./domain";
import type { Metodik } from "./metodik";
import { nastaSteg } from "./metodik";

export function objekt(arende: Arende): Objekt | undefined {
  for (const post of arende.handelser) {
    if (post.handelse.typ === "objekt_identifierat") return post.handelse.objekt;
  }
  return undefined;
}

export function felbeskrivning(arende: Arende): string | undefined {
  for (const post of arende.handelser) {
    if (post.handelse.typ === "felbeskrivning") return post.handelse.text;
  }
  return undefined;
}

// Ansvarig tekniker härleds ur loggen: skaparen, tills en överlämning
// med mottagare eller en omfördelning (ansvarig_satt) pekar ut någon annan.
export function ansvarig(arende: Arende): string | undefined {
  let namn = arende.handelser[0]?.anvandare;
  for (const post of arende.handelser) {
    const h = post.handelse;
    if (h.typ === "ansvarig_satt") namn = h.ansvarig;
    if (h.typ === "overlamning" && h.till) namn = h.till;
  }
  return namn;
}

// Ärendeidentiteten (Case Identity): registreras en gång och återanvänds
// i felsökningsvyn, Live Share, slutrapporten och exporten. Fordons-
// objektet är den röda tråden — det ska alltid vara omedelbart tydligt
// vilket fordon och vilket ärende informationen avser.
export interface Arendeidentitet {
  nummer: number;
  arbetsorder?: string;
  claim?: string;
  skadenummer?: string;
  identifierare?: string;
  vin?: string;
  beskrivning?: string;
  miltal?: string;
  kund?: string;
  ansvarig?: string;
  avslutat: boolean;
}

export function arendeidentitet(arende: Arende): Arendeidentitet {
  const o = objekt(arende);
  let miltal = o?.miltal;
  for (const post of arende.handelser) {
    const h = post.handelse;
    if (h.typ === "matarstallning" && h.lage === "ingaende" && !h.undantag) miltal = h.varde;
  }
  return {
    nummer: arende.nummer,
    arbetsorder: o?.arbetsorder,
    claim: o?.claim,
    skadenummer: o?.skadenummer,
    identifierare: o?.identifierare,
    vin: o?.vin,
    beskrivning: o?.beskrivning,
    miltal,
    kund: o?.kund,
    ansvarig: ansvarig(arende),
    avslutat: arAvslutat(arende),
  };
}

export function arAvslutat(arende: Arende): boolean {
  return arende.handelser.some((p) => p.handelse.typ === "arende_avslutat");
}

// Fordonshistorik: tidigare ärenden på samma objekt (regnr/VIN) med deras
// dokumenterade felorsaker — grunden för pre-diagnostikens historiksteg
// och orsakskedjan. Lokal variant; i plattformsläge svarar servern på
// samma fråga över hela organisationen.
export interface HistorikArende {
  id: string;
  nummer: number;
  skapad: string;
  avslutat: boolean;
  felbeskrivning?: string;
  felorsaker: { avvikelse: string; orsaker: string[]; atgard: string }[];
}

export function lokalFordonshistorik(
  arenden: Record<string, Arende>,
  identifierare: string,
  exkluderaId?: string,
): HistorikArende[] {
  const ident = identifierare.trim().toUpperCase();
  if (!ident) return [];
  const resultat: HistorikArende[] = [];
  for (const arende of Object.values(arenden)) {
    if (arende.id === exkluderaId) continue;
    const o = objekt(arende);
    if (!o || o.identifierare.toUpperCase() !== ident) continue;
    const felorsaker: HistorikArende["felorsaker"] = [];
    for (const post of arende.handelser) {
      const h = post.handelse;
      if (h.typ === "felorsak") felorsaker.push({ avvikelse: h.avvikelse, orsaker: h.orsaker, atgard: h.atgard });
    }
    resultat.push({
      id: arende.id,
      nummer: arende.nummer,
      skapad: arende.skapad,
      avslutat: arAvslutat(arende),
      felbeskrivning: felbeskrivning(arende),
      felorsaker,
    });
  }
  return resultat.sort((a, b) => b.skapad.localeCompare(a.skapad)).slice(0, 20);
}

export interface UtfordKontroll {
  text: string;
  resultat?: string;
  // Satt när underlaget inte kunde tas fram (dokumenterad orsak).
  undantag?: string;
  tidpunkt: string;
  anvandare: string;
}

export function utfordaKontroller(arende: Arende): UtfordKontroll[] {
  const resultat: UtfordKontroll[] = [];
  for (const post of arende.handelser) {
    const h = post.handelse;
    if (h.typ === "kontroll_utford") {
      resultat.push({ text: h.text, resultat: h.resultat, undantag: h.undantag, tidpunkt: post.tidpunkt, anvandare: post.anvandare });
    }
  }
  return resultat;
}

export function ejKontrollerat(arende: Arende, metodik: Metodik): string[] {
  const utforda = new Set<string>();
  for (const post of arende.handelser) {
    const h = post.handelse;
    if (h.typ === "kontroll_utford") utforda.add(`${h.stegId}/${h.kontrollId}`);
  }
  const kvar: string[] = [];
  for (const steg of metodik.steg) {
    for (const kontroll of steg.kontroller ?? []) {
      if (!utforda.has(`${steg.id}/${kontroll.id}`)) kvar.push(kontroll.text);
    }
  }
  return kvar;
}

export function observationer(arende: Arende): string[] {
  // En kontroll vars krav är ett mätvärde loggar både mätvärdet och
  // kontrollen, så att mätningen finns som mätevidens. Rapporten ska
  // ändå bara redovisa värdet en gång: kontrollen bär det redan under
  // Utförda kontroller (QUALITY-AUDIT-2 · m-10).
  const iKontroll = new Set(
    arende.handelser
      .map((p) => p.handelse)
      .filter((h) => h.typ === "kontroll_utford" && h.resultat)
      .map((h) => (h as { text: string; resultat: string }).text + " " + (h as { resultat: string }).resultat),
  );

  const resultat: string[] = [];
  for (const post of arende.handelser) {
    const h = post.handelse;
    if (h.typ === "observation") resultat.push(h.text);
    if (h.typ === "matvarde") {
      if (iKontroll.has(h.beskrivning + " " + h.varde)) continue;
      resultat.push(`${h.beskrivning}: ${h.varde}${h.enhet ? ` ${h.enhet}` : ""}`);
    }
  }
  return resultat;
}

export function hypoteser(arende: Arende): { text: string; niva: Tillforlitlighet }[] {
  const resultat: { text: string; niva: Tillforlitlighet }[] = [];
  for (const post of arende.handelser) {
    if (post.handelse.typ === "hypotes") resultat.push({ text: post.handelse.text, niva: post.handelse.niva });
  }
  return resultat;
}

export function foton(arende: Arende): { beskrivning: string; bilaga: Bilaga; tidpunkt: string }[] {
  const resultat: { beskrivning: string; bilaga: Bilaga; tidpunkt: string }[] = [];
  for (const post of arende.handelser) {
    if (post.handelse.typ === "foto") {
      resultat.push({ beskrivning: post.handelse.beskrivning, bilaga: post.handelse, tidpunkt: post.tidpunkt });
    }
  }
  return resultat;
}

export function videor(arende: Arende): { beskrivning: string; bilaga: Bilaga; tidpunkt: string }[] {
  const resultat: { beskrivning: string; bilaga: Bilaga; tidpunkt: string }[] = [];
  for (const post of arende.handelser) {
    if (post.handelse.typ === "video") {
      resultat.push({ beskrivning: post.handelse.beskrivning, bilaga: post.handelse, tidpunkt: post.tidpunkt });
    }
  }
  return resultat;
}

// Tidsredovisning: varje intervall mellan två händelser tillhör den kategori
// som var aktiv när intervallet började. Kategori styrs av kategori_byte-
// händelser; standard är aktiv felsökning. Paus räknas inte in i total tid.
export interface Tidsfordelning {
  totalMs: number;
  perKategori: Partial<Record<TidKategori, number>>;
}

export function tidsfordelning(arende: Arende, nu?: string): Tidsfordelning {
  const poster = arende.handelser;
  const perKategori: Partial<Record<TidKategori, number>> = {};
  if (poster.length === 0) return { totalMs: 0, perKategori };

  let kategori: TidKategori = "aktiv_felsokning";
  let forra = new Date(poster[0].tidpunkt).getTime();
  let avslutad = false;

  const laggTill = (till: number) => {
    const ms = Math.max(0, till - forra);
    perKategori[kategori] = (perKategori[kategori] ?? 0) + ms;
    forra = till;
  };

  for (const post of poster) {
    laggTill(new Date(post.tidpunkt).getTime());
    const h = post.handelse;
    if (h.typ === "kategori_byte") kategori = h.kategori;
    if (h.typ === "arende_avslutat") {
      avslutad = true;
      break;
    }
  }
  if (!avslutad && nu) laggTill(new Date(nu).getTime());

  let totalMs = 0;
  for (const [k, ms] of Object.entries(perKategori)) {
    if (k !== "paus") totalMs += ms;
  }
  return { totalMs, perKategori };
}

export function formateraTid(ms: number): string {
  const minuter = Math.round(ms / 60000);
  const h = Math.floor(minuter / 60);
  const m = minuter % 60;
  if (h === 0) return `${m} min`;
  return `${h} h ${m} min`;
}

export interface TillforlitlighetsRad {
  niva: Tillforlitlighet;
  text: string;
}

export function tillforlitlighet(arende: Arende): TillforlitlighetsRad[] {
  const rader: TillforlitlighetsRad[] = [];
  if (objekt(arende)) rader.push({ niva: "hog", text: "Object identified" });
  if (foton(arende).length > 0) rader.push({ niva: "hog", text: "Images documented" });
  if (arende.handelser.some((p) => p.handelse.typ === "matvarde")) {
    rader.push({ niva: "hog", text: "Measurements recorded" });
  }
  if (utfordaKontroller(arende).length > 0) {
    rader.push({ niva: "hog", text: "Checks documented" });
  }
  // Felorsaken är per definition inte verifierad förrän ärendet avslutats
  // med en verifierad slutsats — MVP:t markerar den alltid som ej verifierad
  // så länge ärendet är öppet.
  if (!arAvslutat(arende)) {
    rader.push({ niva: "medel", text: "Root cause not yet verified" });
  }
  return rader;
}

export interface Brief {
  objekt?: Objekt;
  ansvarig?: string;
  felbeskrivning?: string;
  utfordaKontroller: UtfordKontroll[];
  observationer: string[];
  hypoteser: { text: string; niva: Tillforlitlighet }[];
  ejKontrollerat: string[];
  rekommenderatNastaSteg: string[];
  totalArbetstid: string;
  tillforlitlighet: TillforlitlighetsRad[];
  avslutat: boolean;
}

// Ärendebriefen: hela den strukturerade sammanfattningen, regenererbar
// ur loggen vid varje anrop.
export function brief(arende: Arende, metodik: Metodik, nu?: string): Brief {
  const kvar = ejKontrollerat(arende, metodik);
  const nasta = nastaSteg(arende, metodik);
  const rekommenderat: string[] = [];
  if (!arAvslutat(arende)) {
    if (nasta.fraga) rekommenderat.push(`Besvara: ${nasta.fraga.text}`);
    else if (nasta.kontroll) rekommenderat.push(nasta.kontroll.text);
    for (const text of kvar.slice(0, 3)) {
      if (!rekommenderat.includes(text)) rekommenderat.push(text);
    }
    if (rekommenderat.length === 0) {
      rekommenderat.push("Every check in the methodology is complete. Verify the conclusion or extend the diagnosis.");
    }
  }
  return {
    objekt: objekt(arende),
    ansvarig: ansvarig(arende),
    felbeskrivning: felbeskrivning(arende),
    utfordaKontroller: utfordaKontroller(arende),
    observationer: observationer(arende),
    hypoteser: hypoteser(arende),
    ejKontrollerat: kvar,
    rekommenderatNastaSteg: rekommenderat.slice(0, 3),
    totalArbetstid: formateraTid(tidsfordelning(arende, nu).totalMs),
    tillforlitlighet: tillforlitlighet(arende),
    avslutat: arAvslutat(arende),
  };
}

// Överlämningsrapport som text — används vid "Lämna över arbete".
export function overlamningstext(arende: Arende, metodik: Metodik, nu?: string): string {
  const b = brief(arende, metodik, nu);
  const rader: string[] = [];
  rader.push(`HANDOVER – Case #${arende.nummer}`);
  if (b.objekt) rader.push(`Object: ${b.objekt.beskrivning} (${b.objekt.identifierare})${b.objekt.kund ? ` – Customer: ${b.objekt.kund}` : ""}`);
  if (b.felbeskrivning) rader.push(`Fault description: ${b.felbeskrivning}`);
  rader.push("");
  rader.push("Checks performed:");
  if (b.utfordaKontroller.length === 0) rader.push("  (none yet)");
  for (const k of b.utfordaKontroller)
    rader.push(k.undantag ? `  ! ${k.text} — underlag saknas: ${k.undantag}` : `  ✓ ${k.text}${k.resultat ? ` — ${k.resultat}` : ""}`);
  rader.push("");
  rader.push("Observations:");
  if (b.observationer.length === 0) rader.push("  (none yet)");
  for (const o of b.observationer) rader.push(`  • ${o}`);
  if (b.hypoteser.length > 0) {
    rader.push("");
    rader.push("Hypotheses (unverified):");
    for (const h of b.hypoteser) rader.push(`  ? ${h.text}`);
  }
  rader.push("");
  rader.push("Not checked:");
  if (b.ejKontrollerat.length === 0) rader.push("  (everything in the methodology is complete)");
  for (const e of b.ejKontrollerat) rader.push(`  – ${e}`);
  rader.push("");
  rader.push("Recommended next step:");
  b.rekommenderatNastaSteg.forEach((s, i) => rader.push(`  ${i + 1}. ${s}`));
  rader.push("");
  rader.push(`Total arbetstid: ${b.totalArbetstid}`);
  return rader.join("\n");
}

export function tidsfordelningsRader(arende: Arende, nu?: string): { label: string; tid: string }[] {
  const { perKategori } = tidsfordelning(arende, nu);
  return (Object.entries(perKategori) as [TidKategori, number][])
    .filter(([, ms]) => ms >= 30000)
    .sort((a, b) => b[1] - a[1])
    .map(([k, ms]) => ({ label: TIDKATEGORI_LABEL[k], tid: formateraTid(ms) }));
}

export function sistaAktivitet(arende: Arende): LoggPost | undefined {
  return arende.handelser[arende.handelser.length - 1];
}
