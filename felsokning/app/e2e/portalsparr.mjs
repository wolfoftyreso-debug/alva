// Portalspärren (revision 2, m-9).
//
// Anmärkningen var att en inloggning som SER ut att autentisera ger
// portalen bakom den en auktoritet den inte har. Rättelsen är att spärren
// blir verklig där det finns något att spärra mot: är plattformen
// konfigurerad krävs en giltig session, annars är portalen uttryckligen
// märkt som demonstration.
//
// ---- Varför en egen körning och inte ett enhetstest ------------------
//
// Sviten kan bara läsa källkod och se att vakten är inkopplad. Släpper
// den ändå igenom — fel villkor, fel ordning, ett <Navigate> som aldrig
// hinner rendera — ser koden likadan ut. Och en spärr som inte spärrar
// är exakt det m-9 handlade om.
//
// Bygget görs därför här, med plattformen konfigurerad, och kontrollen
// tittar var man faktiskt hamnar. Adressen pekar på ett värdnamn som inte
// finns: spärren ska hålla utan att någon server svarar.

import { execFileSync } from "node:child_process";
import { createServer } from "node:http";
import { existsSync, readFileSync } from "node:fs";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const ROT = dirname(dirname(fileURLToPath(import.meta.url)));
const DIST = join(ROT, "dist");
const PORT = 4271;
const BAS = `http://127.0.0.1:${PORT}`;

const VYER = [
  "/alva/portal",
  "/alva/portal/analys",
  "/alva/portal/kunskapskallor",
  "/alva/portal/integration",
  "/alva/portal/fakturor",
  "/alva/portal/abonnemang",
  "/alva/portal/garantier",
  "/alva/portal/forsakring",
  "/alva/portal/support",
];

// Nycklarna är plattformsklientens egna (src/felsokning/plattform.ts).
// Skulle de byta namn ska den här kontrollen falla, inte tyst sluta mäta:
// en session som läggs under fel nyckel ger samma utfall som ingen
// session, och då hade "spärrad" sett ut som ett godkänt resultat.
const TOKEN_NYCKEL = "gf-plattform-token";
const KONTO_NYCKEL = "gf-plattform-konto";

const TYPER = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".woff2": "font/woff2",
  ".svg": "image/svg+xml",
};

if (!process.env.GENOMGANG_HOPPA_BYGG) {
  execFileSync("npx", ["vite", "build"], {
    cwd: ROT,
    stdio: ["ignore", "ignore", "inherit"],
    env: {
      ...process.env,
      VITE_HASH_ROUTER: "1",
      VITE_PLATTFORM_URL: "https://plattform.invalid",
      VITE_SUPABASE_URL: "https://portalsparr.invalid",
      VITE_SUPABASE_PUBLISHABLE_KEY: "portalsparr",
    },
  });
}

if (!existsSync(join(DIST, "index.html"))) {
  console.error(`Inget bygge i ${DIST}.`);
  process.exit(1);
}

const server = createServer((req, res) => {
  const vag = decodeURIComponent(req.url.split("?")[0]);
  const fil = join(DIST, vag === "/" ? "index.html" : vag);
  const mal = existsSync(fil) && extname(fil) ? fil : join(DIST, "index.html");
  res.writeHead(200, { "Content-Type": TYPER[extname(mal)] ?? "application/octet-stream" });
  res.end(readFileSync(mal));
}).listen(PORT);

const webblasare = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM ?? undefined,
});

let fel = 0;
const kontroll = (namn, faktiskt, vantat) => {
  if (faktiskt === vantat) console.log(`✓ ${namn}`);
  else {
    fel++;
    console.log(`✗ ${namn}: fick '${faktiskt}', väntade '${vantat}'`);
  }
};
const hash = (sida) => new URL(sida.url()).hash;

try {
  // ---- Utan session -----------------------------------------------------
  {
    const ctx = await webblasare.newContext();
    const s = await ctx.newPage();
    for (const vy of VYER) {
      await s.goto(`${BAS}/#${vy}`, { waitUntil: "networkidle" });
      await s.waitForTimeout(300);
      kontroll(`${vy} spärras`, hash(s), "#/alva/logga-in");
    }
    await ctx.close();
  }

  // ---- Med session ------------------------------------------------------
  //
  // Sessionen läggs in som inloggningen skulle ha lagt in den. Spärren
  // ska öppna — annars är den inte en spärr utan ett hinder.
  {
    const ctx = await webblasare.newContext();
    const s = await ctx.newPage();
    await s.goto(`${BAS}/#/alva`, { waitUntil: "networkidle" });
    await s.evaluate(
      ([tn, kn]) => {
        localStorage.setItem(tn, "provtoken");
        localStorage.setItem(kn, JSON.stringify({ namn: "Anna", roll: "admin", organisation: "Verkstad A" }));
      },
      [TOKEN_NYCKEL, KONTO_NYCKEL],
    );

    for (const vy of VYER) {
      await s.goto(`${BAS}/#${vy}`, { waitUntil: "networkidle" });
      await s.waitForTimeout(300);
      kontroll(`${vy} öppnas med session`, hash(s), `#${vy}`);
    }

    // Utloggningen ska både finnas och verkligen avsluta sessionen. En
    // knapp som navigerar utan att rensa token vore samma sken igen.
    await s.goto(`${BAS}/#/alva/portal`, { waitUntil: "networkidle" });
    await s.waitForTimeout(300);
    const knapp = s.getByRole("button", { name: /sign out/i });
    kontroll("utloggning finns i portalen", await knapp.count(), 1);
    await knapp.click();
    await s.waitForTimeout(500);
    kontroll("utloggning leder till inloggningen", hash(s), "#/alva/logga-in");
    kontroll("token är borta", await s.evaluate((tn) => localStorage.getItem(tn), TOKEN_NYCKEL), null);

    await s.goto(`${BAS}/#/alva/portal`, { waitUntil: "networkidle" });
    await s.waitForTimeout(300);
    kontroll("portalen är stängd igen efter utloggning", hash(s), "#/alva/logga-in");
    await ctx.close();
  }
} finally {
  await webblasare.close();
  server.close();
}

console.log(fel === 0 ? "\nportalspärren håller" : `\n${fel} fel`);
process.exit(fel === 0 ? 0 : 1);
