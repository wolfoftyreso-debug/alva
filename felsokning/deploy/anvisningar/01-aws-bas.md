# Paket 01 · AWS-basen

Detta paket lägger grunden: nätverk i tre lager, EKS-klustret, Aurora
PostgreSQL, S3 för bilagor, ECR, KMS-nycklar, Secrets Manager, Route 53
och larm. Allt efterföljande läser den här basens utdata.

## Förutsättningar

AWS-behörighet i målkontot, Terraform enligt `infra/aws/versions.tf`.
Läs `infra/aws/README.md` — den förklarar varje val; denna anvisning
är utförandeordningen.

## Steg

```sh
cd infra/aws
terraform init
terraform validate
terraform plan -out plan.ut     # granska: inga destruktiva ändringar väntas i en ny miljö
terraform apply plan.ut
terraform output karta          # hela basen i klartext — bifoga i rapporten
```

Variabler som ska sättas medvetet (via `-var` eller en tfvars-fil som
INTE innehåller hemligheter): `doman`, `zon_id`, `larm_epost`, och
`tillatna_api_cidr` snävat till de adresser som ska nå API-servern.
Standardvärdet är öppet enbart för att en ny miljö ska gå att nå alls.

## Efter apply — fyra saker Terraform inte gör

1. **Claude-nyckeln** in i Secrets Manager (Terraform ska inte känna
   den):
   ```sh
   aws secretsmanager put-secret-value \
     --secret-id felsokning-produktion/app \
     --secret-string "$(aws secretsmanager get-secret-value --secret-id felsokning-produktion/app \
        --query SecretString --output text | jq '.anthropic_api_key = "sk-ant-…"')"
   ```
2. **Databasschemat.** Aurora ligger i ett datalager utan routing ut;
   kör `infra/postgres-init.sql` inifrån klustret:
   ```sh
   aws eks update-kubeconfig --name <klusternamn ur karta>
   kubectl run psql --rm -i --image=postgres:16 --restart=Never -- \
     psql "<databas_url ur terraform output databas_url>" < ../postgres-init.sql
   ```
   Det är samma fil som integrationstestet kör — de kan inte glida isär.
3. **Verifiera att `tillatna_api_cidr` är snävat** om det inte gjordes
   före apply.
4. **Bekräfta larmprenumerationen** — SNS skickar ett
   bekräftelsemejl till `larm_epost`; utan klick går larmen ingenstans.

## Verifiering — allt ska vara sant innan steget rapporteras klart

```sh
terraform output karta                        # kvar_att_gora ska vara tomt utom det som uttryckligen skjutits upp
kubectl get nodes                             # samtliga Ready
aws ecr describe-repositories \
  --query 'repositories[].repositoryName'     # tre repon: web, plattform, ai-orkester
kubectl run schema --rm -i --image=postgres:16 --restart=Never -- \
  psql "<databas_url>" -c "\dt"               # tabellerna ur postgres-init.sql finns
```

Rapportera `terraform output karta` ordagrant, registeradressen och
klusternamnet — steg 02–04 behöver dem.

## Stoppvillkor

Faller `terraform apply`, kör inte om i blindo: läs felet, åtgärda
orsaken, kör `plan` igen och granska. Ett kluster utan Ready-noder
eller ett `kvar_att_gora` med oförklarade punkter betyder stopp, inte
vidare till paket 02.
