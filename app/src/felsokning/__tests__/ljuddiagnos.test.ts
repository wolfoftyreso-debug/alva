// Ljuddiagnosens kontrakt.
//
// Analysen prövas mot syntetiska signaler med känt facit — en FFT som
// inte hittar en ren sinuston är ingen FFT. Händelserna prövas mot
// serverns schema med samma granskning som servern kör: det som inte
// passerar granskaHändelse går inte in i loggen, och då ska det falla
// HÄR, inte i drift. Kopians version castade fram en egen händelsetyp
// som servern hade avvisat — det felet kan inte återkomma osett.

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  MATSEKVENSER,
  analyseraKanal,
  fft,
  hypoteshandelse,
  ljudforslag,
  ljudhandelser,
  stoppregler,
} from "@/felsokning/ljuddiagnos";
import { granskaHändelse } from "../../../../services/plattform/handelser.mjs";

const FS = 48000;

function sinus(hz: number, sekunder: number, amplitud = 1): Float32Array {
  const n = Math.floor(FS * sekunder);
  const ut = new Float32Array(n);
  for (let i = 0; i < n; i++) ut[i] = amplitud * Math.sin((2 * Math.PI * hz * i) / FS);
  return ut;
}

describe("spektralanalysen hittar det som finns i signalen", () => {
  it("en ren ton hittas inom en bins upplösning", () => {
    const r = analyseraKanal(sinus(1000, 6), FS);
    expect(Math.abs(r.dominantHz - 1000)).toBeLessThanOrEqual(FS / 2048);
    expect(r.snrDb).toBeGreaterThan(20);
  });

  it("två toner ger två toppar med den starkaste som dominant", () => {
    const stark = sinus(120, 6);
    const svag = sinus(480, 6, 0.4);
    const blandning = new Float32Array(stark.length);
    for (let i = 0; i < blandning.length; i++) blandning[i] = stark[i] + svag[i];
    const r = analyseraKanal(blandning, FS);
    expect(Math.abs(r.dominantHz - 120)).toBeLessThanOrEqual(FS / 2048);
    expect(r.toppar.some((t) => Math.abs(t.hz - 480) <= FS / 2048)).toBe(true);
  });

  it("ordningen är frekvens genom rotationsfrekvens", () => {
    const r = analyseraKanal(sinus(120, 6), FS, 1800); // 1800 rpm = 30 varv/s
    expect(r.ordning).toBeCloseTo(4, 0);
  });

  it("fft:n är sin egen invers i energi — Parseval håller", () => {
    const n = 2048;
    const re = new Float64Array(n).map(() => Math.random() - 0.5);
    const im = new Float64Array(n);
    const tidsenergi = re.reduce((a, v) => a + v * v, 0);
    fft(re, im);
    let frekvensenergi = 0;
    for (let i = 0; i < n; i++) frekvensenergi += re[i] * re[i] + im[i] * im[i];
    expect(frekvensenergi / n).toBeCloseTo(tidsenergi, 6);
  });
});

describe("stoppreglerna säger ifrån", () => {
  const bra = analyseraKanal(sinus(500, 8), FS, 1500);

  it("för kort inspelning är kritisk", () => {
    const kort = analyseraKanal(sinus(500, 2), FS);
    const regler = stoppregler("A", kort, undefined, true);
    expect(regler.some((r) => r.regel === "for_kort" && r.allvar === "kritisk")).toBe(true);
  });

  it("fast varvtalssekvens utan rpm varnar", () => {
    expect(stoppregler("B", bra, undefined, true).some((r) => r.regel === "rpm_saknas")).toBe(true);
    expect(stoppregler("A", bra, undefined, true).some((r) => r.regel === "rpm_saknas")).toBe(false);
  });

  it("ej reproducerat ljud markeras — inspelning utan symtom är svag evidens", () => {
    expect(stoppregler("A", bra, 850, false).some((r) => r.regel === "ej_reproducerad")).toBe(true);
  });
});

describe("förslagen är hypoteser, aldrig konstateranden", () => {
  it("nivån är aldrig hög, och medel kräver reproducerat ljud med god SNR", () => {
    const r = analyseraKanal(sinus(50, 8), FS, 3000); // ordning 1
    for (const f of [...ljudforslag(r, true), ...ljudforslag(r, false)]) {
      expect(["medel", "lag"]).toContain(f.niva);
      expect(f.text.toLowerCase()).not.toContain("conclusion is");
    }
    expect(ljudforslag(r, false).every((f) => f.niva === "lag")).toBe(true);
  });

  it("utan varvtal ges inga förslag — ordningen är den akustiska grunden", () => {
    expect(ljudforslag(analyseraKanal(sinus(500, 8), FS), true)).toEqual([]);
  });
});

describe("händelserna passerar serverns egen granskning", () => {
  const resultat = analyseraKanal(sinus(240, 8), FS, 1440);

  it("mätvärde och observation går genom granskaHändelse", () => {
    for (const h of ljudhandelser("B", resultat, stoppregler("B", resultat, 1440, true))) {
      expect(granskaHändelse(h), h.typ).toBeNull();
    }
  });

  it("hypoteshändelsen likaså", () => {
    for (const f of ljudforslag(resultat, true)) {
      expect(granskaHändelse(hypoteshandelse(f))).toBeNull();
    }
  });
});

describe("panelen är monterad i ärendevyn", () => {
  it("ArendeSida renderar Ljudpanel med skicka", () => {
    const sida = readFileSync("src/pages/felsokning/ArendeSida.tsx", "utf8");
    expect(sida).toContain("<Ljudpanel skicka={skicka} />");
  });
});
