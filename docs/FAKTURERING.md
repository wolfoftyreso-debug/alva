# Faktureringsmodulen

**ALVA-DOC-0015 · 2026-08-21 · ALVA-PROC-0001 (fakturan) + ALVA-PROC-0002 (abonnemanget)**

Modulen svarar på en enda fråga: *vad ska den här organisationen betala,
och varför just det?* Svaret måste gå att granska två år senare av någon
som inte har systemet framför sig — därför är fakturan **härledd**, inte
inskriven, och varje rad bär sitt eget underlag.

## Delarna

| Fil | Ansvar |
| --- | --- |
| `services/gemensam/fakturering.mjs` | Räknar raderna, momsen och förfallodagen. Ren funktion — samma indata ger alltid samma faktura |
| `services/gemensam/abonnemang.mjs` | Nivåerna, periodankaret och tillståndet (aktiv/varning/låst) |
| `services/gemensam/fakturapdf.mjs` | Dokumentet som PDF, utan externa beroenden |
| `services/plattform/manadsfakturering.mjs` | Jobbet som kör en gång per dygn och fakturerar de perioder som löpt ut |
| `infra/systemd/alva-fakturering.*` | Schemaläggningen (06:00 UTC, `Persistent=true`) |
| `services/plattform/server.mjs` | Endpoints: utfärda, betald, kreditera, lista, PDF |
| `app/src/pages/alva/Fakturor.tsx` | Kundens vy: historik, rader, underlag, nedladdning |

Beloppen är i **öre**, genomgående. Priserna i `PRISLISTA` och `NIVAER`
är platshållare som sätts per marknad — mekanismen är oberoende av dem.

## Så räknas en faktura

1. **Perioden** ankras till registreringsdagen, inte till den 1:a: en
   organisation som registrerar sig den 20:e ska inte få en faktura på
   elva dagar som sin första upplevelse av produkten.
   Månadsadditionen är **klampad** — 31 januari + 1 månad blir 28
   februari, inte 3 mars.
2. **Månaderna** räknas genom att stega en klampad månad i taget från
   periodens början tills dess exklusiva slut passeras. En kalenderårs-
   period är tolv månader; en dygnsankrad månadsperiod är **en**.
3. **Plattformsraden** debiteras per månad (`plattform_ar / 12`), så en
   årsfaktura blir tolv månader och en månadsfaktura en.
4. **Användarraden** är `aktiva konton × månader`, där antalet är de
   konton som faktiskt kan logga in när fakturan utfärdas.
5. **Momsen** räknas på nettosumman, inte per rad — radvis avrundning ger
   ören som inte stämmer mot totalen.

### Regressionen som gav 7× för mycket

Månadsjobbet återanvände funktioner formade för en **årsfaktura**.
Plattformsraden skalade inte alls (hela årsavgiften på varje
månadsfaktura → 12×) och `manaderMellan` räknade *berörda kalender-
månader*, vilket gav 2 för varje period som inte startade den 1:a (→ 2×).
En Standard-kund med fem konton fick 27 900 kr i stället för 3 950 kr.

Låst av tester i `fakturering.test.ts` (månadsperiod, årsperiod,
registrering vilken dag som helst) och av sex integrationskontroller mot
riktig Postgres.

## Oföränderlighet och rättelse

En utfärdad faktura **ändras aldrig** — databasen har en trigger som
avvisar `update`. En rättelse är en **kreditfaktura** som pekar tillbaka
och som kräver ett granskbart skäl. Fakturanumren löper utan luckor
(rådgivande lås i stället för en sequence, som lämnar hål när en
transaktion rullas tillbaka), eftersom en nummerserie med hål inte är ett
bokföringsunderlag utan en lista.

**Betalning** registreras av en människa med en spårbar referens.
Systemet påstår aldrig av sig självt att något är betalt, och statusen
(`utfardad`/`betald`/`krediterad`) **härleds** ur händelserna i stället
för att lagras.

## Idempotens

Jobbet är idempotent på perioden. Skyddet var tidigare enbart
`senast_fakturerad`, som läses **utanför** transaktionen: två samtidiga
körningar (cron plus en manuell) läste samma värde och skrev två fakturor
för samma period. Nu finns ett unikt villkor på
`(organisation_id, period.fran, period.till)` för icke-krediterande
fakturor. Jobbet räknar en konflikt som *redan fakturerad* och går vidare
till nästa organisation; endpointen svarar **409** med skälet.

## Abonnemangets tillstånd

Tillståndet härleds ur obetalda förfallna fakturor med respitdagar — det
lagras inte, så det kan aldrig gå isär med verkligheten.

| Tillstånd | Innebörd |
| --- | --- |
| `aktiv` | Full användning |
| `varning` | En faktura är förfallen; synlig nedräkning, inga begränsningar |
| `last` | Nya ärenden kan inte startas |

**Låsning rör aldrig historiken.** Läsning och export förblir öppna i
låst läge, därför att ärendeloggen är verkstadens underlag i en tvist som
gäller *deras* kund — en tredje part utan del i vår obetalda faktura. Att
göra det underlaget oåtkomligt vore att använda någon annans rättsliga
ställning som påtryckningsmedel.

Enterprise saknar listpris och faktureras **inte** av jobbet: ett påhittat
belopp vore värre än ingen faktura.

## Behörigheter

| Åtgärd | Kräver |
| --- | --- |
| Utfärda, registrera betalning, kreditera | Utfärdarens nyckel (`X-Fakturering`), aldrig en webbläsarsession |
| Läsa fakturalistan, hämta PDF | Administratör i organisationen |
| Ändra abonnemangsnivå, sätta fakturaepost | Administratör |

PDF-vägen kontrollerade tidigare bara organisationstillhörighet, så en
tekniker med ett fakturaid kom förbi den grind listan satte upp. Den har
nu samma admin-krav.

## Kundens väg till sitt eget underlag

Fakturavyn visar hela historiken (inklusive kreditkedjan), varje rads
underlag och en **nedladdning** av PDF:en. Hjälparen byggde tidigare bara
en länk till en endpoint bakom sessionen — vilket aldrig kan fungera,
eftersom en navigering inte bär en `Authorization`-header — och den var
inte anropad någonstans. Dokumentet hämtas nu med sessionen och lämnas
över som en fil.

## Verifiering

- `app/src/felsokning/__tests__/fakturering.test.ts` — perioder, rader, moms, kreditering
- `app/src/felsokning/__tests__/abonnemang.test.ts` — tillstånden och respiten
- `services/plattform/integrationstest.sh` §23b — månadsbelopp, årsbelopp, idempotens, PDF, behörighet, mot riktig Postgres

---

*ALVA-DOC-0015 · En faktura som inte går att härleda ur systemets eget
tillstånd är en gissning med två decimaler.*
