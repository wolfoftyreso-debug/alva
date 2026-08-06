import { describe, expect, it } from "vitest";
import { byggDemoArende } from "../demo";
import { VIBRATION_METODIK, valjMetodik } from "../metodik";
import { brief, felbeskrivning } from "../projektioner";

describe("demoärendet", () => {
  const arende = byggDemoArende(7);

  it("väljer vibrationsmetodiken och har ett rikt underlag", () => {
    expect(valjMetodik(felbeskrivning(arende)!).id).toBe("vibration");
    const b = brief(arende, VIBRATION_METODIK);
    expect(b.objekt?.identifierare).toBe("ABC123");
    expect(b.utfordaKontroller.length).toBeGreaterThanOrEqual(10);
    expect(b.observationer.length).toBeGreaterThanOrEqual(4);
    expect(b.hypoteser).toHaveLength(1);
    expect(b.avslutat).toBe(false);
  });

  it("lämnar kontroller kvar så att guiden kan fortsätta i demon", () => {
    const b = brief(arende, VIBRATION_METODIK);
    expect(b.ejKontrollerat).toContain("Check radial and lateral runout");
    expect(b.ejKontrollerat).toContain("Change when cornering");
    expect(b.rekommenderatNastaSteg.length).toBeGreaterThan(0);
  });

  it("har cirka 1,5 timmars loggad arbetstid och en överlämning", () => {
    const b = brief(arende, VIBRATION_METODIK);
    expect(b.totalArbetstid).toBe("1 tim 35 min");
    expect(arende.handelser.some((p) => p.handelse.typ === "overlamning")).toBe(true);
    expect(new Set(arende.handelser.map((p) => p.anvandare)).size).toBeGreaterThanOrEqual(2);
  });

  it("händelserna ligger i tidsordning med demoärendets id-format", () => {
    const tider = arende.handelser.map((p) => p.tidpunkt);
    expect([...tider].sort()).toEqual(tider);
    expect(arende.id).toMatch(/^arende-demo-/);
    expect(arende.delningskod).toBeTruthy();
  });
});
