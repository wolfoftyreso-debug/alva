// ALVA — service worker.
//
// Regeln som styr allt här: EN DEPLOY FÅR ALDRIG FASTNA I CACHEN.
// Navigeringar (index.html) hämtas därför alltid nätverk-först — cachen
// är reserv för offline, aldrig förstahandskälla. Vites hashade filer
// under /assets/ är oföränderliga per definition och cachas hårt.
//
// Föregångaren gjorde tvärtom (cache-först på '/', konstant cachenamn):
// efter varje deploy serverades en gammal index.html som pekade på
// utrensade filer — vit skärm tills användaren själv rensade cachen.
//
// API:erna (/api, /ai) rörs aldrig: diagnosdata får inte serveras ur en
// cache, och ett avslut som "lyckades" offline vore en lögn.

const CACHE = "alva-2026-08-17";
const KARNA = ["/", "/manifest.json", "/icon-192x192.png", "/icon-512x512.png"];

self.addEventListener("install", (h) => {
  h.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(KARNA))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (h) => {
  h.waitUntil(
    caches
      .keys()
      .then((namn) => Promise.all(namn.filter((n) => n !== CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (h) => {
  const beg = h.request;
  if (beg.method !== "GET") return;
  const url = new URL(beg.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/ai/")) return;

  // Navigeringar: nätverk först, cache som offline-reserv.
  if (beg.mode === "navigate") {
    h.respondWith(
      fetch(beg)
        .then((svar) => {
          const kopia = svar.clone();
          caches.open(CACHE).then((c) => c.put("/", kopia));
          return svar;
        })
        .catch(() => caches.match("/")),
    );
    return;
  }

  // Hashade byggfiler: oföränderliga, cache först.
  if (url.pathname.startsWith("/assets/")) {
    h.respondWith(
      caches.match(beg).then(
        (traff) =>
          traff ??
          fetch(beg).then((svar) => {
            if (svar.ok) {
              const kopia = svar.clone();
              caches.open(CACHE).then((c) => c.put(beg, kopia));
            }
            return svar;
          }),
      ),
    );
    return;
  }

  // Övrigt (ikoner, manifest): nätverk med cache som reserv.
  h.respondWith(fetch(beg).catch(() => caches.match(beg)));
});
