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
    if (h.typ === "video") lagg(post, "video", "E3", h.beskrivning);
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
  const kallor = [har("E2"), har("E3"), har("E4"), har("E5")].filter(Boolean).length;
  if (kallor >= 2) return "E6";
  if (har("E5")) return "E5";
  if (har("E4")) return "E4";
  if (har("E3")) return "E3";
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
    case "Video":
      return h.some((x) => x.typ === "video");
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
      // Teknisk dokumentation: kan ännu inte verifieras maskinellt.
      return true;
  }
}

export function felorsaker(arende: Arende) {
  return arende.handelser.filter((p) => p.handelse.typ === "felorsak");
}

// -- Åtgärdsfasen (Repair & Verification) --
// Loopen som symptomverifieringen öppnade sluts här: åtgärden
// dokumenteras (eller motiveras varför den uteblev) och kvalitets-
// kontrollen visar om symptomet faktiskt är borta.

export const INGEN_ATGARD_ORSAKER = [
  "Kunden avböjde åtgärd",
  "Väntar på reservdel",
  "Åtgärd utförs av annan verkstad",
  "Endast utredning beställd",
  "Kostnadsförslag lämnat, inväntar besked",
];

export function atgarder(arende: Arende) {
  return arende.handelser.filter((p) => p.handelse.typ === "atgard_utford");
}

export function kvalitetskontroll(arende: Arende) {
  let senaste: { resultat: "symptomet_borta" | "kvarstar" | "delvis" | "ej_verifierbar"; beskrivning: string } | undefined;
  for (const post of arende.handelser) {
    if (post.handelse.typ === "kvalitetskontroll") senaste = post.handelse;
  }
  return senaste;
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

// ---- ECM Knowledge Library --------------------------------------------
// Regelpaketet är data, inte kod: reglerna är deklarativa (krav-typ i
// stället för funktioner) och kan därför distribueras från servern
// (GET /api/ecm/regler, filen services/plattform/ecm-regler.json — i
// klustret utbytbar via ConfigMap) och uppdateras utan appändring.
// Klienten cachar senast hämtade paket och faller tillbaka till det
// inbyggda standardpaketet offline/i lokalt läge.

export type ComplianceKravTyp = "miltal" | "historik" | "claim" | "skadenummer" | "foto";

export interface ComplianceRegel {
  id: string;
  rubrik: string;
  krav: ComplianceKravTyp;
  detaljVidBrist: string;
}

export interface RegelPaket {
  version: string;
  arendetypRegler: Partial<Record<string, ComplianceRegel[]>>;
  undantagsorsaker: string[];
  orsakskategorier: string[];
  underlagskallor: string[];
}

function objektFalt(arende: Arende, falt: "miltal" | "claim" | "skadenummer" | "arbetsorder"): string | undefined {
  for (const post of arende.handelser) {
    if (post.handelse.typ === "objekt_identifierat") return post.handelse.objekt[falt];
  }
  return undefined;
}

// Krav-typ → verifiering mot händelseloggen. Nya krav-typer läggs till
// här; vilka regler som använder dem styrs helt av regelpaketet.
const KRAV_KONTROLLER: Record<ComplianceKravTyp, (arende: Arende) => boolean> = {
  miltal: (a) =>
    a.handelser.some((p) => p.handelse.typ === "matarstallning" && !p.handelse.undantag) ||
    !!objektFalt(a, "miltal"),
  historik: (a) => a.handelser.some((p) => p.handelse.typ === "historik_kontrollerad" && p.handelse.kontrollerad),
  claim: (a) => !!objektFalt(a, "claim"),
  skadenummer: (a) => !!objektFalt(a, "skadenummer"),
  foto: (a) => a.handelser.some((p) => p.handelse.typ === "foto"),
};

// Inbyggt standardpaket = fallback när servern inte nåtts ännu.
export const STANDARD_REGELPAKET: RegelPaket = {
  version: ECM_VERSION,
  arendetypRegler: {
    Garanti: [
      { id: "garanti_miltal", rubrik: "Miltal dokumenterat", krav: "miltal", detaljVidBrist: "Garantiärenden kräver dokumenterad mätarställning." },
      { id: "garanti_historik", rubrik: "Servicehistorik kontrollerad", krav: "historik", detaljVidBrist: "Garantiärenden kräver kontrollerad servicehistorik." },
      { id: "garanti_claim", rubrik: "Claim-/garantinummer registrerat", krav: "claim", detaljVidBrist: "Ange claim-/garantinummer (läses ur arbetsordern)." },
    ],
    Goodwill: [
      { id: "goodwill_miltal", rubrik: "Miltal dokumenterat", krav: "miltal", detaljVidBrist: "Goodwillärenden kräver dokumenterad mätarställning." },
      { id: "goodwill_historik", rubrik: "Servicehistorik kontrollerad", krav: "historik", detaljVidBrist: "Goodwillärenden kräver kontrollerad servicehistorik." },
    ],
    Försäkring: [
      { id: "forsakring_skadenummer", rubrik: "Skadenummer registrerat", krav: "skadenummer", detaljVidBrist: "Försäkringsärenden kräver skadenummer (läses ur arbetsordern)." },
      { id: "forsakring_bildbevis", rubrik: "Bildbevis finns", krav: "foto", detaljVidBrist: "Försäkringsärenden kräver bilddokumentation." },
    ],
    Reklamation: [
      { id: "reklamation_historik", rubrik: "Historik och tidigare försök kontrollerade", krav: "historik", detaljVidBrist: "Reklamationer kräver kontrollerad historik (tidigare reparationer/försök)." },
    ],
    Begagnatgaranti: [
      { id: "begagnat_miltal", rubrik: "Miltal dokumenterat", krav: "miltal", detaljVidBrist: "Begagnatgaranti kräver dokumenterad mätarställning." },
    ],
  },
  undantagsorsaker: UNDANTAGSORSAKER,
  orsakskategorier: ORSAKSKATEGORIER,
  underlagskallor: UNDERLAGSKALLOR,
};

const REGELPAKET_NYCKEL = "gf-ecm-regelpaket";

// Validerar och normaliserar ett paket från servern/cachen — trasiga
// eller ofullständiga paket faller tillbaka till standard per fält.
export function normaliseraRegelpaket(data: unknown): RegelPaket {
  const d = (data ?? {}) as Partial<RegelPaket>;
  const lista = (varden: unknown, standard: string[]) =>
    Array.isArray(varden) && varden.length > 0 && varden.every((v) => typeof v === "string")
      ? (varden as string[])
      : standard;
  const regler: RegelPaket["arendetypRegler"] = {};
  if (d.arendetypRegler && typeof d.arendetypRegler === "object") {
    for (const [typ, rader] of Object.entries(d.arendetypRegler)) {
      if (!Array.isArray(rader)) continue;
      const giltiga = rader.filter(
        (r): r is ComplianceRegel =>
          !!r && typeof r.id === "string" && typeof r.rubrik === "string" &&
          typeof r.detaljVidBrist === "string" && typeof r.krav === "string" && r.krav in KRAV_KONTROLLER,
      );
      if (giltiga.length > 0) regler[typ] = giltiga;
    }
  }
  return {
    version: typeof d.version === "string" && d.version ? d.version : STANDARD_REGELPAKET.version,
    arendetypRegler: Object.keys(regler).length > 0 ? regler : STANDARD_REGELPAKET.arendetypRegler,
    undantagsorsaker: lista(d.undantagsorsaker, STANDARD_REGELPAKET.undantagsorsaker),
    orsakskategorier: lista(d.orsakskategorier, STANDARD_REGELPAKET.orsakskategorier),
    underlagskallor: lista(d.underlagskallor, STANDARD_REGELPAKET.underlagskallor),
  };
}

export function aktivtRegelpaket(): RegelPaket {
  try {
    const rad = localStorage.getItem(REGELPAKET_NYCKEL);
    return rad ? normaliseraRegelpaket(JSON.parse(rad)) : STANDARD_REGELPAKET;
  } catch {
    return STANDARD_REGELPAKET;
  }
}

// Hämtar aktuellt regelpaket från plattformen (inloggat läge) och cachar
// det. Anropas vid sidladdning — misslyckas hämtningen gäller cachen
// eller standardpaketet.
export async function hamtaRegelpaket(): Promise<RegelPaket> {
  try {
    const { plattformAktiv, plattformToken, plattformFetch } = await import("./plattform");
    if (plattformAktiv() && plattformToken()) {
      const res = await plattformFetch("/api/ecm/regler");
      if (res.ok) {
        const paket = normaliseraRegelpaket(await res.json());
        localStorage.setItem(REGELPAKET_NYCKEL, JSON.stringify(paket));
        return paket;
      }
    }
  } catch {
    // Nätverksfel: cache/standard gäller.
  }
  return aktivtRegelpaket();
}

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

  // Åtgärdsfasen: reparationen dokumenterad — eller motiverat varför
  // ingen åtgärd utfördes. Obligatoriskt innan ärendet avslutas.
  const atgardsposter = atgarder(arende);
  const utfordAtgard = atgardsposter.some((p) => p.handelse.typ === "atgard_utford" && p.handelse.utford);
  rader.push({
    id: "atgard",
    rubrik: "Åtgärd dokumenterad eller motiverad",
    ok: atgardsposter.length > 0,
    kravs: avslutat,
    detalj:
      atgardsposter.length === 0
        ? "Dokumentera vad som gjordes — eller varför ingen åtgärd utfördes."
        : utfordAtgard
          ? undefined
          : "Ingen åtgärd utförd; orsaken är dokumenterad.",
  });

  // Kvalitetskontroll: är symptomet borta? Krävs när en åtgärd faktiskt
  // utförts — annars finns inget att verifiera.
  const kk = kvalitetskontroll(arende);
  rader.push({
    id: "kvalitetskontroll",
    rubrik: "Kvalitetskontroll genomförd — symptomet verifierat",
    ok: !!kk,
    kravs: avslutat && utfordAtgard,
    detalj: kk
      ? kk.resultat === "symptomet_borta"
        ? "Symptomet är verifierat borta efter åtgärd."
        : kk.resultat === "ej_verifierbar"
          ? `Kunde inte verifieras: ${kk.beskrivning}`
          : `Symptomet kvarstår helt eller delvis — ärendet bör inte avslutas som åtgärdat.`
      : utfordAtgard
        ? "Verifiera att symptomet är borta efter åtgärden (provkörning/återtest)."
        : "Ingen åtgärd utförd — inget att verifiera.",
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

  // Compliance Engine: ärendetypens regler ur det aktiva regelpaketet
  // (serverdistribuerat via ECM Knowledge Library, standard som fallback).
  const paket = aktivtRegelpaket();
  const typ = arendetyp(arende);
  for (const regel of paket.arendetypRegler[typ] ?? []) {
    const ok = KRAV_KONTROLLER[regel.krav](arende);
    rader.push({
      id: regel.id,
      rubrik: `${typ}: ${regel.rubrik}`,
      ok,
      kravs: true,
      detalj: ok ? undefined : regel.detaljVidBrist,
    });
  }

  const avslutEvent = handelser.find((h) => h.typ === "arende_avslutat");
  rader.push({
    id: "signering",
    rubrik: "Teknikerns slutsats signerad",
    ok: !avslutat || (avslutEvent?.typ === "arende_avslutat" && !!avslutEvent.signatur),
    kravs: false,
    detalj:
      avslutat && avslutEvent?.typ === "arende_avslutat" && avslutEvent.signatur
        ? `Signerad av ${avslutEvent.signatur}.`
        : avslutat
          ? "Avslutet saknar signatur (äldre ärende)."
          : "Signeras automatiskt när ärendet avslutas.",
  });

  const hypoteser = handelser.filter((h) => h.typ === "hypotes").length;
  rader.push({
    id: "hypoteser",
    rubrik: "Hypoteser redovisas som ej verifierade",
    ok: true,
    kravs: false,
    detalj: hypoteser > 0 ? `${hypoteser} hypotes(er) markeras som ej verifierade i rapporten — aldrig som konstaterade fel.` : undefined,
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
    regelpaketVersion: aktivtRegelpaket().version,
    arendetyp: arendetyp(arende),
    evidensniva: evidensNiva(arende),
    kvalitetsgrind: kvalitetsgrind(arende, metodik).map(({ id, rubrik, ok, kravs }) => ({ id, rubrik, ok, kravs })),
    evidensposter: evidensposter(arende),
  };
}
