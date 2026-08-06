// Genomgång: hela ärenden genom det byggda gränssnittet.
//
// ---- Varför det här finns -----------------------------------------------
//
// Enhetstesterna granskar modulerna. De tre allvarligaste defekterna i
// förra cykeln levde inte i någon modul utan i ÖVERENSKOMMELSEN mellan
// dem, och svit efter svit var grön medan de fanns:
//
//   · Klientens avslutsvillkor hade glidit från serverns grind. Ett
//     ärende gick att stänga på skärmen utan slutsats och utan kundens
//     besked — och nekades först vid synk, när bilen hade åkt.
//
//   · Grinden krävde textresultat även på kontroller vars evidens är ett
//     foto, och hade därför nekat avslut på nästan varje riktigt ärende.
//
//   · 56 av metodikernas 153 kontroller krävde ett mätvärde och
//     producerade ingen mätevidens, så felorsaksanalysen nekade
//     "Mätresultat" direkt efter att teknikern matat in siffran.
//
// Ingen av dem går att se utan att slutföra ett ärende. Därför den här
// filen.
//
// ---- Vad som mäts -------------------------------------------------------
//
//   Stängning   Varje ärende ska nå avslutat läge. Ett fall som fastnar
//               är antingen ett hinder utan väg ut eller ett glapp mellan
//               klient och grind.
//
//   Schemat     Varje händelse klienten FAKTISKT producerar valideras mot
//               det stängda schemat. En fixtur bevisar ingenting här —
//               schemat stängdes utifrån vad koden borde skicka, och det
//               enda som räknas är vad den skickar.
//
//   Layout      Text som rinner ur sin ruta. En etikett med fast bredd
//               lade sig ovanpå sitt värde i portalen, och breddmätningen
//               såg det inte: överspill gör inte dokumentet bredare. Den
//               här mätningen jämför elementets textbredd med dess egen
//               ruta, vilket är det enda som fångar just det felet.
//
//   Budget      Interaktioner per ärende. Ett verktyg som tyst växer från
//               65 klick till 90 överges i verkstaden långt innan någon
//               skriver en felrapport. Taket är därför ett testvillkor,
//               inte en anteckning.
//
// Körs med `npm run genomgang` (bygger, serverar och kör).

import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { granskaHändelse } from "../../services/gemensam/handelser.mjs";

const ROT = fileURLToPath(new URL("..", import.meta.url));
const DIST = join(ROT, "dist");
const PORT = Number(process.env.GENOMGANG_PORT ?? 4188);
const BAS = `http://127.0.0.1:${PORT}`;

/** Taket per ärende. Höjs bara medvetet, och då syns det i en diff. */
const BUDGET = 90;

const PIXEL = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

// Fallen är valda för att träffa olika metodiker och olika sorters
// evidens: foto, mätvärde, kommentar, säkerhetsspärr.
const FALL = [
  {
    id: "vibration",
    regnr: "TST101",
    objekt: "Volvo XC60 D4 2019",
    fel: "Vibration i ratten vid 90 km/h, blir värre över 110.",
    matvarde: "38 g obalans höger framhjul, övriga inom tolerans.",
    avvikelse: "Höger framhjul har 38 g obalans mot tillverkarens gräns på 10 g, vilket ger rattvibration i intervallet.",
    atgard: "Balansera om höger framhjul och genomför ny provkörning i 80–110 km/h.",
  },
  {
    id: "start_laddning",
    regnr: "TST102",
    objekt: "VW Passat TDI 2017",
    fel: "Bilen startar inte, bara klick vid start på morgonen.",
    matvarde: "Vilospänning 11,4 V mot referens 12,6 V efter tolv timmars vila.",
    avvikelse: "Batteriets vilospänning ligger på 11,4 V mot referens 12,6 V och faller till 8,1 V under startförsök.",
    atgard: "Byt startbatteri och mät laddspänningen efter bytet.",
  },
  {
    id: "hogvolt",
    regnr: "TST103",
    objekt: "Nissan Leaf 2020",
    fel: "Elbilen tappar räckvidd och laddar långsamt i laddbox.",
    matvarde: "Cellspänningsspridning 0,21 V mot tillåtna 0,05 V.",
    avvikelse: "Traktionsbatteriets cellspänningsspridning är 0,21 V mot tillåtna 0,05 V, vilket begränsar räckvidd och laddeffekt.",
    atgard: "Byt den avvikande modulen och genomför balansering av batteripaketet.",
  },
  {
    id: "missljud",
    regnr: "TST104",
    objekt: "Skoda Octavia 2019",
    fel: "Tjutande missljud från höger fram vid låg fart.",
    matvarde: "Ljudnivå 74 dB vid höger framnav mot 61 dB på vänster sida.",
    avvikelse: "Höger framnav ger 74 dB mot 61 dB på vänster sida vid samma hastighet, och ljudet ändras med hjullast.",
    atgard: "Byt höger främre hjullager och provkör på samma vägsträcka.",
  },
];

const SLUTSATS = (f) => ({
  motivering:
    `Mätvärdet ${f.matvarde} ligger utanför referensen, och avvikelsen uppträder bara under den belastning ` +
    `där kunden märker felet. Det förklarar varför symptomet är last- och hastighetsberoende, och kopplar ` +
    `underlaget direkt till den fastställda orsaken.`,
  uteslutet:
    `Angränsande komponenter mättes inom tolerans och kunde därför uteslutas. Den enklare förklaringen ` +
    `prövades först och föll bort mot mätdata.`,
  atgardsval:
    `Åtgärden valdes framför justering eftersom mätvärdet ligger utanför toleransen även efter rengöring, ` +
    `och en justering därför inte återställer funktionen.`,
  kvarstaende: "Inget kvarstår. Symptomet reproducerades före åtgärd och är borta vid kvalitetskontrollen.",
});

const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json" };

/** Statisk server för det byggda gränssnittet. */
function servera() {
  return createServer(async (req, res) => {
    const rel = normalize(decodeURIComponent(req.url.split("?")[0])).replace(/^(\.\.[/\\])+/, "");
    const fil = join(DIST, rel === "/" ? "index.html" : rel);
    try {
      const kropp = await readFile(fil);
      res.writeHead(200, { "content-type": MIME[extname(fil)] ?? "application/octet-stream" });
      res.end(kropp);
    } catch {
      res.writeHead(200, { "content-type": "text/html" });
      res.end(await readFile(join(DIST, "index.html")));
    }
  }).listen(PORT);
}

async function kor(sida, fall) {
  let interaktioner = 0;
  const bok = () => (interaktioner += 1);
  const vanta = (ms) => sida.waitForTimeout(ms);
  const btn = (namn, rot = sida) => rot.getByRole("button", { name: namn });
  const panel = (rubrik) => sida.locator("section").filter({ has: sida.locator("h2", { hasText: rubrik }) });

  const finns = async (l) => {
    try {
      return (await l.count()) > 0 && (await l.first().isVisible());
    } catch {
      return false;
    }
  };
  const klicka = async (l) => {
    await l.first().click({ timeout: 5000 });
    bok();
    await vanta(70);
  };
  const fyll = async (l, text) => {
    await l.first().fill(text, { timeout: 5000 });
    bok();
    await vanta(40);
  };
  const foto = async (l) => {
    await l.first().setInputFiles({ name: "b.png", mimeType: "image/png", buffer: PIXEL });
    bok();
    await vanta(240);
  };

  // ---- Starta ärendet ---------------------------------------------------
  await sida.goto(`${BAS}/#/felsokning/nytt`, { waitUntil: "networkidle" });
  await vanta(300);
  await klicka(btn(/Fill in manually/i));
  const start = sida.locator('input:not([type="file"])');
  await fyll(start.nth(0), fall.regnr);
  await fyll(start.nth(1), fall.objekt);
  await klicka(btn(/^Continue$/));
  await vanta(250);
  await klicka(btn(/Correct object/i));
  await vanta(250);
  await fyll(sida.locator("textarea").first(), fall.fel);
  await klicka(btn(/Start work log/i));
  await vanta(700);

  if (!sida.url().includes("/arende/")) throw new Error(`${fall.id}: kom aldrig in i ärendet`);

  // ---- Guiden och panelerna --------------------------------------------
  let metodik = "";
  let felorsakGjord = false;
  let slutsatsfalt = 0;

  for (let varv = 0; varv < 200; varv++) {
    const text = await sida.locator("body").innerText();
    if (!metodik) metodik = text.match(/METHODOLOGY:\s*([^\n·]+)/i)?.[1]?.trim() ?? "";
    if (text.includes("THE DIAGNOSIS IS CLOSED")) break;

    const pre = panel(/Pre-diagnostics/i);
    if (await finns(pre)) {
      const ja = btn(/Yes — checked/i, pre);
      if (await finns(ja)) {
        // Historikkontrollen är en SPÄRR, inte en påminnelse: metodiken
        // får inte gå att nå förbi den. Det prövas här, i det ögonblick
        // frågan står obesvarad på skärmen — senare går det inte att
        // pröva, eftersom svaret då redan är avgivet.
        if (await finns(panel(/Methodology|Step \d/i))) {
          throw new Error("metodiken var nåbar innan fordonets historik besvarats");
        }
        await klicka(ja);
        await klicka(btn(/^Document$/i, pre));
        continue;
      }
      if (await finns(btn(/Photograph the instrument cluster/i, pre))) {
        await foto(pre.locator('input[type="file"]'));
        const falt = pre.locator('input:not([type="file"])');
        if (await finns(falt)) {
          await fyll(falt, "84 320 km");
          await klicka(btn(/Record|Save/i, pre));
        }
        continue;
      }
      if (await finns(btn(/Correct — verified/i, pre))) {
        await klicka(btn(/Correct — verified/i, pre));
        continue;
      }
      if (await finns(btn(/No further observations/i, pre))) {
        await klicka(btn(/No further observations/i, pre));
        continue;
      }
    }

    const guide = panel(/^Methodology:/i);
    if (await finns(guide)) {
      if (await finns(btn(/Take a photograph/i, guide))) {
        await foto(guide.locator('input[type="file"]'));
        continue;
      }
      const verifiera = btn(/Mark as verified/i, guide);
      if (await finns(verifiera)) {
        const falt = guide.locator('input[type="text"], textarea').first();
        if (await finns(falt)) await fyll(falt, fall.matvarde);
        if (!(await verifiera.first().isDisabled())) {
          await klicka(verifiera);
          continue;
        }
      }
      if (await finns(btn(/Save answer/i, guide))) {
        const falt = guide.locator('input[type="text"], textarea').first();
        if (await finns(falt)) await fyll(falt, `Enligt kundens uppgift: ${fall.fel}`);
        await klicka(btn(/Save answer/i, guide));
        continue;
      }
      // Säkerhetsfrågor besvaras jakande; spärren vid Nej provas i
      // enhetstesterna, inte här.
      if (await finns(btn(/^Yes$/, guide))) {
        await klicka(btn(/^Yes$/, guide));
        continue;
      }
      const val = guide.locator("button").filter({ hasNot: sida.locator("svg") });
      if ((await val.count()) > 0 && !text.includes("Every step in the methodology")) {
        await klicka(val.first());
        continue;
      }
    }

    const repro = panel(/reproduction/i);
    if (await finns(repro)) {
      await klicka(btn(/^Yes$/, repro));
      await fyll(repro.locator("textarea"), `${fall.fel} Återskapat vid provkörning under samma förhållanden.`);
      await klicka(btn(/Document reproduction/i, repro));
      continue;
    }

    const fo = panel(/Root cause analysis/i);
    if (!felorsakGjord && (await finns(fo)) && (await finns(btn(/Document root cause/i, fo)))) {
      await klicka(btn(/Document root cause/i, fo));
      await fyll(fo.locator("textarea").first(), fall.avvikelse);
      await klicka(btn(/^Normal wear$/, fo));
      await klicka(btn(/^Measurement result$/, fo));
      // Säkerhetsnivån är ett tak sedan ALVA-SPEC-071: utan spårbart
      // mätdon (lokalt läge har inget register) är taket som högst
      // medel, och vid medel/låg kräver panelen att teknikern anger
      // vilka ytterligare kontroller som skulle stärka bedömningen.
      // Genomgången fyller fältet som en tekniker skulle.
      const ytterligare = fo.locator("label").filter({ hasText: /further checks/i }).locator("textarea, input");
      if (await finns(ytterligare)) {
        await fyll(ytterligare.first(), "Mätning med kalibrerat mätdon skulle stärka bedömningen.");
      }
      await fyll(fo.locator('input[type="text"], textarea').last(), fall.atgard);
      await klicka(btn(/Save root cause/i, fo));
      // En metodik utan mätkontroller har inga mätresultat att luta sig
      // mot; systemet nekar då källan och teknikern byter.
      if (await finns(btn(/Save root cause/i, fo))) {
        await klicka(btn(/^Measurement result$/, fo));
        await klicka(btn(/^Direct observation$/, fo));
        await klicka(btn(/Save root cause/i, fo));
      }
      felorsakGjord = true;
      continue;
    }

    const at = panel(/Action and quality check/i);
    if (await finns(at)) {
      if (await finns(btn(/Give the customer a proposed action/i, at))) {
        await klicka(btn(/Give the customer a proposed action/i, at));
        await klicka(btn(/^Give the proposal$/i, at));
        continue;
      }
      if (await finns(btn(/^Approved$/i, at))) {
        await klicka(btn(/^Approved$/i, at));
        await klicka(btn(/^Telephone$/i, at));
        await klicka(btn(/Record the decision/i, at));
        continue;
      }
      if (await finns(btn(/Document the action performed/i, at))) {
        await klicka(btn(/Document the action performed/i, at));
        await fyll(at.locator("textarea").first(), `${fall.atgard} Utfört enligt den dokumenterade felorsaken.`);
        await klicka(btn(/Save action/i, at));
        continue;
      }
      if (await finns(btn(/Symptom is gone/i, at))) {
        await klicka(btn(/Symptom is gone/i, at));
        await fyll(at.locator("textarea").first(), "Ny provkörning på samma vägsträcka — symptomet uppträder inte längre.");
        await klicka(btn(/Save quality check/i, at));
        continue;
      }
    }

    const mat = panel(/Outgoing odometer reading/i);
    if (await finns(mat)) {
      await foto(mat.locator('input[type="file"]'));
      const falt = mat.locator('input:not([type="file"])');
      if (await finns(falt)) {
        await fyll(falt, "84 520 km");
        await klicka(btn(/Record|Save/i, mat));
      }
      continue;
    }

    if (await finns(sida.locator("#slutsats-motivering"))) {
      const synliga = await sida.locator('textarea[id^="slutsats-"]').count();
      if (synliga > slutsatsfalt) {
        for (const [id, txt] of Object.entries(SLUTSATS(fall))) {
          const f = sida.locator(`#slutsats-${id}`);
          if (await finns(f)) await fyll(f, txt);
        }
        const reg = btn(/Record closing statement|Update closing statement/i);
        if ((await finns(reg)) && !(await reg.first().isDisabled())) {
          await klicka(reg);
          slutsatsfalt = synliga;
          continue;
        }
      }
    }

    const avsluta = btn(/^Close diagnosis$/i);
    if ((await finns(avsluta)) && !(await avsluta.last().isDisabled())) {
      await klicka(avsluta.last());
      continue;
    }

    break;
  }

  const slut = await sida.locator("body").innerText();
  const hinder = (await sida.locator("li").allInnerTexts()).filter((t) => t.length > 12).slice(0, 4);

  // Allt klienten faktiskt producerade, mot det stängda schemat.
  const handelser = await sida.evaluate(() => {
    const ut = [];
    for (let i = 0; i < localStorage.length; i++) {
      try {
        const v = JSON.parse(localStorage.getItem(localStorage.key(i)));
        const arenden = v?.state?.arenden ?? v?.arenden;
        if (arenden) for (const a of Object.values(arenden)) ut.push(...(a.handelser ?? []));
      } catch {
        /* inte vår nyckel */
      }
    }
    return ut.map((p) => p.handelse);
  });

  return {
    metodik,
    avslutat: slut.includes("THE DIAGNOSIS IS CLOSED"),
    interaktioner,
    handelser: handelser.length,
    avvisade: handelser.map((h) => [h?.typ, granskaHändelse(h)]).filter(([, fel]) => fel !== null),
    hinder,
  };
}

/**
 * Letar text som rinner ur sin ruta.
 *
 * Bara element med egen text och synlig overflow: ett spill där räknas
 * alltid som ett fel, eftersom bokstäverna hamnar ovanpå grannen.
 */
async function overspill(sida) {
  return sida.evaluate(() =>
    [...document.querySelectorAll("body *")]
      .filter((el) => {
        if (el.children.length > 0) return false;
        if (!(el.textContent ?? "").trim()) return false;
        if (getComputedStyle(el).overflowX !== "visible") return false;
        return el.clientWidth > 0 && el.scrollWidth - el.clientWidth > 1;
      })
      .slice(0, 5)
      .map((el) => `"${(el.textContent ?? "").trim().slice(0, 30)}" (+${el.scrollWidth - el.clientWidth} px)`),
  );
}

// ---- Körning -------------------------------------------------------------
//
// Bygget görs härifrån, med den miljö genomgången kräver, i stället för
// att lämnas åt den som startar kommandot. Två variabler avgör om appen
// över huvud taget renderar:
//
//   VITE_HASH_ROUTER            Sidan serveras utan historik-routing, så
//                               utan hash matchar ingen route.
//   VITE_SUPABASE_*             Den gamla butiksklienten byggs fortfarande
//                               med och konstrueras vid import. Saknas
//                               värdena kastar den innan routern monteras
//                               och hela sidan blir tom — det tog en halv
//                               felsökning att förstå första gången.
//
// Platshållarna pekar på en adress som inte finns. Det är avsiktligt:
// genomgången ska aldrig nå ett nät.

if (!process.env.GENOMGANG_HOPPA_BYGG) {
  execFileSync("npx", ["vite", "build"], {
    cwd: ROT,
    stdio: ["ignore", "ignore", "inherit"],
    env: {
      ...process.env,
      VITE_HASH_ROUTER: "1",
      VITE_SUPABASE_URL: "https://genomgang.invalid",
      VITE_SUPABASE_PUBLISHABLE_KEY: "genomgang",
    },
  });
}

if (!existsSync(join(DIST, "index.html"))) {
  console.error(`Inget bygge i ${DIST}.`);
  process.exit(1);
}

const server = servera();
const webblasare = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM ?? undefined,
});

const fel = [];
const rader = [];

try {
  for (const fall of FALL) {
    const ctx = await webblasare.newContext({ viewport: { width: 1440, height: 1000 } });
    const sida = await ctx.newPage();
    await sida.goto(`${BAS}/#/felsokning`, { waitUntil: "networkidle" });
    await sida.waitForTimeout(300);
    if (await sida.locator("input").count()) {
      await sida.locator("input").first().fill("Anna Tekniker");
      await sida.getByRole("button").first().click();
      await sida.waitForTimeout(300);
    }

    const r = await kor(sida, fall);
    rader.push({ fall: fall.id, ...r });
    await ctx.close();

    if (!r.avslutat) fel.push(`${fall.id}: nådde aldrig avslutat läge. Kvarvarande hinder: ${r.hinder.join(" | ") || "(inga visade)"}`);
    if (r.avvisade.length > 0) fel.push(`${fall.id}: ${r.avvisade.length} händelser avvisas av schemat — ${JSON.stringify(r.avvisade.slice(0, 3))}`);
    if (r.interaktioner > BUDGET) fel.push(`${fall.id}: ${r.interaktioner} interaktioner överskrider budgeten ${BUDGET}`);
    if (r.handelser === 0) fel.push(`${fall.id}: ingen händelse hamnade i loggen`);
  }
  // ---- Layoutkontroll i telefonbredd ------------------------------------
  //
  // Portalens vyer har inga ärenden att köra igenom, men de är det som
  // faktiskt gick sönder. Mätningen görs där felet uppstod.
  const ctx = await webblasare.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const sida = await ctx.newPage();
  for (const vag of [
    "/alva",
    "/alva/ansokan",
    "/alva/logga-in",
    "/alva/portal",
    "/alva/portal/analys",
    "/alva/portal/kunskapskallor",
    "/alva/portal/integration",
    "/alva/portal/fakturor",
    "/alva/portal/abonnemang",
    "/alva/portal/garantier",
    "/alva/portal/forsakring",
    "/alva/portal/support",
    "/alva/impressum",
    "/alva/utgavor",
  ]) {
    await sida.goto(`${BAS}/#${vag}`, { waitUntil: "networkidle" });
    await sida.waitForTimeout(400);

    const bred = await sida.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth));
    if (bred > 391) fel.push(`${vag}: dokumentet är ${bred} px brett på en 390 px-skärm`);

    const spill = await overspill(sida);
    if (spill.length > 0) fel.push(`${vag}: text rinner ur sin ruta — ${spill.join(" · ")}`);
  }
  await ctx.close();
} finally {
  await webblasare.close();
  server.close();
}

const bredd = Math.max(...rader.map((r) => r.fall.length));
for (const r of rader) {
  console.log(
    `${r.fall.padEnd(bredd)}  ${String(r.interaktioner).padStart(3)} interaktioner  ` +
      `${String(r.handelser).padStart(3)} händelser  ${r.avslutat ? "avslutat" : "ÖPPET"}  ${r.metodik}`,
  );
}

if (fel.length > 0) {
  console.error(`\nGenomgången misslyckades (${fel.length}):`);
  for (const f of fel) console.error(`  · ${f}`);
  process.exit(1);
}

console.log(`\n${rader.length}/${rader.length} ärenden avslutade · budget ${BUDGET} interaktioner · schemat rent`);
