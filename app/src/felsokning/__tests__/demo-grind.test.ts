// @vitest-environment node
// Demonstrationsärendet är produktens skyltfönster. Klarar det inte
// grinden går det inte att stänga på skärmen heller — och ALVA-RULE-210
// gjorde kravet strängare, så demot måste följa regeln som alla andra.
import { describe, expect, it } from "vitest";
import { byggDemoArende } from "../demo";
import { grinda } from "../../../../services/gemensam/grind.mjs";
import { ALLA_METODIKER } from "../../../../services/gemensam/metodiker.mjs";

describe("demonstrationsärendet", () => {
  // Demot är med avsikt ett PÅGÅENDE ärende — utgående mätarställning och
  // slutsats är kvar att göra, och det är just dem användaren fyller i.
  // Det som måste stämma är att bevisregeln inte är ett av hindren: den
  // ska vara uppfylld av loggen så långt den är skriven.
  it("hindras inte av bevisregeln — anmärkningen är redan dokumenterad", () => {
    const arende = byggDemoArende(1);
    const handelser = arende.handelser.map((p) => p.handelse);
    const metodik = ALLA_METODIKER.find((m: { id: string }) => m.id === arende.metodikId);
    const ids = grinda(handelser, metodik, "en").map((h: { id: string }) => h.id);
    expect(ids).not.toContain("anmarkning_bevis");
    expect(ids).not.toContain("anmarkning_saknas");
  });

  it("bär en anmärkning med bild bunden till samma kontroll", () => {
    const h = byggDemoArende(1).handelser.map((p) => p.handelse);
    const fynd = h.filter((x: { typ: string; anmarkning?: boolean }) => x.typ === "kontroll_utford" && x.anmarkning === true);
    expect(fynd.length).toBeGreaterThan(0);
    for (const f of fynd as { stegId: string; kontrollId: string }[]) {
      const bild = h.find(
        (x: { typ: string; stegId?: string; kontrollId?: string }) =>
          (x.typ === "foto" || x.typ === "video") && x.stegId === f.stegId && x.kontrollId === f.kontrollId,
      );
      expect(bild, `${f.stegId}/${f.kontrollId}`).toBeTruthy();
    }
  });
});
