# AWS-basen

Allt Guidad Felsökning behöver, i eget AWS-konto. Inget GitHub, inget
GHCR, ingen extern byggtjänst.

| Fil | Vad |
| --- | --- |
| `versions.tf` | Leverantörer och tillståndsbackend |
| `variables.tf` | Allt som skiljer en installation från en annan |
| `10-natverk.tf` | VPC, tre subnätlager, NAT, VPC-endpoints, flödesloggar |
| `20-eks.tf` | Klustret, noderna, IRSA, tillägg |
| `30-data.tf` | KMS, Aurora PostgreSQL, S3 för bilagor, ECR |
| `40-hemligheter.tf` | Secrets Manager och rollerna som får läsa dem |
| `50-doman-observation.tf` | Route 53, ACM, CloudWatch, larm |
| `outputs.tf` | Kartan i klartext + värdena arbetslastlagret behöver |

## Två lager, i ordning

```sh
cd infra/aws
terraform init && terraform apply        # basen
terraform output karta                   # hela AWS-sidan i klartext

cd ../terraform
terraform init && terraform apply        # arbetslasten i klustret
```

Anledningen till uppdelningen är inte smak. En enda apply som både
skapar ett EKS-kluster och schemalägger in i det är en känd fälla:
kubernetes-leverantören måste konfigureras med uppgifter som inte finns
förrän klustret är skapat, och planen blir därför opålitlig.

## Vad som gör det till "efter bästa praxis"

**Nätet i tre lager.** Publikt bara för lastbalanserare och NAT, privat
för noderna, och ett eget datalager för Aurora *utan routing ut alls*.
Att databasen inte kan nå internet är ett skydd som inte hänger på att
en säkerhetsgrupp är rätt konfigurerad.

**VPC-endpoints** för S3, ECR, loggar, Secrets Manager, STS och ELB.
Bilddragningar och loggar lämnar aldrig nätet — och NAT-notan sjunker
rejält, eftersom bilddragningar annars dominerar den.

**IRSA i stället för nodroller.** Plattformens tjänstekonto har en egen
roll bunden till exakt en namnrymd och ett tjänstekonto. Grannpodden på
samma nod får ingenting på köpet. `IMDSv2` obligatoriskt med hoppgräns 1
gör dessutom att en pod inte kan låna nodens roll via metadatatjänsten.

**Delade rättigheter mellan bygge och drift.** Byggrollen får publicera
till ECR men inte röra klustret. Driftrollen får röra klustret men inte
publicera bilder. Ett komprometterat bygge kan därför inte driftsätta.

**Egna KMS-nycklar**, tre stycken: en för hemligheter i etcd, en för
databas och bilagor, en för loggar. Åtkomstkontroll och revisionsspår per
nyckel, och möjligheten att rotera en utan att röra de andra.

**Oföränderliga ECR-taggar.** En tagg som pekat på ett bygge kan inte
peka på ett annat, så "vilken kod kör i produktion" har ett entydigt
svar.

**Ingen DeleteObject** för bilagorna. De hör till en append-only
händelselogg, och tjänsten har ingen anledning att kunna radera dem.

**Flödesloggar bara för avvisad trafik.** Allt hade blivit dyrt brus;
avvisningarna är det som säger något när en spärr slår till — eller
borde ha gjort det.

**Larm som betyder något.** Fyra stycken, varav ett larmar på *saknad*
data: uteblir mätvärdet för säkerhetskopiering finns ingen backup, och
en backup man tror finns är värre än ingen.

## Efter första apply

`terraform output karta` listar det under `kvar_att_gora`:

1. **Claude-nyckeln.** Terraform ska inte känna den.
   ```sh
   aws secretsmanager put-secret-value \
     --secret-id felsokning-produktion/app \
     --secret-string "$(aws secretsmanager get-secret-value --secret-id felsokning-produktion/app \
        --query SecretString --output text | jq '.anthropic_api_key = "sk-ant-…"')"
   ```
2. **Schemat.** Kör `infra/postgres-init.sql` mot Aurora — det
   är den som lägger in append-only-triggarna. Samma fil som
   integrationstestet kör, så de kan inte glida isär.
3. **Begränsa `tillatna_api_cidr`.** Standard är öppet mot internet
   eftersom klustret annars inte går att nå från en ny miljö. Snäva in
   till kontorets och runnernas adresser.
4. **Sätt `larm_epost`.** Utan den går larmen ingenstans.

## Kostnad — det som faktiskt kostar

NAT-gateways (en per zon), Auroras minsta kapacitet och EKS
kontrollplan är golvet och löper oavsett last. `nat_per_zon = false`
halverar nätkostnaden i test men gör en zon till enskild felkälla för
all utgående trafik — fel avvägning i produktion.

## Verifiering

`terraform validate` kunde inte köras i utvecklingsmiljön —
registry.terraform.io är blockerad av sessionens egress-policy, så
leverantörerna gick inte att hämta. Det som kontrollerats är
`terraform fmt` och en statisk referenskontroll (88 resurser, 5
datakällor, inga dinglande referenser, alla `count`-resurser indexerade).
Kör `terraform init -backend=false && terraform validate` innan första
apply.
