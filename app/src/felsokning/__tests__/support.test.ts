// @vitest-environment node
// ALVA-PROC-0050 · Felanmälan.
//
// Två egenskaper prövas: att sammanhanget härleds och inte kan smugglas,
// och att statusen är en projektion. Den första är en dataskyddsfråga —
// en supportanmälan är inte ett skäl att flytta personuppgifter till ett
// annat system, och det är precis vad ett fritt sammanhangsfält skulle
// göra första gången någon klistrar in ett regnr "för tydlighetens skull".
import { describe, expect, it } from "vitest";
import {
  FORBJUDET_I_SAMMANHANG,
  STATUSAR,
  TYPER,
  granskaAnmalan,
  sammanhang,
  supportbeteckning,
  supportstatus,
} from "../../../../services/gemensam/support.mjs";

describe("sammanhanget härleds och kan inte smugglas", () => {
  it("bara kända fält följer med", () => {
    const ut = sammanhang({
      arendeId: "arende-1",
      metodikId: "vibration",
      steg: "4",
      plattformsversion: "ALVA 1.0",
      sparId: "abc",
    });
    expect(Object.keys(ut).sort()).toEqual(["arende", "metodik", "plattform", "spar", "steg"]);
  });

  it("identifierande fält släpps aldrig igenom", () => {
    const smuggel = Object.fromEntries(FORBJUDET_I_SAMMANHANG.map((n: string) => [n, "ABC123"]));
    const ut = sammanhang({ ...smuggel, arendeId: "arende-1" });
    for (const n of FORBJUDET_I_SAMMANHANG) expect(Object.keys(ut), n).not.toContain(n);
    // Och det som SKA följa med gör det fortfarande.
    expect(ut.arende).toBe("arende-1");
  });

  it("tomma fält utelämnas i stället för att skickas som tomma strängar", () => {
    expect(sammanhang({ arendeId: "", metodikId: null })).toEqual({});
    expect(sammanhang()).toEqual({});
  });

  it("klientsträngen kapas — en user agent är inte en uppsats", () => {
    expect(sammanhang({ klient: "x".repeat(500) }).klient.length).toBe(200);
  });
});

describe("tröskeln för att anmäla är låg, men inte noll", () => {
  it("en anmälan med rubrik och beskrivning tas emot", () => {
    expect(
      granskaAnmalan({
        typ: "felanmalan",
        rubrik: "Mätsteget vägrar komma",
        beskrivning: "Kontrollen tar inte emot 2,4 men accepterar 2.4. Verkstaden skriver komma.",
      }),
    ).toBeNull();
  });

  it("okänd typ avvisas", () => {
    expect(granskaAnmalan({ typ: "hittepa", rubrik: "Något", beskrivning: "x".repeat(30) })).toBeTruthy();
  });

  it("en tom beskrivning avvisas — den som svarar ser inte skärmen", () => {
    const fel = granskaAnmalan({ typ: "felanmalan", rubrik: "Funkar inte", beskrivning: "" });
    expect(fel).toMatch(/ser inte din skärm/);
  });

  it("orimligt långa fält avvisas", () => {
    expect(granskaAnmalan({ typ: "fraga", rubrik: "x".repeat(300), beskrivning: "y".repeat(30) })).toBeTruthy();
    expect(granskaAnmalan({ typ: "fraga", rubrik: "Rubrik", beskrivning: "y".repeat(30_000) })).toBeTruthy();
  });

  it("alla tre typerna går att anmäla", () => {
    for (const t of TYPER as { id: string }[]) {
      expect(granskaAnmalan({ typ: t.id, rubrik: "En rubrik", beskrivning: "x".repeat(30) }), t.id).toBeNull();
    }
  });
});

describe("statusen är en projektion, inte ett fält", () => {
  it("en anmälan utan inlägg är mottagen — utan att något skrivits", () => {
    expect(supportstatus([])).toBe("mottagen");
    expect(supportstatus()).toBe("mottagen");
  });

  it("senaste statusposten gäller", () => {
    expect(
      supportstatus([
        { typ: "status", status: "under_arbete" },
        { typ: "svar", text: "Vi tittar." },
        { typ: "status", status: "atgardad" },
      ]),
    ).toBe("atgardad");
  });

  it("en stängd anmälan kan öppnas igen", () => {
    // Händer när felet visar sig inte vara borta.
    expect(
      supportstatus([
        { typ: "status", status: "stangd" },
        { typ: "status", status: "under_arbete" },
      ]),
    ).toBe("under_arbete");
  });

  it("okända statusvärden ignoreras i stället för att bli tillstånd", () => {
    expect(supportstatus([{ typ: "status", status: "hittepa" }])).toBe("mottagen");
  });

  it("svar ensamma ändrar inte tillståndet", () => {
    expect(supportstatus([{ typ: "svar", text: "Tack." }])).toBe("mottagen");
  });

  it("alla fyra tillstånd finns", () => {
    expect(STATUSAR).toEqual(["mottagen", "under_arbete", "atgardad", "stangd"]);
  });
});

describe("beteckningen följer nomenklaturen", () => {
  it("ALVA-SUP-0001", () => {
    expect(supportbeteckning(1)).toBe("ALVA-SUP-0001");
    expect(supportbeteckning(1234)).toBe("ALVA-SUP-1234");
  });
});
