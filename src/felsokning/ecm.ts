// Evidence & Compliance Matrix (ECM) — plattformens regelmotor.
//
// Grundprincip: varje påstående måste kunna härledas till evidens i
// händelseloggen. Systemet får aldrig skriva "kontrollerad", "OK" eller
// "inga fel" utan underlag — utan evidens skrivs "Evidens saknas".
//
// Regelbiblioteket är versionshanterat och skilt från applikationslogiken:
// evidensnivåer, krav och kvalitetsgrind ändras här (och i kommande
// versioner via serverdistribuerade regler) utan att vyerna byggs om.
// Vyerna anropar bara de rena funktionerna nedan.

import type { Arende } from "./domain";
import type { Metodik } from "./metodik";

export const ECM_VERSION = "1.0";

// Evidensnivåer: bevisvärdet för ett påstående, härlett ur loggen.
//   E0 inget underlag · E1 teknikerns observation · E2 foto · E3 video
//   E4 mätvärde · E5 diagnosdata/dokument · E6 flera oberoende källor
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

// Godkända orsaker när underlag inte kan tas fram. Fri text tillåts
// också — men en orsak är alltid obligatorisk.
export const UNDANTAGSORSAKER = [
  "Komponenten är oåtkomlig",
  "Fordonet kan inte lyftas säkert",
  "Kunden avböjde demontering",
  "Dålig sikt/åtkomst",
  "Utrustning saknas",
];

// Evidensnivå för ärendet som helhet: den starkaste kombination som
// loggen faktiskt innehåller.
export function evidensNiva(arende: Arende): EvidensNiva {
  let foto = false;
  let matvarde = false;
  let dokument = false;
  let observation = false;
  for (const post of arende.handelser) {
    const h = post.handelse;
    if (h.typ === "foto") foto = true;
    if (h.typ === "matvarde") matvarde = true;
    if (h.typ === "arbetsorder_skannad") dokument = true;
    if (h.typ === "observation" || h.typ === "kontroll_utford") observation = true;
  }
  const kallor = [foto, matvarde, dokument].filter(Boolean).length;
  if (kallor >= 2) return "E6";
  if (dokument) return "E5";
  if (matvarde) return "E4";
  if (foto) return "E2";
  if (observation) return "E1";
  return "E0";
}

export interface GrindRad {
  id: string;
  rubrik: string;
  ok: boolean;
  // Obligatorisk: blockerar slutrapporten tills den är grön.
  kravs: boolean;
  detalj?: string;
}

// Kvalitetsgrind före slutrapport: varje rad är en verifierbar kontroll
// mot händelseloggen. Rapporten kan inte genereras förrän alla
// obligatoriska rader är gröna — evidens eller dokumenterat undantag.
export function kvalitetsgrind(arende: Arende, metodik: Metodik): GrindRad[] {
  const rader: GrindRad[] = [];
  const handelser = arende.handelser.map((p) => p.handelse);

  const objektFinns = handelser.some((h) => h.typ === "objekt_identifierat");
  rader.push({
    id: "objekt",
    rubrik: "Fordons-/objektidentifiering verifierad",
    ok: objektFinns,
    kravs: true,
    detalj: objektFinns ? undefined : "Evidens saknas — identifiera objektet.",
  });

  const arbetsorder = handelser.some((h) => h.typ === "arbetsorder_skannad");
  rader.push({
    id: "arbetsorder",
    rubrik: "Arbetsorder inläst",
    ok: arbetsorder,
    kravs: false,
    detalj: arbetsorder ? undefined : "Ärendet startades utan skannad arbetsorder.",
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
