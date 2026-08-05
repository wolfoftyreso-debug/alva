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
  ja: "Symptomet reproducerades.",
  delvis: "Symptomet kunde delvis reproduceras.",
  nej: "Symptomet kunde inte reproduceras under de förhållanden som rådde vid undersökningen.",
};

const KVALITET = {
  symptomet_borta: "Vid kvalitetskontrollen var symptomet borta.",
  kvarstar: "Vid kvalitetskontrollen kvarstod symptomet.",
  delvis: "Vid kvalitetskontrollen kvarstod symptomet delvis.",
  ej_verifierbar: "Kvalitetskontrollen kunde inte verifiera resultatet.",
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
    meningar.push(`Ärendet gäller ${delar || "ett identifierat objekt"}.`);
  } else {
    saknas.push("objektidentifiering");
    meningar.push("Objektet är inte identifierat i loggen.");
  }

  // 2 · Kundens ord, ordagrant men kortat.
  const fel = sista(h, "felbeskrivning")?.text;
  if (fel) meningar.push(`Kunden beskrev: ”${korta(fel, 160)}”`);
  else saknas.push("felbeskrivning");

  // 3 · Kunde vi se det? Detta är den mening en bedömare läser först.
  const repro = sista(h, "reproducering");
  if (repro) meningar.push(REPRODUKTION[repro.status] ?? "Reproduktionen är dokumenterad.");
  else saknas.push("symptomverifiering");

  // 4 · Orsaken, med teknikerns eget varför när det finns.
  const orsak = sista(h, "felorsak");
  const slutsats = sista(h, "slutsats");
  if (slutsats && slutsats.orsakFastställd === false) {
    meningar.push(`Orsaken kunde inte fastställas: ${korta(slutsats.motivering, 200)}`);
  } else if (orsak) {
    const kategori = (orsak.orsaker ?? []).join(", ");
    meningar.push(`Konstaterad avvikelse: ${korta(orsak.avvikelse, 180)}${kategori ? ` Bedömd orsak: ${kategori}.` : ""}`);
    if (slutsats?.motivering) meningar.push(`Motivering: ${korta(slutsats.motivering, 220)}`);
  } else {
    saknas.push("felorsaksanalys");
  }

  // 5 · Vad som gjordes.
  const atgard = sista(h, "atgard_utford");
  if (atgard) {
    meningar.push(
      atgard.utford
        ? `Utförd åtgärd: ${korta(atgard.beskrivning, 160)}`
        : `Ingen åtgärd utfördes: ${korta(atgard.motivering || atgard.beskrivning, 160)}`,
    );
  } else saknas.push("åtgärd");

  // 6 · Höll det?
  const kvalitet = sista(h, "kvalitetskontroll");
  if (kvalitet) meningar.push(KVALITET[kvalitet.resultat] ?? "Kvalitetskontrollen är dokumenterad.");

  // 7 · Vad som är kvar. Utelämnas aldrig när den finns — det är den
  // enda meningen som talar om vad läsaren själv behöver göra.
  if (slutsats?.kvarstaende) meningar.push(`Kvarstående: ${korta(slutsats.kvarstaende, 160)}`);

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

  const vad = objekt?.identifierare ?? "Oidentifierat objekt";
  if (!avslutat) return `${vad} — pågående.`;
  if (slutsats?.orsakFastställd === false) return `${vad} — avslutat utan fastställd orsak.`;
  if (orsak) return `${vad} — ${korta(orsak.avvikelse, 90)}`;
  return `${vad} — avslutat.`;
}
