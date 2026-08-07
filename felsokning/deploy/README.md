# Driftsättningspaketen

Paketeringen skär plattformen i numrerade zip-paket, ett per
driftsättningssteg, avsedda att utföras av agenter i ordning. Varje
paket bär sin egen `ANVISNING-AGENT.md` — den som packar upp ett paket
ska inte behöva något annat än paketet och det föregående stegets
utdata.

```sh
bash felsokning/deploy/paketera.sh <målkatalog>
```

| Paket | Innehåll | Steg |
| --- | --- | --- |
| `00-plan.zip` | Driftsättningsplanen + SHA256-summor för övriga paket | Läses först, verifierar leveransen |
| `01-aws-bas.zip` | `infra/aws` + `infra/postgres-init.sql` | Terraform: VPC, EKS, Aurora, S3, ECR, KMS, hemligheter, domän, larm |
| `02-tjanster.zip` | `services/` — plattform, ai-orkester, gemensam | Bygg och publicera backendbilderna till ECR, initiera schemat |
| `03-webb-kalla.zip` | `app/` (utan `node_modules`/`dist`/`src/assets`) + `supabase/` | Bygg och publicera webbilden |
| `03-webb-resurser-*.zip` | `app/src/assets` i delar om högst `DELBUDGET` byte (standard 1,9 MB — kanalen tål högst 2 MB per paket); en fil större än budgeten styckas i bitar som mottagaren sätter ihop mot `DELAT.sha256` | Hör till 03 — packas upp i samma träd före bygget |
| `04-arbetslast.zip` | `infra/terraform` | Terraform: arbetslasten i klustret, ingress, DNS |
| `05-verifiering.zip` | `docs/` | Slutkontroll av den driftsatta miljön, driftdokumentation |

Ordningen är driftsättningsordningen och den är inte förhandlingsbar:
basen före bilderna (registret måste finnas), bilderna före arbetslasten
(poddarna drar dem vid apply), verifieringen sist. Skälen står i
respektive anvisning.

Vad som medvetet INTE packas: `node_modules` (återskapas ur
`package-lock.json`), `app/dist` (byggs i webbilden med miljöns egna
byggargument), `.git`, och värdapplikationens rotkataloger — ALVA:s
plattform är `felsokning/`.

Anvisningstexterna ligger i `anvisningar/` och versionshanteras här;
skriptet lägger in dem i paketen under `paket/<paketnamn>/` tillsammans
med `INNEHALL.txt` (fillista) och `PAKET.txt` (version, git-SHA,
byggtid) — vägen är paketunik så att alla paket kan packas upp i samma
arbetskatalog. Summorna i `00-plan.zip` beräknas över de färdiga
paketen — verifiera dem innan något packas upp.
