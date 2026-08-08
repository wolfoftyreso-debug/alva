# Paket 04 · Arbetslasten

Detta paket innehåller `infra/terraform`: tjänsterna i klustret,
ingress med ALB och ACM-certifikat, DNS, nätverkspolicyer, External
Secrets och den självhostade git-tjänsten. Läs `karta.tf` först — den
beskriver hela systemet som data, och resten av filerna läser därifrån.

Kräver att paket 01 är klart (basen ger utdata som `05-aws.tf` läser)
och att paket 02 och 03 är klara (bilderna finns i registret — en
apply mot tomma repon ger `ImagePullBackOff`).

## Steg

```sh
cd infra/terraform
cp terraform.tfvars.exempel terraform.tfvars
# Fyll i: domän, register, bildtagg = taggen ur paket 02/03, repliker.
# INGA hemligheter i filen — de bor i Secrets Manager och speglas av
# External Secrets; Terraform ser aldrig ett värde.

terraform init
terraform validate
terraform plan -out plan.ut     # granska innan apply
terraform apply plan.ut
terraform output karta          # vad kör var, vem ser vilken hemlighet — bifoga i rapporten
```

## Verifiering

```sh
kubectl get pods -A                              # alla Running/Completed, inga omstartsloopar
kubectl get pods -n <namnrymd> -o wide           # web, plattform, ai-orkester uppe i angivet antal repliker
kubectl get ingress -n <namnrymd>                # ALB-adress tilldelad
aws acm list-certificates \
  --query 'CertificateSummaryList[].{d:DomainName,s:Status}'   # ISSUED för domänen

# Hälsokontrollerna genom hela kedjan (DNS → ALB → tjänst):
curl -fsS https://<plattformens adress>/halsa
curl -fsS https://<orkesterns adress>/halsa
curl -fsS https://<webbadressen>/ | grep -q "<div id=\"root\""
```

DNS-propagering kan ta några minuter efter apply — skilj på "inte än"
(avvakta, försök igen) och "fel" (ändra ingenting, rapportera).

## Rollback

Kör om med föregående `bildtagg` i `terraform.tfvars` och `apply`
igen. Taggarna är oföränderliga, så en tidigare tagg är exakt det
bygge den alltid varit.

## Stoppvillkor

Poddar i `ImagePullBackOff`: fel tagg eller paket 02/03 inte klara —
tillbaka dit, inte vidare. `CrashLoopBackOff` i plattformen: läs
`kubectl logs`; saknade hemligheter betyder att paket 01 punkt 1 inte
utfördes. Verifieringen ska vara grön i sin helhet innan paket 05.
