// @vitest-environment node
// handelseRubrik måste vara TOTAL och ALDRIG kasta.
//
// En skadad post — en händelse vars fält saknas eller har fel form —
// fick förr funktionen att antingen returnera undefined (tom rad i
// arbetsloggen, "anna: undefined" i AI-prompten) eller kasta (vit skärm
// i kundens delningsvy, som saknade felgräns). Här låses att varje
// domänens händelsetyp ger en icke-tom sträng, att slutsatsen inte
// längre försvinner, och att en missformad post ger en märkt rad i
// stället för ett undantag.

import { describe, expect, it } from "vitest";
import { handelseRubrik } from "@/felsokning/domain";

const post = (handelse: unknown) => ({ id: "x", tidpunkt: "2026-01-01T10:00:00Z", anvandare: "anna", handelse }) as never;

describe("handelseRubrik är total", () => {
  it("slutsatshändelsen renderas — den försvinner inte längre ur loggen", () => {
    const r = handelseRubrik(post({ typ: "slutsats", motivering: "Sliten bromsskiva bekräftad", uteslutet: "—", kvarstaende: "inget" }));
    expect(r).toContain("Conclusion");
    expect(r).toContain("Sliten bromsskiva");
  });

  it("en slutsats utan fastställd orsak märks som sådan", () => {
    expect(handelseRubrik(post({ typ: "slutsats", motivering: "Kunde inte återskapas", uteslutet: "x", kvarstaende: "y", orsakFastställd: false }))).toContain("cause not established");
  });

  it("en okänd händelsetyp ger en märkt rad, aldrig undefined", () => {
    const r = handelseRubrik(post({ typ: "framtida_typ_som_inte_finns" }));
    expect(typeof r).toBe("string");
    expect(r.length).toBeGreaterThan(0);
    expect(r).not.toBe("undefined");
  });

  it("skadade poster (saknade nästlade fält) kastar aldrig — de blir en märkt rad", () => {
    const skadade = [
      { typ: "objekt_identifierat" }, // saknar objekt
      { typ: "arbetsorder_skannad" }, // saknar falt
      { typ: "felorsak", sakerhet: "hog", avvikelse: "x" }, // saknar orsaker
      { typ: "ai_svar", nastaSteg: "n" }, // saknar rader
      null,
      { typ: "objekt_identifierat", objekt: null },
    ];
    for (const h of skadade) {
      expect(() => handelseRubrik(post(h)), JSON.stringify(h)).not.toThrow();
      expect(typeof handelseRubrik(post(h))).toBe("string");
    }
  });
});
