// PWA-kontraktet.
//
// Funktionen kommer ur serverkopians arbete (installerbar app), men
// flätades in genom sviten med dess defekter rättade. Testerna låser
// just det som var trasigt där, så att det inte kan komma tillbaka:
//
//   1. Service workern får ALDRIG servera navigeringar cache-först.
//      Föregångaren gjorde det med konstant cachenamn — varje deploy
//      gav en gammal index.html som pekade på utrensade filer.
//   2. API:erna cachas aldrig: diagnosdata ur en cache är fel data,
//      och ett "lyckat" avslut offline vore en lögn.
//   3. Manifestets färger är designsystemets, inte ungefär desamma.
//   4. Ikonerna är riktiga PNG:er i utlovade mått — Chrome vägrar
//      installera annars, och en SVG med .png-ändelse är exakt det
//      felet som redan begåtts en gång.

import { readFileSync, existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { FARG } from "@/alva/komponenter";

const manifest = JSON.parse(readFileSync("public/manifest.json", "utf8"));
const sw = readFileSync("public/sw.js", "utf8");

describe("manifestet är ALVA:s", () => {
  it("färgerna kommer ur designsystemet", () => {
    expect(manifest.theme_color).toBe(FARG.blue);
    expect(manifest.background_color).toBe(FARG.background);
  });

  it("appen startar i diagnosrutan — teknikerns startskärm", () => {
    expect(manifest.start_url).toBe("/felsokning");
    expect(manifest.display).toBe("standalone");
  });

  it("inga döda referenser: allt manifestet pekar på finns", () => {
    for (const ikon of manifest.icons) {
      expect(existsSync(`public${ikon.src}`), ikon.src).toBe(true);
    }
    expect(manifest.screenshots).toBeUndefined();
  });
});

describe("ikonerna är riktiga PNG:er i utlovade mått", () => {
  it.each(manifest.icons.map((i: { src: string; sizes: string }) => [i.src, i.sizes]))(
    "%s är %s",
    (src: string, sizes: string) => {
      const data = readFileSync(`public${src}`);
      expect(data.subarray(0, 8)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
      const bredd = data.readUInt32BE(16);
      const hojd = data.readUInt32BE(20);
      expect(`${bredd}x${hojd}`).toBe(sizes);
    },
  );
});

describe("service workern kan inte sänka en deploy", () => {
  it("navigeringar hämtas nätverk-först", () => {
    // Regeln uttrycks i koden som fetch(beg) med cachen enbart i catch.
    expect(sw).toMatch(/mode === "navigate"[\s\S]*?fetch\(beg\)[\s\S]*?\.catch\(\(\) => caches\.match/);
  });

  it("index.html ligger aldrig i kärnlistan under eget namn", () => {
    expect(sw).not.toContain('"/index.html"');
  });

  it("API:erna rörs aldrig", () => {
    expect(sw).toContain('startsWith("/api/")');
    expect(sw).toContain('startsWith("/ai/")');
  });

  it("cachenamnet är daterat — inte en konstant som överlever deployer", () => {
    expect(sw).toMatch(/const CACHE = "alva-\d{4}-\d{2}-\d{2}"/);
  });
});

describe("registreringen är tyst och ofarlig", () => {
  const main = readFileSync("src/main.tsx", "utf8");

  it("bara i produktionsbygge och säker kontext, med tyst fall", () => {
    expect(main).toContain("import.meta.env.PROD");
    expect(main).toContain("window.isSecureContext");
    expect(main).toMatch(/register\("\/sw\.js"\)\.catch\(\(\) => \{\}\)/);
  });
});
