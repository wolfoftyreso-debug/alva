// EXIF-borttagningen är en säkerhetsegenskap, inte en biprodukt.
//
// Omritningen via canvas i skalaNerFoto tar bort all metadata, inklusive
// GPS-position. Egenskapen höll tidigare av en slump (QUALITY-AUDIT m-3):
// ingen hade skrivit ned den, och en ändring i stil med "bevara
// originalkvaliteten" hade tyst börjat publicera var kundens bil stod, i
// en vy som delas med försäkringsbolag och partners.
//
// Testet läser källkoden i stället för att köra funktionen, eftersom det
// som ska skyddas är *vägen*: att bilden går genom en omritning och inte
// vidarebefordras som originalbytes. Ett test som bara körde funktionen i
// jsdom hade inte fångat en ändring till `resolve(await fil.text())`.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const KÄLLA = readFileSync("src/felsokning/format.ts", "utf8");

describe("foton bär ingen metadata vidare", () => {
  it("bilden ritas om via canvas — det är det som tar bort EXIF och GPS", () => {
    const kropp = KÄLLA.slice(KÄLLA.indexOf("export function skalaNerFoto"));
    expect(kropp).toContain("createElement(\"canvas\")");
    expect(kropp).toContain("drawImage");
    // toDataURL på en canvas kan bara producera pixeldata. Returneras
    // något annat har omritningen kringgåtts.
    expect(kropp).toContain("canvas.toDataURL");
  });

  it("originalfilens bytes lämnas aldrig vidare orörda", () => {
    const kropp = KÄLLA.slice(KÄLLA.indexOf("export function skalaNerFoto"));
    // readAsDataURL används för att *läsa in* bilden i ett Image-objekt,
    // aldrig som det som returneras.
    expect(kropp).not.toMatch(/resolve\(\s*lasare\.result/);
    expect(kropp).not.toMatch(/resolve\(\s*await fil\./);
  });

  it("egenskapen är dokumenterad så nästa ändring inte tappar den tyst", () => {
    expect(KÄLLA).toMatch(/EXIF/);
    expect(KÄLLA).toMatch(/GPS/);
  });
});
