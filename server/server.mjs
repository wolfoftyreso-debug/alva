// ALVA — hela produkten i en process.
//
// Den här servern är den enkla driftformen: landningssidan, portalen
// och felsökningsverktyget som statiska filer, plattformens API under
// /api och AI-orkestern under /ai — samma ursprung, en port, en
// container. Kubernetes-driften i infra/ kör i stället tjänsterna som
// egna poddar; båda formerna använder exakt samma tjänstekod, den här
// filen komponerar den bara.
//
//   PORT        lyssnarport, default 8080
//   APP_DIST    katalog med byggd klient, default ../app/dist
//
// Klienten ska vara byggd med VITE_PLATTFORM_URL=/api och
// VITE_AI_ORKESTER_URL=/ai — då går varje anrop till samma ursprung
// och ingen CORS-konfiguration behövs. Dockerfilen i repo-roten gör
// exakt det.
//
// Tjänsterna importeras, de startas inte: server.mjs i respektive
// tjänst lyssnar bara när den är processens huvudmodul. Delegeringen
// sker genom att begäran sänds vidare till tjänstens server-instans
// med prefixet avskalat — tjänsterna ser samma vägar som i egen drift.

import { createServer } from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import { extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { skapaServer as skapaPlattform } from "../services/plattform/server.mjs";
import { skapaServer as skapaOrkester } from "../services/ai-orkester/server.mjs";

const ROT = fileURLToPath(new URL(".", import.meta.url));
const PORT = Number(process.env.PORT ?? 8080);
const DIST = resolve(process.env.APP_DIST ?? join(ROT, "..", "app", "dist"));

// Utan byggd klient finns ingen produkt att servera. Ett tydligt stopp
// vid start är bättre än 404 på roten i drift.
if (!existsSync(join(DIST, "index.html"))) {
  console.error(
    `Ingen byggd klient i ${DIST}.\n` +
      `Bygg först:  cd app && npm ci && VITE_PLATTFORM_URL=/api VITE_AI_ORKESTER_URL=/ai npm run build\n` +
      `eller peka APP_DIST på en byggkatalog.`,
  );
  process.exit(1);
}

const plattform = skapaPlattform();
const orkester = skapaOrkester();

// ---- Statiska filer ----------------------------------------------------

const TYPER = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".woff2": "font/woff2",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".webmanifest": "application/manifest+json",
};

function serveraFil(res, fil, { status = 200, hashad = false } = {}) {
  const andelse = extname(fil);
  res.writeHead(status, {
    "Content-Type": TYPER[andelse] ?? "application/octet-stream",
    "Content-Length": statSync(fil).size,
    "X-Content-Type-Options": "nosniff",
    // Vites filnamn under assets/ bär innehållshash — de kan cachas för
    // alltid. index.html får aldrig cachas: den pekar ut nästa version.
    //
    // Beslutet tas på REQUEST-vägen, inte på den absoluta sökvägen: en
    // APP_DIST som råkar ligga under en katalog med "assets" i namnet
    // hade annars gjort även index.html odödlig, och klienterna fastnat
    // på en gammal build utan att någon förstod varför.
    "Cache-Control": hashad ? "public, max-age=31536000, immutable" : "no-cache",
  });
  createReadStream(fil).pipe(res);
}

function serveraStatiskt(req, res) {
  const vag = decodeURIComponent((req.url ?? "/").split("?")[0]);
  // normalize + prefixkontroll stänger ../-vägar utan specialfall.
  const fil = normalize(join(DIST, vag === "/" ? "index.html" : vag));
  // Avslutande separator i jämförelsen: utan den passerar en grannkatalog
  // vars namn BÖRJAR med dist-katalogens (t.ex. app/dist-backup).
  if (fil !== DIST && !fil.startsWith(DIST + sep)) {
    res.writeHead(400).end();
    return;
  }
  if (existsSync(fil) && statSync(fil).isFile()) {
    serveraFil(res, fil, { hashad: vag.startsWith("/assets/") });
    return;
  }
  // SPA-reserv: vägar utan filändelse är klientens rutter (/, /alva/…,
  // /felsokning/…) och får index.html; en saknad fil MED ändelse är ett
  // riktigt 404 — en trasig referens ska synas, inte maskeras.
  if (!extname(vag)) {
    serveraFil(res, join(DIST, "index.html"));
    return;
  }
  res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }).end("404");
}

// ---- Sammansättningen --------------------------------------------------

// Delegering till en tjänst: prefixet skalas av så att tjänsten ser
// samma vägar som i egen drift, och begäran sänds till dess server-
// instans. Tjänstens hela beteende — CORS, spårning, fel — följer med.
function delegera(tjanst, prefix, req, res) {
  req.url = req.url.slice(prefix.length) || "/";
  tjanst.emit("request", req, res);
}

const server = createServer((req, res) => {
  const vag = (req.url ?? "/").split("?")[0];

  if (vag === "/api" || vag.startsWith("/api/")) return delegera(plattform, "/api", req, res);
  if (vag === "/ai" || vag.startsWith("/ai/")) return delegera(orkester, "/ai", req, res);

  // Egen hälsa: svarar servern alls. Tjänsternas egna hälsokontroller
  // nås via /api/halsa respektive /ai/halsa och säger mer.
  if (vag === "/halsa") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "uppe", delar: ["web", "/api", "/ai"] }));
    return;
  }

  serveraStatiskt(req, res);
});

// ---- Livscykel ---------------------------------------------------------

const ärHuvudmodul = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (ärHuvudmodul) {
  server.listen(PORT, () => {
    console.log(`ALVA lyssnar på :${PORT} — webb på /, API på /api, AI på /ai`);
  });
  // Stäng ordnat på signal: pågående svar får avslutas, nya nekas.
  for (const signal of ["SIGTERM", "SIGINT"]) {
    process.on(signal, () => {
      server.close(() => process.exit(0));
      // Håller något anslutningen öppen längre än så är avbrottet rätt.
      setTimeout(() => process.exit(0), 5000).unref();
    });
  }
}

export { server, serveraStatiskt };
