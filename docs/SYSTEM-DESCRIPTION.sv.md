# Guidad Felsökning — fullständig systembeskrivning

> **Svensk översättning.** Källan är [SYSTEM-DESCRIPTION.md](SYSTEM-DESCRIPTION.md)
> (engelska). Vid avvikelse gäller det engelska dokumentet.
>
> **Kodidentifierare översätts inte** — och behöver det inte här: koden är
> svensk. Det är värt att notera för den som jämför med en annan språkversion,
> där samma identifierare står oöversatta mitt i främmande text.
>
> Ett självständigt referensdokument. Allt nedan är hämtat ur koden i
> `felsokning/` (branch `claude/guidad-felsokning-vision-1mnx7f`), inte ur
> planer eller avsikter. Där något **inte** finns står det uttryckligen.
>
> Syftet är att kunna resonera om systemet utan tillgång till repot.
>
> Senast synkat mot kod: commit `1bb4031`, 2026-08-04.

---

## 0. Sammanfattning på trettio sekunder

Guidad Felsökning är en SaaS-plattform för **fordonsverkstäder**. Den leder en
tekniker genom en strukturerad felsökning, kräver bevis för varje påstående, och
producerar ett spårbart underlag som kan delas med kund, försäkringsbolag eller
nästa tekniker.

Den bärande idén är negativ snarare än positiv: **systemet presenterar aldrig en
hypotes som ett konstaterat fel.** Det är inte en policy i en dokumentfil — det
är kodat, testat och blockerar flöden. När evidens saknas står det "Evidens
saknas", inte en kvalificerad gissning.

Tekniskt: en **append-only händelselogg** är enda sanningskällan. Allt annat —
ärendevyn, briefen, kundrapporten, kvalitetsgrinden, statistiken — är rena
projektioner av loggen och kan alltid regenereras.

| | |
|---|---|
| Klient | React 18 + TypeScript + Vite + Tailwind + zustand + react-router |
| Backend | Två Node-tjänster (`plattform`, `ai-orkester`), rena `node:http`, minimala beroenden |
| Databas | PostgreSQL (Aurora Serverless v2), append-only via databastriggrar |
| Modell | Claude, serverägd routing per uppgift |
| Infra | AWS + EKS, 126 Terraform-resurser i två lager |
| Git & CI | **Självhostad Gitea + Actions-runners på egen EKS** — inget GitHub i driftvägen |
| Tester | 120 vitest-tester + integrationstest mot riktig Postgres |
| Språk i kod | Svenska (identifierare, kommentarer, commit-meddelanden) |

---

## 1. Produktprinciper

Dessa fem är inte riktlinjer utan invarianter. Var och en har en motsvarighet i
kod och i test.

### 1.1 Ingen hypotes presenteras som ett konstaterat fel

Hypoteser är en egen händelsetyp (`hypotes`) med obligatorisk
tillförlitlighetsnivå, och kan **aldrig** anta nivån `hog`
(`niva: Exclude<Tillforlitlighet, "hog">` — typsystemet förbjuder det).
I kundrapporten märks de uttryckligen som ej verifierade. Kvalitetsgrinden har
en egen rad för detta.

Formuleringen vid misslyckad reproduktion är
*"kunde inte reproduceras under de förhållanden som rådde"* — aldrig
*"felet konstaterat"* eller *"inget fel hittat"*. Detta är kodat i både
projektionerna och orkesterns grundprompt.

### 1.2 En kryssruta är inte evidens

Varje kontrollpunkt i varje metodik har ett **minimikrav**:
`matvarde | kommentar | foto`. En mätning kan inte markeras utförd utan värde;
en fotokontroll kan inte markeras utförd utan bild. Vill teknikern hoppa över
något krävs ett **dokumenterat undantag** med orsak ur en fast lista.

Låst av test: *"varje kontroll kräver bevis — en kryssruta är inte evidens"*.

### 1.3 Loggen är append-only, hela vägen ner

Inga update- eller delete-operationer finns i API:t, och databasen har triggrar
som avvisar dem även om någon kringgår applikationen. Ett test söker aktivt
efter `update`/`delete` mot händelsetabellen i serverkoden och faller om de dyker
upp.

Konsekvens: en felaktig uppgift *rättas genom en ny händelse*, aldrig genom att
den gamla försvinner. Historiken är det som ger underlaget värde i en tvist.

### 1.4 Terminologi

I UI och kundkommunikation används **systemet, analysen, bedömningen,
beslutsstödet** — inte "AI", om det inte är tekniskt nödvändigt. Produkten
beskrivs som *evidensbaserat diagnossystem* / *intelligent beslutsstöd*.

Skälet är kommersiellt och epistemiskt: en verkstadskund som hör "AI" hör
"gissning". En försäkringshandläggare som läser "AI-bedömning" i ett underlag
väger det lägre.

### 1.5 Delningsgränsen är en tillåtelselista

Vad som får lämna organisationen räknas upp **positivt**, per nivå. En ny
händelsetyp är därmed intern tills någon aktivt släpper fram den. Ett test
kräver att varje typ i domänmodellen är klassificerad — glöms en bort faller
bygget, i stället för att den läcker.

---

## 2. Domänmodellen — händelseloggen

`app/src/felsokning/domain.ts` (281 rader).

Ett ärende är: identitet + metadata + en **ordnad lista av loggposter**. Varje
loggpost bär `id`, `tidpunkt`, `tekniker` och en `handelse`.

### 2.1 Samtliga händelsetyper

| Typ | Innehåll | Roll |
|---|---|---|
| `objekt_identifierat` | `objekt` (regnr/VIN, märke, modell, motor …) | Vad ärendet gäller |
| `arbetsorder_skannad` | `falt[]` + bilaga | Tolkad arbetsorder (**intern**) |
| `felbeskrivning` | `text` | Kundens ord, ordagrant |
| `arendetyp_satt` | `arendetyp` | Garanti / försäkring / kund … styr regelpaket |
| `fraga_besvarad` | `stegId`, `frageId`, `fraga`, `svar` | Metodikens symptomfrågor |
| `kontroll_utford` | `stegId`, `kontrollId`, `text`, `resultat?`, `undantag?` | Verifierad checklistpunkt |
| `observation` | `text` | Vad teknikern såg — inte vad hen tror |
| `matvarde` | `beskrivning`, `varde`, `enhet?` | Mätning (E4) |
| `hypotes` | `text`, `niva` (aldrig `hog`) | Arbetshypotes (**intern**) |
| `foto` | `beskrivning` + bilaga | Bildbevis (E2) |
| `video` | `beskrivning` + bilaga | Rörligt bevis (E3) |
| `matarstallning` | `lage` (ingående/utgående), `varde` + bilaga | Miltal in/ut |
| `historik_kontrollerad` | `kontrollerad`, `kommentar?` | Servicehistorik |
| `reproducering` | `status` (ja/delvis/nej), `beskrivning` | **Symptomverifiering** |
| `felorsak` | strukturerad felorsaksanalys | Orsak, kategori, underlag |
| `atgardsforslag` | förslag med motivering | Vad som bör göras |
| `kundbeslut` | godkänt/avböjt, kanal | Kundens besked |
| `atgard_utford` | utfört arbete | Vad som faktiskt gjordes |
| `kvalitetskontroll` | verifiering efter åtgärd | Är symptomet borta? |
| `kommentar` | `text` | Fri anteckning |
| `kategori_byte` | `kategori` | Tidredovisning (**intern**) |
| `inaktivitet_forklarad` | `text`, `minuter` | Varför det stod stilla |
| `overlamning` | `fran`, `till?` | Skiftbyte |
| `ansvarig_satt` | `ansvarig` | Arbetsledarens omfördelning (**intern**) |
| `ai_svar` | `rader[]` klassificerade, modellnamn | Beslutsstödets svar (**intern**) |
| `export_skapad` | `format`, `version` | Exporten loggar sig själv |
| `arende_avslutat` | `signatur?` | Teknikerns signering |

### 2.2 Bilagor är innehållsadresserade

`foto`, `video`, `matarstallning` och `arbetsorder_skannad` är
*intersektionstyper* med `Bilaga`:

```ts
export interface Bilaga {
  bilagaId?: string;
  bilagaHash?: string;   // SHA-256
  dataUrl?: string;      // finns kvar för alltid — loggen är append-only
}
```

Innehållet ligger utanför loggen (S3 eller databas), men **hashen ligger i
loggen**. Vid läsning verifieras hashen; stämmer den inte returneras `409`.
Innebörden: byter någon ut en bild i lagret upptäcks det, och loggen kan bevisa
att den ursprungliga bilden var en annan.

`dataUrl` behålls i typen därför att gamla poster har den inbäddad — och loggen
kan inte skrivas om.

---

## 3. Metodikmotorn

Sedan senaste ändringen är **motor och innehåll åtskilda**:

- `metodik.ts` (171 rader) — typer, val av metodik, härledning av nästa steg.
- `metodiker.ts` (899 rader) — de sexton metodikerna.

Biblioteket kan växa utan att motorn ändras.

### 3.1 Metodikbiblioteket

| id | Namn | Område | Steg | Kontroller |
|---|---|---|---|---|
| `vibration` | Vibration under körning | Hjul och balans | symptom → visuell → kontroller → provkorning | 19 |
| `bromsar` | Bromssystem | Chassi | symptom → visuell → matningar → system | 14 |
| `styrning_fjadring` | Styrning och fjädring | Chassi | symptom → visuell → glapp → installning | 11 |
| `elsystem` | Elsystem och strömförsörjning | El | symptom → visuell → matningar → rela → funktionstest | 12 |
| `start_laddning` | Start- och laddningssystem | El | symptom → batteri → start → laddning → krypstrom | 15 |
| `motor_drift` | Motorgång och effekt | Motor | symptom → felkoder → mekanik → tandning_bransle → provkorning | 16 |
| `kylsystem` | Kylsystem och överhettning | Motor | symptom → visuell → matningar → packning | 12 |
| `drivlina` | Växellåda och drivlina | Drivlina | symptom → visuell → matningar → provkorning | 10 |
| `avgas_emission` | Avgassystem och emissioner | Motor | symptom → avlasning → matningar → orsak | 12 |
| `klimat` | Klimatanläggning | Komfort | symptom → visuell → matningar → styrning | 11 |
| `hogvolt` | Högvoltsystem — elbil och hybrid | Högvolt | **sakerhet** → symptom → avlasning → laddning | 16 |
| `diagnos_natverk` | Felkoder och kommunikation | Diagnos | symptom → grund → buss → koder | 10 |
| `lackage` | Läckage | Övrigt | symptom → visuell → metod | 8 |
| `missljud` | Missljud | Övrigt | symptom → inspelning → lokalisering | 7 |
| `adas` | Förarassistans och kalibrering | Diagnos | symptom → forutsattningar → kalibrering | 9 |
| `generisk` | Generell strukturerad felsökning | Övrigt | symptom → visuell → grundkontroller → funktionstest | 9 |

### 3.2 Tre regler, låsta av test

1. **Varje kontroll har ett minimikrav.** Mätvärde, foto eller observation.
2. **Varje metodik börjar med att verifiera symptomet**, aldrig med att åtgärda.
   Kundens ord blir ett verifierat symptom först när det reproducerats.
3. **Där arbetet kan skada någon ligger säkerhetssteget först.** Endast
   `sakerhet` får föregå `symptom` — testet tillåter exakt det undantaget och
   inget annat.

`hogvolt` är den enda metodiken med säkerhetssteg. Det kräver behörighet,
dokumenterad urtagen servicebrytare (foto), väntetid enligt tillverkaren, **mätt
spänningsfrihet** (mätvärde — inte ett ja på en fråga) och skyddsutrustning.
Testet kontrollerar att steget ligger först, att `spanningsfrihet` kräver
mätvärde, och att beskrivningen innehåller ordet "livsfarlig".

Skälet är enkelt: det arbetet kan döda någon. Där duger ingen kryssruta.

### 3.3 Val av metodik

Tidigare en regexkedja med tre utfall. Nu **poängsatt nyckelordsmatchning**:

```ts
export function metodikPoang(metodik: Metodik, text: string): number
export function valjMetodik(felbeskrivning: string): Metodik
```

- Poäng = summan av längden på de nyckelord som träffar. Ett längre — mer
  specifikt — ord väger tyngre. `traktionsbatteri` (16) slår `batteri`.
- **Korta ord (≤3 tecken) matchas som helt ord, längre som ordstam.** Annars
  hade `"ac"` träffat *acceleration* och en vibration hamnat i
  klimatanläggningen.
- Vid lika poäng vinner den som står först i biblioteket → valet är **stabilt**
  mellan körningar.
- Ingen träff → `generisk`.

**Fallgrop som faktiskt bet under utvecklingen:** nyckelorden måste vara
*stammar*, inte färdigböjda ord. Svensk böjning kapar ofta ett `e`:
*filter → filtret*, så `"partikelfilter"` matchar aldrig texten teknikern
skriver. Samma gäller *regenerering → regenererar*, *misständning → misständer*,
*skrammel → skramlar*. Biblioteket använder därför `partikelfilt`, `regenerer`,
`misständ`, `skram`.

**Valet är en frågeordning, inte en diagnos.** Det avgör var teknikern börjar
leta, inte vad som är fel. Träffar inget är `generisk` det ärliga svaret —
strukturellt komplett, och bättre än en gissning.

### 3.4 Nästa steg

```ts
export function nastaSteg(arende: Arende, metodik: Metodik): NastaSteg
```

Rent härlett ur loggen: första obesvarade frågan, därefter första ej utförda
kontrollen, i metodikens ordning. Ingen dold tillståndsmaskin — samma logg ger
alltid samma nästa steg.

### 3.5 Om "täcka allt"

Det går inte att lova ärligt, och dokumentationen påstår det inte. Det som går
är att täcka fordonets system systematiskt och låta `generisk` vara ett
strukturellt komplett skyddsnät för det ingen förutsett.

---

## 4. ECM v2.0 — evidens- och regelmotorn

`app/src/felsokning/ecm.ts` (749 rader). Sex motorer:

### 4.1 Evidence Engine

Evidensnivåer, härledda ur loggen:

| Nivå | Betydelse |
|---|---|
| E0 | Inget underlag |
| E1 | Teknikerns observation |
| E2 | Foto |
| E3 | Video |
| E4 | Mätvärde |
| E5 | Diagnosdata / dokument |
| E6 | Flera oberoende källor |

Ett ärendes evidensnivå är den högsta som underlaget bär. Den visas i UI och
följer med i exporten.

**Innehållshash:** `innehallsHash()` är en deterministisk FNV-1a över
evidensinnehållet. Samma underlag ⇒ samma hash, oavsett maskin eller tidpunkt.
Det gör exporten verifierbar i efterhand.

### 4.2 Rule Engine

- `ORSAKSKATEGORIER` — fast lista för felorsaksanalys (ger jämförbar statistik
  över flottan).
- `UNDANTAGSORSAKER` — fast lista för "varför gjordes inte detta".
- `UNDERLAGSKALLOR` — vad en slutsats vilar på.
- `INGEN_ATGARD_ORSAKER`, `KUNDKANALER`.
- `granskaAvvikelse()` — flaggar text som formulerats som konstaterande utan
  täckning.

Fasta listor i stället för fritext är ett medvetet val: fritext går inte att
aggregera, och statistiken över flottan är en av produktens verkliga tillgångar.

### 4.3 Compliance Engine

`ARENDETYPER` styr vilket **regelpaket** som gäller. Garantiärende kräver
claim-nummer och servicehistorik; försäkringsärende kräver skadenummer och
bildbevis; kundärende kräver mindre. Paketen är data (`ecm-regler.json`,
serverbart via `/api/ecm/regler`) — nya krav kräver ingen ny release.

### 4.4 Validation Engine — pre-diagnostik

Innan felsökningen får börja: objektidentifiering verifierad, arbetsorder
inläst, fordonshistorik kontrollerad **eller motiverad**, ingående mätarställning
dokumenterad, kundens felbeskrivning verifierad, tidiga observationer hanterade.

### 4.5 Completion Engine — kvalitetsgrinden

Den största enskilda funktionen (`kvalitetsgrind`, ~240 rader). Ärendet kan inte
avslutas förrän varje rad är grön eller motiverad:

- Fordonshistorik kontrollerad eller motiverad
- Ingående/utgående mätarställning dokumenterad
- Kundens felbeskrivning verifierad
- **Symptomverifiering:** reproducerat, eller dokumenterat ej reproducerbart
- Felorsaksanalys dokumenterad
- Åtgärd dokumenterad eller motiverad
- Kundens besked på åtgärdsförslaget registrerat
- Utfört arbete trots avböjt åtgärdsförslag (om tillämpligt)
- Kvalitetskontroll genomförd — symptomet verifierat
- Metodikens kontroller: evidens eller dokumenterat undantag
- Foton finns för fotokrävande kontroller
- Teknikerns slutsats signerad
- Hypoteser redovisas som ej verifierade
- Ärendetypens regelpaket uppfyllt (claim / skadenummer / miltal / historik)

### 4.6 Traceability Engine

`sparbarhetspaket()` — hela beviskedjan i ett strukturerat objekt: vad som
påstås, vad det vilar på, vem som dokumenterade det och när.

---

## 5. Symptomverifiering (SVP)

Egen princip därför att den är produktens skarpaste kant mot verkligheten.

**Kundens beskrivning ≠ konstaterat fel.**

1. Beskrivningen dokumenteras **ordagrant** (`felbeskrivning`).
2. Den förtydligas via metodikens symptomfrågor — *när, var, hur*, aldrig
   "vad är fel".
3. Den **reproduceras**, med tre möjliga utfall:
   - **Ja** — med dokumenterade förhållanden.
   - **Delvis** — vad som kunde och inte kunde återskapas.
   - **Nej** — obligatorisk motivering.

Rapportens beviskedja skiljer fyra saker som annars blandas ihop: *kundens
beskrivning*, *verifierad observation*, *felorsaksanalys* och *rekommenderad
åtgärd*.

---

## 6. Klienten

`app/src/felsokning/` + `app/src/pages/felsokning/`.

| Modul | Rader | Ansvar |
|---|---|---|
| `ArendeSida.tsx` | 2433 | Ärendevyn. Trekolumnslayout på skrivbord |
| `metodiker.ts` | 899 | Metodikbiblioteket |
| `ecm.ts` | 749 | Regel- och evidensmotorn |
| `NyttArende.tsx` | 497 | Ärendestart, arbetsorderskanning |
| `Arendelista.tsx` | 399 | Dashboard: räknare, filter |
| `projektioner.ts` | 356 | Alla vyer som rena funktioner av loggen |
| `ai.ts` | 305 | Klientsidan av orkestern, promptbygge, svarstolkning |
| `plattform.ts` | 296 | API-klient mot självhostad plattform |
| `DelatArendeVy.tsx` | 283 | Delad vy (kund/partner/intern) |
| `domain.ts` | 281 | Händelsetyper |
| `Installningar.tsx` | 281 | Organisation, användare, integrationer |
| `Oversikt.tsx` | 238 | Arbetsledarvy |
| `demo.ts` | 200 | Demoärende med 1 tim 35 min historik |
| `ui.tsx` | 174 | Industriellt verkstads-UI |
| `metodik.ts` | 171 | Metodikmotorn |
| `synk.ts` | 141 | Konfliktfri ihopflätning av händelser |
| `ikoner.tsx` | 132 | Egna SVG-linjeikoner (inga emojis) |
| `streckkod.ts` | 131 | Streckkods-/VIN-avläsning |
| `store.ts` | 106 | zustand-store |
| `bilagor.ts` | 96 | Uppladdning + blob-URL-cache |
| `installningar.ts` | 86 | Organisationsinställningar |
| `Bilagevisning.tsx` | 69 | `<Bild>` / `<Klipp>` |
| `Mikrofon.tsx` / `rost.ts` | 66 / 65 | Taligenkänning |
| `format.ts` | 48 | Fotoskalning m.m. |

### 6.1 Projektionerna

```
objekt · felbeskrivning · ansvarig · arendeidentitet · arAvslutat
lokalFordonshistorik · utfordaKontroller · ejKontrollerat
observationer · hypoteser · foton · videor
tidsfordelning · formateraTid · tillforlitlighet
brief · overlamningstext · tidsfordelningsRader · sistaAktivitet
```

Alla rena funktioner av `Arende`. `ejKontrollerat` är den som sparar mest tid i
verkligheten: *det som orsakar dubbelarbete vid skiftbyte är det ingen skrivit
ner att ingen gjort.*

### 6.2 UI-språk

ETKA-inspirerat verkstads-UI: plana ljusgrå ytor (#ECECEC/#F7F7F7), skarpa
kanter, djup marinblå primärfärg, tät typografi (11–15 px), rektangulära knappar
(max 4 px radie), verktygsrad ~44 px. Egna linjeikoner i stället för emojis;
status som färgpunkter.

Motivet: teknikern har handskar på sig, står i ett bullrigt utrymme och har inte
tid med ett luftigt konsument-UI.

### 6.3 Lokalt läge

Utan inloggning fungerar appen mot `localStorage`. Metodiken guidar ensam,
orkestern är avstängd. Status visas i ärendehuvudet. Vid inloggning flätas
lokala händelser ihop med serverns — konfliktfritt per händelse-id, testat.

---

## 7. Backend

### 7.1 `services/plattform` (1210 rader)

Ren `node:http`. Enda beroendet är `pg`.

**API-vägar:**

```
GET  /halsa
GET  /api/openapi.yaml
POST /api/auth/registrera          skapar organisation + systemadministratör
POST /api/auth/logga-in
POST /api/auth/logga-ut-alla       höjer token_version → alla sessioner dör
GET  /api/anvandare                admin
POST /api/anvandare
POST /api/anvandare/{id}/avaktivera | /aktivera
GET  /api/organisation
GET/PUT /api/organisation/installningar
GET  /api/ecm/regler               regelpaket som data
GET/POST /api/arenden
POST /api/arenden/{id}/handelser   append-only
POST /api/arenden/{id}/bilagor
GET  /api/bilagor/{id}             hash verifieras vid läsning
GET  /api/fordon/{identifierare}/historik
GET  /api/statistik/felorsaker
GET  /api/oversikt                 arbetsledarvy
GET  /api/delad/{kod}              filtrerad enligt nivå
POST /api/delad/{kod}/beslut       kundens besked utan inloggning
GET  /api/delad/{kod}/bilagor/{id} nivåfiltrerad
GET  /api/integrationer/leverantorer
GET/PUT/DELETE /api/integrationer/{leverantor}
POST /api/integrationer/{leverantor}/uppslag
```

Inga update- eller delete-vägar mot ärendedata. Med avsikt.

**Säkerhetsfunktioner i tjänsten:**

```
ursprungFor · forTataForsok · kallaFor · inloggningSparrad · loggaForsok
skapaJwt · verifieraJwt · kontoGiltigt · kravAuth · arendeIOrg
integrationsNyckel · kryptera · dekryptera · maskera
arPrivatAdress · pekarInat · gorUppslag · skickaBilaga · synligaTyper
```

### 7.2 `services/ai-orkester` (400 rader)

Äger Claude-nyckeln. Klienten har den **aldrig**. Routing per uppgift:

| Uppgift | Modell | Effort | Vision |
|---|---|---|---|
| `handledning` | `claude-sonnet-5` | medium | — |
| `granskning` | `claude-opus-5` | **high** | — |
| `sammanfattning` | `claude-sonnet-5` | low | — |
| `metodikval` | `claude-haiku-4-5` | *(ingen — modellen tar inte parametern)* | — |
| `instrumentavlasning` | `claude-sonnet-5` | low | ✔ |
| `dokumenttolkning` | `claude-sonnet-5` | low | ✔ |

Samtliga svar är **schema-bundna** (`json_schema`). Grundprompten kodar
AI-reglerna: *"Hitta aldrig på fakta"*, *"aldrig en hypotes som ett konstaterat
fel"*, *"KRÄVER verifiering"*. Vid avböjd förfrågan sker automatisk fallback
till reservmodell. **Modellen som svarade loggas i varje `ai_svar`-händelse** —
underlaget ska gå att granska i efterhand.

Metodikkatalogen byggs ur en enda lista (`METODIK_KATALOG`), som genererar både
schemats `enum` och promptens punktlista. Ett test jämför den mot klientens
bibliotek: glider listorna isär returnerar klassificeraren ett id klienten inte
känner igen, och valet skulle falla *tyst* tillbaka på generisk. Nu faller
testet i stället.

### 7.3 `services/gemensam/observation.mjs` (166 rader)

Spårning och mätvärden **utan nya beroenden**. Tjänsterna har medvetet nästan
inga beroenden; att dra in ett OpenTelemetry-SDK med trettio paket för att mäta
fyra saker vore fel avvägning. I stället två standarder som båda bara är text på
stdout:

- **W3C Trace Context** — `traceparent` följer med genom hela kedjan
  (klient → plattform → orkester).
- **CloudWatch EMF** — strukturerad JSON som CloudWatch själv extraherar
  mätvärden ur. Ingen agent, ingen SDK, inget som kan sluta fungera tyst.

```
spårFrån(huvud) · traceparent(spår) · starta(namn, spår)
  → .mät(delnamn, arbete) · .ms() · .delar()
logga(nivå, meddelande, fält) · mätvärde(namn, värde, enhet, dim, extra)
avsluta(spann, { status, väg, extra })
```

Det som mäts valdes utifrån en fråga: *vad vill man veta klockan tre på natten
när något är långsamt?* Svaret är **var tiden gick** — inte hur många anrop som
skett. Därför `delar()`: databasen, modellanropet, objektlagringen, kundens
leverantör, med antal och summa per del i samma loggrad.

`mät()` mäter även när arbetet kastar — annars ser fel ut som noll tid.

**Dimensioner hålls medvetet få.** Varje unik kombination är en egen tidsserie
som kostar pengar, så organisation, ärende och spår-id får aldrig bli
dimensioner — de ligger som vanliga fält. Låst av test som explicit förbjuder
`org`, `organisation`, `arende`, `spårId`, `anvandare` bland dimensionerna.

---

## 8. Säkerhet

| Skydd | Implementation |
|---|---|
| **Multi-tenant-isolering** | Alla ärendefrågor är organisationsknutna (`arendeIOrg`); integrationstestat mot riktig Postgres |
| **Roller** | `tekniker` / `arbetsledare` / `admin`, i JWT och databas-check |
| **JWT-anspråk** | `{ sub, namn, org, roll, tv }` — `tv` = token_version |
| **Omedelbar återkallelse** | `kontoGiltigt()` kontrollerar `aktiv` + `token_version` vid *varje* autentiserat anrop. En giltig signatur räcker inte |
| **Global utloggning** | `/api/auth/logga-ut-alla` höjer `token_version` → alla utfärdade tokens dör direkt |
| **Lösenord** | bcrypt via `gen_salt('bf')` i databasen |
| **Inloggningsspärr** | 15 min-fönster; max 10 försök per konto, 30 per källa. Städas probabilistiskt (2 % chans per skrivning) för att slippa ett cron-jobb |
| **Kryptering i vila** | AES-256-GCM för kundernas integrationsuppgifter; hemliga fält maskeras alltid i API-svar |
| **SSRF-försvar** | `arPrivatAdress()` + `pekarInat()`: 10/8, 127/8, 169.254/16, 172.16–31, 192.168/16, 100.64/10, ::1, fc/fd, fe80, ::ffff:. **DNS slås upp** innan anrop; `.local`/`.internal` blockeras. Escape-hatch `TILLAT_INTERNA_UPPSLAG` för testmiljö |
| **CORS** | `TILLATNA_URSPRUNG`-allowlist, ursprung sätts en gång per anrop |
| **Bilageintegritet** | SHA-256 i loggen, verifieras vid läsning → `409` vid avvikelse |
| **Append-only i databasen** | Triggrar `before update or delete` på både `felsokning_handelser` och `felsokning_arenden` |
| **Podd-härdning** | IMDSv2 obligatoriskt, hoppgräns 1 → podar kan inte låna nodens IAM-roll |
| **IRSA** | Varje tjänstekonto har egen roll; noderna delar inga rättigheter |
| **Delade IAM-roller** | `bygg` får publicera till ECR men inte röra klustret; `drift` får röra klustret men inte publicera bilder |
| **Nätverkspolicy** | Default deny in; explicita `_ut`-regler per tjänst |
| **Databasåtkomst** | Endast från klustrets noder, i ett subnätlager **utan routing ut** |

### 8.1 Databasschema

```
organisationer · anvandare · inloggningsforsok
felsokning_arenden · felsokning_handelser
bilagor · bilage_innehall
delningar · integrationer
```

---

## 9. Live Share — delningsnivåer

Tre nivåer, serverstyrd filtrering:

| Nivå | Ser |
|---|---|
| **kund** | 22 händelsetyper: objekt, felbeskrivning, frågor, kontroller, observationer, mätvärden, foton, videor, kommentarer, överlämningar, åtgärder, kvalitetskontroll … |
| **partner** | Allt kunden ser **+ `hypotes`** (märkta ej verifierade) |
| **intern** | Full insyn — ingen filtrering |

**Aldrig utanför organisationen:**
`kategori_byte`, `hypotes`, `ai_svar`, `ansvarig_satt`, `arbetsorder_skannad`.

```js
export function synligaTyper(niva) {
  if (niva === "intern") return null;           // full insyn
  return niva === "partner" ? DELBART_PARTNER : DELBART_KUND;
}
```

Länkar är återkallbara. Publik delningssida (`/felsokning/delad/:kod`) kräver
ingen inloggning och pollar för liveuppdatering. Kunden kan lämna besked direkt
i vyn (`POST /api/delad/{kod}/beslut`).

**Varför tillåtelselista:** en neka-lista måste uppdateras när en ny
händelsetyp läggs till — och det är precis det man glömmer. En tillåtelselista
gör "glömt" till "intern", vilket är det säkra utfallet.

---

## 10. Märkesspecifika kopplingar

Leverantörer är **data, inte kod** (`integrationer.json`, monterbar som
ConfigMap via `INTEGRATIONER_FIL`). Nya märken kräver ingen ombyggnad.

| id | Leverantör |
|---|---|
| `generisk_vin` | Valfri VIN-tjänst över HTTP |
| `vag_erwin` | Volkswagen Group erWin (VW, Audi, Škoda, SEAT) |
| `volvo_vida` | Volvo VIDA |
| `fordonsregister` | Regnr → fordon |

Varje leverantör deklarerar sina fält, vilka som är hemliga (krypteras + maskeras),
och hur svaret mappas till domänens fält (`marke`, `modell`, `arsmodell`,
`motor`, `vaxellada`).

Uppslag går genom SSRF-skyddet — en kund kan alltså inte peka en "leverantör"
mot klustrets interna adresser.

---

## 11. Visual-first

Kameran **är** integrationslagret. Det som syns på en skärm eller ett instrument
fotograferas och tolkas, i stället för att integreras.

- **Arbetsorderskanning** är primärvägen vid ärendestart. Sonnet 5 (vision)
  läser kund-, fordons- och verkstadsuppgifter oavsett layout, med konfidens per
  fält:
  - 🟢 ≥95 % godkänns automatiskt
  - 🟡 80–95 % markeras för genomläsning
  - 🔴 <80 % kräver aktiv bekräftelse

  Teknikern granskar alltså bara osäkra fält. Visuell granskning med dokumentet
  bredvid fälten; klick markerar ungefärlig position.

- **Instrumentavläsning** — foto av diagnosskärm eller instrument → strukturerade
  värden.

Motivet är kommersiellt: en integration per verkstadssystem är en säljcykel per
kund. En kamera fungerar mot allt, direkt.

---

## 12. Infrastruktur

Två Terraform-lager. Basen körs sällan, arbetslastlagret ofta.

### 12.1 `infra/aws` — basen (91 resurser)

| Område | Innehåll |
|---|---|
| **Nät** | 1 VPC, 3 subnätlager × 3 zoner: publikt (bara ALB + NAT), privat (noder, inga publika adresser), data (Aurora, **ingen väg ut alls**). VPC-endpoints: S3 (gateway); ECR, loggar, Secrets Manager, STS, ELB (gränssnitt) → trafiken lämnar aldrig nätet |
| **Kluster** | EKS, arm64-noder, IRSA via OIDC-provider, IMDSv2 hoppgräns 1, alla fem kontrollplansloggar på |
| **Data** | Aurora PostgreSQL Serverless v2, PITR ned till sekunden, KMS med egen nyckel, `sslmode=require` |
| **Objektlagring** | S3 för bilagor: SSE-KMS, publik åtkomst blockerad, TLS obligatoriskt, versionshantering på. Plattformens roll får läsa och skriva — **men aldrig radera** |
| **Register** | ECR med **oföränderliga taggar** + sårbarhetsskanning |
| **Hemligheter** | Secrets Manager; läses endast av plattformsrollen via IRSA |
| **Roller** | 9 IAM-roller, bl.a. delade `bygg` / `drift` |
| **Domän** | Route 53 + ACM med DNS-validering |
| **Observation** | 7 larm, 1 instrumentpanel, 3 loggrupper, SNS-topic |

**Larmen** — få, men de som finns betyder något. *Ett larm som ingen agerar på
lär folk att ignorera larm.*

- Aurora CPU > 85 % i tre perioder (skalningstaket kan vara nått)
- Aurora fri lokal lagring < 5 GiB
- **Backup-ålder** — `treat_missing_data = "breaching"`. Saknas mätvärdet finns
  ingen säkerhetskopiering. *En backup man tror finns är värre än ingen.*
- Färre noder än minsta önskade
- Svarstid **p95** > 3 s i tre perioder — inte medelvärde, som döljer att var
  tjugonde tekniker väntar orimligt länge
- Serverfel (summa > 5)
- Modellen avböjer (tyder på oväntat underlag, inte driftfel)

### 12.2 `infra/terraform` — arbetslasten (35 resurser)

Läser basen via `terraform_remote_state`, upprepar ingenting.

```
kubernetes_namespace_v1        denna, gitea
kubernetes_service_account_v1  plattform (IRSA), drift, runner
kubernetes_deployment_v1       plattform, orkester, web
kubernetes_service_v1          plattform, orkester, web
kubernetes_horizontal_pod_autoscaler_v2  × 3
kubernetes_pod_disruption_budget_v1      × 3
kubernetes_ingress_v1          denna, gitea
kubernetes_network_policy_v1   neka_allt_in, tjanster_in, dns_ut,
                               plattform_ut, orkester_ut, web_ut
kubernetes_manifest            hemlighetskalla, hemligheter (External Secrets)
helm_release                   lastbalanserare (ALB), external_secrets,
                               cloudwatch, metrics, gitea
aws_route53_record             denna
```

`karta.tf` (117 rader) producerar en läsbar karta över hela driftbilden:
`terraform output karta`.

### 12.3 Git och CI — helt egenhostat

Uttrycklig produktbeslut: **inget GitHub i driftvägen.** Gitea + Actions-runners
kör på egen EKS. `.gitea/workflows/felsokning.yml`:

| Jobb | Innehåll |
|---|---|
| `test-och-bygg` | `vitest run`, `typkontroll`, eslint, `vite build` |
| `tjanster` | eslint på tjänsterna, **integrationstest mot riktig Postgres**, `swagger-cli validate` |
| `terraform` | `fmt -check -recursive`, `init -backend=false`, `validate` |
| `publicera` | Endast på `main`, endast om ovanstående gått igenom. Bygger tre bilder, taggar med commit-SHA, pushar till eget ECR. **OIDC, ingen statisk nyckel** |
| `driftsatt` | **Manuellt** (`workflow_dispatch`) med explicit bildtagg |

Driftsättning är ett eget steg med avsikt: *en bild i registret är inte samma
sak som en bild som kör.* Rollback = kör igen med tidigare tagg.

Klientens API-adress bakas in vid bygget (Vite), så bilden är miljöbunden.
Byggkontexten för tjänsterna är `services` så att båda når den delade
observationsmodulen utan att den dupliceras.

---

## 13. Testning

**120 vitest-tester** i 13 filer:

| Fil | Antal | Låser |
|---|---|---|
| `ecm.test.ts` | 32 | Evidensnivåer, regelpaket, kvalitetsgrind, pre-diagnostik |
| `metodiker.test.ts` | 14 | Bibliotekets struktur, metodikval, katalogparitet mot orkestern |
| `projektioner.test.ts` | 13 | Vyer som rena funktioner, nästa steg |
| `ai.test.ts` | 11 | Orkesterparitet, OpenAPI ↔ server, append-only, promptregler |
| `observation.test.ts` | 10 | Spårning, EMF-format, **förbjudna dimensioner** |
| `bilagor.test.ts` | 9 | Innehållshash, SigV4, lagerval |
| `delning.test.ts` | 7 | Tillåtelselistan täcker varje händelsetyp |
| `integrationer.test.ts` | 7 | Leverantörsuppslag, SSRF-guard |
| `demo.test.ts` | 4 | Demoärendet är rikt nog att visa |
| `installningar.test.ts` | 4 | Organisationsinställningar |
| `streckkod.test.ts` | 4 | VIN/streckkod |
| `synk.test.ts` | 4 | Konfliktfri ihopflätning |
| `example.test.ts` | 1 | — |

**Utöver enhetstesterna:**

- `integrationstest.sh` — hela flödet mot **riktig Postgres**: organisationer,
  roller, append-only-triggern, isolering, delning, bilagor.
- SigV4 **korsverifierad bit-för-bit mot botocore** (`sigv4-referens.json`).
- `swagger-cli validate` på OpenAPI-specen.
- Paritetstester som jämför spec ↔ server, klient ↔ orkester (× 2 kopior),
  domänmodell ↔ delningslista.

### 13.1 Verifieringsloopen före varje commit

```
npx vitest run                    # 120 tester
npm run typkontroll               # tsc --noEmit  (vite build typkontrollerar INTE)
npx eslint src/felsokning src/pages/felsokning
cd ../services && npx eslint .
npm run build
terraform fmt -check -recursive
# rotens CI: lint · format:check · typecheck · test
```

`typkontroll` lades till efter att två latenta krascher (`TextFalt` och
`UNDANTAGSORSAKER` använda utan import) tagit sig förbi `vite build` — som
transpilerar men inte typkontrollerar.

---

## 14. Repostruktur

`main` är en npm-workspaces-monorepo som heter **Semantika** och äger roten. När
de två produkterna slogs ihop behölls båda, med verktygskedjorna **skilda åt per
träd** — inte genom att försvaga någons regler.

```
/                             Semantika (workspaces-rot)
├── apps/mobile/              Semantika
├── services/api/             Semantika
├── infra/                    Semantika
├── .github/workflows/ci.yml  Semantika  — rörs inte
│
├── .gitea/workflows/felsokning.yml      Guidad Felsökning (självhostad CI)
└── felsokning/
    ├── app/                  klient (egen package.json, eslint, vitest, tsconfig)
    ├── services/
    │   ├── plattform/
    │   ├── ai-orkester/
    │   └── gemensam/         observation.mjs (delad)
    ├── infra/
    │   ├── aws/              basen, 91 resurser
    │   ├── terraform/        arbetslasten, 35 resurser
    │   └── postgres-init.sql
    ├── docs/
    └── supabase/             migrationer + edge-funktion (äldre driftväg)
```

**Två driftvägar finns parallellt:** den självhostade AWS-stacken (den som
gäller) och en äldre Supabase-baserad (edge-funktionen `felsokning-ai`,
migrationer). Orkestern finns därför i **två kopior** som hålls i synk av test.

---

## 15. Dokumentation i repot

```
docs/VISION.md                          produktvisionen
docs/MASTER-PROMPT.md                   grundinstruktionen
docs/MVP.md                             vad som är byggt, funktion för funktion
docs/DEMO.md                            demomanus för visning
docs/OPERATIONS.md                           drift
docs/SYSTEM-DESCRIPTION.md              engelska — källan
docs/SYSTEM-DESCRIPTION.sv.md           detta dokument
docs/SYSTEM-DESCRIPTION.de.md           tyska
docs/SYSTEM-DESCRIPTION.da.md           danska
docs/SYSTEM-DESCRIPTION.no.md           norska (bokmål)
docs/examples/vibration-at-88-km-h.md   genomgående exempelflöde
docs/modules/
  arbetslogg-och-tidredovisning.md
  arendebrief.md
  evidensmotor.md
  kommunikationsmodell.md
  kundrapport.md
  live-share.md
  markesspecifika-kopplingar.md
  verifierade-checklistor.md
```
Samtliga dokument ovan har engelska som källa och ett `.sv.md`-syskon på
svenska. Bara SYSTEM-DESCRIPTION finns på alla fem språk.


---

## 16. Designbeslut och deras motiv

Sammanställda därför att motivet ofta är viktigare än beslutet.

| Beslut | Motiv |
|---|---|
| Event sourcing | Underlaget måste hålla i en tvist. Historiken *är* värdet |
| Append-only även i databasen | Applikationslagret kan kringgås; triggern kan det inte |
| Tillåtelselista för delning | Glömd händelsetyp blir intern, inte läckt |
| Fasta orsakskategorier | Fritext går inte att aggregera; flottstatistiken är en tillgång |
| Serverägd modellrouting | Klienten ska aldrig ha nyckeln, och routing ska kunna ändras utan release |
| Loggad modell per svar | Underlaget ska gå att granska i efterhand |
| Undvik ordet "AI" | Kunden hör "gissning"; handläggaren väger det lägre |
| Visual-first | En integration per verkstadssystem = en säljcykel per kund. Kameran fungerar direkt |
| Leverantörer som data | Nytt märke ska inte kräva release |
| Egen observation, noll beroenden | 30 paket för att mäta 4 saker är fel avvägning |
| Få dimensioner i EMF | Varje kombination är en betald tidsserie |
| p95 i larmet, inte medel | Medelvärdet döljer att var tjugonde tekniker väntar |
| Larm på *saknad* backupdata | En backup man tror finns är värre än ingen |
| Delade bygg-/driftroller | Ett komprometterat bygge ska inte kunna röra klustret |
| Manuell driftsättning | En bild i registret ≠ en bild som kör |
| Oföränderliga ECR-taggar | En tagg ska betyda samma sak imorgon |
| Innehållsadresserade bilagor | Utbytt bild ska upptäckas, inte antas |
| Hash-verifiering vid läsning | Det räcker inte att hasha vid skrivning |
| S3-rollen får inte radera | Append-only måste gälla även lagret |
| Motor skild från innehåll | Biblioteket växer; motorn ska inte behöva ändras |
| Poängsatt metodikval | Regexkedjor blir ogenomskådliga vid 16 alternativ |
| Nyckelord som stammar | Svensk böjning kapar ett `e` — annars matchar inget |
| `generisk` som fallback | Ett ärligt "vi vet inte" slår en gissning |
| Säkerhetssteg först i högvolt | Det arbetet kan döda |
| Svenska i koden | Domänen är svensk; översättning fram och tillbaka tappar precision |

---

## 17. Kända begränsningar och öppna punkter

Uttryckligen inte färdigt:

- **Två orkesterkopior** (Supabase edge-funktion + K8s-tjänst) hålls i synk av
  test, inte av delad kod. Supabase-vägen är den äldre och bör avvecklas.
- **`ArendeSida.tsx` är 2433 rader.** Fungerar, men är den fil som kostar mest
  att ändra i.
- **`terraform validate` kan inte köras lokalt** i utvecklingsmiljön
  (utgående nätverkspolicy blockerar providernedladdning). Ersatt av
  `terraform fmt` + en egen statisk referenskontroll; den riktiga valideringen
  sker i CI.
- **Claude-nyckeln fylls i för hand** efter första `apply` — den ligger inte i
  Terraform-state, med avsikt.
- **`postgres-init.sql` körs manuellt** mot databasen efter basens `apply`.
- **Ingen automatisk återställningstest av backup.** Larmet säger att backup
  *sker*, inte att den *går att återställa*.
- **Metodikbiblioteket täcker inte allt** — och påstår det inte. `generisk` är
  skyddsnätet.
- Rotens eslint har 20 förbefintliga fel i Semantikas egna sidor (`no-explicit-any`)
  som inte hör till Guidad Felsökning.

---

## 18. Ordlista

| Svenska | Betydelse |
|---|---|
| Ärende | Ett felsökningsuppdrag |
| Händelse / loggpost | Odelbar post i append-only-loggen |
| Metodik | Strukturerat felsökningsflöde |
| Steg | Fas i en metodik (symptom, visuell, mätningar …) |
| Kontroll | Enskild checklistpunkt med minimikrav |
| Krav | `matvarde` / `kommentar` / `foto` |
| Undantag | Dokumenterad orsak till att en kontroll hoppades över |
| Brief | Sammanställd ärendebild — projektion |
| Kvalitetsgrind | Regeluppsättning som måste passeras före avslut |
| Evidensnivå | E0–E6, bevisvärdet i underlaget |
| Reproducering | Symptomverifiering: ja / delvis / nej |
| Felorsak | Strukturerad orsaksanalys med kategori och underlag |
| Delning | Extern länk med behörighetsnivå |
| Orkester | Tjänsten som äger modellroutingen |
| Spann / spår | Tidsmätning respektive W3C-spårning |
| Bilaga | Innehållsadresserat foto/video/dokument |
