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

import { granskaSlutsats } from "./motivering.mjs";
import { STANDARD, arJakande, arendetypNu, t } from "./sprak/index.mjs";

const UNDANTAG_MOTIVERAT = (h) => typeof h.undantag === "string" && h.undantag.trim().length > 0;

// Frågor som måste besvaras jakande för att arbetet ska få avslutas.
// Speglar SPARRFRAGOR i app/src/felsokning/metodik.ts; ett test jämför
// listorna så de inte kan glida isär.
export const SPARRFRAGOR = {
  "hogvolt/sakerhet/behorighet": "grind.hogvolt.behorighet",
  "hogvolt/sakerhet/avstangt": "grind.hogvolt.spanningslos",
};

/** Händelser av en viss typ. */
const av = (handelser, typ) => handelser.filter((h) => h.typ === typ);

/**
 * Utvärderar avslutsgrinden.
 *
 * @returns lista med hinder; tom lista betyder att ärendet får avslutas.
 */
export function grinda(handelser, metodik, sprak = STANDARD) {
  const hinder = [];

  // Hindret bär både nyckeln och den färdiga texten. Nyckeln därför att
  // en klient som byter språk ska kunna rendera om utan att fråga
  // servern; texten därför att ett hinder som passerar genom en logg
  // eller en PDF måste vara läsbart utan katalogen.
  const krav = (id, nyckel, ok, detaljNyckel, variabler) => {
    if (ok) return;
    const post = { id, nyckel, rubrik: t(sprak, nyckel, variabler) };
    if (detaljNyckel) {
      post.detaljNyckel = detaljNyckel;
      post.detalj = t(sprak, detaljNyckel, variabler);
    }
    hinder.push(post);
  };

  // Fritext som kommer ur data, inte ur katalogen — namnen på metodikens
  // kontroller. De står på metodikens språk och kan inte översättas här.
  const kravMedData = (id, nyckel, ok, detalj) => {
    if (ok) return;
    const post = { id, nyckel, rubrik: t(sprak, nyckel) };
    if (detalj) post.detalj = detalj;
    hinder.push(post);
  };

  krav("objekt", "grind.objekt", handelser.some((h) => h.typ === "objekt_identifierat"));

  // Historiken får besvaras nekande, men då krävs en motivering — annars
  // vore "Nej" ett sätt att hoppa över kontrollen utan att det syns.
  const historik = av(handelser, "historik_kontrollerad").at(-1);
  krav(
    "historik",
    "grind.historik",
    Boolean(historik) && (historik.kontrollerad || (historik.kommentar ?? "").trim().length > 0),
    historik ? "grind.historik.nekad" : "grind.historik.saknas",
  );

  // Mätarställningen ska vara FOTOGRAFERAD, inte bara inskriven.
  //
  // Skillnaden är hela dess bevisvärde. En inskriven siffra är teknikerns
  // påstående om vad som stod på mätaren; ett foto visar vad som stod
  // där. Mätarställningen är samtidigt det som avgör garanti- och
  // försäkringsfrågor i efterhand, och den enda uppgift i ärendet som
  // någon kan ha ett intresse av att skriva fel.
  //
  // Klienten krävde redan fotot — men bara klienten, och en regel som
  // bara finns i gränssnittet är en vana, inte en spärr. Det är samma
  // förhållande som QUALITET C-2 gällde, fast åt andra hållet: här var
  // det servern som var svagare, vilket är värre, eftersom servern är
  // den som är auktoritativ.
  //
  // Undantag finns och måste finnas — en trasig display, en timräknare
  // som sitter oåtkomligt, en spegling som inte går att fota bort. Men
  // undantaget kräver en motivering, av samma skäl som ett nekat
  // historiksvar gör det.
  for (const [lage, nyckel] of [
    ["ingaende", "grind.matarstallning.ingaende"],
    ["utgaende", "grind.matarstallning.utgaende"],
  ]) {
    const poster = av(handelser, "matarstallning").filter((h) => h.lage === lage);
    const dokumenterad = poster.length > 0;
    const fotograferad = poster.some((h) => h.bilagaId || h.dataUrl);
    const motiverat = poster.some((h) => (h.undantag ?? "").trim().length > 0);
    krav(
      `matarstallning_${lage}`,
      nyckel,
      dokumenterad && (fotograferad || motiverat),
      dokumenterad ? "grind.matarstallning.ej_foto" : "grind.matarstallning.saknas",
    );
  }

  krav("reproducering", "grind.reproducering", handelser.some((h) => h.typ === "reproducering"));

  krav("felorsak", "grind.felorsak", handelser.some((h) => h.typ === "felorsak"));

  // Åtgärdskedjan. En utebliven åtgärd är ett giltigt utfall — men bara
  // när skälet står i loggen.
  const atgarder = av(handelser, "atgard_utford");
  const utfordArbete = atgarder.some((h) => h.utford === true);
  krav("atgard", "grind.atgard", atgarder.length > 0, "grind.atgard.saknas");

  if (utfordArbete) {
    const beslut = av(handelser, "kundbeslut");
    krav("kundbeslut", "grind.kundbeslut", beslut.length > 0);

    // Hårt fel, inte en varning: arbete utfört trots att kunden avböjt.
    krav(
      "avbojt_men_utfort",
      "grind.kundbeslut.avbojt",
      !beslut.some((h) => h.beslut === "avbojt"),
      "grind.kundbeslut.avbojt.detalj",
    );

    krav("kvalitetskontroll", "grind.kvalitetskontroll", handelser.some((h) => h.typ === "kvalitetskontroll"));
  }

  // Metodikens kontroller: varje kontroll ska bära evidens eller ett
  // dokumenterat undantag. Det är den rad som gör metodiken bindande.
  const utforda = new Map();
  for (const h of av(handelser, "kontroll_utford")) utforda.set(`${h.stegId}/${h.kontrollId}`, h);

  const saknade = [];
  const fotokravande = [];
  const foton = av(handelser, "foto").length;
  for (const steg of metodik?.steg ?? []) {
    for (const kontroll of steg.kontroller ?? []) {
      const h = utforda.get(`${steg.id}/${kontroll.id}`);
      if (!h) {
        saknade.push(`${steg.rubrik} · ${kontroll.text}`);
        continue;
      }
      if (UNDANTAG_MOTIVERAT(h)) continue;

      // En fotokontroll verifieras av fotot. Regeln krävde tidigare ett
      // textresultat även här — trots att gränssnittet märker fältet
      // "Observation (valfritt)". Grinden nekade därmed avslut på nästan
      // varje riktigt ärende, vilket inte syntes så länge klienten hade
      // ett eget och mildare villkor (QUALITY-AUDIT-2 · M-7).
      if (kontroll.krav === "foto") {
        fotokravande.push(kontroll.text);
        continue;
      }
      if (!(h.resultat ?? "").trim()) saknade.push(`${steg.rubrik} · ${kontroll.text} (utan resultat)`);
    }
  }
  kravMedData("metodik_kontroller", "grind.kontroller", saknade.length === 0, saknade.slice(0, 5).join(" · "));
  krav("foton", "grind.foton", foton >= fotokravande.length, fotokravande.length ? "grind.foton.detalj" : undefined, {
    kontroller: fotokravande.length,
    foton,
  });

  // ALVA-RULE-200 · Slutsatsen. Ett ärende stängs aldrig utan att
  // teknikern lämnat ett varför — motiveringen som knyter slutsatsen
  // till underlaget, vad som uteslöts, och vad som kvarstår osäkert.
  //
  // Detta är den rad som saknas i varje verkstadsprotokoll: underlaget
  // säger vad som mättes, slutsatsen vad som är fel, men ingenting
  // varför det ena medför det andra. Det är precis det steget en
  // garantihandläggare eller försäkringsbedömare behöver granska.
  const slutsats = av(handelser, "slutsats").at(-1);
  for (const brist of granskaSlutsats(slutsats, handelser, sprak)) {
    hinder.push({ id: `slutsats_${brist.falt}`, nyckel: brist.nyckel, rubrik: brist.text });
  }

  // Säkerhetsspärrar. Ett nekande svar på en spärrfråga får aldrig
  // passera som "besvarad" — se SPARRFRAGOR i klientens metodik.ts.
  // Klientens spärr är vägledning; den här är hindret (QUALITET M-2).
  for (const [fraga, nyckel] of Object.entries(SPARRFRAGOR)) {
    const [metodikId, stegId, frageId] = fraga.split("/");
    if (metodik?.id !== metodikId) continue;
    const svaret = av(handelser, "fraga_besvarad").findLast(
      (h) => h.stegId === stegId && h.frageId === frageId,
    );
    krav(`sparr_${frageId}`, nyckel, arJakande(svaret?.svar), "grind.sparr.ej_uppfyllt");
  }

  // Evidensnivån måste överstiga E0 — annars avslutas ett ärende utan
  // att någonting alls har dokumenterats.
  krav(
    "evidens",
    "grind.evidens",
    handelser.some((h) => ["foto", "video", "matvarde", "observation", "kontroll_utford"].includes(h.typ)),
    "grind.evidens.saknas",
  );

  return hinder;
}

/**
 * Extra krav som följer av ärendetypen. Reglerna kommer från regelpaketet
 * (ECM Knowledge Library) och är alltså data, inte kod.
 */
export function grindaArendetyp(handelser, regelpaket, sprak = STANDARD) {
  // Ärendetypen slås upp i sin nuvarande form. Ett ärende som öppnades
  // när typerna hette "Garanti" ska få garantins extra krav även efter
  // att de bytt språk — se ARENDETYP_ARV.
  const typ = arendetypNu(av(handelser, "arendetyp_satt").at(-1)?.arendetyp);
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
    const krav = regel.typ ?? regel;
    if (!kontroll) {
      hinder.push({
        id: `arendetyp_${krav}`,
        nyckel: "grind.arendetyp.okant",
        rubrik: t(sprak, "grind.arendetyp.okant", { krav }),
      });
    } else if (!kontroll()) {
      // Regelpaketets egen rubrik står på regelpaketets språk och går
      // inte att översätta här — den är data från kunden, inte vår text.
      hinder.push({
        id: `arendetyp_${krav}`,
        nyckel: regel.rubrik ? undefined : "grind.arendetyp.krav",
        rubrik: regel.rubrik ?? t(sprak, "grind.arendetyp.krav", { krav }),
      });
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
