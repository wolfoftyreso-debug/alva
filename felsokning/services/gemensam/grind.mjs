// Kvalitetsgrinden på serversidan.
//
// Revisionen (docs/QUALITY-AUDIT.md, C-2) fann att grinden bara fanns i
// webbläsaren. Ett ärende kunde därmed avslutas utan evidens genom ett
// anrop till API:t, och rapporten presenterade det som komplett — trots
// att dokumentationen påstod att systemet aldrig kan skriva en slutsats
// ECM inte godkänt.
//
// Modulen utvärderar de obligatoriska raderna direkt mot händelseloggen.
// Klientens ecm.ts har fler rader (råd, rekommendationer, härledd
// evidensnivå per påstående) och fortsätter vara vägledningen i
// gränssnittet. Det som blockerar ett avslut bor här.
//
// Avsiktligt: reglerna är rena funktioner av (händelser, metodik). Ingen
// databasåtkomst, ingen tid, inget slumpmässigt — samma logg ger alltid
// samma utfall, vilket är vad som gör en spärr granskbar.

const UNDANTAG_MOTIVERAT = (h) => typeof h.undantag === "string" && h.undantag.trim().length > 0;

// Frågor som måste besvaras jakande för att arbetet ska få avslutas.
// Speglar SPARRFRAGOR i app/src/felsokning/metodik.ts; ett test jämför
// listorna så de inte kan glida isär.
export const SPARRFRAGOR = {
  "hogvolt/sakerhet/behorighet": "Behörighet för högvoltsarbete bekräftad",
  "hogvolt/sakerhet/avstangt": "Fordonet spänningslöst enligt tillverkarens rutin",
};

/** Händelser av en viss typ. */
const av = (handelser, typ) => handelser.filter((h) => h.typ === typ);

/**
 * Utvärderar avslutsgrinden.
 *
 * @returns lista med hinder; tom lista betyder att ärendet får avslutas.
 */
export function grinda(handelser, metodik) {
  const hinder = [];
  const krav = (id, rubrik, ok, detalj) => {
    if (!ok) hinder.push(detalj ? { id, rubrik, detalj } : { id, rubrik });
  };

  krav("objekt", "Fordons-/objektidentifiering verifierad", handelser.some((h) => h.typ === "objekt_identifierat"));

  // Historiken får besvaras nekande, men då krävs en motivering — annars
  // vore "Nej" ett sätt att hoppa över kontrollen utan att det syns.
  const historik = av(handelser, "historik_kontrollerad").at(-1);
  krav(
    "historik",
    "Fordonshistorik kontrollerad eller motiverad",
    Boolean(historik) && (historik.kontrollerad || (historik.kommentar ?? "").trim().length > 0),
    historik ? "Nekad historikkontroll kräver en motivering." : "Ingen historikkontroll dokumenterad.",
  );

  for (const [lage, rubrik] of [
    ["ingaende", "Ingående mätarställning dokumenterad"],
    ["utgaende", "Utgående mätarställning dokumenterad"],
  ]) {
    krav(`matarstallning_${lage}`, rubrik, av(handelser, "matarstallning").some((h) => h.lage === lage));
  }

  krav(
    "reproducering",
    "Symptomverifiering: reproducerat eller dokumenterat ej reproducerbart",
    handelser.some((h) => h.typ === "reproducering"),
  );

  krav("felorsak", "Felorsaksanalys dokumenterad", handelser.some((h) => h.typ === "felorsak"));

  // Åtgärdskedjan. En utebliven åtgärd är ett giltigt utfall — men bara
  // när skälet står i loggen.
  const atgarder = av(handelser, "atgard_utford");
  const utfordArbete = atgarder.some((h) => (h.text ?? "").trim().length > 0);
  krav(
    "atgard",
    "Åtgärd dokumenterad eller motiverad",
    atgarder.length > 0,
    "Varken utförd åtgärd eller skäl till att den uteblev finns dokumenterat.",
  );

  if (utfordArbete) {
    const beslut = av(handelser, "kundbeslut");
    krav("kundbeslut", "Kundens besked på åtgärdsförslaget registrerat", beslut.length > 0);

    // Hårt fel, inte en varning: arbete utfört trots att kunden avböjt.
    krav(
      "avbojt_men_utfort",
      "Utfört arbete trots avböjt åtgärdsförslag",
      !beslut.some((h) => h.utfall === "avbojt"),
      "Kunden avböjde förslaget men arbete har dokumenterats som utfört.",
    );

    krav(
      "kvalitetskontroll",
      "Kvalitetskontroll genomförd — symptomet verifierat",
      handelser.some((h) => h.typ === "kvalitetskontroll"),
    );
  }

  // Metodikens kontroller: varje kontroll ska bära evidens eller ett
  // dokumenterat undantag. Det är den rad som gör metodiken bindande.
  const utforda = new Map();
  for (const h of av(handelser, "kontroll_utford")) utforda.set(`${h.stegId}/${h.kontrollId}`, h);

  const saknade = [];
  const utanFoto = [];
  const foton = av(handelser, "foto").length;
  for (const steg of metodik?.steg ?? []) {
    for (const kontroll of steg.kontroller ?? []) {
      const h = utforda.get(`${steg.id}/${kontroll.id}`);
      if (!h) {
        saknade.push(`${steg.rubrik} · ${kontroll.text}`);
        continue;
      }
      if (UNDANTAG_MOTIVERAT(h)) continue;
      if (!(h.resultat ?? "").trim()) saknade.push(`${steg.rubrik} · ${kontroll.text} (utan resultat)`);
      else if (kontroll.krav === "foto") utanFoto.push(kontroll.text);
    }
  }
  krav(
    "metodik_kontroller",
    "Metodikens kontroller: evidens eller dokumenterat undantag",
    saknade.length === 0,
    saknade.slice(0, 5).join(" · "),
  );
  krav("foton", "Foton finns för fotokrävande kontroller", utanFoto.length === 0 || foton >= utanFoto.length);

  // Säkerhetsspärrar. Ett nekande svar på en spärrfråga får aldrig
  // passera som "besvarad" — se SPARRFRAGOR i klientens metodik.ts.
  // Klientens spärr är vägledning; den här är hindret (QUALITET M-2).
  for (const [nyckel, text] of Object.entries(SPARRFRAGOR)) {
    const [metodikId, stegId, frageId] = nyckel.split("/");
    if (metodik?.id !== metodikId) continue;
    const svaret = av(handelser, "fraga_besvarad").findLast(
      (h) => h.stegId === stegId && h.frageId === frageId,
    );
    krav(`sparr_${frageId}`, text, svaret?.svar === "Ja", "Säkerhetskravet är inte uppfyllt.");
  }

  // Evidensnivån måste överstiga E0 — annars avslutas ett ärende utan
  // att någonting alls har dokumenterats.
  krav(
    "evidens",
    "Evidensnivå över E0",
    handelser.some((h) => ["foto", "video", "matvarde", "observation", "kontroll_utford"].includes(h.typ)),
    "Ingen evidens av något slag finns i loggen.",
  );

  return hinder;
}

/**
 * Extra krav som följer av ärendetypen. Reglerna kommer från regelpaketet
 * (ECM Knowledge Library) och är alltså data, inte kod.
 */
export function grindaArendetyp(handelser, regelpaket) {
  const typ = av(handelser, "arendetyp_satt").at(-1)?.arendetyp;
  const regler = regelpaket?.arendetyper?.[typ]?.krav ?? [];
  const hinder = [];

  const uppfyllt = {
    miltal: () => av(handelser, "matarstallning").length > 0,
    historik: () => av(handelser, "historik_kontrollerad").some((h) => h.kontrollerad),
    foto: () => av(handelser, "foto").length > 0,
    claim: () => harReferens(handelser, ["ao_claim", "claim"]),
    skadenummer: () => harReferens(handelser, ["ao_skadenummer", "skadenummer"]),
  };

  for (const regel of regler) {
    const kontroll = uppfyllt[regel.typ ?? regel];
    // En okänd kravtyp får aldrig tolkas som uppfylld. Ett regelpaket som
    // inte går att utvärdera ska stoppa avslutet, inte släppa igenom det.
    if (!kontroll) {
      hinder.push({ id: `arendetyp_${regel.typ ?? regel}`, rubrik: `Okänt krav i regelpaketet: ${regel.typ ?? regel}` });
    } else if (!kontroll()) {
      hinder.push({ id: `arendetyp_${regel.typ ?? regel}`, rubrik: regel.rubrik ?? `Krav för ärendetypen: ${regel.typ ?? regel}` });
    }
  }
  return hinder;
}

function harReferens(handelser, nycklar) {
  for (const h of av(handelser, "arbetsorder_skannad")) {
    for (const f of h.falt ?? []) {
      if (nycklar.includes(f.id) && String(f.varde ?? "").trim()) return true;
    }
  }
  return false;
}
