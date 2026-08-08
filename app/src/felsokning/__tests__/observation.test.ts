// @vitest-environment node
// Observationen får aldrig bli det som gör systemet långsamt eller
// läckande. Testerna låser tre saker: spåret följer med, mätvärdena har
// format CloudWatch faktiskt förstår, och inget känsligt hamnar i
// dimensionerna.
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  NAMNRYMD,
  avsluta,
  logga,
  mätvärde,
  spårFrån,
  starta,
  traceparent,
} from "../../../../services/gemensam/observation.mjs";

function fånga(arbete: () => void): Record<string, unknown>[] {
  const rader: Record<string, unknown>[] = [];
  const spion = vi.spyOn(process.stdout, "write").mockImplementation((rad) => {
    rader.push(JSON.parse(String(rad)));
    return true;
  });
  try {
    arbete();
  } finally {
    spion.mockRestore();
  }
  return rader;
}

afterEach(() => vi.restoreAllMocks());

describe("spårning", () => {
  it("tar emot ett inkommande spår och behåller spår-id:t", () => {
    const spår = spårFrån("00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01");
    expect(spår.spårId).toBe("4bf92f3577b34da6a3ce929d0e0e4736");
    expect(spår.förälder).toBe("00f067aa0ba902b7");
    // Eget spann-id: vi är ett nytt steg i kedjan, inte samma.
    expect(spår.spanId).not.toBe("00f067aa0ba902b7");
    expect(spår.spanId).toMatch(/^[0-9a-f]{16}$/);
  });

  it("startar ett nytt spår när huvudet saknas eller är trasigt", () => {
    for (const huvud of [undefined, "", "skräp", "00-kort-00f067aa0ba902b7-01", "99-…"]) {
      const spår = spårFrån(huvud as string);
      expect(spår.spårId, String(huvud)).toMatch(/^[0-9a-f]{32}$/);
      expect(spår.förälder, String(huvud)).toBeNull();
    }
  });

  it("skickar vidare ett huvud nästa tjänst kan läsa", () => {
    const spår = spårFrån(undefined);
    const vidare = spårFrån(traceparent(spår));
    expect(vidare.spårId).toBe(spår.spårId);
    expect(vidare.förälder).toBe(spår.spanId);
  });
});

describe("nedbrytning av tiden", () => {
  it("slår ihop upprepade delar till antal och summa", async () => {
    const spann = starta("plattform", spårFrån(undefined));
    await spann.mät("databas", async () => {});
    await spann.mät("databas", async () => {});
    await spann.mät("modell", async () => {});

    const delar = spann.delar();
    expect(Object.keys(delar).sort()).toEqual(["databas", "modell"]);
    expect(delar.databas.antal).toBe(2);
    expect(delar.modell.antal).toBe(1);
    expect(delar.databas.ms).toBeGreaterThanOrEqual(0);
  });

  it("mäter även när arbetet kastar — annars ser fel ut som noll tid", async () => {
    const spann = starta("plattform", spårFrån(undefined));
    await expect(
      spann.mät("databas", async () => {
        throw new Error("nej");
      }),
    ).rejects.toThrow("nej");
    expect(spann.delar().databas.antal).toBe(1);
  });
});

describe("mätvärden i EMF", () => {
  it("har den struktur CloudWatch extraherar mätvärden ur", () => {
    const [rad] = fånga(() => mätvärde("Svarstid", 42, "Milliseconds", { Tjänst: "plattform" }));
    const meta = (rad._aws as { CloudWatchMetrics: { Namespace: string; Dimensions: string[][]; Metrics: { Name: string; Unit: string }[] }[] })
      .CloudWatchMetrics[0];

    expect(meta.Namespace).toBe(NAMNRYMD);
    expect(meta.Dimensions).toEqual([["Tjänst"]]);
    expect(meta.Metrics).toEqual([{ Name: "Svarstid", Unit: "Milliseconds" }]);
    // Värdet måste ligga på toppnivå under sitt eget namn.
    expect(rad.Svarstid).toBe(42);
    expect(rad["Tjänst"]).toBe("plattform");
  });

  it("dimensionerna hålls få — varje kombination är en egen tidsserie", () => {
    const rader = fånga(() => {
      const spann = starta("plattform", spårFrån(undefined));
      avsluta(spann, { status: 200, väg: "/api/arenden/:id/handelser", extra: { metod: "POST" } });
    });

    const dimensioner = rader
      .filter((r) => r._aws)
      .flatMap((r) => (r._aws as { CloudWatchMetrics: { Dimensions: string[][] }[] }).CloudWatchMetrics[0].Dimensions.flat());

    // Organisation, ärende och spår-id får aldrig bli dimensioner:
    // kostnaden växer med en tidsserie per värde.
    for (const förbjuden of ["org", "organisation", "arende", "spårId", "anvandare"]) {
      expect(dimensioner, förbjuden).not.toContain(förbjuden);
    }
    expect(new Set(dimensioner)).toEqual(new Set(["Tjänst", "Väg"]));
  });

  it("fel får en egen serie så larmet kan larma på en summa", () => {
    const rader = fånga(() => {
      const spann = starta("plattform", spårFrån(undefined));
      avsluta(spann, { status: 500, väg: "/api/arenden" });
    });

    const namn = rader
      .filter((r) => r._aws)
      .map((r) => (r._aws as { CloudWatchMetrics: { Metrics: { Name: string }[] }[] }).CloudWatchMetrics[0].Metrics[0].Name);
    expect(namn).toContain("Fel");

    // Och loggraden ska vara märkt som fel, inte info.
    expect(rader.find((r) => r.nivå)).toMatchObject({ nivå: "fel", status: 500 });
  });

  it("lyckade anrop skapar ingen felserie", () => {
    const rader = fånga(() => {
      const spann = starta("plattform", spårFrån(undefined));
      avsluta(spann, { status: 200, väg: "/halsa" });
    });
    const namn = rader
      .filter((r) => r._aws)
      .map((r) => (r._aws as { CloudWatchMetrics: { Metrics: { Name: string }[] }[] }).CloudWatchMetrics[0].Metrics[0].Name);
    expect(namn).not.toContain("Fel");
  });
});

describe("loggrader", () => {
  it("är en rad JSON med spår-id, så Logs Insights kan fråga på fält", () => {
    const [rad] = fånga(() => logga("info", "hej", { spårId: "abc", väg: "/api/arenden" }));
    expect(rad).toMatchObject({ nivå: "info", meddelande: "hej", spårId: "abc" });
    expect(typeof rad.tid).toBe("string");
  });
});
