// Evidence & Compliance Matrix (ECM) — plattformens regelmotor.
//
// ECM är ett eget subsystem, inte en tabell i databasen: den avgör vilken
// dokumentation som krävs, när dokumentation saknas, vilken bevisnivå som
// uppnåtts, vilka regler som gäller (per ärendetyp) och om ett ärende kan
// avslutas. Systemet kan aldrig skriva en slutsats som ECM inte godkänt.
//
// Sex motorer:
//   1. Evidence Engine      — katalogiserar all bevisning ur loggen
//   2. Rule Engine          — dokumentationskraven (metodik + automatiska regler)
//   3. Compliance Engine    — vilka regler som gäller per ärendetyp
//   4. Validation Engine    — inga påståenden utan underlag ("Evidens saknas")
//   5. Completion Engine    — kvalitetsgrind: får ärendet avslutas/rapporteras?
//   6. Traceability Engine  — varje evidenspost hash:as och versionsmärks
//
// Regelbiblioteket är versionshanterat och skilt från applikationslogiken;
// vyerna anropar bara de rena funktionerna nedan. Nästa steg är server-
// distribuerade regelpaket (garantivillkor per tillverkare, försäkrings-
// krav, reklamationsregler) som laddas dynamiskt utan appändring.

import type { Arende, LoggPost } from "./domain";
import type { Metodik } from "./metodik";

export const ECM_VERSION = "2.0";

// ---- 1. Evidence Engine -----------------------------------------------

// Evidensnivåer: bevisvärdet för ett påstående, härlett ur loggen.
export type EvidensNiva = "E0" | "E1" | "E2" | "E3" | "E4" | "E5" | "E6";

export const EVIDENS_LABEL: Record<EvidensNiva, string> = {
  E0: "E0 · Inget underlag",
  E1: "E1 · Teknikerns observation",
  E2: "E2 · Foto",
  E3: "E3 · Video",
  E4: "E4 · Mätvärde",
  E5: "E5 · Diagnosdata/dokument",
  E6: "E6 · Flera oberoende källor",
};

export interface Evidenspost {
  id: string;
  tidpunkt: string;
  tekniker: string;
  kategori: string;
  niva: Exclude<EvidensNiva, "E0" | "E6">;
  sammanfattning: string;
  // Innehållshash för spårbarhet: samma post ger alltid samma hash,
  // varje ändringsförsök syns (loggen är dessutom append-only i DB:n).
  hash: string;
}

// FNV-1a — snabb, deterministisk innehållshash (spårbarhet, inte krypto;
// manipulationsskyddet ligger i databasens append-only-triggers).
export function innehallsHash(innehall: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < innehall.length; i++) {
    h ^= innehall.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

// Katalogiserar varje evidenspost i loggen med nivå, kategori och hash.
export function evidensposter(arende: Arende): Evidenspost[] {
  const poster: Evidenspost[] = [];
  const lagg = (post: LoggPost, kategori: string, niva: Evidenspost["niva"], sammanfattning: string) =>
    poster.push({
      id: post.id,
      tidpunkt: post.tidpunkt,
      tekniker: post.anvandare,
      kategori,
      niva,
      sammanfattning,
      hash: innehallsHash(JSON.stringify(post.handelse)),
    });
  for (const post of arende.handelser) {
    const h = post.handelse;
    if (h.typ === "foto") lagg(post, "foto", "E2", h.beskrivning);
    if (h.typ === "matvarde") lagg(post, "mätvärde", "E4", `${h.beskrivning} = ${h.varde}${h.enhet ? ` ${h.enhet}` : ""}`);
    if (h.typ === "matarstallning" && !h.undantag) lagg(post, "mätarställning", "E2", `${h.lage === "ingaende" ? "In" : "Ut"}: ${h.varde}`);
    if (h.typ === "arbetsorder_skannad") lagg(post, "dokument", "E5", `Arbetsorder, ${h.falt.length} fält`);
    if (h.typ === "observation") lagg(post, "observation", "E1", h.text);
    if (h.typ === "kontroll_utford" && !h.undantag) lagg(post, "kontroll", "E1", h.text);
  }
  return poster;
}

// Ärendets samlade evidensnivå: starkaste kombination loggen innehåller.
export function evidensNiva(arende: Arende): EvidensNiva {
  const poster = evidensposter(arende);
  const har = (n: string) => poster.some((p) => p.niva === n);
  const kallor = [har("E2"), har("E4"), har("E5")].filter(Boolean).length;
  if (kallor >= 2) return "E6";
  if (har("E5")) return "E5";
  if (har("E4")) return "E4";
  if (har("E2")) return "E2";
  if (har("E1")) return "E1";
  return "E0";
}

// ---- 2. Rule Engine ---------------------------------------------------

// Automatiska regler (kodade i orkesterns grundprompt och i metodikens
// krav-fält): kan det fotograferas → begär foto; låter det → video med
// ljud; rör det sig → video; mäts det → mätvärde; visar en display
// informationen → fota displayen; finns ett dokument → fota dokumentet.

// Godkända orsaker när underlag inte kan tas fram (fri text tillåts
// också — men en orsak är alltid obligatorisk).
export const UNDANTAGSORSAKER = [
  "Komponenten är oåtkomlig",
  "Fordonet kan inte lyftas säkert",
  "Kunden avböjde demontering",
  "Dålig sikt/åtkomst",
  "Utrustning saknas",
];

// Markörtexter för pre-diagnostikens kvitteringar (loggas som kommentar).
export const MARKOR_FELBESKRIVNING_VERIFIERAD = "Kundens felbeskrivning verifierad vid mottagandet";
export const MARKOR_INGA_TIDIGA_OBSERVATIONER = "Inga ytterligare observationer vid mottagandet";
export const MARKOR_TIDIGA_OBSERVATIONER_KLARA = "Tidiga observationer vid mottagandet dokumenterade";

// -- Felorsaksanalys (Root Cause Analysis) --
// Ett ärende avslutas aldrig med enbart "komponent trasig, byt komponent":
// varje konstaterat fel kräver avvikelse, bedömd grundorsak, underlag och
// säkerhetsnivå — eller en motivering till varför orsaken inte fastställts.

export const ORSAKSKATEGORIER = [
  "Normalt slitage",
  "Ålder",
  "Körsträcka",
  "Materialutmattning",
  "Tillverkningsfel",
  "Bristande underhåll",
  "Felaktig tidigare reparation",
  "Yttre påverkan",
  "Korrosion",
  "Överhettning",
  "Förorening",
  "Felaktig användning",
  "Modifiering",
  "Olycka eller skada",
  "Okänd orsak",
];

export const UNDERLAGSKALLOR = [
  "Foto",
  "Video",
  "Mätresultat",
  "Diagnosutläsning",
  "Tidigare historik",
  "Servicehistorik",
  "Teknisk dokumentation",
  "Direkt observation",
];

// Kvalitetsregeln: generella formuleringar utan förklaring avvisas.
const GENERISKA_FRASER = /^(trasig|defekt|sliten|utsliten|kass|död|behöver bytas|byt(es)?( ut)?|fungerar inte|går sönder|sönder)[.!]?$/i;

export function granskaAvvikelse(text: string): string | null {
  const ren = text.trim();
  if (ren.length < 20 || GENERISKA_FRASER.test(ren)) {
    return "Felorsak saknas. Beskriv den konstaterade avvikelsen — inte bara komponenten. Exempel: ”Startmotorn aktiverar inte trots korrekt matningsspänning och god jordförbindelse.”";
  }
  return null;
}

// Underlaget måste finnas: en vald evidenskälla godtas bara om loggen
// faktiskt innehåller den sortens evidens.
export function underlagFinns(arende: Arende, kalla: string): boolean {
  const h = arende.handelser.map((p) => p.handelse);
  switch (kalla) {
    case "Foto":
      return h.some((x) => x.typ === "foto");
    case "Mätresultat":
      return h.some((x) => x.typ === "matvarde");
    case "Diagnosutläsning":
      return h.some((x) => x.typ === "foto" && /instrument|diagnos/i.test(x.beskrivning));
    case "Tidigare historik":
    case "Servicehistorik":
      return h.some((x) => x.typ === "historik_kontrollerad" && x.kontrollerad);
    case "Direkt observation":
      return h.some((x) => x.typ === "observation" || x.typ === "kontroll_utford");
    default:
      // Video/teknisk dokumentation: kan ännu inte verifieras maskinellt.
      return true;
  }
}

export function felorsaker(arende: Arende) {
  return arende.handelser.filter((p) => p.handelse.typ === "felorsak");
}

// -- Symptom Verification Protocol (SVP) --
// Kundens beskrivning → förtydligande (metodikens symptomfrågor) →
// reproducering (eller dokumenterat ej reproducerbar). Rapporten skiljer
// alltid kundens upplevelse från teknikerns verifierade observationer.

export function reproducering(arende: Arende) {
  let senaste: { status: "ja" | "delvis" | "nej"; beskrivning: string } | undefined;
  for (const post of arende.handelser) {
    if (post.handelse.typ === "reproducering") senaste = post.handelse;
  }
  return senaste;
}

// Rapportformuleringen styrs av verifieringsläget — aldrig "felet
// konstaterat" utan reproducering eller annan dokumenterad verifiering.
export function reproduceringsText(status: "ja" | "delvis" | "nej"): string {
  if (status === "ja") return "Symptomet reproducerades vid undersökningen.";
  if (status === "delvis") return "Symptomet kunde delvis reproduceras vid undersökningen.";
  return "Kundens beskrivning kunde inte reproduceras under de förhållanden som rådde vid undersökningen.";
}

// ---- 3. Compliance Engine ---------------------------------------------

// Ärendetypen styr vilka dokumentationskrav som gäller utöver metodiken.
export const ARENDETYPER = [
  "Privat kund",
  "Företagskund",
  "Garanti",
  "Goodwill",
  "Försäkring",
  "Reklamation",
  "Begagnatgaranti",
  "Intern kvalitetskontroll",
  "Teknisk utredning",
] as const;

export type Arendetyp = (typeof ARENDETYPER)[number];

export function arendetyp(arende: Arende): Arendetyp {
  let typ: Arendetyp = "Privat kund";
  for (const post of arende.handelser) {
    const h = post.handelse;
    if (h.typ === "arendetyp_satt" && (ARENDETYPER as readonly string[]).includes(h.arendetyp)) {
      typ = h.arendetyp as Arendetyp;
    }
  }
  return typ;
}

interface ComplianceKrav {
  id: string;
  rubrik: string;
  uppfyllt: (arende: Arende) => boolean;
  detaljVidBrist: string;
}

function objektFalt(arende: Arende, falt: "miltal" | "claim" | "skadenummer" | "arbetsorder"): string | undefined {
  for (const post of arende.handelser) {
    if (post.handelse.typ === "objekt_identifierat") return post.handelse.objekt[falt];
  }
  return undefined;
}

const harMatarstallning = (arende: Arende) =>
  arende.handelser.some((p) => p.handelse.typ === "matarstallning" && !p.handelse.undantag) ||
  !!objektFalt(arende, "miltal");
const harHistorik = (arende: Arende) =>
  arende.handelser.some((p) => p.handelse.typ === "historik_kontrollerad" && p.handelse.kontrollerad);
const harFoto = (arende: Arende) => arende.handelser.some((p) => p.handelse.typ === "foto");

// Regelpaket per ärendetyp — här ansluter framtida serverdistribuerade
// regler (garantivillkor per tillverkare, försäkringsbolagens krav …).
const COMPLIANCE_REGLER: Partial<Record<Arendetyp, ComplianceKrav[]>> = {
  Garanti: [
    { id: "garanti_miltal", rubrik: "Miltal dokumenterat", uppfyllt: harMatarstallning, detaljVidBrist: "Garantiärenden kräver dokumenterad mätarställning." },
    { id: "garanti_historik", rubrik: "Servicehistorik kontrollerad", uppfyllt: harHistorik, detaljVidBrist: "Garantiärenden kräver kontrollerad servicehistorik." },
    { id: "garanti_claim", rubrik: "Claim-/garantinummer registrerat", uppfyllt: (a) => !!objektFalt(a, "claim"), detaljVidBrist: "Ange claim-/garantinummer (läses ur arbetsordern)." },
  ],
  Goodwill: [
    { id: "goodwill_miltal", rubrik: "Miltal dokumenterat", uppfyllt: harMatarstallning, detaljVidBrist: "Goodwillärenden kräver dokumenterad mätarställning." },
    { id: "goodwill_historik", rubrik: "Servicehistorik kontrollerad", uppfyllt: harHistorik, detaljVidBrist: "Goodwillärenden kräver kontrollerad servicehistorik." },
  ],
  Försäkring: [
    { id: "forsakring_skadenummer", rubrik: "Skadenummer registrerat", uppfyllt: (a) => !!objektFalt(a, "skadenummer"), detaljVidBrist: "Försäkringsärenden kräver skadenummer (läses ur arbetsordern)." },
    { id: "forsakring_bildbevis", rubrik: "Bildbevis finns", uppfyllt: harFoto, detaljVidBrist: "Försäkringsärenden kräver bilddokumentation." },
  ],
  Reklamation: [
    { id: "reklamation_historik", rubrik: "Historik och tidigare försök kontrollerade", uppfyllt: harHistorik, detaljVidBrist: "Reklamationer kräver kontrollerad historik (tidigare reparationer/försök)." },
  ],
  Begagnatgaranti: [
    { id: "begagnat_miltal", rubrik: "Miltal dokumenterat", uppfyllt: harMatarstallning, detaljVidBrist: "Begagnatgaranti kräver dokumenterad mätarställning." },
  ],
};

// ---- 4. Validation Engine ---------------------------------------------

// Kärnprincipen — inga påståenden utan underlag — verkar i tre lager:
//  (a) orkesterns grundprompt: aldrig "OK/kontrollerad/inga fel" utan
//      evidens; skriv "Evidens saknas" och begär rätt underlag,
//  (b) projektionerna: hypoteser kan aldrig bli konstaterade fel,
//  (c) kvalitetsgrinden nedan: rapport/avslut blockeras tills varje
//      obligatoriskt påstående har evidens eller dokumenterat undantag.

// ---- Pre-Diagnostic Validation ----------------------------------------

export interface PreDiagRad {
  id: "historik" | "matarstallning_in" | "felbeskrivning" | "tidiga_observationer";
  rubrik: string;
  klar: boolean;
  varning?: string;
}

// Ingen felsökning påbörjas förrän grundkontrollerna är genomförda —
// eller dokumenterat motiverade. Allt härleds ur loggen.
export function preDiagnostik(arende: Arende): PreDiagRad[] {
  let historik: PreDiagRad = { id: "historik", rubrik: "Fordonshistorik kontrollerad", klar: false };
  let matarstallning = false;
  let felbeskrivningVerifierad = false;
  let tidiga = false;
  for (const post of arende.handelser) {
    const h = post.handelse;
    if (h.typ === "historik_kontrollerad") {
      historik = {
        id: "historik",
        rubrik: "Fordonshistorik kontrollerad",
        klar: true,
        varning: h.kontrollerad ? undefined : `Ej kontrollerad — orsak: ${h.kommentar ?? "saknas"}`,
      };
    }
    if (h.typ === "matarstallning" && h.lage === "ingaende") matarstallning = true;
    if (h.typ === "kommentar" && h.text.startsWith(MARKOR_FELBESKRIVNING_VERIFIERAD)) felbeskrivningVerifierad = true;
    if (
      h.typ === "kommentar" &&
      (h.text.startsWith(MARKOR_INGA_TIDIGA_OBSERVATIONER) || h.text.startsWith(MARKOR_TIDIGA_OBSERVATIONER_KLARA))
    ) {
      tidiga = true;
    }
  }
  return [
    historik,
    { id: "matarstallning_in", rubrik: "Ingående mätarställning dokumenterad", klar: matarstallning },
    { id: "felbeskrivning", rubrik: "Kundens felbeskrivning verifierad", klar: felbeskrivningVerifierad },
    { id: "tidiga_observationer", rubrik: "Tidiga observationer hanterade", klar: tidiga },
  ];
}

export function preDiagnostikKlar(arende: Arende): boolean {
  return preDiagnostik(arende).every((rad) => rad.klar);
}

// ---- 5. Completion Engine ---------------------------------------------

export interface GrindRad {
  id: string;
  rubrik: string;
  ok: boolean;
  // Obligatorisk: blockerar slutrapporten tills den är grön.
  kravs: boolean;
  detalj?: string;
}

// Kvalitetsgrind före slutrapport/avslut. Varje rad är en verifierbar
// regel mot händelseloggen; regel-id och ECM-version följer med i
// exporten (Traceability Engine).
export function kvalitetsgrind(arende: Arende, metodik: Metodik): GrindRad[] {
  const rader: GrindRad[] = [];
  const handelser = arende.handelser.map((p) => p.handelse);
  const avslutat = handelser.some((h) => h.typ === "arende_avslutat");

  const objektFinns = handelser.some((h) => h.typ === "objekt_identifierat");
  rader.push({
    id: "objekt",
    rubrik: "Fordons-/objektidentifiering verifierad",
    ok: objektFinns,
    kravs: true,
    detalj: objektFinns ? undefined : "Evidens saknas — identifiera objektet.",
  });

  const arbetsorder = handelser.some((h) => h.typ === "arbetsorder_skannad") || !!objektFalt(arende, "arbetsorder");
  rader.push({
    id: "arbetsorder",
    rubrik: "Arbetsorder inläst",
    ok: arbetsorder,
    kravs: false,
    detalj: arbetsorder ? undefined : "Ärendet startades utan skannad arbetsorder.",
  });

  // Pre-diagnostiken ingår i grinden: historik + ingående mätarställning
  // är obligatoriska (dokumenterade eller motiverade).
  const pre = preDiagnostik(arende);
  const historik = pre.find((r) => r.id === "historik")!;
  rader.push({
    id: "historik",
    rubrik: "Fordonshistorik kontrollerad eller motiverad",
    ok: historik.klar,
    kravs: true,
    detalj: historik.klar ? historik.varning : "Kontrollera historiken eller dokumentera varför det inte gått.",
  });
  const matIn = pre.find((r) => r.id === "matarstallning_in")!;
  rader.push({
    id: "matarstallning_in",
    rubrik: "Ingående mätarställning dokumenterad",
    ok: matIn.klar,
    kravs: true,
    detalj: matIn.klar ? undefined : "Fotografera instrumentpanelen (eller dokumentera undantag).",
  });
  const felb = pre.find((r) => r.id === "felbeskrivning")!;
  rader.push({
    id: "felbeskrivning_verifierad",
    rubrik: "Kundens felbeskrivning verifierad",
    ok: felb.klar,
    kravs: false,
    detalj: felb.klar ? undefined : "Bekräfta att kundens beskrivning är korrekt återgiven.",
  });

  // SVP: symptomet reproducerat eller dokumenterat ej reproducerbart —
  // obligatoriskt innan ärendet avslutas.
  const repro = reproducering(arende);
  rader.push({
    id: "svp",
    rubrik: "Symptomverifiering: reproducerat eller dokumenterat ej reproducerbart",
    ok: !!repro,
    kravs: avslutat,
    detalj: repro
      ? reproduceringsText(repro.status)
      : "Dokumentera reproduceringen (Ja/Delvis/Nej med motivering) innan ärendet avslutas.",
  });

  // Felorsaksanalys: minst en dokumenterad felorsak (eller motiverad
  // okänd orsak) krävs för att avsluta — aldrig bara komponent + åtgärd.
  const orsaker = felorsaker(arende);
  rader.push({
    id: "felorsak",
    rubrik: "Felorsaksanalys dokumenterad",
    ok: orsaker.length > 0,
    kravs: avslutat,
    detalj:
      orsaker.length > 0
        ? undefined
        : "Beskriv varför felet uppstått — eller ange varför orsaken inte kunnat fastställas.",
  });

  // Utgående mätarställning: obligatorisk först när ärendet avslutas.
  const matUt = handelser.some((h) => h.typ === "matarstallning" && h.lage === "utgaende");
  rader.push({
    id: "matarstallning_ut",
    rubrik: "Utgående mätarställning dokumenterad",
    ok: matUt,
    kravs: avslutat,
    detalj: matUt ? undefined : "Fotografera instrumentpanelen när arbetet är klart.",
  });

  // Metodikens kontroller: evidens eller dokumenterat undantag per kontroll.
  const hanterade = new Map<string, { undantag?: string }>();
  for (const h of handelser) {
    if (h.typ === "kontroll_utford") hanterade.set(`${h.stegId}/${h.kontrollId}`, { undantag: h.undantag });
  }
  const fotonFinns = handelser.filter((h) => h.typ === "foto").length;
  const saknade: string[] = [];
  const undantagna: string[] = [];
  let fotoKravUtanFoto = 0;
  for (const steg of metodik.steg) {
    for (const kontroll of steg.kontroller ?? []) {
      const status = hanterade.get(`${steg.id}/${kontroll.id}`);
      if (!status) saknade.push(kontroll.text);
      else if (status.undantag) undantagna.push(`${kontroll.text} (${status.undantag})`);
      else if (kontroll.krav === "foto" && fotonFinns === 0) fotoKravUtanFoto += 1;
    }
  }
  rader.push({
    id: "kontroller",
    rubrik: "Metodikens kontroller: evidens eller dokumenterat undantag",
    ok: saknade.length === 0,
    kravs: true,
    detalj:
      saknade.length > 0
        ? `Evidens saknas: ${saknade.join("; ")}`
        : undantagna.length > 0
          ? `Undantag med orsak: ${undantagna.join("; ")}`
          : undefined,
  });

  rader.push({
    id: "fotokrav",
    rubrik: "Foton finns för fotokrävande kontroller",
    ok: fotoKravUtanFoto === 0,
    kravs: true,
    detalj: fotoKravUtanFoto > 0 ? `${fotoKravUtanFoto} fotokrävande kontroll(er) utan bild i loggen.` : undefined,
  });

  // Compliance Engine: ärendetypens regelpaket.
  const typ = arendetyp(arende);
  for (const krav of COMPLIANCE_REGLER[typ] ?? []) {
    const ok = krav.uppfyllt(arende);
    rader.push({
      id: krav.id,
      rubrik: `${typ}: ${krav.rubrik}`,
      ok,
      kravs: true,
      detalj: ok ? undefined : krav.detaljVidBrist,
    });
  }

  const hypoteser = handelser.filter((h) => h.typ === "hypotes").length;
  rader.push({
    id: "hypoteser",
    rubrik: "Hypoteser redovisas som ej verifierade",
    ok: true,
    kravs: false,
    detalj: hypoteser > 0 ? `${hypoteser} hypotes(er) markeras 🔴 i rapporten — aldrig som konstaterade fel.` : undefined,
  });

  rader.push({
    id: "evidensniva",
    rubrik: `Evidensnivå: ${EVIDENS_LABEL[evidensNiva(arende)]}`,
    ok: evidensNiva(arende) !== "E0",
    kravs: true,
    detalj: evidensNiva(arende) === "E0" ? "Ingen evidens i loggen ännu." : undefined,
  });

  return rader;
}

// Sant när alla obligatoriska grindrader är gröna — först då kan
// slutrapporten genereras.
export function grindGodkand(arende: Arende, metodik: Metodik): boolean {
  return kvalitetsgrind(arende, metodik).every((rad) => rad.ok || !rad.kravs);
}

// ---- 6. Traceability Engine -------------------------------------------

// Spårbarhetspaketet som följer med varje export: regelverkets version,
// ärendets evidensnivå och samtliga evidensposter med innehållshash.
// Tillsammans med den append-only-loggen kan varje slutsats härledas:
// vilken bild, vilken mätning, vilken tekniker, vilken regel, när.
export function sparbarhetspaket(arende: Arende, metodik: Metodik) {
  return {
    ecmVersion: ECM_VERSION,
    arendetyp: arendetyp(arende),
    evidensniva: evidensNiva(arende),
    kvalitetsgrind: kvalitetsgrind(arende, metodik).map(({ id, rubrik, ok, kravs }) => ({ id, rubrik, ok, kravs })),
    evidensposter: evidensposter(arende),
  };
}
