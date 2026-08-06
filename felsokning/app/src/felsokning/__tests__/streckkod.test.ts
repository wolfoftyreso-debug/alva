import { describe, expect, it } from "vitest";
import { tolkaKod } from "../streckkod";

describe("avläst kod klassificeras innan den används", () => {
  it("känner igen VIN (17 tecken, utan I/O/Q)", () => {
    expect(tolkaKod("YV1DZ8256F2123456")).toEqual({ varde: "YV1DZ8256F2123456", typ: "VIN" });
    // Mellanslag och bindestreck i streckkoder normaliseras bort.
    expect(tolkaKod(" yv1dz8256f2123456 ")?.typ).toBe("VIN");
    // 16 tecken är inget VIN — men kan vara ett serienummer.
    expect(tolkaKod("YV1DZ8256F212345")?.typ).toBe("Serial number");
    // I/O/Q förekommer aldrig i VIN → klassas som serienummer.
    expect(tolkaKod("YV1DZ8256F212345O")?.typ).toBe("Serial number");
  });

  it("känner igen svenska registreringsnummer i båda serierna", () => {
    expect(tolkaKod("ABC123")).toEqual({ varde: "ABC123", typ: "Reg. no." });
    expect(tolkaKod("abc12a")).toEqual({ varde: "ABC12A", typ: "Reg. no." });
    expect(tolkaKod("ABC 123")?.typ).toBe("Reg. no.");
  });

  it("plockar ut identifieraren ur QR-innehåll med fält eller URL", () => {
    expect(tolkaKod("https://verkstad.se/fordon?vin=YV1DZ8256F2123456")).toEqual({
      varde: "YV1DZ8256F2123456",
      typ: "VIN",
    });
    expect(tolkaKod("REGNR: ABC123")).toEqual({ varde: "ABC123", typ: "Reg. no." });
    expect(tolkaKod("vin YV1DZ8256F2123456")?.typ).toBe("VIN");
  });

  it("tar maskin-/serienummer som de är men avvisar fritext och nakna URL:er", () => {
    expect(tolkaKod("SN-4471/A")).toEqual({ varde: "SN4471/A", typ: "Serial number" });
    expect(tolkaKod("https://exempel.se/nagot-helt-annat")).toBeNull();
    expect(tolkaKod("Kontrollera oljenivån innan start")).toBeNull();
    expect(tolkaKod("  ")).toBeNull();
    expect(tolkaKod("AB")).toBeNull();
  });
});
