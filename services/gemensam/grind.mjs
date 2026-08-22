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
import { inomTak, sakerhetstak } from "./sakerhet.mjs";
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
    Boolean(historik) && (historik.kontrollerad || String(historik.kommentar ?? "").trim().length > 0),
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
    const motiverat = poster.some((h) => String(h.undantag ?? "").trim().length > 0);
    krav(
      `matarstallning_${lage}`,
      nyckel,
      dokumenterad && (fotograferad || motiverat),
      dokumenterad ? "grind.matarstallning.ej_foto" : "grind.matarstallning.saknas",
    );
  }

  krav("reproducering", "grind.reproducering", handelser.some((h) => h.typ === "reproducering"));

  krav("felorsak", "grind.felorsak", handelser.some((h) => h.typ === "felorsak"));

  // Säkerhetsnivån är ett tak, inte ett val (ALVA-SPEC-071). En felorsak
  // som påstår högre säkerhet än underlaget bär spärrar avslutet — inte
  // för att slutsatsen är fel, utan för att PÅSTÅENDET om den är det.
  // Sänkning prövas aldrig: ärlig osäkerhet är information.
  const felorsaken = av(handelser, "felorsak").at(-1);
  if (felorsaken?.sakerhet) {
    const tak = sakerhetstak(handelser);
    krav(
      "sakerhetstak",
      "grind.sakerhet",
      inomTak(felorsaken.sakerhet, tak),
      "grind.sakerhet.detalj",
      { niva: felorsaken.sakerhet, tak },
    );
  }

  // Åtgärdskedjan. En utebliven åtgärd är ett giltigt utfall — men bara
  // när skälet står i loggen.
  const atgarder = av(handelser, "atgard_utford");
  const utfordArbete = atgarder.some((h) => h.utford === true);
  krav("atgard", "grind.atgard", atgarder.length > 0, "grind.atgard.saknas");

  if (utfordArbete) {
    const beslut = av(handelser, "kundbeslut");
    krav("kundbeslut", "grind.kundbeslut", beslut.length > 0);

    // Hårt fel, inte en varning: arbete utfört trots att kunden avböjt.
    //
    // SENASTE beskedet gäller, inte "någonsin avböjt". Kunden som avböjer,
    // ringer tillbaka och godkänner är ett vanligt förlopp — och med den
    // gamla regeln blev ärendet permanent omöjligt att stänga så fort ett
    // avböjande någonsin registrerats, utan att hindret kunde åtgärdas.
    // Loggen är append-only, så det första beskedet står kvar och är
    // synligt; det är vilket som GÄLLER som avgörs här.
    krav(
      "avbojt_men_utfort",
      "grind.kundbeslut.avbojt",
      beslut.at(-1)?.beslut !== "avbojt",
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
      if (!String(h.resultat ?? "").trim()) saknade.push(`${steg.rubrik} · ${kontroll.text} (utan resultat)`);
    }
  }
  kravMedData("metodik_kontroller", "grind.kontroller", saknade.length === 0, saknade.slice(0, 5).join(" · "));
  krav("foton", "grind.foton", foton >= fotokravande.length, fotokravande.length ? "grind.foton.detalj" : undefined, {
    kontroller: fotokravande.length,
    foton,
  });

  // ---- ALVA-RULE-210 · Bevis för anmärkningen -------------------------
  //
  // Varje kontroll måste bära ett resultat. Men den kontroll som FANN
  // något — anmärkningen — är den som bär åtgärden, fakturan och hela
  // garantianspråket, och den fick tidigare vara ett blott påstående i
  // text. "Bussning sprucken, 4 mm glapp" räckte för att stänga ärendet,
  // byta armen och fakturera, utan att en enda bild visade sprickan.
  //
  // Det är samma gränsfel som resten av granskningen letar efter: regeln
  // var riktig inuti (alla kontroller dokumenteras) men oprövad vid sin
  // gräns (just den kontroll som betyder något). En bild som tas EFTER
  // demonteringen går inte att ta i efterhand — bevisbördan måste ligga
  // där fyndet görs.
  //
  // Två krav, som håller ihop:
  //
  //   1. En kontroll märkt som anmärkning KRÄVER foto eller video som är
  //      bunden till just den kontrollen (samma stegId/kontrollId).
  //   2. Har en åtgärd utförts och en felorsak fastställts, MÅSTE minst
  //      en anmärkning finnas — annars kunde kravet kringgås genom att
  //      helt enkelt aldrig märka något som anmärkning.
  //
  // Utan (2) vore (1) frivilligt. Med båda kan ett ärende inte längre
  // stängas med en utförd reparation som ingenting visar.
  {
    const bunden = (h) => `${h.stegId ?? ""}/${h.kontrollId ?? ""}`;
    const visuella = new Set(
      [...av(handelser, "foto"), ...av(handelser, "video")]
        .filter((h) => h.stegId && h.kontrollId)
        .map(bunden),
    );

    const anmarkningar = av(handelser, "kontroll_utford").filter((h) => h.anmarkning === true);
    const utanBevis = anmarkningar
      .filter((h) => !visuella.has(bunden(h)))
      .map((h) => String(h.text ?? h.kontrollId ?? "").trim())
      .filter(Boolean);

    kravMedData(
      "anmarkning_bevis",
      "grind.anmarkning.bevis",
      utanBevis.length === 0,
      utanBevis.slice(0, 5).join(" · "),
    );

    // Reparation utan en enda dokumenterad anmärkning: det som lagades
    // finns då ingenstans i loggen som ett fynd.
    const reparerat = av(handelser, "atgard_utford").some((h) => h.utford === true);
    const felorsakSatt = av(handelser, "felorsak").length > 0;
    krav(
      "anmarkning_saknas",
      "grind.anmarkning.saknas",
      !(reparerat && felorsakSatt) || anmarkningar.length > 0,
      "grind.anmarkning.saknas.detalj",
    );
  }

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
  //
  // Spärren utvärderas ur LOGGEN, inte ur den aktiva metodiken. Den låg
  // tidigare bakom `if (metodik?.id !== metodikId) continue`, så ett
  // metodikbyte AVFÖRDE säkerhetsspärren: öppna som högvolt, svara nej på
  // spänningsfrihet, byt till en metodik utan spärren, stäng med färre
  // krav än ärendet öppnades med. Ett högvoltsfordon är högvolt oavsett
  // vilken metodik som är aktiv — kontrollen hör till fordonet, inte till
  // grinden där den råkade hittas (samma rotorsak som T-13/T-14).
  //
  // Är den ägande metodiken aktiv KRÄVS ett jakande svar (frågan ska
  // ställas och besvaras). Har metodiken bytts bort men loggen bär ett
  // besvarat ICKE-jakande svar, blockeras avslutet ändå. Finns inget svar
  // alls blockeras inget: den som byter en FELVALD metodik innan
  // säkerhetsfrågan besvarats drabbas inte.
  //
  // Matchningen sker på stegId/frageId eftersom loggposten inte bär
  // metodikId. Spärrfrågornas id:n är unika över metodikbiblioteket (ett
  // test låser det), så ingen annan metodik kan råka utlösa en spärr.
  //
  // "Har ärendet någon gång stått under" utläses ur de metodikval som
  // finns i loggen (metodik_vald vid start, metodik_byte vid byte). Ett
  // metodikbyte kräver den händelsen, så varje bytbart ärende bär sin
  // metodikhärkomst i loggen — och därmed går den inte att dölja.
  const metodikerILoggen = new Set([
    ...av(handelser, "metodik_vald").map((h) => h.metodikId),
    ...av(handelser, "metodik_byte").map((h) => h.metodikId),
  ]);
  for (const [fraga, nyckel] of Object.entries(SPARRFRAGOR)) {
    const [metodikId, stegId, frageId] = fraga.split("/");
    const ägandeAktiv = metodik?.id === metodikId;
    const varUnderMetodiken = metodikerILoggen.has(metodikId);
    const svaret = av(handelser, "fraga_besvarad").findLast(
      (h) => h.stegId === stegId && h.frageId === frageId,
    );
    // Kravet gäller om metodiken är aktiv, om ärendet NÅGON GÅNG stått
    // under den (metodikval i loggen), eller om spärrfrågan redan
    // BESVARATS — svaret är i sig bevis att ärendet var under metodiken,
    // eftersom spärrfrågorna är unika för den. Den som aldrig varit i
    // närheten av metodiken drabbas inte.
    if (!ägandeAktiv && !varUnderMetodiken && !svaret) continue;
    // Tystnad är inte ett ja: ett obesvarat säkerhetskrav spärrar också,
    // både när metodiken är aktiv och när den bytts bort. Annars kunde ett
    // högvoltsärende avslutas utan spänningsfrihetskontroll genom ett byte
    // till en svagare metodik utan att säkerhetsfrågan ens besvarats.
    const detaljNyckel = ägandeAktiv ? "grind.sparr.ej_uppfyllt" : "grind.sparr.kringgangen";
    krav(`sparr_${frageId}`, nyckel, arJakande(svaret?.svar), detaljNyckel);
  }

  // Teknisk eskalering (FGS-1.0 §8, DISS-mönstret): en öppnad förfrågan
  // till tillverkare eller garantigivare utan dokumenterat svar spärrar
  // avslutet. Bulletinerna kräver att svaret inväntas innan ytterligare
  // åtgärder görs — ett ärende som stängs med öppen eskalering har inte
  // hela orsakskedjan dokumenterad, och garantianspråket kan ogiltigas.
  {
    const oppna = new Map();
    for (const h of av(handelser, "eskalering")) {
      const nyckel = String(h.referens ?? "").trim();
      if (h.status === "oppnad") oppna.set(nyckel, h);
      else if (oppna.has(nyckel)) oppna.delete(nyckel);
      else if (nyckel === "" && oppna.size === 1) oppna.clear();
    }
    krav("eskalering", "grind.eskalering", oppna.size === 0, "grind.eskalering.detalj", {
      referens: [...oppna.keys()].map((r) => r || "—").join(", "),
    });
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
  // Paketet finns i två former: den distribuerade filens rika form
  // (arendetypRegler med id/rubrik/detaljVidBrist) och den slimmade
  // (arendetyper[typ].krav). Servern matade tidigare in den rika formen
  // i en funktion som bara läste den slimmade — varje ärendetypskrav
  // blev en tyst no-op på servern, och spärren fanns bara som råd i
  // klienten. Det är exakt C-2-mönstret, återuppstått genom ett format.
  const regler = [
    ...(regelpaket?.arendetyper?.[typ]?.krav ?? []),
    ...(regelpaket?.arendetypRegler?.[typ] ?? []).map((r) => ({ typ: r.krav, rubrik: r.rubrik, detalj: r.detaljVidBrist })),
  ];
  const hinder = [];

  const betalareReferens = () => av(handelser, "betalare").some((h) => String(h.referens ?? "").trim());
  const uppfyllt = {
    miltal: () => av(handelser, "matarstallning").length > 0,
    historik: () => av(handelser, "historik_kontrollerad").some((h) => h.kontrollerad),
    foto: () => av(handelser, "foto").length > 0,
    // Referensen kan komma ur den skannade arbetsordern ELLER ur en
    // registrerad betalare — alla verkstäder skannar inte (FGS-1.0 §4).
    claim: () => harReferens(handelser, ["ao_claim", "claim"]) || betalareReferens(),
    skadenummer: () => harReferens(handelser, ["ao_skadenummer", "skadenummer"]) || betalareReferens(),
    // FGS-1.0 §1/§18: betalaren fastställd — spår och namn — innan
    // ärendet kan stängas i de spår där någon annan än kunden betalar.
    betalare: () => av(handelser, "betalare").some((h) => String(h.namn ?? "").trim() && String(h.spar ?? "").trim()),
    // Goodwill och externa garantigivare kräver godkännande/claim
    // authorization INNAN reparationen ersätts (FGS-1.0 §12).
    godkannande: () => av(handelser, "betalare").some((h) => String(h.godkannande ?? "").trim()),
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
        ...(regel.detalj ? { detalj: regel.detalj } : {}),
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
