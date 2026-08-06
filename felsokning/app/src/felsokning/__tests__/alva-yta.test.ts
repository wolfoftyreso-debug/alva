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

// ---- Mobil: ytan får aldrig bli bredare än skärmen ---------------------
//
// Portalens tabeller sköt ut dokumentet till 842 px på en 390 px-skärm.
// Texten kapades i högerkanten och sidan gick att dra i sidled — det som
// syntes i skärmdumpen från en telefon.
//
// Testet läser koden i stället för att rendera, vilket är trubbigt men
// fångar just de konstruktioner som orsakade det: en tabell utan smal
// form, en navigationsrad som inte bryts, och en flexkolumn som inte får
// krympa under sitt innehåll. Den faktiska bredden mäts i genomgången.
describe("ALVA-ytan håller sig inom skärmbredden", () => {
  const komponenter = filer.find(([n]) => n.endsWith("alva/komponenter.tsx"))![1];
  const ram = filer.find(([n]) => n.endsWith("pages/alva/Ram.tsx"))![1];

  it("Tabell har en smal form för telefon, inte bara sidledsscroll", () => {
    // En sexkolumnstabell som scrollar i sidled ryms, men går inte att
    // läsa. Den smala formen är staplade namngivna fält.
    expect(komponenter).toContain("sm:hidden");
    expect(komponenter).toMatch(/<dt\b/);
    expect(komponenter).toMatch(/<dd\b/);
  });

  it("den breda tabellen ligger i en egen scrollbehållare", () => {
    expect(komponenter).toContain('className="hidden overflow-x-auto sm:block"');
  });

  it("navigationsraden bryts i stället för att bredda sidan", () => {
    expect(ram).toMatch(/<ul className="flex flex-wrap/);
  });

  it("fasindikatorns kolumner får krympa under sitt innehåll", () => {
    // Utan min-w-0 sätter innehållet golvet för kolumnbredden, och fyra
    // kolumner blir bredare än telefonen.
    expect(komponenter).toContain("min-w-0 flex-1");
  });
});

// ---- Typografin är specens, inte värdapplikationens --------------------
//
// ALVA-ytan satte länge inget eget snitt och ärvde därför butikens
// `Crimson Text` — en antikva. Specen (ALVA-SPEC-001, paragraf 6)
// föreskriver DIN 2014 med FF DIN och IBM Plex Sans som tillåtna
// alternativ. Skillnaden är inte kosmetisk: bokstavsformen är det första
// som säger vilken tradition ett verktyg tillhör, och på en telefon där
// ingenting annat konkurrerar om intrycket var det allt man såg.
describe("ALVA-ytan bär sin egen typografi", () => {
  const css = readFileSync("src/index.css", "utf8");
  const ram = filer.find(([n]) => n.endsWith("pages/alva/Ram.tsx"))![1];
  const system = filer.find(([n]) => n.endsWith("alva/system.ts"))![1];

  it("ramen märker ytan så att kaskaden når den", () => {
    expect(ram).toContain("alva-yta");
  });

  it("snittet är deklarerat i systemfilen med specens ordning", () => {
    const stack = system.match(/export const TYPSNITT =[\s\S]*?;/)?.[0] ?? "";
    expect(stack).toContain("DIN 2014");
    expect(stack).toContain("FF DIN");
    expect(stack).toContain("IBM Plex Sans");
    // Fallkedjan får aldrig sluta i en antikva. `sans-serif` är den
    // generiska groteskfamiljen och alltså inte det som avses.
    expect(stack).not.toMatch(/(?<!sans-)\bserif\b/);
  });

  it("regeln gäller ytan och når även rubriker", () => {
    const regel = css.match(/\.alva-yta[\s\S]*?\{[\s\S]*?\}/)?.[0] ?? "";
    expect(regel).toContain("DIN 2014");
    expect(css).toContain(".alva-yta h1");
  });

  it("siffror sätts med fast bredd så beteckningar går att jämföra", () => {
    expect(css).toContain("tabular-nums");
  });
});

// ---- Snittet måste följa med i bygget ----------------------------------
//
// Fallkedjan säkrar ordningen men inte utfallet: utan DIN installerad
// föll ALVA ned till vad enheten råkade ha — Helvetica på en iPhone,
// Roboto på en Android. Ett system som beskriver sig som en standard får
// inte se olika ut beroende på var det öppnas.
//
// IBM Plex Sans är därför inbakad som fil. Den måste dessutom ligga som
// data i CSS:en och inte som en separat asset: ALVA publiceras bland
// annat som en självbärande sida bakom en CSP där varje extern begäran
// blockeras, och en @font-face mot en assetfil hade tyst fallit tillbaka
// till enhetens eget snitt — alltså precis det inbäddningen avskaffar.
describe("ALVA:s snitt följer med i bygget", () => {
  const typsnitt = readFileSync("src/alva/typsnitt.css", "utf8");
  const vite = readFileSync("vite.config.ts", "utf8");

  it("de tre textvikterna och två monovikterna finns som filer", () => {
    for (const fil of [
      "ibm-plex-sans-latin-400-normal.woff2",
      "ibm-plex-sans-latin-600-normal.woff2",
      "ibm-plex-sans-latin-700-normal.woff2",
      "ibm-plex-mono-latin-400-normal.woff2",
      "ibm-plex-mono-latin-600-normal.woff2",
    ]) {
      expect(typsnitt, fil).toContain(fil);
      expect(readFileSync(`src/alva/typsnitt/${fil}`).byteLength).toBeGreaterThan(8000);
    }
  });

  it("licensen ligger bredvid filerna", () => {
    // SIL Open Font License kräver att licenstexten följer med.
    expect(readFileSync("src/alva/typsnitt/LICENSE", "utf8")).toMatch(/SIL OPEN FONT LICENSE/i);
  });

  it("bygget bakar in woff2 som data i stället för som separata filer", () => {
    expect(vite).toContain("assetsInlineLimit");
    expect(vite).toContain(".woff2");
  });

  it("ingen @font-face hämtar från en extern värd", () => {
    expect(typsnitt).not.toMatch(/url\(\s*["']?https?:/);
  });
});

// ---- Obackade ytor måste märkas ----------------------------------------
//
// QUALITY-AUDIT-2 · m-9. Inloggningen autentiserar ingenting och
// kontoansökan skickar ingenting, men bägge ser ut som att de gör det.
// Två personer i rad försökte använda dem på riktigt innan de frågade —
// vilket är precis vad fyndet förutsade: en yta som ser färdig ut
// planerar man efter.
//
// Integrationssidan märker redan en profil `draft` tills den körts mot
// leverantören, med motiveringen att en lista där allt ser färdigt ut är
// den snabbaste vägen till ett misslyckat införande. Testet håller
// samma måttstock mot resten av ytan.
describe("ytor utan verklig funktion är märkta som demonstration", () => {
  const sida = (namn: string) => filer.find(([n]) => n.endsWith(`pages/alva/${namn}`))![1];

  it.each(["LoggaIn.tsx", "Ansokan.tsx", "Portal.tsx"])("%s bär en demonstrationsruta", (namn) => {
    expect(sida(namn)).toContain("<Demonstration>");
  });

  it("ansökans kvittens är märkt, inte bara formuläret", () => {
    // Kvittenssidan med sin referens är det som mest liknar ett verkligt
    // besked, och därför den som vilseleder mest om den står omärkt.
    expect(sida("Ansokan.tsx").match(/<Demonstration>/g)).toHaveLength(2);
  });

  it("rutan säger vad som inte sker, inte vad som ska komma", () => {
    // Ett löfte om framtida funktion vore samma fel i ny form.
    const komponenter = filer.find(([n]) => n.endsWith("alva/komponenter.tsx"))![1];
    const ruta = komponenter.match(/export function Demonstration[\s\S]*?\n}/)?.[0] ?? "";
    expect(ruta).toContain("Demonstration");
    for (const löfte of ["coming soon", "snart", "will be available", "in a future"]) {
      for (const namn of ["LoggaIn.tsx", "Ansokan.tsx", "Portal.tsx"]) {
        expect(sida(namn).toLowerCase(), `${namn}: ${löfte}`).not.toContain(löfte);
      }
    }
  });
});

// ---- Märkningen måste säga vad som gäller, inte var något annat finns --
//
// Första formuleringen sa "Applications are handled outside this
// demonstration" — vilket lika gärna läses som att ansökningar tas emot
// någon annanstans, av ett riktigt system. Det gör de inte. En läsare
// frågade vad meningen betydde, vilket är svaret på om den var tydlig.
//
// En märkning som inte går att missförstå säger två saker: att ingenting
// sker, och vad läsaren ska göra i stället.
describe("demonstrationsmärkningen är entydig", () => {
  const sida = (namn: string) => filer.find(([n]) => n.endsWith(`pages/alva/${namn}`))![1];

  it("inloggningen säger vad besökaren ska göra", () => {
    const kod = sida("LoggaIn.tsx");
    expect(kod).toContain("Type anything");
    expect(kod).toContain("no account is needed");
  });

  it("ansökan säger att det inte finns någon mottagning", () => {
    expect(sida("Ansokan.tsx")).toContain("there is no intake behind it yet");
  });

  it("beskrivningen av avsedd drift är märkt som avsedd, inte som gällande", () => {
    // Två meningar bredvid varandra, där den ena säger att inget händer
    // och den andra beskriver en handläggningsprocess, upphäver varandra.
    expect(sida("Ansokan.tsx")).toContain("Intended operation:");
  });

  it("ingen märkning hänvisar till något som läsaren inte kan nå", () => {
    // "finns i plattformstjänsten" hjälper ingen som står på sidan.
    expect(sida("LoggaIn.tsx")).not.toContain("Real authentication exists in the platform service");
  });
});

// ---- ALVA tar inte emot betalningar ------------------------------------
//
// `@stripe/stripe-js` injicerar sitt skript i sidan redan vid import,
// inte när någon ska betala. ALVA laddade därför Stripe på varje
// sidvisning trots att produkten faktureras och aldrig tar emot en
// betalning — och bakom artefaktens CSP blockerades anropet och syntes
// som ett fel i konsolen.
//
// `/pure` är samma modul utan sidoeffekten. Testet låser den, eftersom
// en `import { loadStripe } from "@stripe/stripe-js"` någonstans räcker
// för att skjuta upp skriptet igen.
describe("ingen betalleverantör laddas", () => {
  const stripe = readFileSync("src/lib/stripe.ts", "utf8");

  it("stripe-modulen importeras utan sidoeffekt", () => {
    expect(stripe).toContain('from "@stripe/stripe-js/pure"');
    // Ett värdeimport från huvudmodulen skulle återinföra skriptladdningen.
    expect(stripe).not.toMatch(/import \{[^}]*loadStripe[^}]*\} from "@stripe\/stripe-js"/);
  });

  it("ingen ALVA-yta rör en betalleverantör", () => {
    for (const [namn, kod] of filer) {
      expect(kod.toLowerCase(), namn).not.toContain("stripe");
    }
  });

  it("fakturamodellen finns och tar inte emot betalningar", async () => {
    const m = await import("../../../../services/gemensam/fakturering.mjs");
    const f = m.fakturera({
      nummer: 1,
      org: { namn: "Verkstad Nord AB", moduler: [] },
      aktiva: 3,
      period: { fran: "2026-01-01", till: "2026-12-31" },
      utfardad: "2026-01-15",
    });
    expect(f.betalningssatt).toMatch(/No online payment/i);
    expect(Object.keys(m)).not.toContain("betala");
  });
});
