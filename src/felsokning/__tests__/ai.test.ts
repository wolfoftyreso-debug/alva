import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { byggAnvandarPrompt, byggGranskningsPrompt, tolkaAiSvar } from "../ai";
import { VIBRATION_METODIK } from "../metodik";
import { brief } from "../projektioner";
import { byggDemoArende } from "../demo";

const ENDPOINT = readFileSync("supabase/functions/felsokning-ai/index.ts", "utf8");

describe("AI-orkestern", () => {
  it("plattformens endpoint routar uppgifter till olika modeller", () => {
    // Servern äger orkestern: modellval, effort, systemprompt och schema.
    for (const uppgift of ["handledning:", "granskning:", "sammanfattning:", "metodikval:"]) {
      expect(ENDPOINT).toContain(uppgift);
    }
    expect(ENDPOINT).toContain('"claude-sonnet-5"');
    expect(ENDPOINT).toContain('"claude-opus-5"');
    expect(ENDPOINT).toContain('"claude-haiku-4-5"');
    expect(ENDPOINT).toContain("ANTHROPIC_API_KEY");
  });

  it("endpointen kodar AI-reglerna i grundprompten", () => {
    expect(ENDPOINT).toContain("Hitta aldrig på fakta");
    expect(ENDPOINT).toContain("aldrig en hypotes som ett konstaterat fel");
    expect(ENDPOINT).toContain("KRÄVER verifiering");
    expect(ENDPOINT).toContain('"json_schema"');
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

  it("granskningsprompten innehåller hela arbetsloggen men ingen ny inmatning", () => {
    const arende = byggDemoArende(1);
    const prompt = byggGranskningsPrompt(arende, VIBRATION_METODIK);
    expect(prompt).toContain("Fullständig arbetslogg:");
    expect(prompt).toContain("Arbete överlämnat från Anna till Johan");
    expect(prompt).not.toContain("Teknikerns nya inmatning");
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
