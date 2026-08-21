// @vitest-environment node
// Kunddelningens språk (ALVA-SPEC-060 · ALVA-PROC-0030).
//
// Delningsvyn är den enda yta vars läsare aldrig valt verktyget —
// kunden, försäkringshandläggaren, flottansvarige. Den talar därför
// mottagarens språk, och det här testet låser tre saker som annars går
// sönder tyst:
//
//   1. Varje nyckel vyn slår upp FINNS i katalogen. `t()` faller
//      tillbaka på nyckeln själv, så ett stavfel blir "delning.rubrik…"
//      på skärmen — synligt för kunden, osynligt för bygget utan detta.
//   2. Inga hårdkodade engelska etiketter återuppstår i vyn. En sträng
//      som inte går genom `t()` översätts aldrig, hur komplett
//      katalogen än är.
//   3. Tidslinjen förblir teknikerns ordagranna ord — en översatt logg
//      är inte längre en logg.

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { EN } from "../../../../services/gemensam/sprak/en.mjs";

const VYN = readFileSync("src/felsokning/DelatArendeVy.tsx", "utf8");
const SIDAN = readFileSync("src/pages/felsokning/PublikDelning.tsx", "utf8");

function anvandaNycklar(kalla: string): string[] {
  return [...kalla.matchAll(/\bt\("([^"]+)"/g)].map((m) => m[1]);
}

describe("nycklarna vyn använder finns i katalogen", () => {
  it.each([
    ["DelatArendeVy", anvandaNycklar(VYN)],
    ["PublikDelning", [...anvandaNycklar(SIDAN), ...[...SIDAN.matchAll(/fel\("([^"]+)"\)/g)].map((m) => m[1])]],
  ])("%s slår bara upp nycklar med original i engelskan", (_namn, nycklar) => {
    expect(nycklar.length).toBeGreaterThan(5);
    for (const n of nycklar) expect(EN[n as keyof typeof EN], n).toBeTruthy();
  });

  it("kundbeslutets tre värden har var sin nyckel — mallnyckeln är inte gissad", () => {
    // Vyn bygger nyckeln ur loggens beslutsvärde: delning.beslut.${beslut}.
    expect(VYN).toContain("t(`delning.beslut.${beslut.handelse.beslut}`)");
    for (const beslut of ["godkant", "avbojt", "delvis"]) {
      expect(EN[`delning.beslut.${beslut}` as keyof typeof EN]).toBeTruthy();
    }
  });

  it("notisnycklarna sidan skickar finns, och vyn översätter dem", () => {
    for (const niva of ["kund", "partner", "intern"]) {
      expect(SIDAN).toContain(`"delning.notis.${niva}"`);
      expect(EN[`delning.notis.${niva}` as keyof typeof EN]).toBeTruthy();
    }
    expect(VYN).toContain('notis.startsWith("delning.notis.")');
  });
});

describe("inga hårdkodade mottagartexter återuppstår", () => {
  it.each([
    "Your decision to the workshop",
    "Approve the action",
    "Estimated cost:",
    "Responsible technician",
    "Closing statement and rationale",
    "Awaiting your decision",
    "generated from the case log",
    ">Summary<",
    ">Timeline<",
  ])("vyn bär inte längre %s som litteral", (litteral) => {
    expect(VYN).not.toContain(litteral);
  });

  it("sidans för-laddningsskärmar går genom katalogen", () => {
    expect(SIDAN).not.toContain("Retrieving the case");
    expect(SIDAN).not.toContain("Shared case");
  });
});

describe("mottagarens språk, teknikerns ord", () => {
  it("sammanfattningen följer språkvalet i vyn", () => {
    expect(VYN).toContain("sammanfatta(arende, sprak)");
  });

  it("tidslinjen renderas ur handelseRubrik — ordagrant, med öppen märkning", () => {
    expect(VYN).toContain("handelseRubrik(post)");
    expect(VYN).toContain('t("delning.tidslinje.arbetssprak")');
  });

  it("språkväljaren är besökarens och sparas med webbens kedja", () => {
    expect(VYN).toContain("useWebbSprak()");
    expect(VYN).toContain("sattWebbSprak(e.target.value)");
  });
});
