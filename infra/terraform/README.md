# Infrastrukturen

Hela systemet i Terraform. Filerna är numrerade i den ordning de är
begripliga att läsa:

| Fil | Vad |
| --- | --- |
| `versions.tf` | Leverantörer och tillståndsbackend |
| `variables.tf` | Allt som skiljer en installation från en annan |
| `karta.tf` | **Systemet som data** — tjänster, portar, routing, hemligheter, dataflöden, gränser |
| `10-namnrymd.tf` | Namnrymd, tjänstekonto med IRSA, hemligheter ur Secrets Manager |
| `05-aws.tf` | Kopplingen till AWS-basen — allt den redan bestämt läses här |
| `15-plattformstjanster.tf` | ALB-kontroller, External Secrets, metrics, CloudWatch |
| `90-gitea.tf` | Självhostad git med egna byggrunners |
| `30-plattform.tf` | Backend: auth, händelse-API, delning, integrationer |
| `40-orkester.tf` | AI-orkestern |
| `50-web.tf` | Klienten |
| `60-ingress.tf` | ALB och DNS |
| `70-natverk.tf` | Nätverkspolicyer — vem får prata med vem |
| `outputs.tf` | Kartan utskriven |

Börja i `karta.tf`. Den beskriver systemet en gång, som data; resten av
filerna läser därifrån i stället för att upprepa portar och namn.

## Kom igång

```sh
cp terraform.tfvars.exempel terraform.tfvars   # fyll i domän, register, nycklar
terraform init

# FÖRSTA gången mot ett tomt kluster: CRD:erna måste finnas innan
# manifesten kan planeras — se nedan.
terraform apply -target=helm_release.external_secrets

terraform plan
terraform apply
terraform output karta                         # hela systemet i klartext
```

### Varför två steg första gången

`SecretStore` och `ExternalSecret` i `10-namnrymd.tf` är
`kubernetes_manifest`, och den resurstypen **validerar mot klustrets API
redan vid `terraform plan`**. CRD:erna installeras av `helm_release`
i samma konfiguration, så mot ett tomt kluster faller planen med
`no matches for kind "SecretStore" in group "external-secrets.io"`.
`depends_on` hjälper inte: planvalideringen sker före allt apply-arbete.

Det här är en känd begränsning i Kubernetes-leverantören, inte ett fel i
konfigurationen. Den riktade apply:n ovan installerar CRD:erna först;
därefter fungerar `plan` och `apply` normalt, även vid senare ändringar.

**Det värsta tillfället att upptäcka det är en katastrofåterställning**,
när någon bygger upp allt från noll under tidspress — därför står det
här, i första kommandot, i stället för i ett felsökningsavsnitt.

`terraform output karta` svarar på frågorna "vad kör var", "vem ser
vilken hemlighet", "vad pratar med vad" och "vad ingår inte" — utan att
någon behöver läsa .tf-filerna.

## Kontroll utan kluster

```sh
terraform fmt -check -diff        # formatering
terraform init -backend=false     # hämtar leverantörer
terraform validate                # typer och referenser
```

`terraform validate` kräver att leverantörerna hämtats från
registry.terraform.io.

## Var saker ligger

Det här lagret bestämmer nästan ingenting själv. AWS-basen
(`infra/aws`) äger klustret, databasen, registret, hinken,
rollerna, domänen och hemligheterna — och `05-aws.tf` läser dess utdata.
Ändras något där slår det igenom här utan att en rad ändras.

| Vad | Var |
| --- | --- |
| Händelseloggen | Aurora PostgreSQL utanför klustret, med PITR |
| Bilagor | S3, signerat med tjänstekontots roll — inga nycklar finns |
| Hemligheter | Secrets Manager, speglade av External Secrets var timme |
| Bilder | ECR med oföränderliga taggar |
| Trafik in | ALB med ACM-certifikat |
| Git och bygge | Gitea med egna runners i samma kluster |

Terraform ser aldrig en hemlighets värde. Det är avsiktligt: en
hemlighet som passerar Terraform hamnar i tillståndsfilen.

## Driftsättning

Bilderna byggs av `publicera.yml` vid varje push till main och taggas med
git-SHA:t. Driftsättningen är ett eget flöde, `driftsatt.yml`, som
startas för hand med en tagg och kör mot GitHub-miljön `produktion` — den
kan kräva godkännande. Rollback är att köra flödet igen med en tidigare
tagg.

Kustomize- och Argo CD-vägen är borttagen. Den beskrev samma system en
gång till och kunde inte köras samtidigt som Terraform utan att de
motarbetade varandra (`selfHeal` återställde det Terraform ändrade,
`prune` tog bort det Terraform skapade).

## Det som medvetet inte ingår

Står också i `terraform output karta` under `avgränsningar`:

- **Objektlagring.** Foton och video ligger som data-URL:er i
  händelseloggen. Det gör loggen till systemets enda sanningskälla, men
  också stor och tung att säkerhetskopiera.
- **Observability.** Ingen metrikexport, ingen tracing.
- **Takt-begränsning på inloggning.** Bara den publika beslutsvägen är
  begränsad, och bara per pod.
- **Återkallelse av JWT.** En utfärdad token gäller sina 12 timmar ut
  även om användaren tagits bort.

## Krav på klustret

- En CNI som tillämpar NetworkPolicy (Cilium, Calico, Antrea). Utan det
  är `70-natverk.tf` dokumentation, inte skydd.
- ingress-nginx, med kontrollern i namnrymden `var.ingress_namnrymd`.
- cert-manager med en ClusterIssuer.
- En metrics-server för autoskalningen.
- En StorageClass som klarar `ReadWriteOnce`.
