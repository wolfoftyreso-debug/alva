import { beforeEach, describe, expect, it } from "vitest";
import {
  ALLA_IDENTIFIERINGSMETODER,
  ALLA_OBJEKTTYPER,
  lastaInstallningar,
  normalisera,
} from "../installningar";

describe("organisationsinställningar", () => {
  beforeEach(() => localStorage.clear());

  it("utan sparade val visas allt", () => {
    const inst = lastaInstallningar();
    expect(inst.objekttyper).toEqual(ALLA_OBJEKTTYPER);
    expect(inst.identifieringsmetoder).toEqual(ALLA_IDENTIFIERINGSMETODER);
  });

  it("okända värden filtreras bort och ordningen följer standardlistan", () => {
    const inst = normalisera({
      objekttyper: ["Hydraulics", "Påhittad typ", "Passenger car"],
      identifieringsmetoder: ["VIN"],
    });
    expect(inst.objekttyper).toEqual(["Passenger car", "Hydraulics"]);
    expect(inst.identifieringsmetoder).toEqual(["VIN"]);
  });

  it("en tom eller trasig lista faller tillbaka till hela standardlistan", () => {
    expect(normalisera({ objekttyper: [] }).objekttyper).toEqual(ALLA_OBJEKTTYPER);
    expect(normalisera({ objekttyper: "fel typ" }).objekttyper).toEqual(ALLA_OBJEKTTYPER);
    expect(normalisera(null).identifieringsmetoder).toEqual(ALLA_IDENTIFIERINGSMETODER);
  });

  it("sparade val på enheten läses tillbaka", () => {
    localStorage.setItem(
      "gf-installningar",
      JSON.stringify({ objekttyper: ["Electrical system"], identifieringsmetoder: ["Serial number", "Manual entry"] }),
    );
    const inst = lastaInstallningar();
    expect(inst.objekttyper).toEqual(["Electrical system"]);
    expect(inst.identifieringsmetoder).toEqual(["Serial number", "Manual entry"]);
  });
});
