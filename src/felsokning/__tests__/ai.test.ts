import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { AI_MODELL, byggAnvandarPrompt, tolkaAiSvar } from "../ai";
import { VIBRATION_METODIK } from "../metodik";
import { brief } from "../projektioner";
import { byggDemoArende } from "../demo";

describe("AI-motorn", () => {
  it("använder Claude Opus 5", () => {
    expect(AI_MODELL).toBe("claude-opus-5");
  });

  it("plattformens AI-endpoint äger systemprompten och kodar AI-reglerna", () => {
    // AI:n drivs av plattformen: systemprompt, modell och schema ligger i
    // backend (edge-funktionen), inte i klienten.
    const endpoint = readFileSync("supabase/functions/felsokning-ai/index.ts", "utf8");
    expect(endpoint).toContain('const AI_MODELL = "claude-opus-5"');
    expect(endpoint).toContain("Hitta aldrig på fakta");
    expect(endpoint).toContain("aldrig en hypotes som ett konstaterat fel");
    expect(endpoint).toContain("KRÄVER verifiering");
    expect(endpoint).toContain("ANTHROPIC_API_KEY");
    expect(endpoint).toContain('"json_schema"');
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
