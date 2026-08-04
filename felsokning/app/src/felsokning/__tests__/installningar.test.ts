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
      objekttyper: ["Hydraulik", "Påhittad typ", "Personbil"],
      identifieringsmetoder: ["VIN"],
    });
    expect(inst.objekttyper).toEqual(["Personbil", "Hydraulik"]);
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
      JSON.stringify({ objekttyper: ["Elsystem"], identifieringsmetoder: ["Serienummer", "Manuell inmatning"] }),
    );
    const inst = lastaInstallningar();
    expect(inst.objekttyper).toEqual(["Elsystem"]);
    expect(inst.identifieringsmetoder).toEqual(["Serienummer", "Manuell inmatning"]);
  });
});
