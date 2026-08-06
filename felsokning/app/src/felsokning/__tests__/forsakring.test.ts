// @vitest-environment node
// ALVA-SPEC-041 · Försäkringsregistret.
//
// Ett enda krav bär hela modulen: den får aldrig uttala sig som om den
// avgjorde frågan. Testerna nedan låser den egenskapen från flera håll,
// därför att den kan gå förlorad på flera sätt — ett fält som heter
// `tackt`, ett tomt `utanfor` som läses som ett nej, en föråldrad post
// som ser aktuell ut.
import { describe, expect, it } from "vitest";
import {
  AVGORANDE_VILLKOR,
  BOLAG,
  FORBEHALL,
  GILTIGHETSTID_DAGAR,
  bedom,
  foraldrad,
  spann,
} from "../../../../services/gemensam/forsakring.mjs";

describe("modulen avgör ingenting", () => {
  it("resultatet innehåller inget fält som liknar ett utfall", () => {
    const r = bedom({ alderAr: 3, mil: 4000 });
    for (const förbjudet of ["tackt", "täckt", "covered", "utfall", "beslut", "godkand", "avslag"]) {
      expect(Object.keys(r), förbjudet).not.toContain(förbjudet);
    }
  });

  it("varje svar pekar vidare till kundens eget försäkringsbrev", () => {
    expect(bedom({ alderAr: 1, mil: 100 }).nastaSteg).toMatch(/own policy/i);
    expect(bedom({}).nastaSteg).toMatch(/own policy/i);
  });

  it("ett fordon utanför samtliga noterade gränser får ändå inget nej", () => {
    // Registret kan vara ofullständigt, produkten en annan, och villkoren
    // vid tecknandet andra. Att svara nej här vore att påstå mer än vi vet.
    const r = bedom({ alderAr: 30, mil: 40_000 });
    expect(r.inom).toEqual([]);
    expect(r.utanfor.length).toBeGreaterThan(0);
    expect(r.kvarstaende.length).toBeGreaterThan(0);
    expect(r.nastaSteg).toBeTruthy();
  });

  it("förbehållet säger uttryckligen att ALVA inte avgör", () => {
    expect(FORBEHALL).toMatch(/does not decide/i);
    expect(FORBEHALL).toMatch(/the insurer decides/i);
  });
});

describe("frågorna väger tyngre än gränserna", () => {
  it("ålder och sträcka är två av sju villkor", () => {
    expect(AVGORANDE_VILLKOR.length).toBe(7);
    expect(AVGORANDE_VILLKOR.map((v) => v.id)).toContain("plotsligt");
    expect(AVGORANDE_VILLKOR.map((v) => v.id)).toContain("underhall");
  });

  it("de fem som inte är ålder och sträcka återstår alltid", () => {
    // Även för ett fordon som ligger välinom gränserna. Slitage och
    // eftersatt underhåll avgör oftare än åldern gör.
    const r = bedom({ alderAr: 1, mil: 500 });
    expect(r.kvarstaende.map((v) => v.id)).toEqual(["plotsligt", "komponent", "underhall", "orsak", "sjalvrisk"]);
  });

  it("varje villkor bär en fråga, inte bara en rubrik", () => {
    for (const v of AVGORANDE_VILLKOR) {
      expect(v.fraga, v.id).toMatch(/\?$/);
      expect(v.text, v.id).toBeTruthy();
    }
  });
});

describe("registret åldras synligt", () => {
  it("varje bolag har källa och avläsningsdatum", () => {
    for (const b of BOLAG) {
      expect(b.kalla, b.namn).toMatch(/^https:\/\//);
      expect(b.kontrollerad, b.namn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(b.produkter.length, b.namn).toBeGreaterThan(0);
    }
  });

  it("en gammal post märks som föråldrad i stället för att tigas ihjäl", () => {
    const gammal = { kontrollerad: "2020-01-01" };
    expect(foraldrad(gammal)).toBe(true);
    expect(foraldrad({ kontrollerad: "2026-08-01" }, new Date("2026-08-06"))).toBe(false);
    // Precis över gränsen.
    const nu = new Date("2026-08-06");
    const strax = new Date(nu.getTime() - (GILTIGHETSTID_DAGAR + 1) * 86_400_000);
    expect(foraldrad({ kontrollerad: strax.toISOString().slice(0, 10) }, nu)).toBe(true);
  });

  it("ett trasigt datum räknas som föråldrat, inte som giltigt", () => {
    expect(foraldrad({ kontrollerad: "" })).toBe(true);
    expect(foraldrad({ kontrollerad: "i somras" })).toBe(true);
  });

  it("föråldringen följer med i svaret", () => {
    const gammalt = [{ ...BOLAG[0], kontrollerad: "2020-01-01" }];
    const r = bedom({ alderAr: 1, mil: 100 }, gammalt);
    expect(r.inom.every((p) => p.foraldrad)).toBe(true);
  });
});

describe("gränserna läses som alternativa tak", () => {
  it("ett överskridet mått räcker för att hamna utanför", () => {
    // If: 10 år / 12 000 mil. Ett år gammal men 14 000 mil är utanför den
    // produkten trots att åldern håller.
    const r = bedom({ alderAr: 1, mil: 14_000, bolagId: "if" });
    expect(r.utanfor.some((p) => p.produkt === "Maskinskadeförsäkring")).toBe(true);
    // Men den större produkten går till 15 000 mil.
    expect(r.inom.some((p) => p.produkt === "Stor bilförsäkring")).toBe(true);
  });

  it("halva underlaget ger oklart, inte inom", () => {
    const r = bedom({ alderAr: 2, bolagId: "svedea" });
    expect(r.inom).toEqual([]);
    expect(r.oklart.length).toBeGreaterThan(0);
  });

  it("utan uppgifter alls är allting oklart", () => {
    const r = bedom({});
    expect(r.inom).toEqual([]);
    expect(r.utanfor).toEqual([]);
    expect(r.oklart.length).toBeGreaterThan(0);
  });

  it("samma bolag kan ha olika gränser för olika produkter", () => {
    // Poängen med att inte slå ihop bolaget till en siffra.
    const trygg = BOLAG.find((b) => b.id === "trygghansa");
    const gränser = new Set(trygg.produkter.map((p) => `${p.maxAlderAr}/${p.maxMil}`));
    expect(gränser.size).toBeGreaterThan(1);
  });
});

describe("spannet beskriver marknaden utan att peka ut ett bolag", () => {
  it("ger minsta och största noterade gräns", () => {
    const s = spann();
    expect(s.alderAr.minsta).toBeLessThan(s.alderAr.storsta);
    expect(s.mil.minsta).toBeLessThan(s.mil.storsta);
  });

  it("ett tomt register ger null i stället för ett påhittat spann", () => {
    expect(spann([])).toBeNull();
  });
});
