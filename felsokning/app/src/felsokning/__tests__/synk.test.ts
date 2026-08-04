import { describe, expect, it } from "vitest";
import type { LoggPost } from "../domain";
import { flataIhop } from "../synk";

function post(id: string, tidpunkt: string, anvandare = "Anna"): LoggPost {
  return { id, tidpunkt, anvandare, handelse: { typ: "kommentar", text: id } };
}

describe("flataIhop", () => {
  const lokala = [post("a", "2026-08-02T08:00:00.000Z"), post("c", "2026-08-02T08:10:00.000Z")];
  const fjarr = [post("a", "2026-08-02T08:00:00.000Z"), post("b", "2026-08-02T08:05:00.000Z", "Johan")];

  it("flätar ihop två enheters loggar utan dubbletter, i tidsordning", () => {
    const resultat = flataIhop(lokala, fjarr);
    expect(resultat.map((p) => p.id)).toEqual(["a", "b", "c"]);
  });

  it("skriver aldrig över: alla poster från båda källorna finns kvar", () => {
    const resultat = flataIhop(lokala, fjarr);
    expect(resultat).toHaveLength(3);
    expect(resultat.find((p) => p.id === "b")?.anvandare).toBe("Johan");
  });

  it("är idempotent och deterministisk", () => {
    const enGang = flataIhop(lokala, fjarr);
    const tvaGanger = flataIhop(enGang, fjarr);
    expect(tvaGanger).toEqual(enGang);
    expect(flataIhop(fjarr, lokala).map((p) => p.id)).toEqual(enGang.map((p) => p.id));
  });

  it("använder id som stabil ordning vid exakt samma tidpunkt", () => {
    const samtidiga = flataIhop(
      [post("x2", "2026-08-02T08:00:00.000Z")],
      [post("x1", "2026-08-02T08:00:00.000Z")],
    );
    expect(samtidiga.map((p) => p.id)).toEqual(["x1", "x2"]);
  });
});
