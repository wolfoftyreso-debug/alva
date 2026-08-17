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

## Lyft 2 · EC2-driftformen som dokument (KLART)

`docs/DRIFT-EC2.md` (ALVA-DOC-0013): kopians fungerande
nginx+systemd-deploy i allmängiltig form. Rättat i lyftet: nycklar i
miljöfil i stället för i systemd-enheten (kopians enhet bar skarpa
nycklar i klartext — rotationskrav dokumenterat), en driftmekanism
(PM2 struken), CSP utan externa typsnittstjänster, DNS-utmaning för
certbot bakom proxy, maskinen som konsument av main.

## Lyft 3 · Ljuddiagnosen — lokal akustisk analys (KLART)

Ur kopians missljudsarbete (`49f0544` m.fl.). Substansen behållen:
mätsekvenserna A–F, spektralanalysen, stoppreglerna, hypotesflödet.
Rättat i lyftet, låst av 12 nya tester (`ljuddiagnos.test.ts`):

| Kopians defekt | Rättelse |
| --- | --- |
| Egen händelsetyp "ljudanalys" intvingad med typcast — serverns slutna schema hade avvisat varje sådan händelse | Mätningen dokumenteras som schemats egna typer (`matvarde`, `observation`, `hypotes`); varje händelse prövas i test mot serverns `granskaHändelse` |
| Naiv DFT, O(N²) per ram — miljardtals operationer för tio sekunder ljud | Radix-2-FFT; Parsevalkontroll i test, ren ton återfinns inom en bins upplösning |
| Hypoteser med "sannolikhet per komponent" presenterade som diagnos | Förslag formulerade ur ordningstalet (den ärliga akustiska grunden), alltid nivå medel/lag, dokumenteras bara på teknikerns eget klick |
| Kräver ljudserver (Express+SQLite+ML) för all analys | Analysen körs helt i webbläsaren; serverjämförelse mot referensprofiler bokförd som eget framtida lyft |
| Panelen okopplad — död kod i kopians HEAD | Monterad i ärendevyn, hopfälld tills den behövs, verifierad i webbläsare vid 390 px |

## Lyft 4 · Faktureringstimern — schemalagd drift av befintliga jobb (KLART)

Kopians billing-arbete var till största delen en PARALLELL värld:
eget databasschema, egen cron i frontendträdet körd med tsx, egen
e-postmodul — ovanpå en plattform som redan hade idempotent
månadsfakturering (`manadsfakturering.mjs`), PDF, betalregistrering
och ett tillstånd (aktiv/varning/låst) som HÄRLEDS ur obetalda
förfallna fakturor med respitdagar. Det riktiga behovet var
schemaläggningen — kopians timeridé, riktad mot rätt lager:

- `infra/systemd/alva-fakturering.service` + `.timer` (dagligen 06:00
  UTC, Persistent) kör plattformens eget jobb.
- `infra/systemd/alva-gallring.service` + `.timer` (05:00 UTC) — samma
  fynd i förbifarten: gallringen var också oschemalagd, och utan den
  är lagringsbegränsningen en avsikt, inte en kontroll (TÜV T-4).
- Inga nycklar i enheterna: `EnvironmentFile=/etc/alva/miljo`.
- Driftavsnitt i `docs/DRIFT-EC2.md` §8; enheterna testlåsta
  (`drift.test.ts`): jobbfilerna finns, miljöfil i stället för
  inbäddade hemligheter, Persistent på båda timerna.

Avvisat ur kopians billing: parallellschemat och e-postpåminnelserna.
Tillstånden behöver ingen påminnelsekörning (de härleds), och en
e-postkanal är ett eget beslut med egen infrastruktur — bokförs som
kandidat, inte som smygberoende.

## Lyft 5 · Ljudreferensprofiler — ramverkslöst, utan påhittade referenser (KLART)

Mekanismen ur kopians ljudtjänst — profil per fordonstyp och
mätsekvens med medel/spridning per särdrag, z-jämförelse — omkonstruerad
enligt plattformens regler. Det viktigaste ärlighetsfyndet: kopians tre
"tränade referensprofiler" för namngivna bilmodeller var SYNTETISKA
(identiska toppvärden, "5 inspelningar" som aldrig gjorts). De följde
inte med.

| Kopians konstruktion | Lyftets |
| --- | --- |
| Express+SQLite+ML-paket, egen tjänst med ljuduppladdning | Delad ren modul (`ljudprofil.mjs`, identisk klient/server som spärrlistorna) + tre routes i plattformen med pg. Servern jämför SÄRDRAG (tyngdpunkt + åtta bandenergier) — ljudet lämnar aldrig webbläsaren |
| Fabriksprofiler som såg tränade ut | Inga. En profil byggs enbart av organisationens egna inspelningar, märkta friska av teknikern — och under tre inspelningar svarar jämförelsen att referensen inte räcker |
| Godtycklig std i syntetdata | Welford-uppdatering med spridningsgolv, låst mot naiva formler i test |

Verifiering: 17 nya enhetstester (Welford, z-gränser, ärlighetsreglerna,
modulparitet klient/server) och sju nya integrationskontroller mot
riktig Postgres (obrukbar under tre, brukbar från tre, inom/avvikande,
organisationsisolering). I förbifarten rättades plattformens Dockerfile:
kopieringslistan saknade merparten av serverns moduler — containern
hade kraschat på första importen.

## Kvar att lyfta

1. **E-postkanal** (fakturor, påminnelser) — eget beslut om transport
   (självhostad SMTP-relä kontra SES) innan något får skicka.

Därmed är samtliga lyftbara spår ur serverkopian antingen inflätade
eller avvisade med skäl. Flätningen är avslutad; e-postkanalen står
kvar som öppet beslut.
