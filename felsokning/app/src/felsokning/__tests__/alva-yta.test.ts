// @vitest-environment node
// Disciplinen är det karakteristiska, inte färgerna.
//
// Ett designsystem som bara finns i ett dokument blir urvattnat på tredje
// sidan någon lägger till. Testet läser den faktiska källkoden för
// webbplatsen och portalen och låser de regler som annars glider:
// inga gradienter, ingen animation, inga emojier, inga marknadsföringsord,
// och ingen färg utanför paletten.
//
// Det testar utseende genom att läsa kod, vilket är trubbigt. Men det
// fångar exakt den sortens tillägg som faktiskt sker — en `animate-pulse`
// här, en `bg-gradient-to-r` där — och som ingen enskilt tycker är fel.
import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { FORBJUDNA_ORD } from "@/alva/sprak";

const KATALOGER = ["src/alva", "src/pages/alva"];

const filer = KATALOGER.flatMap((katalog) =>
  readdirSync(katalog)
    .filter((f) => f.endsWith(".ts") || f.endsWith(".tsx"))
    .map((f) => [`${katalog}/${f}`, readFileSync(`${katalog}/${f}`, "utf8")] as const),
);

/** Kommentarer får diskutera det som är förbjudet i gränssnittet. */
const utanKommentarer = (kod: string) =>
  kod.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

describe("ALVA-ytan följer designsystemet", () => {
  it("hittar filerna att granska", () => {
    expect(filer.length).toBeGreaterThanOrEqual(7);
  });

  it.each(filer)("%s använder ingen gradient, glaseffekt eller skugga", (_namn, kod) => {
    const k = utanKommentarer(kod);
    expect(k).not.toMatch(/gradient/i);
    expect(k).not.toMatch(/backdrop-blur|backdrop-filter/i);
    expect(k).not.toMatch(/\bshadow-(sm|md|lg|xl|2xl)\b/);
  });

  it.each(filer)("%s innehåller ingen animation", (_namn, kod) => {
    const k = utanKommentarer(kod);
    // Rörelse som inte bär information är brus i ett utrymme där
    // teknikern redan har för mycket.
    expect(k).not.toMatch(/\banimate-|\btransition-|@keyframes/);
  });

  it.each(filer)("%s använder inga emojier", (_namn, kod) => {
    const k = utanKommentarer(kod);
    // Fyra tecken är tillåtna: ✓ ○ □ →
    const emojier = k.match(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu) ?? [];
    expect(emojier.filter((t) => !["✓", "○", "□", "→"].includes(t))).toEqual([]);
  });

  it.each(filer)("%s använder bara färger ur paletten", (_namn, kod) => {
    const k = utanKommentarer(kod);
    const palett = ["#1B1E22", "#4D5662", "#D7DCE2", "#F6F7F8", "#005CA9", "#FFFFFF"];
    const funna = (k.match(/#[0-9A-Fa-f]{3,8}\b/g) ?? []).map((f) => f.toUpperCase());
    expect(funna.filter((f) => !palett.includes(f))).toEqual([]);
  });

  it.each(filer.filter(([n]) => !n.endsWith("sprak.ts")))(
    "%s innehåller inga marknadsföringsord",
    (_namn, kod) => {
      // sprak.ts undantas: den definierar listan och måste innehålla den.
      const text = utanKommentarer(kod).toLowerCase();
      for (const ord of FORBJUDNA_ORD) expect(text, ord).not.toContain(ord);
    },
  );

  it("hela ytan undviker AI-språk — produkten beskrivs som en metod", () => {
    for (const [namn, kod] of filer) {
      const text = utanKommentarer(kod);
      expect(text, namn).not.toMatch(/\bAI[- ]?(assistant|assistent|powered|driven)\b/i);
      expect(text, namn).not.toMatch(/\bchatt?bot\b/i);
    }
  });

  it("rubriker är versaler — sektionsetiketter, inte meningar", () => {
    const komponenter = readFileSync("src/alva/komponenter.tsx", "utf8");
    expect(komponenter).toMatch(/uppercase/);
    // Både Etikett och Rubrik måste sätta versaler.
    const rubrik = komponenter.slice(komponenter.indexOf("export function Rubrik"));
    expect(rubrik.slice(0, 600)).toMatch(/uppercase/);
  });

  it("avståndsmått följer 8 px-rutnätet", () => {
    // Rutnätet gäller layout, inte typografi: teckenstorlek och
    // radavstånd sätts av läsbarhet, inte av rytmen i sidan. Det som
    // mäts här är Tailwinds avståndsklasser, som är 4 px-steg — ett
    // jämnt steg är alltså en 8 px-multipel.
    const udda: string[] = [];
    for (const [namn, kod] of filer) {
      for (const m of utanKommentarer(kod).matchAll(/\b(p|px|py|pt|pb|pl|pr|m|mx|my|mt|mb|ml|mr|gap)-(\d+)\b/g)) {
        if (Number(m[2]) % 2 !== 0) udda.push(`${namn}: ${m[0]}`);
      }
    }
    expect(udda).toEqual([]);
  });
});

// ---- Andra produkters meddelanden får inte synas på ALVA-ytan ----------
//
// Bakgrund: butikens banner "Skarpa betalningar är inte konfigurerade"
// renderades ovanför ALVA-huvudet, eftersom den satt i App och bara
// undantog /felsokning. En verkstad som ser ett driftmeddelande från en
// annan produkt läser det som att den tittar på något halvfärdigt — och
// det är ett trovärdighetsproblem, inte ett kosmetiskt.
describe("ALVA-ytan är fri från andra produkters meddelanden", () => {
  const banner = readFileSync("src/components/PaymentTestModeBanner.tsx", "utf8");

  it("betalningsbannern undantar både /felsokning och /alva", () => {
    expect(banner).toContain('"/felsokning"');
    expect(banner).toContain('"/alva"');
  });

  it("undantaget matchar underliggande sökvägar, inte bara prefix på ordnivå", () => {
    // "/alvarlig" ska inte räknas som ALVA. Regeln jämför hela segment.
    expect(banner).toMatch(/pathname === p \|\| pathname\.startsWith\(`\$\{p\}\/`\)/);
  });
});
