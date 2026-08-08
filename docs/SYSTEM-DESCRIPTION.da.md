# Guidad Felsökning (Guidet Fejlfinding) — fuldstændig systembeskrivelse

> **Dansk oversættelse.** Kilden er [SYSTEM-DESCRIPTION.md](SYSTEM-DESCRIPTION.md) (engelsk).
> Ved uoverensstemmelse gælder det engelske dokument.
>
> **Kodeidentifikatorer oversættes ikke.** Hændelsestyper, funktions- og
> feltnavne, filstier og konfigurationsnøgler er svenske *i selve koden*. En
> oversættelse ville gøre dokumentet ubrugeligt over for repositoriet, så de står
> ordret, med dansk forklaring hvor betydningen ikke er indlysende.
>
> Et selvstændigt referencedokument. Alt nedenfor er hentet fra koden i
> `felsokning/` (branch `claude/guidad-felsokning-vision-1mnx7f`), ikke fra
> planer eller hensigter. Hvor noget **ikke** findes, står det udtrykkeligt.
>
> Senest synkroniseret med koden: commit `1bb4031`, 04-08-2026.

---

## 0. Sammenfatning på tredive sekunder

Guidad Felsökning er en SaaS-platform til **autoværksteder**. Den fører en
tekniker gennem en struktureret fejlfinding, kræver bevis for hver eneste
påstand og producerer et sporbart grundlag, der kan deles med kunden, et
forsikringsselskab eller den næste tekniker.

Den bærende idé er negativ snarere end positiv: **systemet fremstiller aldrig en
hypotese som en konstateret fejl.** Det er ikke en politik i et dokument — det er
kodet, testet og blokerer forløb. Når beviset mangler, står der „Evidens saknas"
(bevis mangler), ikke et kvalificeret gæt.

Teknisk: en **append-only hændelseslog** er eneste sandhedskilde. Alt andet —
sagsvisningen, briefen, kunderapporten, kvalitetsporten, statistikken — er rene
projektioner af loggen og kan altid gendannes.

| | |
|---|---|
| Klient | React 18 + TypeScript + Vite + Tailwind + zustand + react-router |
| Backend | To Node-tjenester (`plattform`, `ai-orkester`), rent `node:http`, minimale afhængigheder |
| Database | PostgreSQL (Aurora Serverless v2), append-only håndhævet af databasetriggere |
| Model | Claude, serverejet routing pr. opgave |
| Infrastruktur | AWS + EKS, 126 Terraform-ressourcer i to lag |
| Git & CI | **Selvhostet Gitea + Actions-runnere på eget EKS** — ingen GitHub i driftvejen |
| Test | 120 vitest-test + integrationstest mod rigtig Postgres |
| Sprog i koden | Svensk (identifikatorer, kommentarer, commit-beskeder) |

---

## 1. Produktprincipper

Disse fem er invarianter, ikke retningslinjer. Hver enkelt har en modsvarighed i
kode og i en test.

### 1.1 Ingen hypotese fremstilles som en konstateret fejl

Hypoteser er deres egen hændelsestype (`hypotes`) med obligatorisk
pålidelighedsniveau og kan **aldrig** antage niveauet `hog` (høj) —
`niva: Exclude<Tillforlitlighet, "hog">`; typesystemet forbyder det. I
kunderapporten er de udtrykkeligt markeret som ikke verificerede.
Kvalitetsporten har en egen række til dette.

Formuleringen ved mislykket reproduktion er *„kunde inte reproduceras under de
förhållanden som rådde"* („kunne ikke reproduceres under de forhold, der
herskede") — aldrig „fejlen konstateret" eller „ingen fejl fundet". Det er kodet
både i projektionerne og i orkestrets grundprompt.

### 1.2 Et flueben er ikke bevis

Hvert kontrolpunkt i hver metodik bærer et **minimumskrav**: `matvarde`
(måleværdi) | `kommentar` (observation) | `foto`. En måling kan ikke markeres
udført uden værdi; en fotokontrol ikke uden billede. Vil teknikeren springe
noget over, kræves en **dokumenteret undtagelse** med en begrundelse fra en fast
liste.

Låst af testen *„varje kontroll kräver bevis — en kryssruta är inte evidens"*.

### 1.3 Loggen er append-only, hele vejen ned

Der findes ingen update- eller delete-operationer i API'et, og databasen har
triggere, som afviser dem, selv hvis nogen omgår applikationen. En test søger
aktivt i serverkoden efter `update`/`delete` mod hændelsestabellen og fejler,
hvis de dukker op.

Konsekvens: en forkert oplysning rettes *ved en ny hændelse*, aldrig ved at den
gamle forsvinder. Historikken er det, der giver grundlaget værdi i en tvist.

### 1.4 Terminologi

I brugerfladen og i kundekommunikationen bruges **systemet, analysen,
vurderingen, beslutningsstøtten** — ikke „AI", medmindre det er teknisk
nødvendigt. Produktet beskrives som et *evidensbaseret diagnosesystem* /
*intelligent beslutningsstøtte*.

Grunden er både kommerciel og erkendelsesmæssig: en værkstedskunde, der hører
„AI", hører „gæt". En forsikringssagsbehandler, der læser „AI-vurdering" i et
grundlag, vægter det lavere.

### 1.5 Delingsgrænsen er en tilladelsesliste

Hvad der må forlade organisationen, opregnes **positivt**, pr. niveau. En ny
hændelsestype er dermed intern, indtil nogen aktivt slipper den fri. En test
kræver, at hver type i domænemodellen er klassificeret — glemmes en, fejler
bygget, i stedet for at den lækker.

---

## 2. Domænemodellen — hændelsesloggen

`app/src/felsokning/domain.ts` (281 linjer).

En sag er: identitet + metadata + en **ordnet liste af logposter**. Hver post
bærer `id`, `tidpunkt` (tidspunkt), `tekniker` og en `handelse` (hændelse).

### 2.1 Samtlige hændelsestyper

| Type | Indhold | Rolle |
|---|---|---|
| `objekt_identifierat` | `objekt` (nummerplade/VIN, mærke, model, motor …) | Hvad sagen angår |
| `arbetsorder_skannad` | `falt[]` + bilag | Aflæst arbejdsordre (**intern**) |
| `felbeskrivning` | `text` | Kundens ord, ordret |
| `arendetyp_satt` | `arendetyp` | Garanti / forsikring / kunde — vælger regelpakke |
| `fraga_besvarad` | `stegId`, `frageId`, `fraga`, `svar` | Metodikkens symptomspørgsmål |
| `kontroll_utford` | `stegId`, `kontrollId`, `text`, `resultat?`, `undantag?` | Verificeret tjeklistepunkt |
| `observation` | `text` | Hvad teknikeren så — ikke hvad hen tror |
| `matvarde` | `beskrivning`, `varde`, `enhet?` | Måling (E4) |
| `hypotes` | `text`, `niva` (aldrig `hog`) | Arbejdshypotese (**intern**) |
| `foto` | `beskrivning` + bilag | Billedbevis (E2) |
| `video` | `beskrivning` + bilag | Levende bevis (E3) |
| `matarstallning` | `lage` (ind/ud), `varde` + bilag | Kilometerstand ind/ud |
| `historik_kontrollerad` | `kontrollerad`, `kommentar?` | Servicehistorik |
| `reproducering` | `status` (ja/delvis/nej), `beskrivning` | **Symptomverifikation** |
| `felorsak` | struktureret årsagsanalyse | Årsag, kategori, grundlag |
| `atgardsforslag` | forslag med begrundelse | Hvad der bør gøres |
| `kundbeslut` | godkendt/afvist, kanal | Kundens beslutning |
| `atgard_utford` | udført arbejde | Hvad der faktisk blev gjort |
| `kvalitetskontroll` | verifikation efter reparation | Er symptomet væk? |
| `kommentar` | `text` | Fri note |
| `kategori_byte` | `kategori` | Tidsregistrering (**intern**) |
| `inaktivitet_forklarad` | `text`, `minuter` | Hvorfor det stod stille |
| `overlamning` | `fran`, `till?` | Vagtoverdragelse |
| `ansvarig_satt` | `ansvarig` | Værkførerens omfordeling (**intern**) |
| `ai_svar` | klassificerede `rader[]`, modelnavn | Beslutningsstøttens svar (**intern**) |
| `export_skapad` | `format`, `version` | Eksporten logger sig selv |
| `arende_avslutat` | `signatur?` | Teknikerens underskrift |

### 2.2 Bilag er indholdsadresserede

`foto`, `video`, `matarstallning` og `arbetsorder_skannad` er *snittyper* med
`Bilaga` (bilag):

```ts
export interface Bilaga {
  bilagaId?: string;
  bilagaHash?: string;   // SHA-256
  dataUrl?: string;      // bliver for altid — loggen er append-only
}
```

Indholdet ligger uden for loggen (S3 eller database), men **hashen ligger i
loggen**. Ved læsning verificeres hashen; passer den ikke, returneres `409`.
Betydningen: bytter nogen et billede ud i lageret, opdages det, og loggen kan
bevise, at det oprindelige billede var et andet.

`dataUrl` beholdes i typen, fordi ældre poster har den indlejret — og loggen kan
ikke skrives om.

---

## 3. Metodikmotoren

Siden den seneste ændring er **motor og indhold adskilt**:

- `metodik.ts` (171 linjer) — typer, valg af metodik, udledning af næste trin.
- `metodiker.ts` (899 linjer) — de seksten metodikker.

Biblioteket kan vokse, uden at motoren ændres.

### 3.1 Metodikbiblioteket

Trin-id'er er kode og forbliver svenske. `symptom` = symptom, `visuell` =
visuel kontrol, `matningar` = målinger, `provkorning` = prøvekørsel, `sakerhet`
= sikkerhed, `avlasning` = aflæsning, `glapp` = slør, `packning` = pakning.

| id | Navn (i koden) | Område | Trin | Kontroller |
|---|---|---|---|---|
| `vibration` | Vibration under körning | Hjul og afbalancering | symptom → visuell → kontroller → provkorning | 19 |
| `bromsar` | Bromssystem | Undervogn | symptom → visuell → matningar → system | 14 |
| `styrning_fjadring` | Styrning och fjädring | Undervogn | symptom → visuell → glapp → installning | 11 |
| `elsystem` | Elsystem och strömförsörjning | El | symptom → visuell → matningar → rela → funktionstest | 12 |
| `start_laddning` | Start- och laddningssystem | El | symptom → batteri → start → laddning → krypstrom | 15 |
| `motor_drift` | Motorgång och effekt | Motor | symptom → felkoder → mekanik → tandning_bransle → provkorning | 16 |
| `kylsystem` | Kylsystem och överhettning | Motor | symptom → visuell → matningar → packning | 12 |
| `drivlina` | Växellåda och drivlina | Transmission | symptom → visuell → matningar → provkorning | 10 |
| `avgas_emission` | Avgassystem och emissioner | Motor | symptom → avlasning → matningar → orsak | 12 |
| `klimat` | Klimatanläggning | Komfort | symptom → visuell → matningar → styrning | 11 |
| `hogvolt` | Högvoltsystem — elbil och hybrid | Højvolt | **sakerhet** → symptom → avlasning → laddning | 16 |
| `diagnos_natverk` | Felkoder och kommunikation | Diagnose | symptom → grund → buss → koder | 10 |
| `lackage` | Läckage | Øvrigt | symptom → visuell → metod | 8 |
| `missljud` | Missljud | Øvrigt | symptom → inspelning → lokalisering | 7 |
| `adas` | Förarassistans och kalibrering | Diagnose | symptom → forutsattningar → kalibrering | 9 |
| `generisk` | Generell strukturerad felsökning | Øvrigt | symptom → visuell → grundkontroller → funktionstest | 9 |

Danske navne: vibration under kørsel · bremsesystem · styretøj og affjedring ·
elsystem og strømforsyning · start- og ladesystem · motorgang og ydelse ·
kølesystem og overophedning · gearkasse og transmission · udstødning og
emissioner · klimaanlæg · højvoltsystem (elbil/hybrid) · fejlkoder og
kommunikation · lækage · unormal støj · førerassistance og kalibrering ·
generisk struktureret fejlfinding.

### 3.2 Tre regler, låst af test

1. **Hver kontrol har et minimumskrav.** Måleværdi, foto eller observation.
2. **Hver metodik begynder med at verificere symptomet**, aldrig med at
   reparere. Kundens ord bliver først et verificeret symptom, når det er
   reproduceret.
3. **Hvor arbejdet kan skade nogen, kommer sikkerhedstrinnet først.** Kun
   `sakerhet` må gå forud for `symptom` — testen tillader præcis den undtagelse
   og ingen anden.

`hogvolt` er den eneste metodik med et sikkerhedstrin. Det kræver
kvalifikation, dokumenteret udtaget serviceafbryder (foto), ventetid efter
fabrikantens anvisning, **målt spændingsfrihed** (en måleværdi — ikke et ja til
et spørgsmål) og værnemidler. Testen kontrollerer, at trinnet ligger først, at
`spanningsfrihet` kræver en måleværdi, og at beskrivelsen indeholder ordet
„livsfarlig".

Grunden er enkel: det arbejde kan dræbe nogen. Der dur et flueben ikke.

### 3.3 Valg af metodik

Tidligere en regex-kæde med tre udfald. Nu **pointsat nøgleordsmatchning**:

```ts
export function metodikPoang(metodik: Metodik, text: string): number
export function valjMetodik(felbeskrivning: string): Metodik
```

- Point = summen af længden på de nøgleord, der rammer. Et længere — mere
  specifikt — ord vejer tungere. `traktionsbatteri` (16) slår `batteri`.
- **Korte ord (≤3 tegn) matches som helt ord, længere som ordstamme.** Ellers
  ville `"ac"` have ramt *acceleration*, og en vibration var havnet i
  klimaanlægget.
- Ved lige point vinder den, der står først i biblioteket → valget er **stabilt**
  mellem kørsler.
- Ingen træffer → `generisk`.

**En faldgrube, der faktisk bed under udviklingen:** nøgleordene skal være
*stammer*, ikke færdigbøjede ord. Svensk bøjning fjerner ofte et `e`:
*filter → filtret*, så `"partikelfilter"` rammer aldrig den tekst, en tekniker
rent faktisk skriver. Det samme gælder *regenerering → regenererar*,
*misständning → misständer*, *skrammel → skramlar*. Biblioteket bruger derfor
`partikelfilt`, `regenerer`, `misständ`, `skram`.

*(Til en lokalisering: dette er en egenskab ved svensk morfologi. Dansk har den
samme klasse af problem i bestemt form og sammensætninger — `filter` bliver
`filteret`, og `bremse` optræder inde i `håndbremse`, hvor en ordstammematchning
med krav om ordstart ikke rammer. Et lokaliseret nøgleordssæt skal valideres mod
den samme test, ikke oversættes ord for ord.)*

**Valget er en spørgsmålsrækkefølge, ikke en diagnose.** Det afgør, hvor
teknikeren begynder at lede, ikke hvad der er galt. Rammer intet, er `generisk`
det ærlige svar — strukturelt komplet og bedre end et gæt.

### 3.4 Næste trin

```ts
export function nastaSteg(arende: Arende, metodik: Metodik): NastaSteg
```

Rent udledt af loggen: første ubesvarede spørgsmål, dernæst første ikke-udførte
kontrol, i metodikkens rækkefølge. Ingen skjult tilstandsmaskine — den samme log
giver altid det samme næste trin.

### 3.5 Om at „dække alt"

Det kan ikke loves ærligt, og dokumentationen påstår det ikke. Det, der kan
lade sig gøre, er at dække køretøjets systemer systematisk og lade `generisk`
være et strukturelt komplet sikkerhedsnet for det, ingen har forudset.

---

## 4. ECM v2.0 — bevis- og regelmotoren

`app/src/felsokning/ecm.ts` (749 linjer). Seks motorer:

### 4.1 Evidence Engine

Bevisniveauer, udledt af loggen:

| Niveau | Betydning |
|---|---|
| E0 | Intet grundlag |
| E1 | Teknikerens observation |
| E2 | Foto |
| E3 | Video |
| E4 | Måleværdi |
| E5 | Diagnosedata / dokument |
| E6 | Flere uafhængige kilder |

En sags bevisniveau er det højeste, grundlaget bærer. Det vises i brugerfladen
og følger med eksporten.

**Indholdshash:** `innehallsHash()` er en deterministisk FNV-1a over
bevisindholdet. Samme grundlag ⇒ samme hash, uanset maskine eller tidspunkt. Det
gør eksporten verificerbar bagefter.

### 4.2 Rule Engine

- `ORSAKSKATEGORIER` — fast liste over årsagskategorier (giver sammenlignelig
  statistik på tværs af flåden).
- `UNDANTAGSORSAKER` — fast liste til „hvorfor dette ikke blev gjort".
- `UNDERLAGSKALLOR` — hvad en konklusion hviler på.
- `INGEN_ATGARD_ORSAKER`, `KUNDKANALER` (kundekanaler).
- `granskaAvvikelse()` — markerer tekst, der er formuleret som en konstatering
  uden dækning.

Faste lister frem for fritekst er et bevidst valg: fritekst kan ikke aggregeres,
og flådestatistikken er et af produktets reelle aktiver.

### 4.3 Compliance Engine

`ARENDETYPER` (sagstyper) bestemmer, hvilken **regelpakke** der gælder. En
garantisag kræver claim-nummer og servicehistorik; en forsikringssag kræver
skadenummer og billedbevis; en kundesag kræver mindre. Pakkerne er data
(`ecm-regler.json`, kan serveres via `/api/ecm/regler`) — nye krav kræver ingen
ny udgivelse.

### 4.4 Validation Engine — prædiagnostik

Før fejlfindingen må begynde: objektidentifikation verificeret, arbejdsordre
indlæst, køretøjshistorik kontrolleret **eller begrundet**, indgående
kilometerstand dokumenteret, kundens fejlbeskrivelse verificeret, tidlige
observationer håndteret.

### 4.5 Completion Engine — kvalitetsporten

Den største enkeltfunktion (`kvalitetsgrind`, ~240 linjer). Sagen kan ikke
afsluttes, før hver række er grøn eller begrundet:

- Køretøjshistorik kontrolleret eller begrundet
- Indgående/udgående kilometerstand dokumenteret
- Kundens fejlbeskrivelse verificeret
- **Symptomverifikation:** reproduceret eller dokumenteret som ikke
  reproducerbar
- Årsagsanalyse dokumenteret
- Udbedring dokumenteret eller begrundet
- Kundens svar på forslaget registreret
- Arbejde udført trods afvist forslag (hvor det er relevant)
- Kvalitetskontrol gennemført — symptomet verificeret
- Metodikkens kontroller: bevis eller dokumenteret undtagelse
- Fotos findes til fotokrævende kontroller
- Teknikerens konklusion underskrevet
- Hypoteser fremstillet som ikke verificerede
- Sagstypens regelpakke opfyldt (claim / skadenummer / kilometerstand /
  historik)

### 4.6 Traceability Engine

`sparbarhetspaket()` — hele beviskæden i ét struktureret objekt: hvad der
påstås, hvad det hviler på, hvem der dokumenterede det og hvornår.

---

## 5. Symptomverifikation (SVP)

Et selvstændigt princip, fordi det er produktets skarpeste kant mod
virkeligheden.

**Kundens beskrivelse ≠ en konstateret fejl.**

1. Beskrivelsen dokumenteres **ordret** (`felbeskrivning`).
2. Den præciseres gennem metodikkens symptomspørgsmål — *hvornår, hvor,
   hvordan*, aldrig „hvad er der galt".
3. Den **reproduceres**, med tre mulige udfald:
   - **Ja** — med dokumenterede forhold.
   - **Delvis** — hvad der kunne og ikke kunne genskabes.
   - **Nej** — obligatorisk begrundelse.

Rapportens beviskæde adskiller fire ting, der ellers blandes sammen: *kundens
beskrivelse*, *verificeret observation*, *årsagsanalyse* og *anbefalet
udbedring*.

---

## 6. Klienten

`app/src/felsokning/` + `app/src/pages/felsokning/`.

| Modul | Linjer | Ansvar |
|---|---|---|
| `ArendeSida.tsx` | 2433 | Sagsvisningen. Trekolonnelayout på skrivebord |
| `metodiker.ts` | 899 | Metodikbiblioteket |
| `ecm.ts` | 749 | Regel- og bevismotor |
| `NyttArende.tsx` | 497 | Sagsoprettelse, scanning af arbejdsordre |
| `Arendelista.tsx` | 399 | Dashboard: tællere, filtre |
| `projektioner.ts` | 356 | Alle visninger som rene funktioner af loggen |
| `ai.ts` | 305 | Klientsiden af orkestret, promptopbygning, svarfortolkning |
| `plattform.ts` | 296 | API-klient mod den selvhostede platform |
| `DelatArendeVy.tsx` | 283 | Delt visning (kunde/partner/intern) |
| `domain.ts` | 281 | Hændelsestyper |
| `Installningar.tsx` | 281 | Organisation, brugere, integrationer |
| `Oversikt.tsx` | 238 | Værkførervisning |
| `demo.ts` | 200 | Demosag med 1 t 35 min historik |
| `ui.tsx` | 174 | Industriel værkstedsflade |
| `metodik.ts` | 171 | Metodikmotoren |
| `synk.ts` | 141 | Konfliktfri sammenfletning af hændelser |
| `ikoner.tsx` | 132 | Egne SVG-linjeikoner (ingen emojis) |
| `streckkod.ts` | 131 | Stregkode-/VIN-aflæsning |
| `store.ts` | 106 | zustand-store |
| `bilagor.ts` | 96 | Upload + blob-URL-cache |
| `installningar.ts` | 86 | Organisationsindstillinger |
| `Bilagevisning.tsx` | 69 | `<Bild>` / `<Klipp>` |
| `Mikrofon.tsx` / `rost.ts` | 66 / 65 | Talegenkendelse |
| `format.ts` | 48 | Fotoskalering m.m. |

### 6.1 Projektionerne

```
objekt · felbeskrivning · ansvarig · arendeidentitet · arAvslutat
lokalFordonshistorik · utfordaKontroller · ejKontrollerat
observationer · hypoteser · foton · videor
tidsfordelning · formateraTid · tillforlitlighet
brief · overlamningstext · tidsfordelningsRader · sistaAktivitet
```

Alle rene funktioner af `Arende`. `ejKontrollerat` („ikke kontrolleret") er den,
der sparer mest tid i praksis: *det, der giver dobbeltarbejde ved vagtskifte, er
det, ingen har skrevet ned, at ingen har gjort.*

### 6.2 Designsprog

En ETKA-inspireret værkstedsflade: flade lysegrå flader (#ECECEC/#F7F7F7),
skarpe kanter, dyb marineblå som primærfarve, tæt typografi (11–15 px),
rektangulære knapper (maks. 4 px radius), værktøjslinje ~44 px. Egne
linjeikoner i stedet for emojis; status som farveprikker.

Motivet: teknikeren har handsker på, står i et støjende rum og har ikke tid til
en luftig forbrugerflade.

### 6.3 Lokal tilstand

Uden login arbejder appen mod `localStorage`. Metodikken guider alene;
orkestret er slukket. Status vises i sagshovedet. Ved login flettes lokale
hændelser sammen med serverens — konfliktfrit pr. hændelses-id, testet.

---

## 7. Backend

### 7.1 `services/plattform` (1210 linjer)

Rent `node:http`. Eneste afhængighed er `pg`.

**API-stier:**

```
GET  /halsa                        sundhedstjek
GET  /api/openapi.yaml
POST /api/auth/registrera          opretter organisation + systemadministrator
POST /api/auth/logga-in            login
POST /api/auth/logga-ut-alla       hæver token_version → alle sessioner dør
GET  /api/anvandare                brugere; kun admin
POST /api/anvandare
POST /api/anvandare/{id}/avaktivera | /aktivera
GET  /api/organisation
GET/PUT /api/organisation/installningar
GET  /api/ecm/regler               regelpakker som data
GET/POST /api/arenden              sager
POST /api/arenden/{id}/handelser   append-only
POST /api/arenden/{id}/bilagor     bilag
GET  /api/bilagor/{id}             hash verificeres ved læsning
GET  /api/fordon/{identifierare}/historik
GET  /api/statistik/felorsaker     årsagsstatistik
GET  /api/oversikt                 værkførervisning
GET  /api/delad/{kod}              delt, filtreret efter niveau
POST /api/delad/{kod}/beslut       kundens beslutning uden login
GET  /api/delad/{kod}/bilagor/{id} niveaufiltreret
GET  /api/integrationer/leverantorer
GET/PUT/DELETE /api/integrationer/{leverantor}
POST /api/integrationer/{leverantor}/uppslag
```

Der findes ingen update- eller delete-stier mod sagsdata. Med vilje.

**Sikkerhedsfunktioner i tjenesten:**

```
ursprungFor · forTataForsok · kallaFor · inloggningSparrad · loggaForsok
skapaJwt · verifieraJwt · kontoGiltigt · kravAuth · arendeIOrg
integrationsNyckel · kryptera · dekryptera · maskera
arPrivatAdress · pekarInat · gorUppslag · skickaBilaga · synligaTyper
```

### 7.2 `services/ai-orkester` (400 linjer)

Ejer Claude-nøglen. Klienten har den **aldrig**. Routing pr. opgave:

| Opgave | Model | Effort | Vision |
|---|---|---|---|
| `handledning` (vejledning i realtid) | `claude-sonnet-5` | medium | — |
| `granskning` (dybdegennemgang) | `claude-opus-5` | **high** | — |
| `sammanfattning` (overdragelsesresumé) | `claude-sonnet-5` | low | — |
| `metodikval` (klassificering) | `claude-haiku-4-5` | *(ingen — modellen tager ikke parameteren)* | — |
| `instrumentavlasning` (instrumentaflæsning) | `claude-sonnet-5` | low | ✔ |
| `dokumenttolkning` (dokumentfortolkning) | `claude-sonnet-5` | low | ✔ |

Alle svar er **skemabundne** (`json_schema`). Grundprompten koder reglerne:
*„Find aldrig på fakta"*, *„aldrig en hypotese som en konstateret fejl"*,
*„KRÆVER verifikation"*. Ved afvist forespørgsel sker der automatisk fallback
til en reservemodel. **Den model, der svarede, logges i hver `ai_svar`-hændelse**
— grundlaget skal kunne granskes bagefter.

Metodikkataloget bygges ud fra én liste (`METODIK_KATALOG`), som genererer både
skemaets `enum` og promptens punktliste. En test sammenligner det med klientens
bibliotek: driver listerne fra hinanden, returnerer klassifikatoren et id,
klienten ikke kender, og valget ville falde *stiltiende* tilbage på generisk. Nu
fejler testen i stedet.

### 7.3 `services/gemensam/observation.mjs` (166 linjer)

Sporing og måleværdier **uden nye afhængigheder**. Tjenesterne har bevidst
næsten ingen afhængigheder; at trække et OpenTelemetry-SDK med tredive pakker
ind for at måle fire ting ville være den forkerte afvejning. I stedet to
standarder, der begge blot er tekst på stdout:

- **W3C Trace Context** — `traceparent` følger med gennem hele kæden
  (klient → platform → orkester).
- **CloudWatch EMF** — struktureret JSON, som CloudWatch selv trækker
  måleværdier ud af. Ingen agent, intet SDK, intet der kan holde op med at
  virke i stilhed.

```
spårFrån(header) · traceparent(spor) · starta(navn, spor)
  → .mät(delnavn, arbejde) · .ms() · .delar()
logga(niveau, besked, felter) · mätvärde(navn, værdi, enhed, dim, ekstra)
avsluta(span, { status, väg, extra })
```

Det, der måles, blev valgt ud fra ét spørgsmål: *hvad vil man vide klokken tre
om natten, når noget er langsomt?* Svaret er **hvor tiden blev af** — ikke hvor
mange kald der er sket. Derfor `delar()` („dele"): databasen, modelkaldet,
objektlageret, kundens leverandør, med antal og sum pr. del i samme loglinje.

`mät()` måler også, når arbejdet kaster — ellers ser fejl ud som nul tid.

**Dimensioner holdes bevidst få.** Hver unik kombination er sin egen tidsserie,
der koster penge, så organisation, sag og spor-id må aldrig blive dimensioner —
de ligger som almindelige felter. Låst af en test, der udtrykkeligt forbyder
`org`, `organisation`, `arende`, `spårId`, `anvandare` blandt dimensionerne.

---

## 8. Sikkerhed

| Beskyttelse | Implementering |
|---|---|
| **Multi-tenant-isolation** | Alle sagsforespørgsler er organisationsbundne (`arendeIOrg`); integrationstestet mod rigtig Postgres |
| **Roller** | `tekniker` / `arbetsledare` / `admin` (tekniker / værkfører / admin), i JWT'et og som databasetjek |
| **JWT-claims** | `{ sub, namn, org, roll, tv }` — `tv` = token_version |
| **Øjeblikkelig tilbagekaldelse** | `kontoGiltigt()` kontrollerer `aktiv` + `token_version` ved *hver* autentificeret forespørgsel. En gyldig signatur er ikke nok |
| **Global udlogning** | `/api/auth/logga-ut-alla` hæver `token_version` → alle udstedte tokens dør straks |
| **Adgangskoder** | bcrypt via `gen_salt('bf')` i databasen |
| **Login-spærring** | 15-minutters vindue; maks. 10 forsøg pr. konto, 30 pr. kilde. Ryddes probabilistisk (2 % pr. skrivning) for at undgå et cron-job |
| **Kryptering i hvile** | AES-256-GCM til kundernes integrationsoplysninger; hemmelige felter maskeres altid i API-svar |
| **SSRF-forsvar** | `arPrivatAdress()` + `pekarInat()`: 10/8, 127/8, 169.254/16, 172.16–31, 192.168/16, 100.64/10, ::1, fc/fd, fe80, ::ffff:. **DNS slås op**, før kaldet sker; `.local`/`.internal` blokeret. Nødudgang `TILLAT_INTERNA_UPPSLAG` til testmiljø |
| **CORS** | `TILLATNA_URSPRUNG`-tilladelsesliste; oprindelsen sættes én gang pr. forespørgsel |
| **Bilagsintegritet** | SHA-256 i loggen, verificeres ved læsning → `409` ved afvigelse |
| **Append-only i databasen** | Triggere `before update or delete` på både `felsokning_handelser` og `felsokning_arenden` |
| **Pod-hærdning** | IMDSv2 obligatorisk, hop-grænse 1 → pods kan ikke låne nodens IAM-rolle |
| **IRSA** | Hver servicekonto har sin egen rolle; noderne deler ingen rettigheder |
| **Delte IAM-roller** | `bygg` (build) må publicere til ECR, men ikke røre klyngen; `drift` må røre klyngen, men ikke publicere images |
| **Netværkspolitik** | Indgående nægtes som standard; eksplicitte `_ut`-regler (udgående) pr. tjeneste |
| **Databaseadgang** | Kun fra klyngens noder, i et undernetslag **uden rute ud** |

### 8.1 Databaseskema

```
organisationer · anvandare · inloggningsforsok
felsokning_arenden · felsokning_handelser
bilagor · bilage_innehall
delningar · integrationer
```

(organisationer · brugere · loginforsøg · sager · hændelser · bilag ·
bilagsindhold · delinger · integrationer)

---

## 9. Live Share — delingsniveauer

Tre niveauer, serverstyret filtrering:

| Niveau | Ser |
|---|---|
| **kund** (kunde) | 22 hændelsestyper: objekt, fejlbeskrivelse, spørgsmål, kontroller, observationer, måleværdier, fotos, videoer, kommentarer, overdragelser, udbedringer, kvalitetskontrol … |
| **partner** | Alt, hvad kunden ser **+ `hypotes`** (markeret som ikke verificeret) |
| **intern** | Fuld indsigt — ingen filtrering |

**Aldrig uden for organisationen:**
`kategori_byte`, `hypotes`, `ai_svar`, `ansvarig_satt`, `arbetsorder_skannad`.

```js
export function synligaTyper(niva) {
  if (niva === "intern") return null;           // fuld indsigt
  return niva === "partner" ? DELBART_PARTNER : DELBART_KUND;
}
```

Links kan tilbagekaldes. Den offentlige delingsside
(`/felsokning/delad/:kod`) kræver ikke login og poller for liveopdatering.
Kunden kan give sit svar direkte i visningen
(`POST /api/delad/{kod}/beslut`).

**Hvorfor en tilladelsesliste:** en nægtelsesliste skal opdateres, hver gang en
ny hændelsestype tilføjes — og det er præcis det, man glemmer. En
tilladelsesliste gør „glemt" til „intern", og det er det sikre udfald.

---

## 10. Mærkespecifikke koblinger

Leverandører er **data, ikke kode** (`integrationer.json`, kan monteres som
ConfigMap via `INTEGRATIONER_FIL`). Nye mærker kræver ingen ombygning.

| id | Leverandør |
|---|---|
| `generisk_vin` | Vilkårlig VIN-tjeneste over HTTP |
| `vag_erwin` | Volkswagen Group erWin (VW, Audi, Škoda, SEAT) |
| `volvo_vida` | Volvo VIDA |
| `fordonsregister` | Nummerplade → køretøj |

Hver leverandør deklarerer sine felter, hvilke der er hemmelige (krypteres +
maskeres), og hvordan svaret mappes til domænets felter (`marke`, `modell`,
`arsmodell`, `motor`, `vaxellada` — mærke, model, årgang, motor, gearkasse).

Opslag går gennem SSRF-beskyttelsen — en kunde kan altså ikke pege en
„leverandør" mod klyngens interne adresser.

---

## 11. Visual-first

Kameraet **er** integrationslaget. Det, der står på en skærm eller et
instrument, fotograferes og fortolkes i stedet for at blive integreret.

- **Scanning af arbejdsordren** er hovedvejen ved sagsoprettelse. Sonnet 5
  (vision) læser kunde-, køretøjs- og værkstedsoplysninger uanset layout, med
  en konfidens pr. felt:
  - 🟢 ≥95 % godkendes automatisk
  - 🟡 80–95 % markeres til gennemlæsning
  - 🔴 <80 % kræver aktiv bekræftelse

  Teknikeren gennemgår altså kun de usikre felter. Visuel kontrol med
  dokumentet ved siden af felterne; et klik markerer den omtrentlige position.

- **Instrumentaflæsning** — foto af en diagnoseskærm eller et instrument →
  strukturerede værdier.

Motivet er kommercielt: én integration pr. værkstedssystem er én salgscyklus
pr. kunde. Et kamera virker mod alt, med det samme.

---

## 12. Infrastruktur

To Terraform-lag. Basen kører sjældent, arbejdsbyrdelaget ofte.

### 12.1 `infra/aws` — basen (91 ressourcer)

| Område | Indhold |
|---|---|
| **Netværk** | 1 VPC, 3 undernetslag × 3 zoner: offentligt (kun ALB + NAT), privat (noder, ingen offentlige adresser), data (Aurora, **slet ingen rute ud**). VPC-endpoints: S3 (gateway); ECR, logs, Secrets Manager, STS, ELB (interface) → trafikken forlader aldrig netværket |
| **Klynge** | EKS, arm64-noder, IRSA via OIDC-provider, IMDSv2 hop-grænse 1, alle fem control plane-logs slået til |
| **Data** | Aurora PostgreSQL Serverless v2, PITR ned til sekundet, KMS med egen nøgle, `sslmode=require` |
| **Objektlager** | S3 til bilag: SSE-KMS, offentlig adgang blokeret, TLS obligatorisk, versionering slået til. Platformsrollen må læse og skrive — **men aldrig slette** |
| **Register** | ECR med **uforanderlige tags** + sårbarhedsscanning |
| **Hemmeligheder** | Secrets Manager; kan kun læses af platformsrollen via IRSA |
| **Roller** | 9 IAM-roller, heriblandt de delte `bygg` / `drift` |
| **Domæne** | Route 53 + ACM med DNS-validering |
| **Observerbarhed** | 7 alarmer, 1 dashboard, 3 loggrupper, SNS-topic |

**Alarmerne** — få, men de, der findes, betyder noget. *En alarm, ingen
reagerer på, lærer folk at ignorere alarmer.*

- Aurora-CPU > 85 % i tre perioder (skaleringsloftet kan være nået)
- Aurora fri lokal lagring < 5 GiB
- **Backup-alder** — `treat_missing_data = "breaching"`. Mangler måleværdien,
  findes der ingen sikkerhedskopiering. *En backup, man tror findes, er værre
  end ingen.*
- Færre noder end det ønskede minimum
- Svartid **p95** > 3 s i tre perioder — ikke gennemsnittet, som skjuler, at
  hver tyvende tekniker venter urimeligt længe
- Serverfejl (sum > 5)
- Modellen afviser (tyder på uventet input, ikke på en driftsfejl)

### 12.2 `infra/terraform` — arbejdsbyrden (35 ressourcer)

Læser basen via `terraform_remote_state`; gentager intet.

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

`karta.tf` (117 linjer) producerer et læsbart kort over hele driftbilledet:
`terraform output karta`.

### 12.3 Git og CI — fuldt selvhostet

En udtrykkelig produktbeslutning: **ingen GitHub i driftvejen.** Gitea +
Actions-runnere kører på eget EKS. `.gitea/workflows/felsokning.yml`:

| Job | Indhold |
|---|---|
| `test-och-bygg` | `vitest run`, `typkontroll`, eslint, `vite build` |
| `tjanster` | eslint på tjenesterne, **integrationstest mod rigtig Postgres**, `swagger-cli validate` |
| `terraform` | `fmt -check -recursive`, `init -backend=false`, `validate` |
| `publicera` | Kun på `main`, kun hvis ovenstående gik igennem. Bygger tre images, tagger med commit-SHA'en, skubber til vores eget ECR. **OIDC, ingen statisk nøgle** |
| `driftsatt` | **Manuelt** (`workflow_dispatch`) med eksplicit image-tag |

Idriftsættelse er et selvstændigt trin med vilje: *et image i registret er ikke
det samme som et image, der kører.* Rollback = kør igen med det tidligere tag.

Klientens API-adresse bages ind ved bygget (Vite), så imaget er miljøbundet.
Byggekonteksten for tjenesterne er `services`, så begge når det
fælles observationsmodul uden at duplikere det.

---

## 13. Test

**120 vitest-test** i 13 filer:

| Fil | Antal | Låser |
|---|---|---|
| `ecm.test.ts` | 32 | Bevisniveauer, regelpakker, kvalitetsport, prædiagnostik |
| `metodiker.test.ts` | 14 | Bibliotekets struktur, metodikvalg, katalogparitet med orkestret |
| `projektioner.test.ts` | 13 | Visninger som rene funktioner, næste trin |
| `ai.test.ts` | 11 | Orkesterparitet, OpenAPI ↔ server, append-only, promptregler |
| `observation.test.ts` | 10 | Sporing, EMF-format, **forbudte dimensioner** |
| `bilagor.test.ts` | 9 | Indholdshash, SigV4, valg af lagerlag |
| `delning.test.ts` | 7 | Tilladelseslisten dækker hver hændelsestype |
| `integrationer.test.ts` | 7 | Leverandøropslag, SSRF-værn |
| `demo.test.ts` | 4 | Demosagen er rig nok til at vise |
| `installningar.test.ts` | 4 | Organisationsindstillinger |
| `streckkod.test.ts` | 4 | VIN/stregkode |
| `synk.test.ts` | 4 | Konfliktfri sammenfletning |
| `example.test.ts` | 1 | — |

**Ud over enhedstestene:**

- `integrationstest.sh` — hele forløbet mod **rigtig Postgres**: organisationer,
  roller, append-only-triggeren, isolation, deling, bilag.
- SigV4 **krydsverificeret bit for bit mod botocore** (`sigv4-referens.json`).
- `swagger-cli validate` på OpenAPI-specifikationen.
- Paritetstest mellem specifikation ↔ server, klient ↔ orkester (× 2 kopier),
  domænemodel ↔ delingsliste.

### 13.1 Verifikationssløjfen før hver commit

```
npx vitest run                    # 120 test
npm run typkontroll               # tsc --noEmit  (vite build typetjekker IKKE)
npx eslint src/felsokning src/pages/felsokning
cd ../services && npx eslint .
npm run build
terraform fmt -check -recursive
# rodens CI: lint · format:check · typecheck · test
```

`typkontroll` kom til, efter at to latente nedbrud (`TextFalt` og
`UNDANTAGSORSAKER` brugt uden import) var sluppet forbi `vite build` — som
transpilerer, men ikke typetjekker.

---

## 14. Repositoriestruktur

`main` er et npm-workspaces-monorepo ved navn **Semantika**, som ejer roden. Da
de to produkter blev slået sammen, blev begge bevaret, med værktøjskæderne
**adskilt pr. træ** — ikke ved at svække nogens regler.

```
/                             Semantika (workspaces-rod)
├── apps/mobile/              Semantika
├── services/api/             Semantika
├── infra/                    Semantika
├── .github/workflows/ci.yml  Semantika  — urørt
│
├── .gitea/workflows/felsokning.yml      Guidad Felsökning (egen CI)
└── felsokning/
    ├── app/                  klient (egen package.json, eslint, vitest, tsconfig)
    ├── services/
    │   ├── plattform/
    │   ├── ai-orkester/
    │   └── gemensam/         observation.mjs (fælles)
    ├── infra/
    │   ├── aws/              basen, 91 ressourcer
    │   ├── terraform/        arbejdsbyrden, 35 ressourcer
    │   └── postgres-init.sql
    ├── docs/
    └── supabase/             migrationer + edge-funktion (ældre vej)
```

**To driftveje findes parallelt:** den selvhostede AWS-stak (den, der gælder) og
en ældre Supabase-baseret (edge-funktionen `felsokning-ai`, migrationer).
Orkestret findes derfor i **to kopier**, holdt synkrone af test.

---

## 15. Dokumentation i repositoriet

```
docs/VISION.md                          produktvisionen
docs/MASTER-PROMPT.md                   grundinstruktionen
docs/MVP.md                             hvad der er bygget, funktion for funktion
docs/DEMO.md                            demomanuskript til fremvisning
docs/OPERATIONS.md                           drift
docs/SYSTEM-DESCRIPTION.md              engelsk — den gældende udgave
docs/SYSTEM-DESCRIPTION.sv.md           svensk
docs/SYSTEM-DESCRIPTION.de.md           tysk
docs/SYSTEM-DESCRIPTION.da.md           dette dokument
docs/SYSTEM-DESCRIPTION.no.md           norsk (bokmål)
docs/examples/vibration-at-88-km-h.md   gennemgående eksempel
docs/modules/                           otte moduldokumenter
```
Alle dokumenter ovenfor har engelsk som kilde og et `.sv.md`-søskendedokument
på svensk. Kun SYSTEM-DESCRIPTION findes på alle fem sprog.


---

## 16. Designbeslutninger og deres begrundelser

Samlet, fordi begrundelsen ofte er vigtigere end beslutningen.

| Beslutning | Begrundelse |
|---|---|
| Event sourcing | Grundlaget skal holde i en tvist. Historikken *er* værdien |
| Append-only også i databasen | Applikationslaget kan omgås; triggeren kan ikke |
| Tilladelsesliste til deling | En glemt hændelsestype bliver intern, ikke lækket |
| Faste årsagskategorier | Fritekst kan ikke aggregeres; flådestatistikken er et aktiv |
| Serverejet modelrouting | Klienten må aldrig have nøglen, og routing skal kunne ændres uden en udgivelse |
| Model logget pr. svar | Grundlaget skal kunne granskes bagefter |
| Undgå ordet „AI" | Kunden hører „gæt"; sagsbehandleren vægter det lavere |
| Visual-first | Én integration pr. værkstedssystem = én salgscyklus pr. kunde. Kameraet virker med det samme |
| Leverandører som data | Et nyt mærke bør ikke kræve en udgivelse |
| Egen observerbarhed, nul afhængigheder | 30 pakker for at måle 4 ting er den forkerte afvejning |
| Få EMF-dimensioner | Hver kombination er en betalt tidsserie |
| p95 i alarmen, ikke gennemsnittet | Gennemsnittet skjuler, at hver tyvende tekniker venter |
| Alarm på *manglende* backupdata | En backup, man tror findes, er værre end ingen |
| Delte build-/driftroller | Et kompromitteret build må ikke kunne røre klyngen |
| Manuel idriftsættelse | Et image i registret ≠ et image, der kører |
| Uforanderlige ECR-tags | Et tag skal betyde det samme i morgen |
| Indholdsadresserede bilag | Et udskiftet billede skal opdages, ikke antages |
| Hashverifikation ved læsning | Det er ikke nok at hashe ved skrivning |
| S3-rollen må ikke slette | Append-only skal også gælde lageret |
| Motor adskilt fra indhold | Biblioteket vokser; motoren skal ikke behøve at ændres |
| Pointsat metodikvalg | Regex-kæder bliver uigennemskuelige ved 16 alternativer |
| Nøgleord som ordstammer | Svensk bøjning fjerner et `e` — ellers rammer intet |
| `generisk` som fallback | Et ærligt „vi ved det ikke" slår et gæt |
| Sikkerhedstrin først i højvolt | Det arbejde kan dræbe |
| Svensk i koden | Domænet er svensk; oversættelse frem og tilbage taber præcision |

---

## 17. Kendte begrænsninger og åbne punkter

Udtrykkeligt ikke færdigt:

- **To orkesterkopier** (Supabase-edge-funktion + K8s-tjeneste) holdes
  synkrone af test, ikke af fælles kode. Supabase-vejen er den ældre og bør
  udfases.
- **`ArendeSida.tsx` er på 2433 linjer.** Den virker, men er den fil, der koster
  mest at ændre i.
- **`terraform validate` kan ikke køres lokalt** i udviklingsmiljøet (den
  udgående netværkspolitik blokerer provider-downloads). Erstattet af
  `terraform fmt` plus en egen statisk referencekontrol; den rigtige validering
  sker i CI.
- **Claude-nøglen udfyldes i hånden** efter den første `apply` — den ligger med
  vilje ikke i Terraform-state.
- **`postgres-init.sql` køres manuelt** mod databasen, efter at basen er
  anvendt.
- **Ingen automatisk gendannelsestest af backuppen.** Alarmen siger, at der
  *tages* backup, ikke at den *kan gendannes*.
- **Metodikbiblioteket dækker ikke alt** — og påstår det ikke. `generisk` er
  sikkerhedsnettet.
- Rodens eslint har 20 allerede eksisterende fejl i Semantikas egne sider
  (`no-explicit-any`), som ikke vedrører Guidad Felsökning.

---

## 18. Ordliste

Venstre kolonne er begrebet, som det står i kode og brugerflade.

| Svensk | Dansk |
|---|---|
| Ärende | Sag — én fejlfindingsopgave |
| Händelse / loggpost | Hændelse / logpost — udelelig post i append-only-loggen |
| Metodik | Metodik — struktureret fejlfindingsforløb |
| Steg | Trin — fase i en metodik (symptom, visuel kontrol, målinger …) |
| Kontroll | Kontrol — enkelt tjeklistepunkt med minimumskrav |
| Krav | Krav — `matvarde` / `kommentar` / `foto` |
| Undantag | Undtagelse — dokumenteret grund til, at en kontrol blev sprunget over |
| Brief | Brief — sammenstillet sagsbillede; en projektion |
| Kvalitetsgrind | Kvalitetsport — regelsæt, der skal passeres før afslutning |
| Evidensnivå | Bevisniveau — E0–E6, grundlagets bevisværdi |
| Reproducering | Reproduktion — symptomverifikation: ja / delvis / nej |
| Felorsak | Fejlårsag — struktureret analyse med kategori og grundlag |
| Delning | Deling — eksternt link med rettighedsniveau |
| Orkester | Orkester — tjenesten, der ejer modelroutingen |
| Spann / spår | Span / spor — tidsmåling henholdsvis W3C-sporing |
| Bilaga | Bilag — indholdsadresseret foto/video/dokument |
| Tekniker | Tekniker, mekaniker |
| Arbetsledare | Værkfører |
| Fordon | Køretøj |
| Mätvärde | Måleværdi |
| Felbeskrivning | Fejlbeskrivelse (kundens ord) |
| Arbetsorder | Arbejdsordre |
| Mätarställning | Kilometerstand |
| Överlämning | Overdragelse |
| Åtgärd | Udbedring, indgreb |
| Kundbeslut | Kundens beslutning |
| Säkerhet | Sikkerhed |
| Högvolt | Højvolt |
