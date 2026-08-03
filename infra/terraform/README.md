# Infrastrukturen

Hela systemet i Terraform. Filerna är numrerade i den ordning de är
begripliga att läsa:

| Fil | Vad |
| --- | --- |
| `versions.tf` | Leverantörer och tillståndsbackend |
| `variables.tf` | Allt som skiljer en installation från en annan |
| `karta.tf` | **Systemet som data** — tjänster, portar, routing, hemligheter, dataflöden, gränser |
| `10-namnrymd.tf` | Namnrymd, hemligheten, databasschemat |
| `20-databas.tf` | Postgres — händelseloggen |
| `30-plattform.tf` | Backend: auth, händelse-API, delning, integrationer |
| `40-orkester.tf` | AI-orkestern |
| `50-web.tf` | Klienten |
| `60-ingress.tf` | Trafiken utifrån |
| `70-natverk.tf` | Nätverkspolicyer — vem får prata med vem |
| `outputs.tf` | Kartan utskriven |

Börja i `karta.tf`. Den beskriver systemet en gång, som data; resten av
filerna läser därifrån i stället för att upprepa portar och namn.

## Kom igång

```sh
cp terraform.tfvars.exempel terraform.tfvars   # fyll i domän, register, nycklar
terraform init
terraform plan
terraform apply
terraform output karta                         # hela systemet i klartext
```

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

## Förhållandet till kustomize och Argo CD

`infra/k8s` + `infra/overlays` + `infra/gitops` beskriver **samma system**
i kustomize, synkat av Argo CD. Det är en historisk parallell väg.

**Välj en.** Kör båda mot samma kluster och de motarbetar varandra: Argo
CD:s `selfHeal` återställer det Terraform just ändrat, och `prune` tar
bort det Terraform skapat.

Rekommendationen är Terraform, av tre skäl:

1. Nätverkspolicyer, genererade hemligheter och (senare) molnresurser
   som databas, DNS och objektlagring hör hemma här.
2. Kartan blir läsbar — `karta.tf` och `terraform output` finns inte i
   kustomize-varianten.
3. Kustomize-vägen saknar i dag nätverkspolicyer och kör Postgres utan
   säkerhetskontext.

Byter ni: ta bort Argo CD-applikationen (`kubectl -n argocd delete
application guidad-felsokning`) **innan** första `terraform apply`, och
importera befintliga resurser med `terraform import` om ni vill undvika
omstart. Behåller ni Argo CD i stället: applicera nätverkspolicyerna och
ingressens kroppsgräns därifrån också.

Bildtaggen kommer från publiceringsflödet oavsett väg — kör
`terraform apply -var bildtagg=<git-sha>` i stället för att låta CI
skriva i git.

## Det som medvetet inte ingår

Står också i `terraform output karta` under `avgränsningar`:

- **Säkerhetskopiering.** En StatefulSet med en PVC är inte backup. Sätt
  CloudNativePG (basbackup, WAL-arkivering, PITR, failover) innan skarp
  drift och peka `DATABASE_URL` på dess tjänst.
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
