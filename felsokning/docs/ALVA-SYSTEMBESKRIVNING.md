# ALVA — fullständig systembeskrivning

**ALVA-DOC-0004 · Underlag för fortsatt resonemang · 2026-08-06 · `ae5acbe`**

> Syftet med den här filen är att någon ska kunna resonera vidare om ALVA utan
> att ha varit med när det byggdes. Den beskriver vad som **finns**, inte vad
> som är tänkt. Där något är ofärdigt står det i klartext, och där ett påstående
> vilar på en mätning står mätningen.
>
> Siffrorna är räknade ur källkoden det datum som står ovan, inte uppskattade.

---

## 1. Vad ALVA är

ALVA är en **metod** för felsökning av fordon, och en plattform som håller
metoden. Skillnaden är inte semantisk och den bär hela produkten:

> **ALVA is not an assistant. ALVA is a method.**
> Man säger *"följ ALVA"* på samma sätt som man säger *"följ ISO 9001"*.

Namnet är stegen:

| | |
|---|---|
| **A**nalysis | Vad är symptomet, och vad säger underlaget? |
| **L**ocalization | Var sitter det? |
| **V**erification | Är det bevisat, eller bara troligt? |
| **A**ction | Vad gjordes, och höll det? |

### Problemet den finns för

En verkstadsjournal i dag är fritext. *"Bytt vattenpump, provkörd, ok."* Den går
inte att granska, inte att jämföra, och den håller inte när någon ett år senare
frågar varför just den delen byttes. Konsekvensen betalas av tre parter: kunden
som inte vet vad den betalat för, verkstaden som inte kan visa att den gjorde
rätt, och försäkringsbolaget eller tillverkaren som inte kan avgöra ett anspråk.

ALVA producerar i stället ett **underlag**: en append-only-logg där varje
påstående bär sin evidens, sin härkomst och sin tidpunkt, och där ett ärende
inte går att stänga utan att en människa skrivit *varför slutsatsen följer av
evidensen*.

### Den regel som är produktens kärna

**ALVA-RULE-200 — avslutssatsen.** Ett ärende kan inte stängas utan fyra fält:
vad som konstaterades, vilken evidens som bär det, vilka hypoteser som
avfärdades och varför, och vad som återstår som osäkert. Det finns en katalog
över icke-svar (*"åtgärdat"*, *"ok efter provkörning"*) som avvisas, och varje
uppställd hypotes måste vara besvarad.

Det är den rad som saknas i varje verkstadsjournal i drift i dag, och den enda
en granskare faktiskt behöver.

### Vad ALVA aldrig gör

- **Påstår inte att något är avgjort.** Försäkringsmodulen har inget fält som
  liknar ett utfall; garantimodulen svarar *oklart* när underlaget inte räcker.
- **Hittar inte på leverantörs-API:er.** Integrationer som inte finns är märkta
  som obyggda.
- **Sätter inte härkomst från anroparen.** Tid, användare, evidensgrad och
  kalibrering härleds av systemet.

---

## 2. Vad som är byggt

### Omfattning, räknad

| Del | Rader |
|---|---|
| Domänlogik, klient (`app/src/felsokning`) | 8 649 |
| Felsökningsgränssnitt (`app/src/pages/felsokning`) | 4 312 |
| ALVA-yta: webbplats och portal (`app/src/pages/alva`) | 2 455 |
| Delade moduler (`services/gemensam`) | 3 881 |
| Plattformstjänst (`services/plattform`) | 2 794 |
| Designsystem (`app/src/alva`) | 785 |
| Infrastruktur (`infra`, Terraform + schema) | 4 055 |

**17 metodiker**, **48 händelsetyper**, **39 API-vägar**, **18 databastabeller**,
**24 testfiler**.

### Metodiker

Vibration under körning · Bromssystem · Styrning och fjädring · Elsystem och
strömförsörjning · Start- och laddningssystem · Motorgång och effekt ·
Kylsystem och överhettning · Växellåda och drivlina · Avgassystem och
emissioner · Klimatanläggning · Högvoltsystem (elbil och hybrid) · Felkoder och
kommunikation · Läckage · Missljud · ADAS · Generisk.

Varje metodik är en sekvens av steg med kontroller. En kontroll har ett krav
(text, mätvärde eller foto) och kan undantas — men bara med skriven motivering.

### Ärendeflödet, i den ordning teknikern möter det

1. **Objektidentifiering** — regnr eller VIN, verifierad.
2. **Pre-diagnostik.** Metodiken öppnas inte förrän den är besvarad. Ingår:
   - **Fordonshistorik** — måste aktivt besvaras; ett *nej* kräver motivering.
   - **Ingående mätarställning** — måste **fotograferas**; en inskriven siffra
     utan foto graderas E1 i stället för E2 och spärrar avslut.
   - **Felbeskrivning verifierad** och **tidiga observationer**.
3. **Symptomverifiering** — kundens beskrivning blir aldrig ett konstaterat fel
   förrän den reproducerats, eller dokumenterats som ej reproducerbar.
4. **Metodiken** — steg för steg, med evidens per kontroll.
5. **Felorsaksanalys** — avvikelse, orsakskategori, underlag, säkerhetsgrad.
6. **Åtgärdsförslag och kundbeslut** — arbete får inte redovisas som utfört utan
   registrerat kundbesked.
7. **Åtgärd och verifiering.**
8. **Avslutssats (ALVA-RULE-200)** och **utgående mätarställning**.

### Evidensmodellen

| Grad | Vad det är |
|---|---|
| E5 | Dokument (skannad arbetsorder) |
| E4 | Mätvärde med **kalibrerat instrument uppslaget i registret** |
| E3 | Video med ljud |
| E2 | Foto — inklusive fotograferad mätarställning |
| E1 | Teknikerns observation, kontrollresultat, **transkriberad** mätarställning |

E4 kräver att `matdonId` går att slå upp i organisationens mätdonsregister.
Beteckning och kalibreringsdatum **härleds därifrån** och skriver över det
klienten skickade. Ett okänt mätdon avvisas.

### Kvalitetsgrinden

Server-auktoritativ. Klienten har ingen egen åsikt — den frågar `grinda()` och
renderar grindens egna hinder. Grinden kräver bl.a. objektidentifiering,
besvarad historik, fotograferade mätarställningar in och ut, symptomverifiering,
felorsaksanalys, kundbeslut när arbete utförts, och en avslutssats som passerar
ALVA-RULE-200.

### Portalen och webbplatsen

Publikt: översikt, kontoansökan, inloggning, Impressum, utgåvor.
Portal (kräver session): dashboard, analys, kunskapskällor, integration,
fakturor, **garantier**, **försäkring**, **support**, diagnostik.

### Regelverksmoduler

**Garantier (ALVA-SPEC-040).** EU och USA, med källa och kontrolldatum per post.
Bärande skiljelinje: **lagstadgat mot avtalat**. Nybils-, rostskydds-, lack- och
drivlinegaranti är *avtalade* — ingen lag kräver dem. Avgasgarantin är
lagstadgad i bägge jurisdiktionerna och den enda som är det.

**Försäkring (ALVA-SPEC-041).** Sju villkor som avgör en maskinskadefråga, och
ett register över svenska bolags noterade gränser med avläsningsdatum. Poster
äldre än 180 dagar märks som föråldrade. Modulen avgör aldrig något.

**Support (ALVA-PROC-0050).** Felanmälan i varje ärende. Sammanhanget härleds —
ärende, metodik, plattformsversion, spår-id — och identifierande fält kan inte
smugglas med. Anmälan är oföränderlig, statusen en projektion.

**Fakturering (ALVA-PROC-0001).** Fakturan härleds ur organisationens tillstånd.
Utfärdad faktura ändras aldrig; betalning är en händelse. Nummerserie utan
luckor. Ingen betalleverantör.

---

## 3. Tekniken

### Stack

| | |
|---|---|
| Klient | Vite 5.4 · React 18 · TypeScript · Tailwind · zustand · react-router 7 |
| Tjänster | Node 22, `node:http` utan ramverk. Enda beroende: `pg` |
| Databas | PostgreSQL |
| Test | vitest (enhet) · Playwright (genomgång, portalspärr) · bash + riktig Postgres (integration) |
| Typsnitt | IBM Plex Sans/Mono, **inbäddade som data-URI** — noll externa hämtningar |

Att plattformstjänsten är ramverkslös är ett val: den ska gå att läsa i sin
helhet av den som ska lita på den.

### Arkitektoniska principer

**Händelsekälla.** Append-only-loggen är enda sanningskällan; allt annat är
projektioner. Det gäller genomgående — ärendets status, fakturans status,
supportärendets status, evidensrapporten.

**Härlett, inte inskrivet.** Sammanfattningen, fakturan, mätdonets kalibrering,
supportens sammanhang och versionen vid avslut härleds. Det som går att härleda
skrivs inte av.

**Stängt schema.** `granskaHändelse` itererar händelsens *egna* nycklar och
avvisar allt odeklarerat — hårt, inte genom tyst strippning.

**Server-ägd härkomst.** `tillPost()` skriver över användare och tidpunkt från
den verifierade sessionen och serverklockan. Klientens klocka bevaras separat
för offlinearbete.

**Krypto-shredding.** Identifierande fält krypteras med en nyckel per subjekt.
Radering = förstöra nyckeln. Nycklarna är **kuverterade** under en huvudnyckel
utanför databasen.

### Databasen

18 tabeller. Append-only-skydd (databastrigger, inte applikationslogik) på:
`felsokning_handelser`, `felsokning_arenden` (kolumnvis), `fakturor`,
`fakturahandelser`, `atkomstlogg`, `raderingar`, `supportarenden`,
`supportinlagg`. `personnycklar` har ett smalare skydd — nyckeln måste kunna
förstöras, men identiteten kan inte ändras.

Händelsenyckeln är `(arende_id, id)`, inte `id` ensamt. Se TÜV T-1.

### Infrastruktur

Självhostad på AWS, Terraform-beskriven: EKS, RDS (Aurora Postgres), S3 för
bilagor, Secrets Manager + External Secrets, KMS, IRSA för tjänsteidentitet.
Nattlig CronJob för gallring. **Inga hemligheter i Terraforms tillstånd.**

Hemligheter: `DATABASE_URL`, `JWT_SECRET`, `INTEGRATION_NYCKEL`,
`PERSONNYCKEL_HUVUD`, `FAKTURERING_NYCKEL`, `SUPPORT_NYCKEL`,
`ECM_REGLER_NYCKEL`/`_SIGNATUR`.

### CI

Fyra jobb: `check` (värdapplikationen), `alva` (460 enhetstester, lint,
typkontroll), `genomgang` (fyra hela ärenden genom det byggda gränssnittet +
portalspärren), `plattform` (157 integrationskontroller mot riktig Postgres).

---

## 4. Mognad

### Vad som är bevisat

| Garanti | Hur den är bevisad |
|---|---|
| Append-only håller | Direkt `UPDATE`/`DELETE` avvisas oavsett anslutande konto. Prövat mot riktig Postgres. |
| Grinden är auktoritativ | Klienten har ingen egen regel; testet kräver att den inte har någon. |
| Schemat är stängt | Prövat mot verklig trafik: 41 händelser ur ett kört ärende. |
| Portalen är stängd | Byggd med plattform konfigurerad, kontrollerat var besökaren hamnar. Mutationstestat. |
| Mätkedjan är spårbar | Okänt mätdon avvisas; registrets datum skriver över klientens. |
| En hyresgäst kan inte blockera en annan | Motspelande-hyresgäst-harness i CI. |
| Återställning fungerar | Dump återställs och triggarna kontrolleras. |

### Vad som är öppet, uttryckligen

| Punkt | Läge |
|---|---|
| **Abonnemang och prisplaner** | **Ej byggt.** Modell och vyer för fakturering finns; prenumeration, gratisstart, månadsgenerering, PDF-utskick, nivåer och nedräkning till spärr finns inte. |
| **TÜV T-3, restdel** | Kuverteringen stänger "nyckeln bredvid chiffertexten", inte backupfönstret. En backup tagen före en radering plus huvudnyckeln återställer uppgifterna. Kräver nyckel per subjekt i KMS. |
| **T-12** | Ingen react-router-version är fri från bägge avvikelserna; den som bärs gäller RSC-läge som inte används. |
| **Terraform** | CronJob och hemlighetskoppling skrivna men **ej applicerade** — ingen terraform-binär i miljön. |
| **Rev 1 · C-4** | Personuppgiftsbiträdesavtal och DPIA — dokument att skriva och skriva under. |
| **Rev 1 · m-4** | Avveckla Supabase-orkestratorn — driftbeslut. |
| **Rev 1 · m-6** | Manuell tillgänglighetsgranskning. |
| **Impressum** | Strukturen finns; driftens uppgifter är **inte satta** och redovisas som åtgärdslista. |
| **Försäkringsregistret** | Sex svenska bolag. Inte en marknadsundersökning. |
| **Leverantörsintegrationer** | Register och kryptering finns; verkliga leverantörs-API:er är inte inkopplade. |

### Revisionshistorik

Tre revisioner, alla interna, alla med reproducerade fynd:

- **Revision 1** — fann att grinden bara fanns i klienten (C-2). Stängd.
- **Revision 2** (VAG-lins) — fann att händelseschemat var öppet (C-5) och att
  klientens regel drivit isär från serverns (M-7). Stängda.
- **TÜV-revisionen** (ALVA-DOC-0003) — 12 fynd, 3 kritiska. 10 stängda, 2
  reducerade med skälen utskrivna.

Mönstret i alla tre: kontrollerna är riktiga i sina egna termer och oprövade vid
sina gränser.

### Ärlig sammanfattning av mognaden

**Kärnan är produktionsmässig.** Metoden, loggen, grinden, evidensmodellen och
rapporten är genomarbetade, prövade mot riktig databas och riktigt gränssnitt,
och har överlevt tre revisioner som letade fel på allvar.

**Kommersiellt är den ofärdig.** Fakturering finns som mekanism men det finns
ingen abonnemangsmodell, ingen prisplan i drift, ingen kundhantering över tid.

**Juridiskt är strukturen på plats men inte fylld.** Impressum, dataskydd,
tillgänglighet och tvistlösning har sina platser och sina rättsliga grunder;
uppgifterna är inte ifyllda och två dokument (biträdesavtal, DPIA) är inte
skrivna.

**Driftsmässigt är den beskriven men inte driftsatt.** Terraform beskriver hela
klustret; ingenting har applicerats mot ett riktigt AWS-konto.

Rimligaste nästa steg, i ordning: abonnemangsmodellen · applicera Terraform mot
en riktig miljö · fyll Impressum · skriv biträdesavtal och DPIA · stäng T-3 med
KMS.

---

## 5. Nomenklatur

| Beteckning | Vad |
|---|---|
| `ALVA-CASE-91821` | Ärende |
| `ALVA-PROC-0001` | Process (fakturering) |
| `ALVA-PROC-0030` | Ärendesammanfattning |
| `ALVA-PROC-0040` | Gallring |
| `ALVA-PROC-0050` | Support |
| `ALVA-RULE-200` | Avslutssatsen |
| `ALVA-SPEC-001` | Designsystem och typografi |
| `ALVA-SPEC-002` | Utgåvor |
| `ALVA-SPEC-004` | Mätdon |
| `ALVA-SPEC-020/021` | Integrationsgränssnitt |
| `ALVA-SPEC-040` | Garantiregimer |
| `ALVA-SPEC-041` | Försäkringsvillkor |
| `ALVA-SPEC-050` | Företagsuppgifter |
| `ALVA-SRC-010` | Kunskapskälla |
| `ALVA-INV-0001` | Faktura |
| `ALVA-SUP-0001` | Supportärende |
| `ALVA-REP-0100` | Driftrapport |
| `ALVA-DOC-0002/0003/0004` | Revision 2 · TÜV-revision · denna fil |

## 6. Designsystem i korthet

8 px-rutnät utan undantag, låst av test. Palett: Graphite `#1B1E22`, Steel
`#4D5662`, Light Steel `#D7DCE2`, Background `#F6F7F8`, ALVA Blue `#005CA9`.
Räta hörn. Inga gradienter, ingen animation, inga emojier, inga
marknadsföringsord — allt låst av test som läser källkoden.

**Språkgränsen:** ALVA:s *struktur* är engelsk och oföränderlig (stegen,
beteckningarna, rubrikerna). *Innehållet* är på arbetsspråket. Därför är
portalen engelsk och felsökningsgränssnittet svenskt.

---

*ALVA-DOC-0004 · Räknat och skrivet 2026-08-06 mot `ae5acbe`*
