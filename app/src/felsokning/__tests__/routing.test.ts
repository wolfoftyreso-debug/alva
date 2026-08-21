// @vitest-environment node
// Varje länk sajten själv visar måste leda någonstans.
//
// Sidfoten bär det en näringsidkare måste hålla synligt, och tre av dess
// länkar (dataskydd, villkor, tillgänglighet) pekade på routes som inte
// fanns — på VARJE sida, publik som portal. En besökare som klickade
// "Data protection" landade på en generisk 404. Testet läser länkarna ur
// Ram.tsx och kräver att App.tsx har en route för var och en.

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const RAM = readFileSync("src/pages/alva/Ram.tsx", "utf8");
const APP = readFileSync("src/App.tsx", "utf8");

function internaLankar(kalla: string): string[] {
  return [...new Set([...kalla.matchAll(/["'](\/alva\/[a-z-]+)["']/g)].map((m) => m[1]))];
}

describe("sidfoten leder någonstans", () => {
  const fotlankar = internaLankar(RAM.slice(RAM.indexOf("const FOT"), RAM.indexOf("] as const", RAM.indexOf("const FOT"))));

  it("foten har de lagstadgade länkarna", () => {
    for (const vag of ["/alva/impressum", "/alva/dataskydd", "/alva/villkor", "/alva/tillganglighet"]) {
      expect(fotlankar, vag).toContain(vag);
    }
  });

  it.each(["/alva/impressum", "/alva/dataskydd", "/alva/villkor", "/alva/tillganglighet", "/alva/sprak", "/alva/utgavor"])(
    "%s har en route i App.tsx",
    (vag) => {
      expect(APP).toContain(`path="${vag}"`);
    },
  );

  it("varje /alva-länk i ramen har en route — inga nya döda länkar", () => {
    for (const vag of internaLankar(RAM)) {
      expect(APP, `${vag} saknar route`).toContain(`path="${vag}"`);
    }
  });
});
