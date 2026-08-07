# Driftsättningsplan · ALVA på AWS

Detta paket läses först. Det innehåller planen och SHA256-summorna för
de fem arbetspaketen. Allt är egenhostat i ett eget AWS-konto — ingen
extern byggtjänst, inget externt register.

## Leveransen

| Paket | Steg | Utförs av |
| --- | --- | --- |
| `01-aws-bas.zip` | AWS-basen: VPC, EKS, Aurora, S3, ECR, KMS, Secrets Manager, Route 53, larm | Agent med AWS-behörighet |
| `02-tjanster.zip` | Backendbilderna (plattform, ai-orkester) byggs, testas och publiceras; databasschemat initieras | Agent med Docker + ECR-push |
| `03-webb.zip` | Webbilden byggs med miljöns byggargument och publiceras | Agent med Docker + ECR-push |
| `04-arbetslast.zip` | Arbetslasten i klustret: tjänster, ingress, DNS, nätverkspolicyer | Agent med kluster-behörighet |
| `05-verifiering.zip` | Slutkontroll av den driftsatta miljön | Valfri agent, läsbehörighet räcker |

## Ordningen och varför

`01` före `02`/`03`: bilderna kan inte publiceras förrän registret
finns. `02`/`03` före `04`: arbetslastens poddar drar bilderna vid
apply — en apply mot tomma repon ger poddar i `ImagePullBackOff`.
`05` sist, alltid: ett steg utan verifiering är inte utfört.
`02` och `03` är oberoende av varandra och får köras parallellt av två
agenter; alla andra steg är sekventiella.

## Innan något packas upp

```sh
sha256sum -c SHA256SUMS.txt
```

Stämmer inte en summa: stanna och rapportera. Packa upp paketen i EN
gemensam arbetskatalog — vägarna är relativa `felsokning/` och lägger
sig i ett träd (`infra/`, `services/`, `app/`, `docs/`). Varje pakets
anvisning, fillista och versionsstämpel ligger under
`paket/<paketnamn>/` och krockar därför aldrig med de andras.

## Verktyg som förutsätts

Terraform (version enligt `versions.tf`), AWS CLI v2 med behörighet i
målkontot, Docker, Node 22, `kubectl`, `jq`, `psql`. Region enligt
`variables.tf` (standard `eu-north-1`).

## Regler som gäller varje steg

1. **Fortsätt aldrig förbi en misslyckad verifiering.** Rapportera vad
   som fallerade och stanna — nästa paket förutsätter det förra.
2. **Hemligheter går aldrig in i Terraform, git eller ett paket.**
   De sätts direkt i Secrets Manager; tillståndsfilen får aldrig se dem.
3. **En bildtagg pekar på ett bygge, för alltid.** Registret har
   oföränderliga taggar; välj en ny tagg per bygge (git-SHA:t i
   `PAKET.txt` är rätt val) och använd SAMMA tagg i steg 02, 03 och 04.
4. **Rapportera utfall ordagrant** — vad som kördes, vad som verifierades,
   vad som återstår. `terraform output karta` är kvittot i steg 01 och 04.
