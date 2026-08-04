# Infrastrukturen

Hela systemet i Terraform. Filerna är numrerade i den ordning de är
begripliga att läsa:

| Fil | Vad |
| --- | --- |
| `versions.tf` | Leverantörer och tillståndsbackend |
| `variables.tf` | Allt som skiljer en installation från en annan |
| `karta.tf` | **Systemet som data** — tjänster, portar, routing, hemligheter, dataflöden, gränser |
| `10-namnrymd.tf` | Namnrymd, hemligheten, databasschemat |
| `20-databas.tf` | Händelseloggen — tre lägen, se nedan |
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

## Databasen: tre lägen

`var.databas_lage` saknar standardvärde med flit. Valet avgör om det
finns säkerhetskopiering, och det ska inte kunna bli fel av slentrian.

| Läge | Backup | Failover | Använd när |
| --- | --- | --- | --- |
| `extern` | Leverantörens, med PITR | Leverantörens | **Produktion.** Cloud SQL, RDS, Neon, Azure Flexible Server |
| `cnpg` | Basbackup 02:30 + WAL-arkiv → objektlagring, PITR | Ja, `databas_instanser` styr | Produktion när databasen måste ligga i klustret |
| `inbyggd` | **Ingen** | Nej | Prov och demo. Blockeras av en precondition när `miljo = "produktion"` |

Går händelseloggen förlorad är det inte "data" som försvinner utan varje
ärendes bevisvärde: vad som kontrollerades, av vem, när, med vilken
evidens. Det går inte att återskapa i efterhand.

`cnpg` kräver att CloudNativePG-operatorn redan är installerad —
Terraform slår upp dess CRD vid plan:

```sh
kubectl apply --server-side -f \
  https://raw.githubusercontent.com/cloudnative-pg/cloudnative-pg/release-1.25/releases/cnpg-1.25.0.yaml
```

I `extern` läge ansvarar ni själva för att köra
`infra/postgres-init.sql` mot databasen. Det är samma fil som
integrationstestet kör, så schemat kan inte glida isär från det som
testas.

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
