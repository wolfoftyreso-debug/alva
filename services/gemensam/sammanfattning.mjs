// ALVA-PROC-0030 · Case summary.
//
// Några få meningar som ger vem som helst en bild av ärendet: kunden i
// telefon, försäkringshandläggaren som öppnar en akt, teknikern som tar
// över efter helgen.
//
// ---- Varför den är härledd och inte genererad -------------------------
//
// Frestelsen är att låta modellen skriva den. Det vore fel här, och
// skälet är inte försiktighet utan funktion:
//
//   Den ska gå att lita på.   En sammanfattning som en bedömare läser
//                             blir en del av beslutsunderlaget. Är den
//                             genererad måste den granskas mot loggen
//                             varje gång — och då är den inte längre en
//                             genväg.
//
//   Den ska vara stabil.      Samma ärende måste ge samma text i dag och
//                             om två år. En sammanfattning som ändrar sig
//                             mellan visningar är oanvändbar i en tvist.
//
//   Den ska fungera offline.  Verkstadsgolvet har dålig täckning.
//
// Sammanfattningen är därför en projektion, precis som briefen och
// rapporten. Den innehåller inget som inte står i loggen, och den säger
// uttryckligen när något saknas i stället för att utelämna det.
//
// Modellen har fortfarande en roll — men i andra änden: den kan föreslå
// en språkligt jämnare formulering som teknikern GODKÄNNER, och då blir
// godkännandet en händelse i loggen. Det som visas här är alltid det
// härledda.

const handelserI = (arende) => (arende.handelser ?? []).map((p) => p.handelse ?? p);
const av = (handelser, typ) => handelser.filter((h) => h?.typ === typ);
const sista = (handelser, typ) => av(handelser, typ).at(-1);

const REPRODUKTION = {
  ja: "The symptom was reproduced.",
  delvis: "The symptom could be partially reproduced.",
  nej: "The symptom could not be reproduced under the conditions present during the examination.",
};

const KVALITET = {
  symptomet_borta: "At the quality check the symptom was gone.",
  kvarstar: "At the quality check the symptom remained.",
  delvis: "At the quality check the symptom partially remained.",
  ej_verifierbar: "The quality check could not verify the outcome.",
};

/** Klipper en mening vid en rimlig gräns utan att kapa mitt i ett ord. */
function korta(text, max = 220) {
  const rå = String(text ?? "").trim().replace(/\s+/g, " ");
  if (rå.length <= max) return rå;
  const brytpunkt = rå.lastIndexOf(" ", max);
  return `${rå.slice(0, brytpunkt > max * 0.6 ? brytpunkt : max)}…`;
}

/**
 * Bygger sammanfattningen.
 *
 * Ordningen är den en läsare faktiskt behöver: vad gällde det, vad sade
 * kunden, kunde vi se det, vad blev orsaken, vad gjorde vi, höll det,
 * vad är kvar. Varje mening utelämnas när underlaget saknas — utom de
 * som handlar om att något saknas, för de är själva poängen.
 *
 * @returns { meningar[], text, fullstandig, saknas[] }
 */
export function sammanfatta(arende) {
  const h = handelserI(arende);
  const meningar = [];
  const saknas = [];

  // 1 · Objektet.
  const objekt = sista(h, "objekt_identifierat")?.objekt;
  if (objekt) {
    const delar = [objekt.beskrivning, objekt.identifierare].filter(Boolean).join(", ");
    meningar.push(`The case concerns ${delar || "an identified object"}.`);
  } else {
    saknas.push("object identification");
    meningar.push("The object is not identified in the log.");
  }

  // 2 · Kundens ord, ordagrant men kortat.
  const fel = sista(h, "felbeskrivning")?.text;
  if (fel) meningar.push(`The customer described: ”${korta(fel, 160)}”`);
  else saknas.push("fault description");

  // 3 · Kunde vi se det? Detta är den mening en bedömare läser först.
  const repro = sista(h, "reproducering");
  if (repro) meningar.push(REPRODUKTION[repro.status] ?? "The reproduction is documented.");
  else saknas.push("symptom verification");

  // 4 · Orsaken, med teknikerns eget varför när det finns.
  const orsak = sista(h, "felorsak");
  const slutsats = sista(h, "slutsats");
  if (slutsats && slutsats.orsakFastställd === false) {
    meningar.push(`The cause could not be established: ${korta(slutsats.motivering, 200)}`);
  } else if (orsak) {
    const kategori = (orsak.orsaker ?? []).join(", ");
    meningar.push(`Established deviation: ${korta(orsak.avvikelse, 180)}${kategori ? ` Assessed cause: ${kategori}.` : ""}`);
    if (slutsats?.motivering) meningar.push(`Rationale: ${korta(slutsats.motivering, 220)}`);
  } else {
    saknas.push("root cause analysis");
  }

  // 5 · Vad som gjordes.
  const atgard = sista(h, "atgard_utford");
  if (atgard) {
    meningar.push(
      atgard.utford
        ? `Action performed: ${korta(atgard.beskrivning, 160)}`
        : `No action was performed: ${korta(atgard.motivering || atgard.beskrivning, 160)}`,
    );
  } else saknas.push("action");

  // 6 · Höll det?
  const kvalitet = sista(h, "kvalitetskontroll");
  if (kvalitet) meningar.push(KVALITET[kvalitet.resultat] ?? "The quality check is documented.");

  // 7 · Vad som är kvar. Utelämnas aldrig när den finns — det är den
  // enda meningen som talar om vad läsaren själv behöver göra.
  if (slutsats?.kvarstaende) meningar.push(`Remaining: ${korta(slutsats.kvarstaende, 160)}`);

  return {
    version: "ALVA-PROC-0030",
    meningar,
    text: meningar.join(" "),
    /** Sant när inget obligatoriskt underlag saknas. */
    fullstandig: saknas.length === 0,
    saknas,
  };
}

/**
 * Kortformen: en enda mening för en lista eller ett API-svar där
 * utrymmet är en rad.
 */
export function enrading(arende) {
  const h = handelserI(arende);
  const objekt = sista(h, "objekt_identifierat")?.objekt;
  const slutsats = sista(h, "slutsats");
  const orsak = sista(h, "felorsak");
  const avslutat = h.some((x) => x?.typ === "arende_avslutat");

  const vad = objekt?.identifierare ?? "Unidentified object";
  if (!avslutat) return `${vad} — in progress.`;
  if (slutsats?.orsakFastställd === false) return `${vad} — closed without an established cause.`;
  if (orsak) return `${vad} — ${korta(orsak.avvikelse, 90)}`;
  return `${vad} — closed.`;
}
