# Flätningen av serverkopians arbete

**ALVA-DOC-0012 · påbörjad 2026-08-17 · uppdateras per lyft**

Bakgrund: produktionskopian på EC2 (`alva.landvex.com`) drev 63 commits
och 391 ocommitterade filer före GitHub `main`, byggda utan att
kontraktssviten kördes — 224 av 1119 tester röda på dess HEAD, och
kopians egen regressionsrapport konstaterade att samtliga
webbläsartester föll. Beslutet: GitHub `main` är enda sanningskälla,
och kopians funktioner lyfts in EN i taget genom sviten — grönt eller
inte in. Detta dokument bokför varje lyft och varje avvisning, med
skäl.

## Lyft 1 · PWA — installerbar app (KLART)

Ur kopians commits `0beb055`/`fe17107`. Substansen behållen: manifest,
ikonuppsättning 72–512 px, service worker, tyst registrering,
start i diagnosrutan (`/felsokning` — samma beslut som flödesarbetet
i `8e17c59` tog oberoende).

Defekter rättade i lyftet, nu testlåsta (`pwa.test.ts`, 16 tester):

| Kopians defekt | Rättelse |
| --- | --- |
| Service workern servade navigeringar cache-först med konstant cachenamn — varje deploy gav gammal `index.html` mot utrensade filer: vit skärm | Nätverk-först för navigeringar, cachen enbart offline-reserv; daterat cachenamn; `/index.html` aldrig i kärnlistan |
| `/ai` cachades (bara `/api` undantogs) | Båda API:erna orörda av cachen |
| Manifestfärger ungefär lika designsystemets (`#F8F9FA`) | Exakt `FARG.background`/`FARG.blue`, låst mot komponentbiblioteket |
| Döda referenser till skärmdumpar som inte fanns | Borttagna; testet kräver att allt manifestet pekar på existerar |
| Generiska PIL-ikoner | ALVA:s märke enligt designsystemet: vit yta, grafit ordbild, blått streck; riktiga PNG:er i utlovade mått, verifierat per fil |
| Registrering ovillkorad | Bara produktionsbygge + säker kontext, tyst fall |

Verifiering: 807 tester gröna (16 nya), typkontroll ren, bygget bär
PWA-filerna, rökprovet rent, `sw.js` serveras `no-cache` så att nya
versioner når ut.

## Avvisat — med skäl

| Spår i kopian | Skäl |
| --- | --- |
| `rename-events.sh` och sed-översatta identifierare (`gatea`, `granskaConclusion`, `warranties.mjs` …) | Bryter det slutna händelseschemat klient/server och lämnar halvöversatta namn — 55 anrop till funktioner som inte finns. Engelska namn är en versionerad schemamigrering med arvsmappning, inte sök-och-ersätt |
| Egen parallellimplementation av diagnosfönstret (`DiagnosSession`, `DiagnosWindowManager`, `CasePage`) | Samma funktion finns redan i `main` (`8e17c59`), byggd genom sviten |
| Mörkt läge / "Premium dark mode UI" | Strider mot designsystemet (ALVA-SPEC-001); ogjort i kopian själv av samma skäl ("Ljus, professionell UI for OEM") |
| PM2-konfig parallellt med systemd | En driftmekanism. Enservern under systemd är den dokumenterade formen |

## Kvar att lyfta

1. **Ljuddiagnosen** — störst värde, kräver omkonstruktion:
   backend är Express+SQLite+ML-paket, plattformens regler säger
   ramverkslöst + Postgres. Frontenden (1 948 rader) återanvänds.
2. **Faktureringstimern** — anpassas till månadsfaktureringens
   befintliga modell i `services/plattform`.
3. **EC2-driftformen som dokument** — kopians fungerande
   nginx+systemd-deploy, städad till `docs/DRIFT-EC2.md`.
