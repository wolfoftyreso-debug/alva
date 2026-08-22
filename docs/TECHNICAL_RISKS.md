# ALVA — TECHNICAL RISKS

Graderat efter **konsekvens i produktion**, inte efter hur mycket det
skaver mot en standard. En avvikelse från målarkitekturen som fungerar,
är testad och begriplig är inte en risk — den är ett val.

| Grad | Innebörd |
| --- | --- |
| CRITICAL | Kan orsaka dataförlust, säkerhetsbrott eller ostoppbar drift. Blockerar produktion |
| HIGH | Orsakar verkliga incidenter eller gör felsökning oacceptabelt dyr |
| MEDIUM | Bromsar utveckling, ökar underhållskostnad |
| LOW | Bör städas, brådskar inte |

---

## CRITICAL

### R-1 · Inga versionsstyrda migrationer

**Var:** `infra/postgres-init.sql`, applicerat manuellt med `psql`.

Schemat är idempotent DDL utan versionstabell. Det innebär i praktiken:

- Ingen vet vilken schemaversion en given databas har.
- Ingen rollback finns. Ett felaktigt `alter table` i produktion går inte
  att backa på ett kontrollerat sätt.
- Kolumnbyten, typändringar och datafyllning går inte att uttrycka —
  bara additiva `add column if not exists`.
- Applicering är ett manuellt steg i en driftanvisning, alltså beroende av
  att en människa gör rätt vid rätt tidpunkt.

**Skärpande omständighet:** databasen bär append-only-triggrar och en
hashkedja. Ett schemamisstag här är inte "en dålig migrering" — det kan
göra bevismaterial overifierbart.

**Åtgärd:** inför migreringsverktyg med versionstabell och kör det i CI
mot en tom databas *och* mot en kopia av produktionsschemat.

### R-2 · Död scaffolding drar in ~40 oanvända beroenden

**Var:** `app/src/components/ui/` (49 filer, 3 954 rader) och
`app/package.json`.

Ingen ALVA-sida importerar dem. Ändå installeras och byggs hela
`@radix-ui`-sviten, `@stripe/react-stripe-js`, `@stripe/stripe-js`,
`@tanstack/react-query`, `zod`, `date-fns`, `recharts` med flera.

Varför det är CRITICAL och inte städning: **det är angreppsyta utan
motprestation.** Varje beroende är en försörjningskedja in i ett system
vars hela värde är bevisintegritet. `@stripe/*` ger dessutom en
betalningsberoende-signal i ett system som uttryckligen inte hanterar
kortbetalningar.

**Åtgärd:** ta bort katalogen och beroendena. Verifiera med bygge och
hela sviten.

---

## HIGH

### R-3 · `services/plattform/server.mjs` är ett god-object

3 249 rader, 32 endpoints, handskriven routing, auth, affärslogik,
validering och svarsformatering i samma fil.

Konsekvens: varje ändring rör en fil som allt annat också rör. Två
personer kan inte arbeta i API:t samtidigt utan konflikt. Att hitta var en
väg hanteras kräver läsning, inte navigering.

**Åtgärd:** dela per resurs (arenden, auth, delning, fakturering,
integrationer). Mekanisk extraktion, inte omskrivning.

### R-4 · `ArendeSida.tsx` är 3 179 rader med affärslogik i en komponent

Teknikerns huvudflöde. Innehåller UI, tillståndshantering, regelutvärdering
och anrop. Bryter mot lagerregeln (UI → application → domain).

**Skärpande:** det är produktens mest använda skärm och den svåraste att
testa isolerat.

**Åtgärd:** lyft regel- och flödeslogik till `src/felsokning/`-moduler som
redan finns och testas. UI:t behålls.

### R-5 · E2E körs inte i CI

`genomgang.mjs` och `portalsparr.mjs` finns och fungerar, men CI kör dem
inte. De var dessutom trasiga (fel webbläsarsökväg) tills det upptäcktes
manuellt — vilket är precis vad som händer med tester som ingen kör.

**Åtgärd:** in i CI som eget jobb.

### R-6 · CI ligger bara i Gitea, repot i GitHub

`.gitea/workflows/` kräver egna runners på ett EKS-kluster. Det finns
ingen `.github/workflows/`. Om Gitea-runnern inte är uppe är kvalitetsgrinden
**inte en grind** — den är en förhoppning.

**Åtgärd:** spegla grinden till GitHub Actions.

### R-7 · Terraform är oapplicerad och overifierad

Infrastrukturen är skriven men har inte körts i någon miljö som gått att
kontrollera. `terraform validate` i CI säger att syntaxen håller, inte att
miljön går att resa.

**Åtgärd:** res staging ur Terraform en gång, hela vägen. Allt annat är
antaganden.

---

## MEDIUM

### R-8 · Två parallella driftformer dokumenterade

EKS/Fargate **och** EC2/systemd. Båda beskrivna som giltiga. Det dubblar
driftkunskapen som krävs och gör "hur ser produktionen ut?" till en fråga
utan entydigt svar.

**Åtgärd:** välj en. Behåll den andra som dokumenterad reservväg, inte som
jämbördigt alternativ.

### R-9 · Ingen typkoppling mellan databas och kod

Rå SQL utan ORM. Ett kolumnnamnsbyte upptäcks först när en fråga körs.
Integrationstestet fångar mycket, men typsystemet hjälper inte alls.

**Notering:** rå SQL är här ett rimligt val — append-only-triggrarna och
hashkedjan lever i databasen och skulle motarbetas av en ORM. Risken är
inte "ingen Prisma" utan "ingen kontroll alls". En genererad typmodell ur
schemat löser det utan att införa en ORM.

### R-10 · Symlänkar i stället för workspace

20 symlänkar delar `services/gemensam` in i tjänsterna. Fungerar på Linux
och i Docker, men: går sönder på Windows utan utvecklarläge, går sönder vid
`zip` utan `-y` (verifierat under paketering), och kan inte versionshanteras
per konsument.

### R-11 · Ingen köhantering; AI-anrop sker synkront i request

Ett långsamt modellsvar håller en HTTP-förbindelse. Vid last blir det en
tråd-svält lång innan det blir ett modellproblem.

### R-12 · Blandat språk i koden

Domänbegrepp, funktionsnamn och kommentarer är svenska; strukturen engelsk.
Det är genomgående och konsekvent, men höjer tröskeln för varje utvecklare
som inte läser svenska — och för de flesta kodverktyg.

**Notering:** detta ska INTE åtgärdas nu. Ett massbyte av identifierare i
ett bevisbärande system är hög risk för noll funktionell vinst. Beslutet
hör hemma i plattformsprojektet, inte här.

### R-13 · Prompts saknar egen version i utdata

Prompts versionshanteras med repot men `promptVersion` följer inte med i
AI-utdata. Ett svar går inte att koppla till exakt promptrevision i
efterhand.

---

## LOW

### R-14 · `lovable-tagger` kvar i `vite.config.ts`

Byggsteg från projektets ursprung. Ingen funktion i produktionsbygget.

### R-15 · Ingen Sentry, ingen readiness skild från liveness

Egen strukturerad logg finns och är bra, men felaggregering saknas.

### R-16 · T-3 KMS-valv byggt men inte i drift

`nyckelvalv.mjs` är klart och testat mot stubbad KMS. Utan skarp KMS är
raderingslöftets backupfönster fortfarande öppet — dokumenterat i
`DATASKYDD.md`, inte dolt.

---

## Vad som INTE är en risk

Följande avviker från målarkitekturen men är medvetna, testade och
begripliga val. De ska inte migreras utan ett verkligt behov:

- **Ramverkslös server.** 32 endpoints i ren `node:http`. Problemet är
  filstorleken (R-3), inte frånvaron av Fastify.
- **Vite-SPA i stället för Next.js.** Portalen är ett inloggat verktyg utan
  SEO- eller SSR-behov.
- **Egen schemamotor i stället för Zod.** `granskaHändelse` är en *stängd*
  schemamotor som avvisar okända fält — en domäninvariant som skyddar
  bevisintegriteten. Zod vid API-gränsen är ett komplement, inte en ersättare.
- **Ingen Redis, ingen Kafka, inget service mesh.**
