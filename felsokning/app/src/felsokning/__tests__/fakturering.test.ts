// @vitest-environment node
// ALVA-PROC-0001 · Fakturan härleds, den skrivs inte in.
//
// Testerna nedan handlar mindre om aritmetik än om två egenskaper som
// avgör om en faktura går att granska två år senare: att varje rad bär
// sitt underlag, och att en utfärdad faktura aldrig ändras.
import { describe, expect, it } from "vitest";
import {
  PRISLISTA,
  fakturabeteckning,
  fakturarader,
  fakturera,
  formateraBelopp,
  kreditera,
  manaderMellan,
} from "../../../../services/gemensam/fakturering.mjs";

const ORG = { namn: "Verkstad Nord AB", moduler: ["forsakringsrapportering"] };
const PERIOD = { fran: "2026-01-01", till: "2026-12-31" };

describe("perioden räknas i hela månader", () => {
  it("ett kalenderår är tolv månader", () => {
    expect(manaderMellan("2026-01-01", "2026-12-31")).toBe(12);
  });

  it("en enda månad är en, inte noll", () => {
    expect(manaderMellan("2026-03-01", "2026-03-31")).toBe(1);
  });

  it("en bakvänd eller trasig period ger noll i stället för ett negativt belopp", () => {
    expect(manaderMellan("2026-12-31", "2026-01-01")).toBe(0);
    expect(manaderMellan("inte ett datum", "2026-01-01")).toBe(0);
  });
});

describe("raderna bär sitt underlag", () => {
  it("varje rad säger var antalet kommer ifrån", () => {
    const rader = fakturarader(ORG, 12, PERIOD);
    for (const r of rader) {
      expect(r.underlag, r.benamning).toBeTruthy();
      expect(r.belopp).toBe(r.antal * r.apris);
    }
  });

  it("användarraden räknar aktiva konton gånger månader", () => {
    const rad = fakturarader(ORG, 12, PERIOD).find((r) => r.benamning === "User licenses");
    expect(rad.antal).toBe(12 * 12);
    expect(rad.underlag).toContain("12 active users");
    expect(rad.underlag).toContain("12 months");
  });

  it("en organisation utan aktiva användare får ingen användarrad — inte en nollrad", () => {
    const rader = fakturarader(ORG, 0, PERIOD);
    expect(rader.some((r) => r.benamning === "User licenses")).toBe(false);
  });

  it("bara påslagna moduler faktureras, och okända moduler tigs ihjäl", () => {
    const rader = fakturarader({ ...ORG, moduler: ["forsakringsrapportering", "hittepa"] }, 1, PERIOD);
    expect(rader.filter((r) => r.enhet === "module/year")).toHaveLength(1);
  });
});

describe("summan går ihop", () => {
  const f = fakturera({ nummer: 1, org: ORG, aktiva: 12, period: PERIOD, utfardad: "2026-01-15" });

  it("nettot är summan av raderna", () => {
    expect(f.netto).toBe(f.rader.reduce((s, r) => s + r.belopp, 0));
  });

  it("momsen räknas på nettot, inte per rad", () => {
    // Radvis avrundning ger ören som inte stämmer mot totalen.
    expect(f.moms).toBe(Math.round(f.netto * PRISLISTA.momssats));
    expect(f.totalt).toBe(f.netto + f.moms);
  });

  it("förfallodagen följer betalningsvillkoret", () => {
    expect(f.forfaller).toBe("2026-02-14"); // 15 jan + 30 dagar
  });

  it("beteckningen följer nomenklaturen", () => {
    expect(f.beteckning).toBe("ALVA-INV-0001");
    expect(fakturabeteckning(1234)).toBe("ALVA-INV-1234");
  });

  it("fakturan säger uttryckligen att ingen onlinebetalning tas emot", () => {
    expect(f.betalningssatt).toMatch(/No online payment/i);
  });
});

describe("en utfärdad faktura ändras aldrig", () => {
  const f = fakturera({ nummer: 1, org: ORG, aktiva: 12, period: PERIOD, utfardad: "2026-01-15" });

  it("krediteringen är en egen post som pekar tillbaka", () => {
    const { kredit } = kreditera(f, {
      nummer: 2,
      utfardad: "2026-02-01",
      orsak: "Antalet aktiva användare var felaktigt vid utfärdandet.",
    });
    expect(kredit.krediterar).toBe(f.beteckning);
    expect(kredit.beteckning).toBe("ALVA-INV-0002");
    expect(kredit.totalt).toBe(-f.totalt);
    // Originalet är orört.
    expect(f.status).toBe("utfardad");
    expect(f.totalt).toBeGreaterThan(0);
  });

  it("en kreditering utan skäl avvisas", () => {
    expect(kreditera(f, { nummer: 2, utfardad: "2026-02-01", orsak: "" }).fel).toBeTruthy();
    expect(kreditera(f, { nummer: 2, utfardad: "2026-02-01", orsak: "fel" }).fel).toBeTruthy();
  });
});

describe("belopp skrivs så att de går att jämföra", () => {
  it("två decimaler och hårt mellanslag som tusentalsavskiljare", () => {
    // Hårt mellanslag, uttryckligen: ett belopp får inte brytas över en
    // radbrytning, och skillnaden mot ett vanligt mellanslag ska synas i
    // testet i stället för att ligga osynlig i en sträng.
    const NBSP = "\u00A0";
    expect(formateraBelopp(2_400_000)).toBe(`24${NBSP}000,00 SEK`);
    expect(formateraBelopp(39_000)).toBe("390,00 SEK");
    expect(formateraBelopp(2_400_000)).not.toContain(" 000");
  });

  it("negativa belopp märks med minustecken, inte parentes", () => {
    expect(formateraBelopp(-2_400_000)).toMatch(/^−/);
  });

  it("räknar i öre — inga flyttalsfel i totalen", () => {
    const f = fakturera({ nummer: 1, org: ORG, aktiva: 7, period: PERIOD, utfardad: "2026-01-15" });
    expect(Number.isInteger(f.netto)).toBe(true);
    expect(Number.isInteger(f.moms)).toBe(true);
    expect(Number.isInteger(f.totalt)).toBe(true);
  });
});
