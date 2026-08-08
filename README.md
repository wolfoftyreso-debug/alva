# ALVA

Professionell plattform för guidad fordonsfelsökning i verkstad.
Namnet är metoden: **Analysis · Localization · Verification · Action**.
Kärnregeln: ett ärende som inte kan granskas i efterhand är inte klart
— upprätthållet tekniskt genom grindar, inte som råd.

Detta repo är hela projektet, inget annat:

| Katalog | Innehåll |
| --- | --- |
| `app/` | Webbklienten — publik webbplats, kundportal och felsökningsverktyget |
| `services/gemensam/` | Delad domänkod: metodiker, grindar, språk, versioner |
| `services/plattform/` | Plattformstjänsten — auth, händelse-API, delning, fakturering |
| `services/ai-orkester/` | AI-tjänsten |
| `infra/aws/` | Terraform: AWS-basen (VPC, EKS, Aurora, S3, ECR, KMS, hemligheter) |
| `infra/terraform/` | Terraform: arbetslasten i klustret |
| `deploy/` | Paketering för agentdriven driftsättning — läs `deploy/README.md` |
| `docs/` | All dokumentation och revisionshistorik |
| `supabase/` | Värdapplikationens migrationsunderlag |

## Börja här

- **Vad ALVA är och vad som är byggt:** `docs/VAD-AR-ALVA.txt`
- **Fullständig systembeskrivning:** `docs/ALVA-SYSTEMBESKRIVNING.md`
- **Driftsättning på AWS:** `deploy/README.md` — sex numrerade paket i
  ordning, ett per steg, med agentanvisning i varje. Infrastrukturens
  egna vägledningar: `infra/aws/README.md` och `infra/terraform/README.md`.
- **Drift:** `docs/OPERATIONS.md`

## Utveckling

```sh
cd app && npm ci
npx vitest run          # testsviten
npm run typkontroll     # TypeScript
npm run dev             # lokal utveckling
```

Backendtjänsternas integrations- och återställningstest:
`services/plattform/integrationstest.sh` respektive
`aterstallningstest.sh`. CI körs självhostat via Gitea Actions
(`.gitea/workflows/felsokning.yml`) — allt bygge och register ligger i
den egna AWS-miljön.
