// @vitest-environment node
// ALVA-SPEC-040 · Garantiregimerna.
//
// Testerna handlar mindre om att siffrorna är rätt — det avgörs av
// källorna, inte av en assertion — än om två egenskaper som avgör om
// modulen är farlig att lita på:
//
//   1. Att varje lagstadgad regel bär en källa. En regel utan källa är ett
//      påstående, och ett påstående om lag är värre än inget påstående.
//   2. Att bedömningen aldrig säger "utanför garanti" på ett underlag som
//      inte räcker. Det är det enda felet i den här modulen som kostar
//      kunden pengar.
import { describe, expect, it } from "vitest";
import {
  FORBEHALL,
  JURISDIKTIONER,
  KONTROLLERAD,
  REGIMER,
  mojligenGallande,
  regimerFor,
  skyddadReparation,
} from "../../../../services/gemensam/garantier.mjs";

describe("varje regel går att spåra till sin källa", () => {
  it("alla lagstadgade regler har källa och länk", () => {
    for (const r of REGIMER.filter((x) => x.grund === "lag")) {
      expect(r.källa, r.id).toBeTruthy();
      expect(r.källänk, r.id).toMatch(/^https:\/\//);
    }
  });

  it("varje regel är antingen lag eller avtal, aldrig något oklart däremellan", () => {
    for (const r of REGIMER) expect(["lag", "avtal"], r.id).toContain(r.grund);
  });

  it("kontrolldatumet finns och står i förbehållet", () => {
    expect(KONTROLLERAD).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(FORBEHALL).toContain(KONTROLLERAD);
    expect(FORBEHALL).toMatch(/not legal advice/i);
  });
});

describe("skiljelinjen mellan lagstadgat och avtalat hålls", () => {
  // Den här förväxlingen är modulens hela existensberättigande. Skulle
  // rosten någon gång märkas som lagstadgad vore modulen värre än ingen.
  it("rostskydd, lack och nybil är AVTALADE — inget av dem har lagstöd", () => {
    for (const id of ["AVTAL-ROST", "AVTAL-LACK", "AVTAL-NYBIL", "AVTAL-DRIVLINA"]) {
      expect(REGIMER.find((r) => r.id === id).grund, id).toBe("avtal");
    }
  });

  it("avgasgarantin är lagstadgad i bägge jurisdiktionerna", () => {
    expect(REGIMER.find((r) => r.id === "US-AVGAS-PRESTANDA").grund).toBe("lag");
    expect(REGIMER.find((r) => r.id === "US-AVGAS-HUVUDDELAR").grund).toBe("lag");
    expect(REGIMER.find((r) => r.id === "EU-AVGAS-EURO6").grund).toBe("lag");
  });

  it("avtalade regimer utger sig inte för att ha en lagkälla", () => {
    for (const r of REGIMER.filter((x) => x.grund === "avtal")) {
      expect(r.källänk, r.id).toBeNull();
      expect(r.källa, r.id).toMatch(/manufacturer/i);
    }
  });

  it("konsumentköpet pekar på säljaren, inte tillverkaren", () => {
    // Det vanligaste felet i verkstadsledet: kunden skickas till fel part.
    const r = REGIMER.find((x) => x.id === "EU-KONFORMITET");
    expect(r.bärare).toBe("säljaren");
    expect(r.anmärkning).toMatch(/SELLER, not the manufacturer/);
  });
});

describe("jurisdiktionen avgör vad som visas", () => {
  it("Kalifornien ärver de federala reglerna", () => {
    const ids = regimerFor("US-CA").map((r) => r.id);
    // Magnuson–Moss är federal och måste följa med — den är den regel
    // verkstaden behöver mest, och att tappa den vore tyst skada.
    expect(ids).toContain("US-MMWA");
    expect(ids).toContain("US-CA-AVGAS");
  });

  it("EU visar inte amerikanska regler och tvärtom", () => {
    expect(regimerFor("EU").map((r) => r.id)).not.toContain("US-MMWA");
    expect(regimerFor("US").map((r) => r.id)).not.toContain("EU-MVBER");
  });

  it("avtalade kategorier visas i bägge", () => {
    for (const j of ["EU", "US"]) {
      expect(regimerFor(j).map((r) => r.id)).toContain("AVTAL-ROST");
    }
  });

  it("varje jurisdiktion i listan ger minst en regim", () => {
    for (const j of JURISDIKTIONER) expect(regimerFor(j.id).length, j.id).toBeGreaterThan(0);
  });
});

describe("skyddet för oberoende reparation lyfts fram", () => {
  it("EU pekar på MVBER och USA på Magnuson–Moss", () => {
    expect(skyddadReparation("EU").id).toBe("EU-MVBER");
    expect(skyddadReparation("US").id).toBe("US-MMWA");
    expect(skyddadReparation("US-CA").id).toBe("US-MMWA");
  });

  it("bägge säger att arbete här inte upphäver garantin", () => {
    expect(skyddadReparation("EU").text).toMatch(/independent workshop/i);
    expect(skyddadReparation("US").text).toMatch(/may not condition/i);
  });
});

describe("bedömningen påstår aldrig mer än underlaget bär", () => {
  it("ett nytt fordon ligger inom de federala avgasreglerna", () => {
    const { inom } = mojligenGallande("US", { alderAr: 1, miles: 12_000 });
    expect(inom.map((r) => r.id)).toContain("US-AVGAS-PRESTANDA");
    expect(inom.map((r) => r.id)).toContain("US-AVGAS-HUVUDDELAR");
  });

  it("perioden är 'whichever comes first' — ett överskridet mått räcker", () => {
    // Två år gammal men 40 000 miles: prestandagarantin är passerad på
    // sträckan trots att åldern håller.
    const { utanfor } = mojligenGallande("US", { alderAr: 2, miles: 40_000 });
    expect(utanfor.map((r) => r.id)).toContain("US-AVGAS-PRESTANDA");
  });

  it("okänd ålder ger OKLART, aldrig utanför", () => {
    // Det enda felet här som kostar kunden pengar är att påstå att en
    // garanti gått ut när underlaget inte räcker.
    const { utanfor, oklart } = mojligenGallande("US", {});
    expect(utanfor).toEqual([]);
    expect(oklart.map((r) => r.id)).toContain("US-AVGAS-HUVUDDELAR");
  });

  it("bara mätarställning utan ålder räcker inte för att avfärda", () => {
    const { utanfor, oklart } = mojligenGallande("US", { miles: 10_000 });
    expect(utanfor).toEqual([]);
    expect(oklart.length).toBeGreaterThan(0);
  });

  it("men en passerad sträcka avfärdar även utan ålder", () => {
    // Här RÄCKER underlaget: 200 000 miles är över varje federal gräns,
    // oavsett hur gammalt fordonet är.
    const { utanfor } = mojligenGallande("US", { miles: 200_000 });
    expect(utanfor.map((r) => r.id)).toContain("US-AVGAS-HUVUDDELAR");
  });

  it("kilometer och miles räknas om åt bägge håll", () => {
    // 100 000 miles är ~160 934 km, alltså över Euro 7:s 160 000 km.
    const { utanfor } = mojligenGallande("EU", { alderAr: 2, miles: 100_000 });
    expect(utanfor.map((r) => r.id)).toContain("EU-AVGAS-EURO7");
    // Och 50 000 km är under.
    const { inom } = mojligenGallande("EU", { alderAr: 2, km: 50_000 });
    expect(inom.map((r) => r.id)).toContain("EU-AVGAS-EURO7");
  });

  it("regler utan tidsgräns gäller alltid, även utan uppgifter om fordonet", () => {
    expect(mojligenGallande("EU", {}).inom.map((r) => r.id)).toContain("EU-MVBER");
    expect(mojligenGallande("US", {}).inom.map((r) => r.id)).toContain("US-MMWA");
  });

  it("avtalade regimer bedöms inte alls — deras villkor känner vi inte", () => {
    const allt = mojligenGallande("EU", { alderAr: 1, km: 1000 });
    const ids = [...allt.inom, ...allt.utanfor, ...allt.oklart].map((r) => r.id);
    expect(ids).not.toContain("AVTAL-ROST");
    expect(ids).not.toContain("AVTAL-NYBIL");
  });
});
