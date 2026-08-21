// Ljuddiagnos — akustisk analys i webbläsaren.
//
// Ur serverkopians arbete (ALVA-DOC-0012, lyft 3). Substansen är
// densamma — mätsekvenser, spektralanalys, stoppregler — men tre saker
// är rättade i lyftet:
//
//   1. Allt sker LOKALT. Ingen ljudserver krävs: WebAudio spelar in,
//      spektrumet beräknas här. Serverjämförelse mot referensprofiler
//      är ett senare, eget lyft.
//   2. Resultatet dokumenteras som SCHEMATS händelser — matvarde,
//      observation, hypotes — aldrig en egen händelsetyp förbi det
//      slutna schemat (kopian castade fram typen "ljudanalys", som
//      servern hade avvisat).
//   3. Analysen använder en riktig FFT (radix-2). Kopian körde en
//      naiv DFT, O(N²) per ram — miljardtals operationer för tio
//      sekunder ljud.
//
// Hypoteser är FÖRSLAG med nivå medel/lag, aldrig hög: en akustisk
// signatur pekar ut var man ska mäta — den är inte en verifierad
// felorsak. Det är samma regel som allt annat beslutsstöd i ALVA.

import type { Handelse } from "./domain";

// ---- Mätsekvenser ------------------------------------------------------

export type Sekvens = "A" | "B" | "C" | "D" | "E" | "F";

export interface Matsekvens {
  namn: string;
  beskrivning: string;
  varaktighetS: number;
  rpm?: number;
  instruktioner: string[];
}

export const MATSEKVENSER: Record<Sekvens, Matsekvens> = {
  A: {
    namn: "Idle",
    beskrivning: "10 seconds at idle, engine warm",
    varaktighetS: 10,
    instruktioner: [
      "Start the engine and let it idle until normal operating temperature",
      "Hold the microphone 30–50 cm from the engine bay",
      "Record 10 seconds of continuous engine sound",
    ],
  },
  B: {
    namn: "1500 rpm",
    beskrivning: "Stable 1500 rpm",
    varaktighetS: 10,
    rpm: 1500,
    instruktioner: [
      "Raise engine speed to a steady 1500 rpm",
      "Hold the speed stable for the whole recording",
      "Avoid acceleration and engine braking",
    ],
  },
  C: {
    namn: "2000 rpm",
    beskrivning: "Stable 2000 rpm",
    varaktighetS: 10,
    rpm: 2000,
    instruktioner: ["Raise engine speed to a steady 2000 rpm", "Hold the speed stable", "Record 10 seconds"],
  },
  D: {
    namn: "Acceleration",
    beskrivning: "Idle to 3000 rpm, controlled",
    varaktighetS: 15,
    instruktioner: [
      "Start from idle",
      "Accelerate evenly to about 3000 rpm",
      "Record the whole sweep — avoid sudden throttle input",
    ],
  },
  E: {
    namn: "Deceleration",
    beskrivning: "3000 rpm to idle, engine braking only",
    varaktighetS: 10,
    instruktioner: ["Hold 3000 rpm", "Release the throttle completely", "Do not use the brakes while recording"],
  },
  F: {
    namn: "Directed component",
    beskrivning: "Microphone or probe at a specific component",
    varaktighetS: 10,
    instruktioner: [
      "Place the microphone or probe as close to the component as possible",
      "Keep clear of rotating parts",
      "Record 10 seconds",
    ],
  },
};

// ---- Spektralanalys ----------------------------------------------------

export interface Topp {
  hz: number;
  /** Relativ magnitud, 1 = starkaste toppen. */
  rel: number;
}

export interface Spektralresultat {
  dominantHz: number;
  toppar: Topp[];
  /** Uppskattat signal/brus-förhållande i dB. */
  snrDb: number;
  /** Frekvens ÷ rotationsfrekvens — bara när varvtal angivits. */
  ordning?: number;
  /** Spektral tyngdpunkt — var energin bor. */
  centroidHz: number;
  /** Relativ energi i åtta logaritmiska band 50 Hz–8 kHz, summa 1. */
  band: number[];
  samplefrekvens: number;
  varaktighetS: number;
}

/** Bandgränserna: åtta logaritmiska band mellan 50 Hz och 8 kHz. */
export const BANDGRANSER = Array.from({ length: 9 }, (_, i) => 50 * Math.pow(8000 / 50, i / 8));

const FFT_STORLEK = 2048;
const HOPP = 1024;

// Radix-2 FFT, itererande Cooley–Tukey. Re/im muteras på plats.
export function fft(re: Float64Array, im: Float64Array): void {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const vinkel = (-2 * Math.PI) / len;
    const wRe = Math.cos(vinkel);
    const wIm = Math.sin(vinkel);
    for (let i = 0; i < n; i += len) {
      let kRe = 1;
      let kIm = 0;
      for (let j = 0; j < len / 2; j++) {
        const aRe = re[i + j];
        const aIm = im[i + j];
        const bRe = re[i + j + len / 2] * kRe - im[i + j + len / 2] * kIm;
        const bIm = re[i + j + len / 2] * kIm + im[i + j + len / 2] * kRe;
        re[i + j] = aRe + bRe;
        im[i + j] = aIm + bIm;
        re[i + j + len / 2] = aRe - bRe;
        im[i + j + len / 2] = aIm - bIm;
        const nyRe = kRe * wRe - kIm * wIm;
        kIm = kRe * wIm + kIm * wRe;
        kRe = nyRe;
      }
    }
  }
}

/**
 * Medelspektrum över hela inspelningen: Hammingfönster per ram, FFT,
 * magnituderna medelvärdesbildade. Ett stationärt motorljud träder
 * fram; enstaka skrammel slätas ut — det är avsikten, sekvenserna är
 * konstruerade för stationära driftlägen.
 */
export function analyseraKanal(kanal: Float32Array, samplefrekvens: number, rpm?: number): Spektralresultat {
  const fonster = new Float64Array(FFT_STORLEK);
  for (let i = 0; i < FFT_STORLEK; i++) fonster[i] = 0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (FFT_STORLEK - 1));

  const spektrum = new Float64Array(FFT_STORLEK / 2);
  let ramar = 0;
  for (let start = 0; start + FFT_STORLEK <= kanal.length; start += HOPP) {
    const re = new Float64Array(FFT_STORLEK);
    const im = new Float64Array(FFT_STORLEK);
    for (let i = 0; i < FFT_STORLEK; i++) re[i] = kanal[start + i] * fonster[i];
    fft(re, im);
    for (let k = 0; k < FFT_STORLEK / 2; k++) spektrum[k] += Math.hypot(re[k], im[k]);
    ramar++;
  }
  if (ramar > 0) for (let k = 0; k < spektrum.length; k++) spektrum[k] /= ramar;

  // Toppar: lokala maxima, sorterade, närliggande bin sammanslagna.
  // Bin 0–1 (DC och infraljud under ~45 Hz) ingår inte som dominant.
  const binHz = samplefrekvens / FFT_STORLEK;
  const kandidater: { k: number; m: number }[] = [];
  for (let k = 2; k < spektrum.length - 1; k++) {
    if (spektrum[k] > spektrum[k - 1] && spektrum[k] >= spektrum[k + 1]) kandidater.push({ k, m: spektrum[k] });
  }
  kandidater.sort((a, b) => b.m - a.m);
  const valda: { k: number; m: number }[] = [];
  for (const kand of kandidater) {
    if (valda.length >= 5) break;
    if (valda.every((v) => Math.abs(v.k - kand.k) > 3)) valda.push(kand);
  }
  // Ingen topp = ingen signal. Fallbacket var tidigare 1, vilket gav en
  // TYST kanal ett SNR på ~240 dB: nämnaren (medianen) golvas till 1e-12,
  // täljaren låtsades vara 1, och stoppregeln "för lågt SNR" — som finns
  // just för att fånga en mutad mikrofon — passerade i stället. Noll är
  // det ärliga värdet: fanns ingen topp fanns ingen ton.
  const maxM = valda[0]?.m ?? 0;
  const toppar: Topp[] = valda.map((v) => ({ hz: Math.round(v.k * binHz), rel: Number((v.m / maxM).toFixed(2)) }));
  const dominantHz = toppar[0]?.hz ?? 0;

  // SNR: starkaste toppen mot medianenergin — grovt men ärligt mått på
  // om något alls sticker upp ur mattan.
  const sorterat = Array.from(spektrum).sort((a, b) => a - b);
  const median = sorterat[Math.floor(sorterat.length / 2)] || 1e-12;
  // Ett rent spektrum har halva binsen nära noll, så medianen golvas till
  // 1e-12 — utan tak blir kvoten då astronomisk och säger ingenting om
  // signalen. SNR:t taklistas därför vid 90 dB, vilket är långt över
  // allt en verkstadsmikrofon kan mäta, och blir 0 när ingen topp finns.
  const snrDb =
    maxM <= 0 ? 0 : Number(Math.min(90, 20 * Math.log10(maxM / median)).toFixed(1));

  // Tyngdpunkt och bandenergier — särdragen referensprofilerna jämför.
  let energiSumma = 0;
  let viktadSumma = 0;
  const band = new Array(BANDGRANSER.length - 1).fill(0);
  for (let k = 1; k < spektrum.length; k++) {
    const hz = k * binHz;
    const energi = spektrum[k] * spektrum[k];
    energiSumma += energi;
    viktadSumma += hz * energi;
    for (let b = 0; b < band.length; b++) {
      if (hz >= BANDGRANSER[b] && hz < BANDGRANSER[b + 1]) {
        band[b] += energi;
        break;
      }
    }
  }
  const bandSumma = band.reduce((a, v) => a + v, 0) || 1e-12;

  return {
    dominantHz,
    toppar,
    snrDb,
    ordning: rpm ? Number((dominantHz / (rpm / 60)).toFixed(1)) : undefined,
    centroidHz: Math.round(viktadSumma / (energiSumma || 1e-12)),
    band: band.map((v) => Number((v / bandSumma).toFixed(4))),
    samplefrekvens,
    varaktighetS: Number((kanal.length / samplefrekvens).toFixed(1)),
  };
}

/**
 * Särdragen som referensprofilerna byggs av och jämförs mot
 * (services/gemensam/ljudprofil.mjs). En handfull tal — det är ALLT
 * som lämnar webbläsaren; ljudet gör det aldrig.
 */
export function profilsardrag(resultat: Spektralresultat): Record<string, number> {
  const ut: Record<string, number> = { centroid: resultat.centroidHz };
  resultat.band.forEach((v, i) => {
    ut[`band${i}`] = v;
  });
  return ut;
}

// ---- Stoppregler -------------------------------------------------------
//
// Samma tanke som grindarna: en analys som inte håller ska SÄGA det,
// inte leverera ett svagt svar som ser starkt ut.

export interface Stoppregel {
  regel: "for_kort" | "for_lagt_snr" | "rpm_saknas" | "ej_reproducerad";
  allvar: "kritisk" | "varning";
  meddelande: string;
  atgard: string;
}

export function stoppregler(
  sekvens: Sekvens,
  resultat: Spektralresultat,
  rpm: number | undefined,
  reproducerad: boolean,
): Stoppregel[] {
  const regler: Stoppregel[] = [];
  if (resultat.varaktighetS < 5) {
    regler.push({
      regel: "for_kort",
      allvar: "kritisk",
      meddelande: "The recording is too short for a reliable analysis (at least 5 seconds required).",
      atgard: "Record again for the sequence's full duration.",
    });
  }
  if (resultat.snrDb < 10) {
    regler.push({
      regel: "for_lagt_snr",
      allvar: "kritisk",
      meddelande: "Background noise dominates the recording — no component stands out of the floor.",
      atgard: "Move to a quieter spot or use a directed microphone/probe (sequence F).",
    });
  }
  if (MATSEKVENSER[sekvens].rpm !== undefined && rpm === undefined) {
    regler.push({
      regel: "rpm_saknas",
      allvar: "varning",
      meddelande: "Engine speed was not stated for a fixed-rpm sequence — order analysis is not possible.",
      atgard: "Read the rpm from the instrument cluster or OBD and enter it.",
    });
  }
  if (!reproducerad) {
    regler.push({
      regel: "ej_reproducerad",
      allvar: "varning",
      meddelande: "The noise has not been marked as reproduced during the recording.",
      atgard: "A recording without the symptom is weak evidence — note the operating state and try again.",
    });
  }
  return regler;
}

// ---- Förslag -----------------------------------------------------------
//
// Ordningstalet (frekvens ÷ rotationsfrekvens) är den ärliga akustiska
// grunden: det säger VAD som roterar i takt med ljudet, inte vilken
// komponent som är trasig. Förslagen formuleras därefter, och nivån är
// aldrig hög — det avgör mätningen efteråt.

export interface Ljudforslag {
  text: string;
  niva: "medel" | "lag";
}

export function ljudforslag(resultat: Spektralresultat, reproducerad: boolean): Ljudforslag[] {
  const o = resultat.ordning;
  if (o === undefined || resultat.dominantHz === 0) return [];
  const niva: "medel" | "lag" = reproducerad && resultat.snrDb >= 15 ? "medel" : "lag";
  const forslag: Ljudforslag[] = [];
  if (o >= 0.8 && o <= 1.2) {
    forslag.push({
      text: `Dominant sound at order ${o} — once per crankshaft revolution. Acoustically consistent with an imbalance or a component rotating at crankshaft speed; verify by measurement before any conclusion.`,
      niva,
    });
  } else if (o >= 1.8 && o <= 2.2) {
    forslag.push({
      text: `Dominant sound at order ${o} — twice per revolution. In a four-cylinder engine this matches the firing frequency; uneven combustion is one acoustic explanation to test, not a conclusion.`,
      niva,
    });
  } else if (o > 2.5) {
    forslag.push({
      text: `Dominant sound at order ${o} — many times per revolution, consistent with belt-driven auxiliaries, pump vanes or bearing elements. Sequence F against candidate components separates them.`,
      niva: "lag",
    });
  } else {
    forslag.push({
      text: `Dominant sound at order ${o} — below crankshaft speed, consistent with a slower rotating part (wheel side, if recorded while driving). Needs a directed recording to localize.`,
      niva: "lag",
    });
  }
  return forslag;
}

// ---- Händelserna -------------------------------------------------------
//
// Mätningen blir schemats egna typer. Inga nya händelsetyper, inga
// casts — det som inte går genom granskaHändelse går inte in i loggen.

export function ljudhandelser(sekvens: Sekvens, resultat: Spektralresultat, stopp: Stoppregel[]): Handelse[] {
  const s = MATSEKVENSER[sekvens];
  const handelser: Handelse[] = [
    {
      typ: "matvarde",
      beskrivning: `Acoustic analysis, sequence ${sekvens} (${s.namn}) — dominant frequency`,
      varde: String(resultat.dominantHz),
      enhet: "Hz",
      kalla: "In-browser spectral analysis (FFT, averaged spectrum)",
    },
    {
      typ: "observation",
      text:
        `Acoustic recording, sequence ${sekvens} (${s.beskrivning}), ${resultat.varaktighetS} s. ` +
        `Peaks: ${resultat.toppar.map((t) => `${t.hz} Hz (${Math.round(t.rel * 100)}%)`).join(", ") || "none"}. ` +
        `SNR ${resultat.snrDb} dB.` +
        (resultat.ordning !== undefined ? ` Order ${resultat.ordning} at stated rpm.` : "") +
        (stopp.length > 0 ? ` Limitations: ${stopp.map((r) => r.meddelande).join(" ")}` : ""),
    },
  ];
  return handelser;
}

export function hypoteshandelse(forslag: Ljudforslag): Handelse {
  return { typ: "hypotes", text: forslag.text, niva: forslag.niva };
}
