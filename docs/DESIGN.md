# ALVA · Designpaketet

**ALVA 3.6 · ALVA-SPEC-001 i paketform.** Allt som behövs för att bygga
gränssnitt som ser ut och beter sig som ALVA — regler, palett,
typografi med snittfiler, och komponentbiblioteket i källkod. Reglerna
är inte stilistiska önskemål: de flesta är låsta av tester som läser
källkoden och fäller bygget vid avsteg.

## 1. Identiteten

ALVA är ett industriverktyg i tysk verkstadstradition (DIN), inte en
konsumentapp. Det första intrycket ska vara detsamma som från ett
kalibrerat mätinstrument: sakligt, tätt, entydigt. Därav följer allt
annat: nästan monokrom palett, versala etiketter, räta hörn, ingen
dekoration.

## 2. Paletten — sju färger, inga fler

| Namn | Hex | Används till |
| --- | --- | --- |
| Graphite | `#1B1E22` | Brödtext, rubriker, avslutad status |
| Steel | `#4D5662` | Sekundärtext, etiketter, inaktiva länkar |
| Light Steel | `#D7DCE2` | Ramar och avdelare — den enda linjefärgen |
| Background | `#F6F7F8` | Sidbakgrund |
| White | `#FFFFFF` | Ytor: kort, sidhuvud, fält |
| ALVA Blue | `#005CA9` | ENDAST aktivt steg, verifierad status, markerad komponent — aldrig dekoration |
| Varning / Stoppat | `#8A5A00` / `#8B1A1A` | Semantik, inte accent: förfallet respektive spärrat. Bärs alltid av text också, aldrig enbart av färg |

Inga gradienter. Inga skuggor som bär betydelse. Räta hörn överallt.

## 3. Rutnätet — 8 px, undantagslöst

All yttre och inre luft ligger på 8-pixelrutnätet: endast jämna
Tailwind-steg (`p-2`, `gap-4`, `py-6`, `mt-8` …) — låst av test. Ett
rutnät med undantag är inget rutnät.

Layoutmått: innehållsbredd max `1040px`, sidmarginal `px-6`,
sektionsavstånd `py-12`, sidhuvud `py-4`. Allt innehåll ska hålla sig
inom skärmen ned till 390 px bredd utan sidledsscroll — tabeller får en
egen smal, staplad form (`<dt>/<dd>`) i stället för att scrolla.

## 4. Typografin

Snittkedjan (deklareras i `system.ts`, speglas i CSS så kaskaden når
allt): **DIN 2014 → FF DIN → IBM Plex Sans → Inter → Helvetica Neue →
system-ui**. Aldrig en antikva, inte ens sist i kedjan. IBM Plex Sans
och Plex Mono följer med som woff2 i paketet (OFL-licens bifogad) —
mono används för beteckningar och identiteter (`ALVA-ORG-0142`).
`font-variant-numeric: tabular-nums` på hela ytan — siffror står i
kolumn, beteckningar jämförs oftare än de läses.

Grader som används (px): 10 (sidhuvudets utläsning), 11 (etiketter,
statusmärken — versaler, spärrning `0.08em`), 12 (navigation, tabell),
13 (brödtext i kort), 15 (ingress), 16/22/32 (rubriknivå 3/2/1 —
versaler, spärrning `0.02em`). Sektionsrubriker är ETIKETTER i
versaler, inte meningar.

## 5. Ikonerna — fyra tecken

`✓` klar · `○` pågående · `□` väntar · `→` nästa. Inget annat: inga
ikonbibliotek, inga emojier, inga illustrationer. En status som inte
kan uttryckas med de fyra är inte färdigtänkt. Status anges alltid
med ord bredvid tecknet — aldrig enbart färg eller symbol.

## 6. Rörelse — ingen

Ingen animation, ingen övergång, inget som rör sig vid sidladdning.
En animation som inte bär information är brus, och ett värde som rör
sig är svårare att läsa av än ett som står stilla.

## 7. Komponentbiblioteket (`komponenter.tsx`)

Ett bibliotek, två användningar: publika webben och det inloggade
gränssnittet är samma system — inloggningen byter aldrig värld.

| Komponent | Roll |
| --- | --- |
| `FARG` | Paletten som konstant — enda källan till färgvärden |
| `Etikett` | Versal sektionsetikett (11 px, spärrad) |
| `Rubrik` | Rubriknivå 1–3, versaler |
| `Symbol` | De fyra ikontecknen |
| `Statusmärke` | Status med ord i ram — läsbar även i svartvitt |
| `Falt` | Etikett + värde, radformen i kort |
| `Block` | Kortet: rubrik, beteckning (`ALVA-…`), innehåll |
| `Demonstration` | Märkning av exempeldata — demo ser aldrig ut som verklighet |
| `Fasrad` | Metodens fyra faser med aktivt/klart läge |
| `Procedurvy` | Stegvis procedur med status per steg |
| `Knapp` | Primär (blå), sekundär (ram), aldrig mer än en primär per vy |
| `Textfalt` | Inmatning med etikett |
| `Tabell` | Bred form + automatisk smal, staplad form under `sm` |

Mönsterregler: markera ALDRIG en yta som klickbar utan att hela ytan
är det; aktiv navigering markeras med ALVA Blue + `aria-current`;
exempeldata märks alltid med `Demonstration`.

## 8. Språkgränsen

ALVA:s **struktur** är engelsk och oföränderlig — fasnamnen (Analysis,
Localization, Verification, Action), statusorden, portalens
navigering. **Innehållet** talar arbetsspråket (tio språk). Publika
webben talar besökarens språk; portalen är produkten och talar
organisationens.

## 9. Filerna i paketet

    DESIGN.md            Denna fil — reglerna
    komponenter.tsx      Komponentbiblioteket (React + TypeScript)
    system.ts            ALVA-konstanterna: namn, faser, snittkedja
    alva-yta.css         Kaskadreglerna som bär snittet till hela ytan
    typsnitt.css         @font-face-deklarationerna
    typsnitt/            IBM Plex woff2 + licens

Komponenterna förutsätter Tailwind (endast standardsteg) och React.
Snittfilerna är självhostade — inga externa typsnittstjänster, av
samma skäl som allt annat i ALVA är egenhostat.

---

*Ett värde som rör sig är svårare att läsa än ett som står stilla.*
