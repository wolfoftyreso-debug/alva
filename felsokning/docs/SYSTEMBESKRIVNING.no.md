# Guidad Felsökning (Veiledet Feilsøking) — fullstendig systembeskrivelse

> **Norsk oversettelse (bokmål).** Kilden er [SYSTEMBESKRIVNING.md](SYSTEMBESKRIVNING.md) (svensk).
> Ved uoverensstemmelse gjelder det svenske dokumentet.
>
> **Kodeidentifikatorer oversettes ikke.** Hendelsestyper, funksjons- og
> feltnavn, filstier og konfigurasjonsnøkler er svenske *i selve koden*. En
> oversettelse ville gjort dokumentet ubrukelig mot repositoriet, så de står
> ordrett, med norsk forklaring der betydningen ikke er åpenbar.
>
> Et selvstendig referansedokument. Alt nedenfor er hentet fra koden i
> `felsokning/` (branch `claude/guidad-felsokning-vision-1mnx7f`), ikke fra
> planer eller intensjoner. Der noe **ikke** finnes, står det uttrykkelig.
>
> Sist synkronisert mot koden: commit `1bb4031`, 04.08.2026.

---

## 0. Sammendrag på tretti sekunder

Guidad Felsökning er en SaaS-plattform for **bilverksteder**. Den fører en
tekniker gjennom en strukturert feilsøking, krever bevis for hver eneste
påstand, og produserer et sporbart grunnlag som kan deles med kunden, et
forsikringsselskap eller neste tekniker.

Den bærende ideen er negativ snarere enn positiv: **systemet framstiller aldri
en hypotese som en konstatert feil.** Det er ikke en retningslinje i et dokument
— det er kodet, testet og blokkerer flyt. Når beviset mangler, står det „Evidens
saknas" (bevis mangler), ikke en kvalifisert gjetning.

Teknisk: en **append-only hendelseslogg** er eneste sannhetskilde. Alt annet —
saksvisningen, briefen, kunderapporten, kvalitetsporten, statistikken — er rene
projeksjoner av loggen og kan alltid gjenskapes.

| | |
|---|---|
| Klient | React 18 + TypeScript + Vite + Tailwind + zustand + react-router |
| Backend | To Node-tjenester (`plattform`, `ai-orkester`), rent `node:http`, minimale avhengigheter |
| Database | PostgreSQL (Aurora Serverless v2), append-only håndhevet av databasetriggere |
| Modell | Claude, servereid ruting per oppgave |
| Infrastruktur | AWS + EKS, 126 Terraform-ressurser i to lag |
| Git & CI | **Selvhostet Gitea + Actions-runnere på eget EKS** — ingen GitHub i driftsveien |
| Tester | 120 vitest-tester + integrasjonstest mot ekte Postgres |
| Språk i koden | Svensk (identifikatorer, kommentarer, commit-meldinger) |

---

## 1. Produktprinsipper

Disse fem er invarianter, ikke retningslinjer. Hver enkelt har en motsvarighet i
kode og i en test.

### 1.1 Ingen hypotese framstilles som en konstatert feil

Hypoteser er sin egen hendelsestype (`hypotes`) med obligatorisk
pålitelighetsnivå, og kan **aldri** anta nivået `hog` (høy) —
`niva: Exclude<Tillforlitlighet, "hog">`; typesystemet forbyr det. I
kunderapporten er de uttrykkelig merket som ikke verifiserte. Kvalitetsporten
har en egen rad for dette.

Formuleringen ved mislykket reproduksjon er *„kunde inte reproduceras under de
förhållanden som rådde"* („kunne ikke reproduseres under de forholdene som
rådde") — aldri „feilen konstatert" eller „ingen feil funnet". Det er kodet
både i projeksjonene og i orkesterets grunnprompt.

### 1.2 En avkryssing er ikke bevis

Hvert kontrollpunkt i hver metodikk bærer et **minimumskrav**: `matvarde`
(måleverdi) | `kommentar` (observasjon) | `foto`. En måling kan ikke merkes som
utført uten verdi; en fotokontroll ikke uten bilde. Vil teknikeren hoppe over
noe, kreves et **dokumentert unntak** med en begrunnelse fra en fast liste.

Låst av testen *„varje kontroll kräver bevis — en kryssruta är inte evidens"*.

### 1.3 Loggen er append-only, hele veien ned

Det finnes ingen update- eller delete-operasjoner i API-et, og databasen har
triggere som avviser dem selv om noen omgår applikasjonen. En test søker aktivt
i serverkoden etter `update`/`delete` mot hendelsestabellen og feiler hvis de
dukker opp.

Konsekvens: en feilaktig opplysning rettes *ved en ny hendelse*, aldri ved at
den gamle forsvinner. Historikken er det som gir grunnlaget verdi i en tvist.

### 1.4 Terminologi

I brukergrensesnittet og i kundekommunikasjonen brukes **systemet, analysen,
vurderingen, beslutningsstøtten** — ikke „KI", med mindre det er teknisk
nødvendig. Produktet beskrives som et *evidensbasert diagnosesystem* /
*intelligent beslutningsstøtte*.

Grunnen er både kommersiell og erkjennelsesmessig: en verkstedkunde som hører
„KI", hører „gjetning". En forsikringssaksbehandler som leser „KI-vurdering" i
et grunnlag, vekter det lavere.

### 1.5 Delingsgrensen er en tillatelsesliste

Hva som får forlate organisasjonen, listes opp **positivt**, per nivå. En ny
hendelsestype er dermed intern til noen aktivt slipper den fram. En test krever
at hver type i domenemodellen er klassifisert — glemmes en, feiler bygget, i
stedet for at den lekker.

---

## 2. Domenemodellen — hendelsesloggen

`app/src/felsokning/domain.ts` (281 linjer).

En sak er: identitet + metadata + en **ordnet liste av loggposter**. Hver post
bærer `id`, `tidpunkt` (tidspunkt), `tekniker` og en `handelse` (hendelse).

### 2.1 Samtlige hendelsestyper

| Type | Innhold | Rolle |
|---|---|---|
| `objekt_identifierat` | `objekt` (skiltnummer/VIN, merke, modell, motor …) | Hva saken gjelder |
| `arbetsorder_skannad` | `falt[]` + vedlegg | Avlest arbeidsordre (**intern**) |
| `felbeskrivning` | `text` | Kundens ord, ordrett |
| `arendetyp_satt` | `arendetyp` | Garanti / forsikring / kunde — velger regelpakke |
| `fraga_besvarad` | `stegId`, `frageId`, `fraga`, `svar` | Metodikkens symptomspørsmål |
| `kontroll_utford` | `stegId`, `kontrollId`, `text`, `resultat?`, `undantag?` | Verifisert sjekklistepunkt |
| `observation` | `text` | Hva teknikeren så — ikke hva hen tror |
| `matvarde` | `beskrivning`, `varde`, `enhet?` | Måling (E4) |
| `hypotes` | `text`, `niva` (aldri `hog`) | Arbeidshypotese (**intern**) |
| `foto` | `beskrivning` + vedlegg | Bildebevis (E2) |
| `video` | `beskrivning` + vedlegg | Levende bevis (E3) |
| `matarstallning` | `lage` (inn/ut), `varde` + vedlegg | Kilometerstand inn/ut |
| `historik_kontrollerad` | `kontrollerad`, `kommentar?` | Servicehistorikk |
| `reproducering` | `status` (ja/delvis/nej), `beskrivning` | **Symptomverifisering** |
| `felorsak` | strukturert årsaksanalyse | Årsak, kategori, grunnlag |
| `atgardsforslag` | forslag med begrunnelse | Hva som bør gjøres |
| `kundbeslut` | godkjent/avslått, kanal | Kundens beslutning |
| `atgard_utford` | utført arbeid | Hva som faktisk ble gjort |
| `kvalitetskontroll` | verifisering etter reparasjon | Er symptomet borte? |
| `kommentar` | `text` | Fri notat |
| `kategori_byte` | `kategori` | Tidsføring (**intern**) |
| `inaktivitet_forklarad` | `text`, `minuter` | Hvorfor det sto stille |
| `overlamning` | `fran`, `till?` | Skiftovergang |
| `ansvarig_satt` | `ansvarig` | Verksmesterens omfordeling (**intern**) |
| `ai_svar` | klassifiserte `rader[]`, modellnavn | Beslutningsstøttens svar (**intern**) |
| `export_skapad` | `format`, `version` | Eksporten logger seg selv |
| `arende_avslutat` | `signatur?` | Teknikerens signatur |

### 2.2 Vedlegg er innholdsadresserte

`foto`, `video`, `matarstallning` og `arbetsorder_skannad` er *snittyper* med
`Bilaga` (vedlegg):

```ts
export interface Bilaga {
  bilagaId?: string;
  bilagaHash?: string;   // SHA-256
  dataUrl?: string;      // blir for alltid — loggen er append-only
}
```

Innholdet ligger utenfor loggen (S3 eller database), men **hashen ligger i
loggen**. Ved lesing verifiseres hashen; stemmer den ikke, returneres `409`.
Betydningen: byttes et bilde ut i lageret, oppdages det, og loggen kan bevise at
det opprinnelige bildet var et annet.

`dataUrl` beholdes i typen fordi eldre poster har den innebygd — og loggen kan
ikke skrives om.

---

## 3. Metodikkmotoren

Siden siste endring er **motor og innhold atskilt**:

- `metodik.ts` (171 linjer) — typer, valg av metodikk, utledning av neste steg.
- `metodiker.ts` (899 linjer) — de seksten metodikkene.

Biblioteket kan vokse uten at motoren endres.

### 3.1 Metodikkbiblioteket

Steg-id-er er kode og forblir svenske. `symptom` = symptom, `visuell` = visuell
kontroll, `matningar` = målinger, `provkorning` = prøvekjøring, `sakerhet` =
sikkerhet, `avlasning` = avlesing, `glapp` = slark, `packning` = pakning.

| id | Navn (i koden) | Område | Steg | Kontroller |
|---|---|---|---|---|
| `vibration` | Vibration under körning | Hjul og balansering | symptom → visuell → kontroller → provkorning | 19 |
| `bromsar` | Bromssystem | Understell | symptom → visuell → matningar → system | 14 |
| `styrning_fjadring` | Styrning och fjädring | Understell | symptom → visuell → glapp → installning | 11 |
| `elsystem` | Elsystem och strömförsörjning | El | symptom → visuell → matningar → rela → funktionstest | 12 |
| `start_laddning` | Start- och laddningssystem | El | symptom → batteri → start → laddning → krypstrom | 15 |
| `motor_drift` | Motorgång och effekt | Motor | symptom → felkoder → mekanik → tandning_bransle → provkorning | 16 |
| `kylsystem` | Kylsystem och överhettning | Motor | symptom → visuell → matningar → packning | 12 |
| `drivlina` | Växellåda och drivlina | Drivverk | symptom → visuell → matningar → provkorning | 10 |
| `avgas_emission` | Avgassystem och emissioner | Motor | symptom → avlasning → matningar → orsak | 12 |
| `klimat` | Klimatanläggning | Komfort | symptom → visuell → matningar → styrning | 11 |
| `hogvolt` | Högvoltsystem — elbil och hybrid | Høyvolt | **sakerhet** → symptom → avlasning → laddning | 16 |
| `diagnos_natverk` | Felkoder och kommunikation | Diagnose | symptom → grund → buss → koder | 10 |
| `lackage` | Läckage | Annet | symptom → visuell → metod | 8 |
| `missljud` | Missljud | Annet | symptom → inspelning → lokalisering | 7 |
| `adas` | Förarassistans och kalibrering | Diagnose | symptom → forutsattningar → kalibrering | 9 |
| `generisk` | Generell strukturerad felsökning | Annet | symptom → visuell → grundkontroller → funktionstest | 9 |

Norske navn: vibrasjon under kjøring · bremsesystem · styring og fjæring ·
elsystem og strømforsyning · start- og ladesystem · motorgang og effekt ·
kjølesystem og overoppheting · girkasse og drivverk · eksos og utslipp ·
klimaanlegg · høyvoltsystem (elbil/hybrid) · feilkoder og kommunikasjon ·
lekkasje · ulyd · førerassistanse og kalibrering · generisk strukturert
feilsøking.

### 3.2 Tre regler, låst av tester

1. **Hver kontroll har et minimumskrav.** Måleverdi, foto eller observasjon.
2. **Hver metodikk begynner med å verifisere symptomet**, aldri med å utbedre.
   Kundens ord blir først et verifisert symptom når det er reprodusert.
3. **Der arbeidet kan skade noen, kommer sikkerhetssteget først.** Bare
   `sakerhet` får gå foran `symptom` — testen tillater akkurat det unntaket og
   ingen andre.

`hogvolt` er den eneste metodikken med et sikkerhetssteg. Det krever
kvalifikasjon, dokumentert uttatt servicebryter (foto), ventetid etter
produsentens anvisning, **målt spenningsfrihet** (en måleverdi — ikke et ja på
et spørsmål) og verneutstyr. Testen kontrollerer at steget ligger først, at
`spanningsfrihet` krever en måleverdi, og at beskrivelsen inneholder ordet
„livsfarlig".

Grunnen er enkel: det arbeidet kan drepe noen. Der holder ikke en avkryssing.

### 3.3 Valg av metodikk

Tidligere en regex-kjede med tre utfall. Nå **poengsatt nøkkelordsmatching**:

```ts
export function metodikPoang(metodik: Metodik, text: string): number
export function valjMetodik(felbeskrivning: string): Metodik
```

- Poeng = summen av lengden på nøkkelordene som treffer. Et lengre — mer
  spesifikt — ord veier tyngre. `traktionsbatteri` (16) slår `batteri`.
- **Korte ord (≤3 tegn) matches som helt ord, lengre som ordstamme.** Ellers
  ville `"ac"` truffet *acceleration*, og en vibrasjon havnet i klimaanlegget.
- Ved lik poengsum vinner den som står først i biblioteket → valget er
  **stabilt** mellom kjøringer.
- Ingen treff → `generisk`.

**En fallgruve som faktisk slo til under utviklingen:** nøkkelordene må være
*stammer*, ikke ferdigbøyde ord. Svensk bøyning kutter ofte en `e`:
*filter → filtret*, så `"partikelfilter"` treffer aldri teksten en tekniker
faktisk skriver. Det samme gjelder *regenerering → regenererar*,
*misständning → misständer*, *skrammel → skramlar*. Biblioteket bruker derfor
`partikelfilt`, `regenerer`, `misständ`, `skram`.

*(For en lokalisering: dette er en egenskap ved svensk morfologi. Norsk har
samme klasse av problem i bestemt form og sammensetninger — `filter` blir
`filteret`, og `brems` opptrer inne i `håndbrems`, der en stammematching med
krav om ordstart ikke treffer. Et lokalisert nøkkelordssett må valideres mot
samme test, ikke oversettes ord for ord.)*

**Valget er en spørsmålsrekkefølge, ikke en diagnose.** Det avgjør hvor
teknikeren begynner å lete, ikke hva som er galt. Treffer ingenting, er
`generisk` det ærlige svaret — strukturelt komplett og bedre enn en gjetning.

### 3.4 Neste steg

```ts
export function nastaSteg(arende: Arende, metodik: Metodik): NastaSteg
```

Rent utledet av loggen: første ubesvarte spørsmål, deretter første ikke-utførte
kontroll, i metodikkens rekkefølge. Ingen skjult tilstandsmaskin — samme logg
gir alltid samme neste steg.

### 3.5 Om å „dekke alt"

Det kan ikke loves ærlig, og dokumentasjonen påstår det ikke. Det som lar seg
gjøre, er å dekke kjøretøyets systemer systematisk og la `generisk` være et
strukturelt komplett sikkerhetsnett for det ingen har forutsett.

---

## 4. ECM v2.0 — bevis- og regelmotoren

`app/src/felsokning/ecm.ts` (749 linjer). Seks motorer:

### 4.1 Evidence Engine

Bevisnivåer, utledet av loggen:

| Nivå | Betydning |
|---|---|
| E0 | Ingen grunnlag |
| E1 | Teknikerens observasjon |
| E2 | Foto |
| E3 | Video |
| E4 | Måleverdi |
| E5 | Diagnosedata / dokument |
| E6 | Flere uavhengige kilder |

En saks bevisnivå er det høyeste grunnlaget bærer. Det vises i grensesnittet og
følger med eksporten.

**Innholdshash:** `innehallsHash()` er en deterministisk FNV-1a over
bevisinnholdet. Samme grunnlag ⇒ samme hash, uansett maskin eller tidspunkt. Det
gjør eksporten verifiserbar i ettertid.

### 4.2 Rule Engine

- `ORSAKSKATEGORIER` — fast liste over årsakskategorier (gir sammenlignbar
  statistikk på tvers av flåten).
- `UNDANTAGSORSAKER` — fast liste for „hvorfor dette ikke ble gjort".
- `UNDERLAGSKALLOR` — hva en konklusjon hviler på.
- `INGEN_ATGARD_ORSAKER`, `KUNDKANALER` (kundekanaler).
- `granskaAvvikelse()` — flagger tekst som er formulert som en konstatering uten
  dekning.

Faste lister framfor fritekst er et bevisst valg: fritekst kan ikke aggregeres,
og flåtestatistikken er en av produktets reelle verdier.

### 4.3 Compliance Engine

`ARENDETYPER` (sakstyper) bestemmer hvilken **regelpakke** som gjelder. En
garantisak krever claim-nummer og servicehistorikk; en forsikringssak krever
skadenummer og bildebevis; en kundesak krever mindre. Pakkene er data
(`ecm-regler.json`, kan serveres via `/api/ecm/regler`) — nye krav trenger ingen
ny utgivelse.

### 4.4 Validation Engine — prediagnostikk

Før feilsøkingen får begynne: objektidentifisering verifisert, arbeidsordre
lest inn, kjøretøyhistorikk kontrollert **eller begrunnet**, inngående
kilometerstand dokumentert, kundens feilbeskrivelse verifisert, tidlige
observasjoner håndtert.

### 4.5 Completion Engine — kvalitetsporten

Den største enkeltfunksjonen (`kvalitetsgrind`, ~240 linjer). Saken kan ikke
avsluttes før hver rad er grønn eller begrunnet:

- Kjøretøyhistorikk kontrollert eller begrunnet
- Inngående/utgående kilometerstand dokumentert
- Kundens feilbeskrivelse verifisert
- **Symptomverifisering:** reprodusert, eller dokumentert som ikke
  reproduserbar
- Årsaksanalyse dokumentert
- Utbedring dokumentert eller begrunnet
- Kundens svar på forslaget registrert
- Arbeid utført tross avslått forslag (der det er aktuelt)
- Kvalitetskontroll gjennomført — symptomet verifisert
- Metodikkens kontroller: bevis eller dokumentert unntak
- Foto finnes for fotokrevende kontroller
- Teknikerens konklusjon signert
- Hypoteser framstilt som ikke verifiserte
- Sakstypens regelpakke oppfylt (claim / skadenummer / kilometerstand /
  historikk)

### 4.6 Traceability Engine

`sparbarhetspaket()` — hele beviskjeden i ett strukturert objekt: hva som
påstås, hva det hviler på, hvem som dokumenterte det og når.

---

## 5. Symptomverifisering (SVP)

Et eget prinsipp, fordi det er produktets skarpeste kant mot virkeligheten.

**Kundens beskrivelse ≠ en konstatert feil.**

1. Beskrivelsen dokumenteres **ordrett** (`felbeskrivning`).
2. Den presiseres gjennom metodikkens symptomspørsmål — *når, hvor, hvordan*,
   aldri „hva er galt".
3. Den **reproduseres**, med tre mulige utfall:
   - **Ja** — med dokumenterte forhold.
   - **Delvis** — hva som lot seg og ikke lot seg gjenskape.
   - **Nei** — obligatorisk begrunnelse.

Rapportens beviskjede skiller fire ting som ellers blandes sammen: *kundens
beskrivelse*, *verifisert observasjon*, *årsaksanalyse* og *anbefalt
utbedring*.

---

## 6. Klienten

`app/src/felsokning/` + `app/src/pages/felsokning/`.

| Modul | Linjer | Ansvar |
|---|---|---|
| `ArendeSida.tsx` | 2433 | Saksvisningen. Trekolonneoppsett på skrivebord |
| `metodiker.ts` | 899 | Metodikkbiblioteket |
| `ecm.ts` | 749 | Regel- og bevismotor |
| `NyttArende.tsx` | 497 | Saksoppretting, skanning av arbeidsordre |
| `Arendelista.tsx` | 399 | Dashbord: tellere, filtre |
| `projektioner.ts` | 356 | Alle visninger som rene funksjoner av loggen |
| `ai.ts` | 305 | Klientsiden av orkesteret, promptbygging, svartolkning |
| `plattform.ts` | 296 | API-klient mot den selvhostede plattformen |
| `DelatArendeVy.tsx` | 283 | Delt visning (kunde/partner/intern) |
| `domain.ts` | 281 | Hendelsestyper |
| `Installningar.tsx` | 281 | Organisasjon, brukere, integrasjoner |
| `Oversikt.tsx` | 238 | Verksmestervisning |
| `demo.ts` | 200 | Demosak med 1 t 35 min historikk |
| `ui.tsx` | 174 | Industrielt verkstedgrensesnitt |
| `metodik.ts` | 171 | Metodikkmotoren |
| `synk.ts` | 141 | Konfliktfri sammenfletting av hendelser |
| `ikoner.tsx` | 132 | Egne SVG-linjeikoner (ingen emojier) |
| `streckkod.ts` | 131 | Strekkode-/VIN-avlesing |
| `store.ts` | 106 | zustand-store |
| `bilagor.ts` | 96 | Opplasting + blob-URL-cache |
| `installningar.ts` | 86 | Organisasjonsinnstillinger |
| `Bilagevisning.tsx` | 69 | `<Bild>` / `<Klipp>` |
| `Mikrofon.tsx` / `rost.ts` | 66 / 65 | Talegjenkjenning |
| `format.ts` | 48 | Fotoskalering m.m. |

### 6.1 Projeksjonene

```
objekt · felbeskrivning · ansvarig · arendeidentitet · arAvslutat
lokalFordonshistorik · utfordaKontroller · ejKontrollerat
observationer · hypoteser · foton · videor
tidsfordelning · formateraTid · tillforlitlighet
brief · overlamningstext · tidsfordelningsRader · sistaAktivitet
```

Alle rene funksjoner av `Arende`. `ejKontrollerat` („ikke kontrollert") er den
som sparer mest tid i praksis: *det som gir dobbeltarbeid ved skiftbytte, er det
ingen har skrevet ned at ingen har gjort.*

### 6.2 Designspråk

Et ETKA-inspirert verkstedgrensesnitt: flate lysegrå flater (#ECECEC/#F7F7F7),
skarpe kanter, dyp marineblå som primærfarge, tett typografi (11–15 px),
rektangulære knapper (maks 4 px radius), verktøylinje ~44 px. Egne linjeikoner i
stedet for emojier; status som fargeprikker.

Motivet: teknikeren har hansker på, står i et støyende rom og har ikke tid til
et luftig forbrukergrensesnitt.

### 6.3 Lokal modus

Uten innlogging arbeider appen mot `localStorage`. Metodikken veileder alene;
orkesteret er av. Status vises i sakshodet. Ved innlogging flettes lokale
hendelser sammen med serverens — konfliktfritt per hendelses-id, testet.

---

## 7. Backend

### 7.1 `services/plattform` (1210 linjer)

Rent `node:http`. Eneste avhengighet er `pg`.

**API-stier:**

```
GET  /halsa                        helsesjekk
GET  /api/openapi.yaml
POST /api/auth/registrera          oppretter organisasjon + systemadministrator
POST /api/auth/logga-in            innlogging
POST /api/auth/logga-ut-alla       hever token_version → alle økter dør
GET  /api/anvandare                brukere; kun admin
POST /api/anvandare
POST /api/anvandare/{id}/avaktivera | /aktivera
GET  /api/organisation
GET/PUT /api/organisation/installningar
GET  /api/ecm/regler               regelpakker som data
GET/POST /api/arenden              saker
POST /api/arenden/{id}/handelser   append-only
POST /api/arenden/{id}/bilagor     vedlegg
GET  /api/bilagor/{id}             hash verifiseres ved lesing
GET  /api/fordon/{identifierare}/historik
GET  /api/statistik/felorsaker     årsaksstatistikk
GET  /api/oversikt                 verksmestervisning
GET  /api/delad/{kod}              delt, filtrert etter nivå
POST /api/delad/{kod}/beslut       kundens beslutning uten innlogging
GET  /api/delad/{kod}/bilagor/{id} nivåfiltrert
GET  /api/integrationer/leverantorer
GET/PUT/DELETE /api/integrationer/{leverantor}
POST /api/integrationer/{leverantor}/uppslag
```

Det finnes ingen update- eller delete-stier mot saksdata. Med hensikt.

**Sikkerhetsfunksjoner i tjenesten:**

```
ursprungFor · forTataForsok · kallaFor · inloggningSparrad · loggaForsok
skapaJwt · verifieraJwt · kontoGiltigt · kravAuth · arendeIOrg
integrationsNyckel · kryptera · dekryptera · maskera
arPrivatAdress · pekarInat · gorUppslag · skickaBilaga · synligaTyper
```

### 7.2 `services/ai-orkester` (400 linjer)

Eier Claude-nøkkelen. Klienten har den **aldri**. Ruting per oppgave:

| Oppgave | Modell | Effort | Vision |
|---|---|---|---|
| `handledning` (veiledning i sanntid) | `claude-sonnet-5` | medium | — |
| `granskning` (dybdegjennomgang) | `claude-opus-5` | **high** | — |
| `sammanfattning` (overleveringssammendrag) | `claude-sonnet-5` | low | — |
| `metodikval` (klassifisering) | `claude-haiku-4-5` | *(ingen — modellen tar ikke parameteren)* | — |
| `instrumentavlasning` (instrumentavlesing) | `claude-sonnet-5` | low | ✔ |
| `dokumenttolkning` (dokumenttolking) | `claude-sonnet-5` | low | ✔ |

Alle svar er **skjemabundne** (`json_schema`). Grunnprompten koder reglene:
*„Finn aldri på fakta"*, *„aldri en hypotese som en konstatert feil"*,
*„KREVER verifisering"*. Ved avvist forespørsel skjer automatisk fallback til en
reservemodell. **Modellen som svarte, logges i hver `ai_svar`-hendelse** —
grunnlaget skal kunne granskes i ettertid.

Metodikkatalogen bygges fra én liste (`METODIK_KATALOG`) som genererer både
skjemaets `enum` og promptens punktliste. En test sammenligner den med klientens
bibliotek: driver listene fra hverandre, returnerer klassifikatoren en id
klienten ikke kjenner, og valget ville falt *stilltiende* tilbake på generisk.
Nå feiler testen i stedet.

### 7.3 `services/gemensam/observation.mjs` (166 linjer)

Sporing og måleverdier **uten nye avhengigheter**. Tjenestene har bevisst nesten
ingen avhengigheter; å dra inn et OpenTelemetry-SDK med tretti pakker for å måle
fire ting ville vært feil avveining. I stedet to standarder som begge bare er
tekst på stdout:

- **W3C Trace Context** — `traceparent` følger med gjennom hele kjeden
  (klient → plattform → orkester).
- **CloudWatch EMF** — strukturert JSON som CloudWatch selv henter måleverdier
  ut av. Ingen agent, ingen SDK, ingenting som kan slutte å virke i stillhet.

```
spårFrån(header) · traceparent(spor) · starta(navn, spor)
  → .mät(delnavn, arbeid) · .ms() · .delar()
logga(nivå, melding, felt) · mätvärde(navn, verdi, enhet, dim, ekstra)
avsluta(span, { status, väg, extra })
```

Det som måles, ble valgt ut fra ett spørsmål: *hva vil man vite klokka tre om
natta når noe er tregt?* Svaret er **hvor tiden ble av** — ikke hvor mange kall
som har skjedd. Derav `delar()` („deler"): databasen, modellkallet,
objektlagringen, kundens leverandør, med antall og sum per del i samme
logglinje.

`mät()` måler også når arbeidet kaster — ellers ser feil ut som null tid.

**Dimensjoner holdes bevisst få.** Hver unike kombinasjon er en egen tidsserie
som koster penger, så organisasjon, sak og spor-id må aldri bli dimensjoner — de
ligger som vanlige felt. Låst av en test som uttrykkelig forbyr `org`,
`organisation`, `arende`, `spårId`, `anvandare` blant dimensjonene.

---

## 8. Sikkerhet

| Beskyttelse | Implementasjon |
|---|---|
| **Multi-tenant-isolasjon** | Alle sakssøk er organisasjonsbundne (`arendeIOrg`); integrasjonstestet mot ekte Postgres |
| **Roller** | `tekniker` / `arbetsledare` / `admin` (tekniker / verksmester / admin), i JWT-en og som databasesjekk |
| **JWT-claims** | `{ sub, namn, org, roll, tv }` — `tv` = token_version |
| **Umiddelbar tilbakekalling** | `kontoGiltigt()` kontrollerer `aktiv` + `token_version` ved *hver* autentisert forespørsel. En gyldig signatur holder ikke |
| **Global utlogging** | `/api/auth/logga-ut-alla` hever `token_version` → alle utstedte tokens dør umiddelbart |
| **Passord** | bcrypt via `gen_salt('bf')` i databasen |
| **Innloggingssperre** | 15-minutters vindu; maks 10 forsøk per konto, 30 per kilde. Ryddes probabilistisk (2 % per skriving) for å slippe en cron-jobb |
| **Kryptering i hvile** | AES-256-GCM for kundenes integrasjonsopplysninger; hemmelige felt maskeres alltid i API-svar |
| **SSRF-forsvar** | `arPrivatAdress()` + `pekarInat()`: 10/8, 127/8, 169.254/16, 172.16–31, 192.168/16, 100.64/10, ::1, fc/fd, fe80, ::ffff:. **DNS slås opp** før kallet; `.local`/`.internal` blokkert. Nødutgang `TILLAT_INTERNA_UPPSLAG` for testmiljø |
| **CORS** | `TILLATNA_URSPRUNG`-tillatelsesliste; opphavet settes én gang per forespørsel |
| **Vedleggsintegritet** | SHA-256 i loggen, verifiseres ved lesing → `409` ved avvik |
| **Append-only i databasen** | Triggere `before update or delete` på både `felsokning_handelser` og `felsokning_arenden` |
| **Pod-herding** | IMDSv2 obligatorisk, hoppgrense 1 → poder kan ikke låne nodens IAM-rolle |
| **IRSA** | Hver tjenestekonto har sin egen rolle; nodene deler ingen rettigheter |
| **Delte IAM-roller** | `bygg` (bygg) får publisere til ECR, men ikke røre klyngen; `drift` får røre klyngen, men ikke publisere images |
| **Nettverkspolicy** | Innkommende nektes som standard; eksplisitte `_ut`-regler (utgående) per tjeneste |
| **Databasetilgang** | Kun fra klyngens noder, i et subnettlag **uten rute ut** |

### 8.1 Databaseskjema

```
organisationer · anvandare · inloggningsforsok
felsokning_arenden · felsokning_handelser
bilagor · bilage_innehall
delningar · integrationer
```

(organisasjoner · brukere · innloggingsforsøk · saker · hendelser · vedlegg ·
vedleggsinnhold · delinger · integrasjoner)

---

## 9. Live Share — delingsnivåer

Tre nivåer, serverstyrt filtrering:

| Nivå | Ser |
|---|---|
| **kund** (kunde) | 22 hendelsestyper: objekt, feilbeskrivelse, spørsmål, kontroller, observasjoner, måleverdier, foto, video, kommentarer, overleveringer, utbedringer, kvalitetskontroll … |
| **partner** | Alt kunden ser **+ `hypotes`** (merket som ikke verifisert) |
| **intern** | Full innsikt — ingen filtrering |

**Aldri utenfor organisasjonen:**
`kategori_byte`, `hypotes`, `ai_svar`, `ansvarig_satt`, `arbetsorder_skannad`.

```js
export function synligaTyper(niva) {
  if (niva === "intern") return null;           // full innsikt
  return niva === "partner" ? DELBART_PARTNER : DELBART_KUND;
}
```

Lenker kan tilbakekalles. Den offentlige delingssiden
(`/felsokning/delad/:kod`) krever ingen innlogging og poller for
liveoppdatering. Kunden kan gi sitt svar direkte i visningen
(`POST /api/delad/{kod}/beslut`).

**Hvorfor en tillatelsesliste:** en nektelsesliste må oppdateres hver gang en ny
hendelsestype legges til — og det er nettopp det man glemmer. En
tillatelsesliste gjør „glemt" til „intern", og det er det trygge utfallet.

---

## 10. Merkespesifikke koblinger

Leverandører er **data, ikke kode** (`integrationer.json`, kan monteres som
ConfigMap via `INTEGRATIONER_FIL`). Nye merker krever ingen ombygging.

| id | Leverandør |
|---|---|
| `generisk_vin` | Vilkårlig VIN-tjeneste over HTTP |
| `vag_erwin` | Volkswagen Group erWin (VW, Audi, Škoda, SEAT) |
| `volvo_vida` | Volvo VIDA |
| `fordonsregister` | Skiltnummer → kjøretøy |

Hver leverandør deklarerer sine felt, hvilke som er hemmelige (krypteres +
maskeres), og hvordan svaret mappes til domenets felt (`marke`, `modell`,
`arsmodell`, `motor`, `vaxellada` — merke, modell, årsmodell, motor, girkasse).

Oppslag går gjennom SSRF-beskyttelsen — en kunde kan altså ikke peke en
„leverandør" mot klyngens interne adresser.

---

## 11. Visual-first

Kameraet **er** integrasjonslaget. Det som står på en skjerm eller et
instrument, fotograferes og tolkes i stedet for å integreres.

- **Skanning av arbeidsordren** er hovedveien ved saksoppretting. Sonnet 5
  (vision) leser kunde-, kjøretøy- og verkstedopplysninger uansett oppsett, med
  en konfidens per felt:
  - 🟢 ≥95 % godkjennes automatisk
  - 🟡 80–95 % merkes for gjennomlesing
  - 🔴 <80 % krever aktiv bekreftelse

  Teknikeren går altså bare gjennom de usikre feltene. Visuell kontroll med
  dokumentet ved siden av feltene; et klikk markerer omtrentlig posisjon.

- **Instrumentavlesing** — foto av en diagnoseskjerm eller et instrument →
  strukturerte verdier.

Motivet er kommersielt: én integrasjon per verkstedsystem er én salgssyklus per
kunde. Et kamera virker mot alt, med én gang.

---

## 12. Infrastruktur

To Terraform-lag. Basen kjører sjelden, arbeidslastlaget ofte.

### 12.1 `infra/aws` — basen (91 ressurser)

| Område | Innhold |
|---|---|
| **Nettverk** | 1 VPC, 3 subnettlag × 3 soner: offentlig (kun ALB + NAT), privat (noder, ingen offentlige adresser), data (Aurora, **ingen vei ut i det hele tatt**). VPC-endepunkter: S3 (gateway); ECR, logger, Secrets Manager, STS, ELB (grensesnitt) → trafikken forlater aldri nettet |
| **Klynge** | EKS, arm64-noder, IRSA via OIDC-provider, IMDSv2 hoppgrense 1, alle fem control plane-logger på |
| **Data** | Aurora PostgreSQL Serverless v2, PITR ned til sekundet, KMS med egen nøkkel, `sslmode=require` |
| **Objektlagring** | S3 for vedlegg: SSE-KMS, offentlig tilgang blokkert, TLS obligatorisk, versjonering på. Plattformrollen får lese og skrive — **men aldri slette** |
| **Register** | ECR med **uforanderlige tagger** + sårbarhetsskanning |
| **Hemmeligheter** | Secrets Manager; kan bare leses av plattformrollen via IRSA |
| **Roller** | 9 IAM-roller, blant dem de delte `bygg` / `drift` |
| **Domene** | Route 53 + ACM med DNS-validering |
| **Observerbarhet** | 7 alarmer, 1 dashbord, 3 logggrupper, SNS-topic |

**Alarmene** — få, men de som finnes, betyr noe. *En alarm ingen reagerer på,
lærer folk å ignorere alarmer.*

- Aurora-CPU > 85 % i tre perioder (skaleringstaket kan være nådd)
- Aurora fri lokal lagring < 5 GiB
- **Backup-alder** — `treat_missing_data = "breaching"`. Mangler måleverdien,
  finnes ingen sikkerhetskopiering. *En backup man tror finnes, er verre enn
  ingen.*
- Færre noder enn ønsket minimum
- Svartid **p95** > 3 s i tre perioder — ikke gjennomsnittet, som skjuler at
  hver tjuende tekniker venter urimelig lenge
- Serverfeil (sum > 5)
- Modellen avslår (tyder på uventet inndata, ikke på en driftsfeil)

### 12.2 `infra/terraform` — arbeidslasten (35 ressurser)

Leser basen via `terraform_remote_state`; gjentar ingenting.

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

`karta.tf` (117 linjer) produserer et lesbart kart over hele driftsbildet:
`terraform output karta`.

### 12.3 Git og CI — helt selvhostet

En uttrykkelig produktbeslutning: **ingen GitHub i driftsveien.** Gitea +
Actions-runnere kjører på eget EKS. `.gitea/workflows/felsokning.yml`:

| Jobb | Innhold |
|---|---|
| `test-och-bygg` | `vitest run`, `typkontroll`, eslint, `vite build` |
| `tjanster` | eslint på tjenestene, **integrasjonstest mot ekte Postgres**, `swagger-cli validate` |
| `terraform` | `fmt -check -recursive`, `init -backend=false`, `validate` |
| `publicera` | Kun på `main`, kun hvis det over gikk gjennom. Bygger tre images, tagger med commit-SHA-en, dytter til vårt eget ECR. **OIDC, ingen statisk nøkkel** |
| `driftsatt` | **Manuelt** (`workflow_dispatch`) med eksplisitt image-tagg |

Idriftsetting er et eget steg med hensikt: *et image i registeret er ikke det
samme som et image som kjører.* Rollback = kjør igjen med forrige tagg.

Klientens API-adresse bakes inn ved bygget (Vite), så imaget er miljøbundet.
Byggkonteksten for tjenestene er `felsokning/services`, slik at begge når den
felles observasjonsmodulen uten å duplisere den.

---

## 13. Testing

**120 vitest-tester** i 13 filer:

| Fil | Antall | Låser |
|---|---|---|
| `ecm.test.ts` | 32 | Bevisnivåer, regelpakker, kvalitetsport, prediagnostikk |
| `metodiker.test.ts` | 14 | Bibliotekets struktur, metodikkvalg, katalogparitet med orkesteret |
| `projektioner.test.ts` | 13 | Visninger som rene funksjoner, neste steg |
| `ai.test.ts` | 11 | Orkesterparitet, OpenAPI ↔ server, append-only, promptregler |
| `observation.test.ts` | 10 | Sporing, EMF-format, **forbudte dimensjoner** |
| `bilagor.test.ts` | 9 | Innholdshash, SigV4, valg av lagringslag |
| `delning.test.ts` | 7 | Tillatelseslisten dekker hver hendelsestype |
| `integrationer.test.ts` | 7 | Leverandøroppslag, SSRF-vern |
| `demo.test.ts` | 4 | Demosaken er rik nok til å vises |
| `installningar.test.ts` | 4 | Organisasjonsinnstillinger |
| `streckkod.test.ts` | 4 | VIN/strekkode |
| `synk.test.ts` | 4 | Konfliktfri sammenfletting |
| `example.test.ts` | 1 | — |

**Utover enhetstestene:**

- `integrationstest.sh` — hele flyten mot **ekte Postgres**: organisasjoner,
  roller, append-only-triggeren, isolasjon, deling, vedlegg.
- SigV4 **kryssverifisert bit for bit mot botocore** (`sigv4-referens.json`).
- `swagger-cli validate` på OpenAPI-spesifikasjonen.
- Paritetstester mellom spesifikasjon ↔ server, klient ↔ orkester (× 2 kopier),
  domenemodell ↔ delingsliste.

### 13.1 Verifiseringssløyfen før hver commit

```
npx vitest run                    # 120 tester
npm run typkontroll               # tsc --noEmit  (vite build typesjekker IKKE)
npx eslint src/felsokning src/pages/felsokning
cd ../services && npx eslint .
npm run build
terraform fmt -check -recursive
# rotens CI: lint · format:check · typecheck · test
```

`typkontroll` kom til etter at to latente krasj (`TextFalt` og
`UNDANTAGSORSAKER` brukt uten import) hadde sluppet forbi `vite build` — som
transpilerer, men ikke typesjekker.

---

## 14. Repositoriestruktur

`main` er et npm-workspaces-monorepo som heter **Semantika** og eier roten. Da
de to produktene ble slått sammen, ble begge beholdt, med verktøykjedene
**atskilt per tre** — ikke ved å svekke noens regler.

```
/                             Semantika (workspaces-rot)
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
    │   └── gemensam/         observation.mjs (felles)
    ├── infra/
    │   ├── aws/              basen, 91 ressurser
    │   ├── terraform/        arbeidslasten, 35 ressurser
    │   └── postgres-init.sql
    ├── docs/
    └── supabase/             migrasjoner + edge-funksjon (eldre vei)
```

**To driftsveier finnes parallelt:** den selvhostede AWS-stakken (den som
gjelder) og en eldre Supabase-basert (edge-funksjonen `felsokning-ai`,
migrasjoner). Orkesteret finnes derfor i **to kopier**, holdt synkrone av
tester.

---

## 15. Dokumentasjon i repositoriet

```
docs/VISION.md                          produktvisjonen
docs/MASTER-PROMPT.md                   grunninstruksjonen
docs/MVP.md                             hva som er bygget, funksjon for funksjon
docs/DEMO.md                            demomanus for framvisning
docs/DRIFT.md                           drift
docs/SYSTEMBESKRIVNING.md               den svenske originalen av dette dokumentet
docs/SYSTEMBESKRIVNING.en.md            engelsk
docs/SYSTEMBESKRIVNING.de.md            tysk
docs/SYSTEMBESKRIVNING.da.md            dansk
docs/SYSTEMBESKRIVNING.no.md            dette dokumentet
docs/exempel/vibration-vid-88-km-h.md   gjennomgående eksempel
docs/moduler/                           åtte moduldokumenter
```

---

## 16. Designbeslutninger og deres begrunnelser

Samlet fordi begrunnelsen ofte er viktigere enn beslutningen.

| Beslutning | Begrunnelse |
|---|---|
| Event sourcing | Grunnlaget må holde i en tvist. Historikken *er* verdien |
| Append-only også i databasen | Applikasjonslaget kan omgås; triggeren kan ikke |
| Tillatelsesliste for deling | En glemt hendelsestype blir intern, ikke lekket |
| Faste årsakskategorier | Fritekst kan ikke aggregeres; flåtestatistikken er en verdi |
| Servereid modellruting | Klienten må aldri ha nøkkelen, og ruting må kunne endres uten en utgivelse |
| Modell logget per svar | Grunnlaget må kunne granskes i ettertid |
| Unngå ordet „KI" | Kunden hører „gjetning"; saksbehandleren vekter det lavere |
| Visual-first | Én integrasjon per verkstedsystem = én salgssyklus per kunde. Kameraet virker med én gang |
| Leverandører som data | Et nytt merke bør ikke kreve en utgivelse |
| Egen observerbarhet, null avhengigheter | 30 pakker for å måle 4 ting er feil avveining |
| Få EMF-dimensjoner | Hver kombinasjon er en betalt tidsserie |
| p95 i alarmen, ikke gjennomsnittet | Gjennomsnittet skjuler at hver tjuende tekniker venter |
| Alarm på *manglende* backupdata | En backup man tror finnes, er verre enn ingen |
| Delte bygg-/driftsroller | Et kompromittert bygg må ikke kunne røre klyngen |
| Manuell idriftsetting | Et image i registeret ≠ et image som kjører |
| Uforanderlige ECR-tagger | En tagg må bety det samme i morgen |
| Innholdsadresserte vedlegg | Et utbyttet bilde må oppdages, ikke antas |
| Hashverifisering ved lesing | Det holder ikke å hashe ved skriving |
| S3-rollen får ikke slette | Append-only må gjelde lagringen også |
| Motor atskilt fra innhold | Biblioteket vokser; motoren skal ikke måtte endres |
| Poengsatt metodikkvalg | Regex-kjeder blir ugjennomtrengelige ved 16 alternativer |
| Nøkkelord som ordstammer | Svensk bøyning kutter en `e` — ellers treffer ingenting |
| `generisk` som fallback | Et ærlig „vi vet ikke" slår en gjetning |
| Sikkerhetssteg først i høyvolt | Det arbeidet kan drepe |
| Svensk i koden | Domenet er svensk; oversetting fram og tilbake taper presisjon |

---

## 17. Kjente begrensninger og åpne punkter

Uttrykkelig ikke ferdig:

- **To orkesterkopier** (Supabase-edge-funksjon + K8s-tjeneste) holdes
  synkrone av tester, ikke av felles kode. Supabase-veien er den eldre og bør
  fases ut.
- **`ArendeSida.tsx` er på 2433 linjer.** Den virker, men er filen som koster
  mest å endre i.
- **`terraform validate` kan ikke kjøres lokalt** i utviklingsmiljøet (den
  utgående nettverkspolicyen blokkerer nedlasting av providere). Erstattet av
  `terraform fmt` pluss en egen statisk referansekontroll; den ekte valideringen
  skjer i CI.
- **Claude-nøkkelen fylles inn for hånd** etter første `apply` — den ligger
  bevisst ikke i Terraform-state.
- **`postgres-init.sql` kjøres manuelt** mot databasen etter at basen er
  anvendt.
- **Ingen automatisk gjenopprettingstest av backupen.** Alarmen sier at det
  *tas* backup, ikke at den *kan gjenopprettes*.
- **Metodikkbiblioteket dekker ikke alt** — og påstår det ikke. `generisk` er
  sikkerhetsnettet.
- Rotens eslint har 20 allerede eksisterende feil i Semantikas egne sider
  (`no-explicit-any`) som ikke gjelder Guidad Felsökning.

---

## 18. Ordliste

Venstre kolonne er begrepet slik det står i kode og grensesnitt.

| Svensk | Norsk |
|---|---|
| Ärende | Sak — én feilsøkingsoppgave |
| Händelse / loggpost | Hendelse / loggpost — udelelig post i append-only-loggen |
| Metodik | Metodikk — strukturert feilsøkingsflyt |
| Steg | Steg — fase i en metodikk (symptom, visuell kontroll, målinger …) |
| Kontroll | Kontroll — enkelt sjekklistepunkt med minimumskrav |
| Krav | Krav — `matvarde` / `kommentar` / `foto` |
| Undantag | Unntak — dokumentert grunn til at en kontroll ble hoppet over |
| Brief | Brief — sammenstilt saksbilde; en projeksjon |
| Kvalitetsgrind | Kvalitetsport — regelsett som må passeres før avslutning |
| Evidensnivå | Bevisnivå — E0–E6, grunnlagets bevisverdi |
| Reproducering | Reproduksjon — symptomverifisering: ja / delvis / nei |
| Felorsak | Feilårsak — strukturert analyse med kategori og grunnlag |
| Delning | Deling — ekstern lenke med rettighetsnivå |
| Orkester | Orkester — tjenesten som eier modellrutingen |
| Spann / spår | Span / spor — tidsmåling henholdsvis W3C-sporing |
| Bilaga | Vedlegg — innholdsadressert foto/video/dokument |
| Tekniker | Tekniker, mekaniker |
| Arbetsledare | Verksmester, arbeidsleder |
| Fordon | Kjøretøy |
| Mätvärde | Måleverdi |
| Felbeskrivning | Feilbeskrivelse (kundens ord) |
| Arbetsorder | Arbeidsordre |
| Mätarställning | Kilometerstand |
| Överlämning | Overlevering |
| Åtgärd | Utbedring, tiltak |
| Kundbeslut | Kundens beslutning |
| Säkerhet | Sikkerhet |
| Högvolt | Høyvolt |
