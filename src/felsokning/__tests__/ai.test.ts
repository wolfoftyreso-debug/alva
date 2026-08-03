import { describe, expect, it } from "vitest";
import { AI_MODELL, SYSTEM_PROMPT, byggAnvandarPrompt, tolkaAiSvar } from "../ai";
import { VIBRATION_METODIK } from "../metodik";
import { brief } from "../projektioner";
import { byggDemoArende } from "../demo";

describe("AI-motorn", () => {
  it("använder Claude Opus 5", () => {
    expect(AI_MODELL).toBe("claude-opus-5");
  });

  it("systemprompten kodar AI-reglerna", () => {
    expect(SYSTEM_PROMPT).toContain("Hitta aldrig på fakta");
    expect(SYSTEM_PROMPT).toContain("aldrig en hypotes som ett konstaterat fel");
    expect(SYSTEM_PROMPT).toContain("KRÄVER verifiering");
    expect(SYSTEM_PROMPT).toContain("kortfattat");
  });

  it("användarprompten byggs ur ärendebriefen och den nya inmatningen", () => {
    const arende = byggDemoArende(1);
    const prompt = byggAnvandarPrompt(
      brief(arende, VIBRATION_METODIK),
      VIBRATION_METODIK.namn,
      "Reläet klickar inte.",
    );
    expect(prompt).toContain("Volvo XC60 D4 2019");
    expect(prompt).toContain("Felbeskrivning:");
    expect(prompt).toContain("Kontrollera lufttryck");
    expect(prompt).toContain("Ej kontrollerat enligt metodiken:");
    expect(prompt).toContain("Teknikerns nya inmatning: Reläet klickar inte.");
  });

  it("tolkar giltiga svar och kastar på ogiltiga", () => {
    const svar = tolkaAiSvar({
      rader: [
        { typ: "verifierat", text: "Matningsspänning finns på stift 14." },
        { typ: "okand_typ", text: "ska filtreras bort" },
      ],
      nastaSteg: "Kontrollera jordanslutningen på stift 7.",
    });
    expect(svar.rader).toHaveLength(1);
    expect(svar.rader[0].typ).toBe("verifierat");
    expect(svar.nastaSteg).toContain("stift 7");

    expect(() => tolkaAiSvar({ rader: "inte en lista", nastaSteg: "x" })).toThrow();
    expect(() => tolkaAiSvar(null)).toThrow();
  });
});
