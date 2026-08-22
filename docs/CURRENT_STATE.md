# ALVA — CURRENT STATE

**Teknisk inventering. Beskriver systemet som det FAKTISKT är i dag, inte
som det borde vara.** Inga värderingar här; de ligger i
`TECHNICAL_RISKS.md` och `CODEBASE_CLASSIFICATION.md`.

Underlag: HEAD `1f841bd`, 669 commits, 376 spårade filer, ~46 200 rader
kod (exkl. beroenden).

---

## 1. Sammanfattning

ALVA är ett **bevisbärande diagnostikverktyg** för fordonsverkstäder. Det
tekniskt särskiljande är inte gränssnittet utan datamodellen: en
append-only händelselogg som hashkedjas, förseglas med HMAC vid avslut och
tidsförankras mot en oberoende RFC 3161-tjänst. Produktens värde är att en
post ska överleva granskning i en tvist.

Systemet är **medvetet ramverksfritt** på serversidan och kör som **en
process** i standarddrift. Det är inte ett resultat av slarv — det är ett
genomgående arkitekturval som syns i varje modul.

---

## 2. Stack — som den är

| Lager | Faktiskt | Målstandarden säger |
| --- | --- | --- |
| Språk | TypeScript (klient), JavaScript ESM `.mjs` (server/domän) | TypeScript |
| Runtime | Node.js 22 | Node LTS |
| Webb | **Vite + React 19 + React Router** (SPA) | Next.js |
| Backend | **`node:http` utan ramverk**, handskriven routing | Fastify |
| Databas | PostgreSQL (Aurora i AWS) | PostgreSQL ✔ |
| Datalager | **Rå SQL via `pg`** | Prisma |
| Migrationer | **Inga.** Idempotent DDL i `infra/postgres-init.sql`, körs manuellt med `psql` | Versionsstyrda migrationer |
| Validering | **Egen** stängd schemamotor (`granskaHändelse`) | Zod |
| API | REST + **OpenAPI** (`services/plattform/openapi.yaml`, CI-validerad) | REST + OpenAPI ✔ |
| Test | Vitest (1008), Playwright (e2e), integrationstest mot riktig Postgres | Vitest + Playwright ✔ |
| Paket | **npm**, inga workspaces — delning via **symlänkar** | pnpm workspace |
| Container | Docker, flerstegsbygge | Docker ✔ |
| CI | **Gitea Actions** (`.gitea/workflows/felsokning.yml`) | GitHub Actions |
| IaC | Terraform (`infra/aws`, `infra/terraform`) | Terraform ✔ |
| Drift | Två dokumenterade former: EKS/Fargate **och** enkel EC2-systemd | ECS/Fargate |
| Fel/telemetri | Egen strukturerad logg + CloudWatch EMF | CloudWatch + Sentry |

---

## 3. Repostruktur

    app/                    Klient: publik webb + portal + felsökningsverktyg
      src/alva/             Designsystem, komponentbibliotek, webbspråk
      src/felsokning/       Domännära klientkod, AI-klient, synk, bilagor
      src/pages/            Sidor (alva/ = portal+webb, felsokning/ = verktyget)
      src/components/ui/    shadcn/Radix-scaffolding — se §9
      e2e/                  Playwright-genomgångar
    services/
      gemensam/             DOMÄNEN — ren, ramverksfri, delad
      plattform/            API: auth, händelser, delning, fakturering
      ai-orkester/          AI-gateway (Claude + Gemini)
    server/                 Kombinerad server: hela produkten i en process
    infra/                  Terraform + postgres-init.sql + systemd
    deploy/                 Paketerad driftsättningsanvisning
    docs/                   Dokumentation och revisionshistorik

**Delning sker med symlänkar, inte paket.** 20 filer i
`services/plattform/` och `services/ai-orkester/` är symlänkar in i
`services/gemensam/`. Klienten importerar samma `.mjs`-filer med relativ
sökväg. Det ger äkta enkällighet utan byggsteg, men är inte en
workspace-modell och versionshanteras inte.

---

## 4. Domänen (`services/gemensam`)

Systemets kärna. Ramverksfri, testad, delad mellan klient och server.

| Modul | Ansvar |
| --- | --- |
| `handelser.mjs` | **Stängt händelseschema** (33 typer) + `granskaHändelse`. Okända fält avvisas |
| `grind.mjs` | Kvalitetsgrinden: vad som krävs för att avsluta ett ärende |
| `kedja.mjs` | Hashkedja (`grund`/`lank`), HMAC-försegling, `provaForsegling` |
| `tidsstampel.mjs` | RFC 3161: DER-kodning, tokenläsning, TSA-anrop |
| `personuppgifter.mjs` | Krypto-shredding: identifierande fält krypteras per subjekt |
| `sakerhet.mjs` | Säkerhetstak — härleder högsta tillåtna konfidens ur underlaget |
| `motivering.mjs` | Slutsatsens fyra frågor, kvalitetsgranskade |
| `metodiker.mjs` | 16 felsökningsmetodiker med steg och kontroller |
| `sprak/` | Tiospråkssystem, 351 nycklar, låst av fullständighetstester |
| `fakturering.mjs` | Periodlogik, UTC-säker |

---

## 5. Data

**Schema:** `infra/postgres-init.sql` (601 rader). Skapar tabeller,
index och **append-only-triggrar** som hindrar `update`/`delete` på
händelser och ärenden oavsett roll.

**Applicering:** manuellt, `psql "<url>" < infra/postgres-init.sql`.
Idempotent (`create table if not exists`, `add column if not exists`).
**Det finns ingen versionstabell och ingen rollback-väg.**

**Tenantmodell:**

    Organisation → Användare (roll: tekniker | arbetsledare | admin)
                 → Ärenden (organisation_id på all affärsdata)

All ärendedata bär `organisation_id`. Isolering genomdrivs i varje fråga
(`arendeIOrg`) och prövas i integrationstestet mot riktig Postgres.

**Personuppgifter:** identifierande fält krypteras med nyckel per subjekt.
Nycklarna kuverteras under `PERSONNYCKEL_HUVUD` (utanför databasen), eller
— nytt och ännu inte i drift — per subjekt i AWS KMS
(`services/plattform/nyckelvalv.mjs`).

---

## 6. Auth

**Autentisering:** egen JWT (HS256), lösenord med bcrypt via pgcryptos
`gen_salt('bf', ≥12)`. `JWT_SECRET` krävs — saknas den svarar tjänsten 503
(fail closed). Kontospärr efter 10 försök per konto / 30 per källa.
`token_version` möjliggör återkallelse.

**Auktorisering:** roll i token (`tekniker`/`arbetsledare`/`admin`),
kontrollerad per endpoint. Ingen separat permission-modell.

Autentisering och auktorisering ligger **i samma serverfil** men i skilda
funktioner (`kravAnspr`, rollkontroll per väg).

---

## 7. AI

Redan centraliserat. Klienten anropar aldrig en modell direkt.

    Klient → /api/ai (plattformen) → services/ai-orkester → leverantör

`ai-orkester/server.mjs` äger modellval, systemprompt, schema och effort
per uppgift. Sju uppgiftstyper. Två leverantörer: Anthropic (handledning,
granskning, sammanfattning, metodikval, dokumenttolkning,
instrumentavläsning) och Google Gemini (bildanalys). Nyckeln krävs per
leverantör; saknas den svarar tjänsten 503 och produkten fungerar vidare
utan modellen.

Strukturerad utdata valideras mot JSON-schema. Prompts ligger i källkod
och versionshanteras därmed med repot, men har ingen egen promptversion i
utdata.

---

## 8. Bakgrundsarbete

| Jobb | Hur det körs |
| --- | --- |
| Gallring (`services/plattform/gallring.mjs`) | Eget jobb: CronJob i klustret / systemd-timer på EC2 |
| Fakturering (`fakturering.mjs`) | Samma modell |
| Kedjesvep (`--kedjesvep`) | Verifierar hashkedjor, körs som jobb |

Ingen kö. Inget SQS. AI-anrop sker synkront i request.

---

## 9. Känd död kod

`app/src/components/ui/` — **49 filer, 3 954 rader** shadcn/Radix-scaffolding
från projektets Lovable-ursprung. **Ingen ALVA-sida importerar dem.** Endast
`src/hooks/use-toast.ts` refererar dit, och den används inte heller.

De drar in ~40 beroenden som annars inte behövs: hela `@radix-ui`-sviten,
`@stripe/*` (0 användningar), `@tanstack/react-query` (0), `date-fns` (0),
`zod` (0), `@hookform/resolvers` (0), `recharts`, `embla-carousel`, `cmdk`,
`vaul`, `sonner`, `next-themes`, `input-otp`, `react-day-picker`.

`lovable-tagger` sitter kvar i `vite.config.ts`.

ALVA:s verkliga gränssnitt är handskrivet: `src/alva/komponenter.tsx` och
`src/felsokning/ui.tsx`.

---

## 10. Test

| Svit | Omfattning |
| --- | --- |
| Vitest | **1008 test**, 43 filer |
| Integrationstest | `services/plattform/integrationstest.sh` — **231 kontroller** mot riktig Postgres (startar egen instans) |
| E2E | `app/e2e/genomgang.mjs` (4 ärenden genom byggt gränssnitt), `portalsparr.mjs` |
| Rökprov | `server/rokprov.sh` — hela produkten i en process |

Testerna låser även designsystemet (paletten, 8px-rutnätet, typografin)
och tiospråkskatalogernas fullständighet.

**E2E körs inte i CI.**

---

## 11. CI

`.gitea/workflows/felsokning.yml` — Gitea Actions på egna runners.

Jobb: `test-och-bygg` (vitest, typkontroll, eslint, build) ·
`tjanster` (eslint, integrationstest mot Postgres, OpenAPI-validering) ·
`terraform`.

Repot ligger på GitHub. **Det finns ingen `.github/workflows/`.**

---

## 12. Säkerhet — nuläge

Finns: CSP `frame-ancestors 'none'`, HSTS, `X-Content-Type-Options`,
`Referrer-Policy`, CORS mot ursprungslista, taktbegränsning vid inloggning
och på publika beslutsendpointen, append-only i databasen, hashkedja,
försegling, krypto-shredding, åtkomstlogg, `BETRODDA_PROXYHOPP` mot
X-Forwarded-For-förfalskning, fail-closed på saknad `JWT_SECRET`.

Inga hemligheter i repot (genomsökt: inga träffar på kända nyckelmönster).
`.gitignore` täcker `.env*`, `*.tfstate`, `*.tfvars`.

---

## 13. Drift

Två dokumenterade former:

1. **EKS/Fargate** — Terraform i `infra/aws` (bas) och `infra/terraform`
   (arbetslast). Aurora, S3, ECR, Secrets Manager, IRSA.
2. **EC2 + systemd** — `docs/DRIFT-EC2.md`, en process, lokal Postgres.

Terraform är skriven men **inte applicerad eller validerad** i någon miljö
som gått att kontrollera härifrån.

---

## 14. Observabilitet

Egen strukturerad logg (`observation.mjs`): nivå, meddelande, tid, spårId,
spanId, väg, status, ms. CloudWatch EMF-mätvärden. `traceparent` bärs genom
klient → plattform → orkester. Hälsoendpoint `/halsa` på varje tjänst.

Ingen Sentry. Ingen readiness-endpoint skild från liveness.
