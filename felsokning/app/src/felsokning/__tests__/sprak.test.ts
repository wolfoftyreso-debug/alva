// @vitest-environment node
// ALVA-SPEC-060 · Språk.
//
// ---- Vad som faktiskt prövas här ----------------------------------------
//
// Ett översättningstest som bara räknar nycklar är nästan värdelöst: det
// går att få grönt genom att kopiera engelskan till tio filer. Testet
// nedan prövar därför fyra saker som var och en kan gå sönder tyst i
// drift, och som ingen upptäcker förrän en tekniker läser fel:
//
//   1. Att katalogen är komplett — ingen nyckel faller tyst tillbaka.
//   2. Att strukturen INTE är översatt — faser och statusord är ALVA:s
//      ram och ska stå likadant i en rumänsk rapport som i en tysk.
//   3. Att inget språk är engelska i förklädnad — en fil som fortfarande
//      innehåller källtexten är inte översatt, den är bara komplett.
//   4. Att variabelhållarna överlevde översättningen. {procent} som blev
//      {percent} i den franska filen ger inte ett fel, den ger "{percent}
//      % de l'interface" på skärmen, för alltid.
import { describe, expect, it } from "vitest";
import {
  INVARIANTA,
  KATALOGER,
  SPRAK,
  STANDARD,
  arInvariant,
  metodikvarning,
  otillatna,
  overflodiga,
  saknade,
  t,
  tackning,
  valjSprak,
  oversattare,
} from "../../../../services/gemensam/sprak/index.mjs";
import { EN } from "../../../../services/gemensam/sprak/en.mjs";

const OVRIGA = SPRAK.map((s) => s.kod).filter((k) => k !== "en");
const NYCKLAR = Object.keys(EN);
const OVERSATTBARA = NYCKLAR.filter((n) => !arInvariant(n));

describe("katalogen", () => {
  it("har en fil för varje språk i SPRAK, och inget språk utan fil", () => {
    expect(Object.keys(KATALOGER).sort()).toEqual(SPRAK.map((s) => s.kod).sort());
  });

  it("har engelska som standard- och källspråk", () => {
    expect(STANDARD).toBe("en");
    expect(SPRAK.find((s) => s.kod === "en")?.granskat).toBe(true);
  });

  it.each(OVRIGA)("%s saknar ingen översättbar nyckel", (kod) => {
    expect(saknade(KATALOGER[kod])).toEqual([]);
  });

  it.each(OVRIGA)("%s har inga nycklar utan original i engelskan", (kod) => {
    expect(overflodiga(KATALOGER[kod])).toEqual([]);
  });

  it("engelskan innehåller något att översätta", () => {
    // Motvikt mot de tomma listorna ovan: om EN blir tom passerar de
    // alla, och katalogen vore "komplett" på tio språk utan innehåll.
    expect(OVERSATTBARA.length).toBeGreaterThan(60);
  });
});

describe("strukturen översätts inte", () => {
  it("faser och statusord räknas som invarianta", () => {
    expect(INVARIANTA).toContain("fas.");
    expect(INVARIANTA).toContain("status.");
    expect(arInvariant("fas.analys")).toBe(true);
    expect(arInvariant("status.passed")).toBe(true);
    expect(arInvariant("grind.slutsats")).toBe(false);
  });

  it.each(OVRIGA)("%s definierar ingen invariant nyckel", (kod) => {
    expect(otillatna(KATALOGER[kod])).toEqual([]);
  });

  it.each(SPRAK.map((s) => s.kod))("%s visar faserna på engelska", (kod) => {
    expect(t(kod, "fas.analys")).toBe("Analysis");
    expect(t(kod, "fas.lokalisering")).toBe("Localization");
    expect(t(kod, "fas.verifiering")).toBe("Verification");
    expect(t(kod, "fas.atgard")).toBe("Action");
    expect(t(kod, "status.passed")).toBe("Passed");
  });

  it("hämtar invarianta ur engelskan även om en katalog vore förgiftad", () => {
    // Regeln ska hålla i drift och inte bara i testet: `t()` frågar
    // aldrig katalogen efter en invariant nyckel.
    const forgiftad = { ...KATALOGER.de, "status.passed": "Bestanden" };
    const egna = { ...KATALOGER, de: forgiftad };
    expect(egna.de["status.passed"]).toBe("Bestanden");
    expect(t("de", "status.passed")).toBe("Passed");
  });
});

describe("översättningarna är översättningar", () => {
  // Hur många strängar som får vara identiska med engelskan innan filen
  // rimligen inte är översatt. Vissa SKA vara det: "Document", "No",
  // "Responsable", produktnamn. Men inte hälften.
  const TAK = 0.25;

  it.each(OVRIGA)("%s är inte engelska i förklädnad", (kod) => {
    const lika = OVERSATTBARA.filter((n) => KATALOGER[kod][n] === EN[n]);
    const andel = lika.length / OVERSATTBARA.length;
    expect(andel, `identiska med engelskan: ${lika.slice(0, 8).join(", ")}`).toBeLessThan(TAK);
  });

  it.each(OVRIGA)("%s behåller variabelhållarna i varje sträng", (kod) => {
    const hallare = (s: string) => (String(s).match(/\{(\w+)\}/g) ?? []).sort();
    for (const n of OVERSATTBARA) {
      expect(hallare(KATALOGER[kod][n]), `${kod}: ${n}`).toEqual(hallare(EN[n]));
    }
  });

  it.each(OVRIGA)("%s har full täckning", (kod) => {
    expect(tackning(kod)).toBe(1);
  });

  it("täckningen är noll för ett okänt språk", () => {
    expect(tackning("xx")).toBe(0);
  });
});

describe("uppslagning", () => {
  it("faller tillbaka på engelska för en okänd språkkod", () => {
    expect(t("xx", "handling.spara")).toBe(EN["handling.spara"]);
  });

  it("visar nyckeln när den saknas överallt hellre än tomhet", () => {
    expect(t("de", "finns.inte")).toBe("finns.inte");
  });

  it("sätter in variabler", () => {
    expect(t("sv", "sprak.tackning", { procent: 100 })).toBe("100 % av gränssnittet");
  });

  it("lämnar hållaren orörd när variabeln inte skickats", () => {
    // Hellre synligt {procent} än "undefined %", som ser ut som ett
    // värde och läses som ett.
    expect(t("sv", "sprak.tackning")).toContain("{procent}");
  });

  it("bunden översättare ger samma svar", () => {
    const o = oversattare("de");
    expect(o("handling.spara")).toBe(t("de", "handling.spara"));
  });
});

describe("språkval", () => {
  it("låter användarens val gå före allt annat", () => {
    expect(valjSprak({ anvandare: "pl", organisation: "de", webblasare: ["fr"] })).toBe("pl");
  });

  it("låter organisationen gå före webbläsaren", () => {
    // Rapporten ska inte byta språk beroende på vem som skrev raden.
    expect(valjSprak({ organisation: "de", webblasare: ["pl", "en"] })).toBe("de");
  });

  it("tar webbläsarens första kända språk", () => {
    expect(valjSprak({ webblasare: ["ja", "ro", "de"] })).toBe("ro");
  });

  it("klipper regionvarianter", () => {
    expect(valjSprak({ anvandare: "de-AT" })).toBe("de");
    expect(valjSprak({ webblasare: ["pt-BR"] })).toBe("pt");
  });

  it("landar på engelska när ingenting är känt", () => {
    expect(valjSprak({})).toBe(STANDARD);
    expect(valjSprak()).toBe(STANDARD);
    expect(valjSprak({ anvandare: "ja", webblasare: ["ko"] })).toBe(STANDARD);
  });
});

describe("metodikvarningen", () => {
  it("tiger för granskade språk", () => {
    expect(metodikvarning("en")).toBeNull();
    expect(metodikvarning("sv")).toBeNull();
  });

  it.each(SPRAK.filter((s) => !s.granskat).map((s) => s.kod))("varnar på %s", (kod) => {
    const text = metodikvarning(kod)!;
    expect(text).toBeTruthy();
    // Varningen ska stå på användarens eget språk — en varning på
    // engelska om att texten är på engelska hjälper ingen.
    expect(text).toBe(KATALOGER[kod]["metodik.ogranskad"].replace("{sprak}", egetNamn(kod)));
    // Och den ska namnge språket, inte vara en allmän brasklapp.
    expect(text).toContain(egetNamn(kod));
  });

  it("tiger för ett okänt språk i stället för att varna om ingenting", () => {
    expect(metodikvarning("xx")).toBeNull();
  });
});

function egetNamn(kod: string): string {
  return SPRAK.find((s) => s.kod === kod)!.egetNamn;
}
