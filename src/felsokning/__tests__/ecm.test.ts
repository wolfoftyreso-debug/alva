import { describe, expect, it } from "vitest";
import type { Arende, Handelse } from "../domain";
import { nyLoggPost } from "../domain";
import { VIBRATION_METODIK } from "../metodik";
import { evidensNiva, grindGodkand, kvalitetsgrind } from "../ecm";
import { byggDemoArende } from "../demo";

function byggArende(handelser: Handelse[]): Arende {
  return {
    id: "ecm-test",
    nummer: 1,
    skapad: "2026-08-03T08:00:00Z",
    handelser: handelser.map((h) => nyLoggPost("Anna", h, "2026-08-03T08:00:00Z")),
  };
}

const OBJEKT: Handelse = {
  typ: "objekt_identifierat",
  objekt: { typ: "Personbil", identifierare: "ABC123", identifieringsmetod: "Regnr", beskrivning: "Volvo XC60" },
};

describe("evidensnivåer", () => {
  it("härleder nivån ur loggens faktiska innehåll", () => {
    expect(evidensNiva(byggArende([]))).toBe("E0");
    expect(evidensNiva(byggArende([{ typ: "observation", text: "x" }]))).toBe("E1");
    expect(evidensNiva(byggArende([{ typ: "foto", beskrivning: "x", dataUrl: "data:" }]))).toBe("E2");
    expect(evidensNiva(byggArende([{ typ: "matvarde", beskrivning: "U", varde: "12" }]))).toBe("E4");
    expect(evidensNiva(byggArende([{ typ: "arbetsorder_skannad", falt: [] }]))).toBe("E5");
    expect(
      evidensNiva(
        byggArende([
          { typ: "foto", beskrivning: "x", dataUrl: "data:" },
          { typ: "matvarde", beskrivning: "U", varde: "12" },
        ]),
      ),
    ).toBe("E6");
  });
});

describe("kvalitetsgrind före slutrapport", () => {
  it("utan evidens är grinden stängd — inga påståenden utan underlag", () => {
    const tomt = byggArende([]);
    expect(grindGodkand(tomt, VIBRATION_METODIK)).toBe(false);
    const rader = kvalitetsgrind(tomt, VIBRATION_METODIK);
    expect(rader.find((r) => r.id === "objekt")?.ok).toBe(false);
    expect(rader.find((r) => r.id === "kontroller")?.ok).toBe(false);
    expect(rader.find((r) => r.id === "kontroller")?.detalj).toContain("Evidens saknas");
  });

  it("ett dokumenterat undantag räknas som hanterat men flaggas med orsak", () => {
    // Alla kontroller får undantag med orsak — grinden öppnas, men
    // undantagen redovisas i detaljraden (aldrig som "utförd").
    const undantag: Handelse[] = [OBJEKT, { typ: "foto", beskrivning: "Översikt", dataUrl: "data:" }, { typ: "matvarde", beskrivning: "Lufttryck", varde: "2,4", enhet: "bar" }];
    for (const steg of VIBRATION_METODIK.steg) {
      for (const kontroll of steg.kontroller ?? []) {
        undantag.push({
          typ: "kontroll_utford",
          stegId: steg.id,
          kontrollId: kontroll.id,
          text: kontroll.text,
          undantag: "Kunden avböjde demontering",
        });
      }
    }
    const arende = byggArende(undantag);
    expect(grindGodkand(arende, VIBRATION_METODIK)).toBe(true);
    const rad = kvalitetsgrind(arende, VIBRATION_METODIK).find((r) => r.id === "kontroller");
    expect(rad?.ok).toBe(true);
    expect(rad?.detalj).toContain("Undantag med orsak");
    expect(rad?.detalj).toContain("Kunden avböjde demontering");
  });

  it("demoärendet blockeras tills alla kontroller har evidens eller undantag", () => {
    const demo = byggDemoArende(1);
    expect(grindGodkand(demo, VIBRATION_METODIK)).toBe(false);

    const komplett: Arende = {
      ...demo,
      handelser: [...demo.handelser],
    };
    const hanterade = new Set(
      demo.handelser
        .filter((p) => p.handelse.typ === "kontroll_utford")
        .map((p) => {
          const h = p.handelse;
          return h.typ === "kontroll_utford" ? `${h.stegId}/${h.kontrollId}` : "";
        }),
    );
    for (const steg of VIBRATION_METODIK.steg) {
      for (const kontroll of steg.kontroller ?? []) {
        if (!hanterade.has(`${steg.id}/${kontroll.id}`)) {
          komplett.handelser.push(
            nyLoggPost("Johan", {
              typ: "kontroll_utford",
              stegId: steg.id,
              kontrollId: kontroll.id,
              text: kontroll.text,
              undantag: "Utrustning saknas",
            }),
          );
        }
      }
    }
    expect(grindGodkand(komplett, VIBRATION_METODIK)).toBe(true);
    // Demoärendet har foto + mätvärden + flera källor → högsta evidensnivån.
    expect(evidensNiva(komplett)).toBe("E6");
  });
});
