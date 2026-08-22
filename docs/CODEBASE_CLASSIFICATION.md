# ALVA — CODEBASE CLASSIFICATION

Varje större del klassad **A KEEP · B REFACTOR · C REBUILD · D REMOVE**,
med konkreta sökvägar.

Utgångspunkt: koden bedöms på faktisk kvalitet. Att något fungerar gör det
inte bra; att något avviker från målstandarden gör det inte dåligt.

---

## A — KEEP

Rätt struktur, rätt kvalitet. Rör inte utan skäl.

| Sökväg | Varför |
| --- | --- |
| `services/gemensam/` (hela) | Systemets kärna. Ren, ramverksfri, delad mellan klient och server, tungt testad. Det här är repots starkaste kod |
| `services/gemensam/handelser.mjs` | Stängt händelseschema som avvisar okända fält. Domäninvariant, inte boilerplate |
| `services/gemensam/kedja.mjs` | Hashkedja + HMAC-försegling. 108 rader, gör exakt en sak |
| `services/gemensam/tidsstampel.mjs` | RFC 3161. Bevisad mot riktig openssl-token |
| `services/gemensam/grind.mjs` | Kvalitetsgrinden. Serverauktoritativ, spegelkörd i klienten |
| `services/gemensam/sakerhet.mjs` | Säkerhetstaket — härleder konfidens ur underlag i stället för att låta någon påstå den |
| `services/gemensam/sprak/` | Tiospråkssystem, låst av fullständighetstester |
| `services/ai-orkester/` | **Redan den AI-gateway Fas 7 efterfrågar.** Leverantörsneutral routing, schema per uppgift, nyckel per leverantör |
| `infra/postgres-init.sql` — triggerdelen | Append-only genomdrivet i databasen, inte i applikationen |
| `services/plattform/integrationstest.sh` | 231 kontroller mot riktig Postgres, inklusive tenant-isolering |
| `app/src/alva/komponenter.tsx`, `app/src/felsokning/ui.tsx` | Handskrivet designsystem, låst av tester |
| `app/e2e/` | Fungerande genomgångar av hela flödet |
| `services/plattform/openapi.yaml` | Finns och CI-valideras |
| `docs/` (revisionshistoriken) | Ovanligt hederlig teknisk dokumentation. Behåll |

---

## B — REFACTOR

Rätt funktion, fel struktur. Ändra formen, inte beteendet.

| Sökväg | Problem | Åtgärd |
| --- | --- | --- |
| `services/plattform/server.mjs` (3 249 rader) | God-object: routing + auth + affärslogik + validering i en fil | Dela per resurs. Mekanisk extraktion, oförändrat beteende, testerna som facit |
| `app/src/pages/felsokning/ArendeSida.tsx` (3 179 rader) | Affärslogik i React-komponent | Lyft regel- och flödeslogik till `src/felsokning/`. **Behåll UI:t oförändrat** |
| `infra/postgres-init.sql` (som helhet) | Idempotent DDL utan version | Konvertera till versionsstyrda migrationer. Schemat i sig är bra — leveransmodellen är det inte |
| `services/plattform/*.mjs` symlänkar | Delning utan versionshantering | På sikt workspace-paket. Inte brådskande, men ett hinder för plattformsanslutning |
| `.gitea/workflows/felsokning.yml` | Rätt innehåll, fel plats | Spegla till GitHub Actions. Lägg till E2E |
| `app/src/felsokning/ecm.ts` (858 rader) | Stor men sammanhållen | Dela om den växer. Låg prioritet |

---

## C — REBUILD

Fungerar, men bär inte i produktion i nuvarande form.

| Sökväg | Problem | Åtgärd |
| --- | --- | --- |
| Schemaleveransen (`psql < postgres-init.sql`) | Manuellt produktionsingrepp utan version eller rollback | Bygg om som migreringskedja med versionstabell, körd av CI |
| AI-anrop i request | Synkrona modellanrop håller HTTP-förbindelser | Flytta tunga anrop till worker + kö när last motiverar det. **Inte innan** |
| Driftmodellen (två parallella) | EKS/Fargate och EC2/systemd som jämbördiga | Välj en som produktionsform |

---

## D — REMOVE

Död, duplicerad eller ren belastning.

| Sökväg | Storlek | Varför |
| --- | --- | --- |
| `app/src/components/ui/` | **49 filer, 3 954 rader** | shadcn/Radix-scaffolding. Ingen ALVA-sida importerar den |
| `app/src/hooks/use-toast.ts` | — | Enda referensen till ovanstående; själv oanvänd |
| `@radix-ui/*` (30 paket) | — | Endast använda av död kod |
| `@stripe/react-stripe-js`, `@stripe/stripe-js` | — | **0 användningar.** ALVA hanterar inga kortbetalningar |
| `@tanstack/react-query` | — | 0 användningar |
| `date-fns`, `@hookform/resolvers` | — | 0 användningar |
| `zod` | — | 0 användningar i dag (kan återinföras medvetet vid API-gränsen) |
| `recharts`, `embla-carousel-react`, `cmdk`, `vaul`, `sonner`, `next-themes`, `input-otp`, `react-day-picker`, `react-resizable-panels`, `react-hook-form` | — | Endast använda av död kod |
| `lovable-tagger` + anropet i `vite.config.ts` | — | Byggsteg från projektets ursprung |
| `lucide-react` | — | Endast i död kod. ALVA:s designsystem har fyra egna tecken |

**Storleksordning:** ~4 000 rader och ~40 beroenden bort, utan att någon
funktion påverkas. Verifieras med bygge + hela sviten.

---

## Sammanställning

| Klass | Andel av kodbasen (ungefär) |
| --- | --- |
| A — KEEP | ~55 % — domänen, tjänsterna, testerna, designsystemet |
| B — REFACTOR | ~30 % — två god-objects och leveransmodellen för schemat |
| C — REBUILD | ~5 % — schemaleverans, drift, synkrona AI-anrop |
| D — REMOVE | ~10 % — scaffolding och dess beroenden |

Kodbasen är i väsentligt bättre skick än typiskt för ett projekt med
AI-ursprung. Kärnan är ovanligt stark. Skulden sitter i kanterna: en
oanvänd UI-svit som aldrig städades bort efter starten, två filer som
tillåtits växa, och en databasleverans som aldrig moderniserades.
