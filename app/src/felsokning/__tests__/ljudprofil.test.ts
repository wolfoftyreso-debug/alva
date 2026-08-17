// Referensprofilernas kontrakt.
//
// Matematiken prövas mot känt facit (Welford mot naiva formler), och
// ärlighetsreglerna låses: en profil under minsta antal inspelningar
// är ingen referens, en obrukbar jämförelse säger varför, och
// klientens och serverns kopior av modulen är identiska — samma regel
// som spärrlistorna.

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  MINSTA_INSPELNINGAR,
  fordonsnyckel,
  jamforMotProfil,
  nyProfil,
  spridning,
  uppdateraProfil,
} from "../../../../services/gemensam/ljudprofil.mjs";

const serie = [
  { centroid: 400, band0: 0.5 },
  { centroid: 410, band0: 0.52 },
  { centroid: 390, band0: 0.48 },
];

function byggd() {
  return serie.reduce((p, s) => uppdateraProfil(p, s), nyProfil());
}

describe("profilen räknar rätt", () => {
  it("medel och spridning stämmer mot de naiva formlerna", () => {
    const p = byggd();
    expect(p.antal).toBe(3);
    expect(p.medel.centroid).toBeCloseTo(400, 6);
    // Stickprovsstd för [400, 410, 390] är 10.
    expect(spridning(p, "centroid")).toBeCloseTo(10, 6);
  });

  it("uppdateringen muterar aldrig den gamla profilen", () => {
    const fore = byggd();
    const kopia = JSON.parse(JSON.stringify(fore));
    uppdateraProfil(fore, { centroid: 999, band0: 0.9 });
    expect(fore).toEqual(kopia);
  });
});

describe("ärlighetsreglerna", () => {
  it("under minsta antal inspelningar är referensen obrukbar — med orsak", () => {
    let p = nyProfil();
    for (let i = 0; i < MINSTA_INSPELNINGAR - 1; i++) p = uppdateraProfil(p, serie[0]);
    const svar = jamforMotProfil(p, serie[0]);
    expect(svar.anvandbar).toBe(false);
    expect(svar.orsak).toContain(String(MINSTA_INSPELNINGAR));
  });

  it("ingen profil alls är också ett ärligt svar", () => {
    expect(jamforMotProfil(null, serie[0]).anvandbar).toBe(false);
  });

  it("ett värde nära referensen bedöms inom, ett långt ifrån avvikande", () => {
    const p = byggd();
    const inom = jamforMotProfil(p, { centroid: 405, band0: 0.5 });
    expect(inom.anvandbar).toBe(true);
    expect(inom.bedomning).toBe("inom_referens");
    const utanfor = jamforMotProfil(p, { centroid: 700, band0: 0.9 });
    expect(utanfor.bedomning).toBe("avvikande");
    expect(utanfor.avvikande).toContain("centroid");
  });

  it("spridningsgolvet hindrar en överansträngd referens från att döma ut normal variation", () => {
    // Tre identiska inspelningar ger spridning 0 — utan golv vore ALLT avvikande.
    let p = nyProfil();
    for (let i = 0; i < 3; i++) p = uppdateraProfil(p, { centroid: 400 });
    const svar = jamforMotProfil(p, { centroid: 404 });
    expect(svar.bedomning).toBe("inom_referens");
  });
});

describe("fordonsnyckeln är förlåtande mot skrivsätt", () => {
  it("normaliserar skiftläge och blanksteg", () => {
    expect(fordonsnyckel("  Volvo   XC60 ")).toBe("volvo xc60");
    expect(fordonsnyckel("VOLVO XC60")).toBe(fordonsnyckel("volvo xc60"));
  });
});

describe("klientens och serverns modul är samma modul", () => {
  it("filerna är identiska — som spärrlistorna", () => {
    expect(readFileSync("../services/gemensam/ljudprofil.mjs", "utf8")).toBe(
      readFileSync("../services/plattform/ljudprofil.mjs", "utf8"),
    );
  });
});
