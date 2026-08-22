# ALVA — MIGRATION PLAN

Inkrementell. Systemet ska vara körbart mellan varje steg. Ingen big-bang.

**Regel för hela planen:** varje steg avslutas med hela verifieringskedjan
— `vitest` (1008), `typkontroll`, `eslint`, bygge, `integrationstest.sh`
(231 kontroller mot riktig Postgres), `rokprov.sh`, och E2E där det är
relevant. Ett steg som inte kan verifieras är inte klart.

---

## Ordning, och varför just den

Ordningen följer **risk före kosmetik**. Det som kan orsaka dataförlust
först, det som kostar underhåll sedan, det som skaver mot standarden sist.

### Etapp 1 — Stäng det som kan skada data (R-1)

Migrationskedja med versionstabell. `postgres-init.sql` blir
`migrations/0001_grund.sql` med efterföljande steg. CI kör kedjan mot tom
databas **och** mot kopia av produktionsschemat, och verifierar att
resultatet är identiskt med dagens schema.

Detta först, därför att allt annat arbete som rör databasen blir farligare
utan det.

### Etapp 2 — Ta bort det döda (R-2)

`app/src/components/ui/`, `use-toast.ts` och ~40 beroenden. Ren
subtraktion. Verifieras med bygge och full svit; om något faller var det
inte dött, och då stannar borttagningen.

Tidigt, därför att det gör allt efterföljande arbete lättare att
överblicka — och för att det minskar angreppsytan direkt.

### Etapp 3 — Grinden ska faktiskt grinda (R-5, R-6)

GitHub Actions med samma innehåll som Gitea-flödet, plus E2E. Först när
CI kör på den plattform där koden faktiskt ligger är kvalitetsgrinden en
grind.

### Etapp 4 — Dela god-objects (R-3, R-4)

`server.mjs` per resurs; `ArendeSida.tsx` genom att lyfta logik till
befintliga testade moduler. Mekanisk extraktion med testerna som facit.
Beteendet ska vara oförändrat — en diff som ändrar beteende i det här
steget är ett fel.

### Etapp 5 — Res staging ur Terraform (R-7)

En gång, hela vägen. Innan detta är driftpåståendena antaganden.

### Etapp 6 — Välj en driftform (R-8)

Behåll den andra som dokumenterad reservväg.

### Etapp 7 — Typkoppling mot schemat (R-9)

Generera typer ur databasschemat. **Ingen ORM** — append-only-triggrarna
och hashkedjan lever i databasen och skulle motarbetas av en ORM.

### Etapp 8 — Plattformsanslutning

Först här blir workspace-paket (R-10) och identity-anslutning aktuella.
Kräver att plattformsrepot finns och har en granskad identitetsmodell.

---

## Uttryckligen INTE i planen

| Ändring | Varför inte |
| --- | --- |
| Migrering till Next.js | Portalen är ett inloggat verktyg utan SSR- eller SEO-behov. Kostnad utan motprestation |
| Migrering till Prisma | Skulle motarbeta append-only-triggrarna och hashkedjan. Den verkliga bristen är migrationer, inte ORM |
| Byte till Fastify | Problemet är filstorleken, inte `node:http`. Dela filen först; se sedan om ramverket behövs |
| Zod som ersättare för `granskaHändelse` | Den stängda schemamotorn är en domäninvariant. Zod kan komplettera vid API-gränsen |
| Översättning av svenska identifierare | Massbyte i ett bevisbärande system: hög risk, noll funktionell vinst. Beslutet hör hemma i plattformsprojektet |
| pnpm-migrering nu | Kosmetiskt före etapp 8. Gör det när workspace ändå införs |
| Kö/worker för AI | Inför när last motiverar det, inte innan |

---

## Produktionsblockerare

Måste vara stängda innan ALVA kan kallas produktionsklar:

1. **R-1** Versionsstyrda migrationer med rollback-väg
2. **R-6** CI som faktiskt kör på repots plattform
3. **R-5** E2E i grinden
4. **R-7** Terraform applicerad minst en gång i staging
5. **R-2** Död scaffolding och dess beroenden borta

Övrigt är underhållsskuld, inte blockerare.
