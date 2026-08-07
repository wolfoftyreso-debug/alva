# Paket 05 · Slutkontroll

Detta paket innehåller dokumentationen (`docs/`) och den samlade
slutkontrollen. Grundhållningen är plattformens egen: ett steg utan
verifiering är inte utfört, och en driftsättning som inte kan granskas
i efterhand är inte klar.

Kräver att paket 01–04 rapporterats klara. Läsbehörighet räcker —
detta steg ändrar ingenting.

## Kontrollerna

**1. Kartan stämmer med verkligheten.**
```sh
cd infra/terraform && terraform output karta
kubectl get pods -n <namnrymd> -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.containers[0].image}{"\n"}{end}'
```
Varje pod kör exakt den bild och tagg som paket 02/03 rapporterade —
jämför digest, inte bara tagg.

**2. Kedjan utifrån.**
```sh
curl -fsS https://<plattformens adress>/halsa
curl -fsS https://<orkesterns adress>/halsa
curl -fsS https://<webbadressen>/ | grep -q "<div id=\"root\""
curl -fsSI https://<webbadressen>/ | grep -i strict-transport-security
```

**3. Grinden spärrar på servern.** Skapa ett provärende via API:t och
begär avslut utan uppfyllda krav — svaret ska vara hindren, inte ett
förseglat ärende. (Flödet i detalj: `docs/OPERATIONS.md`.)

**4. Säkerhetskopiering och återställning.**
```sh
aws rds describe-db-clusters --query 'DBClusters[].{id:DBClusterIdentifier,pitr:EarliestRestorableTime}'
```
PITR-fönstret finns. Larmet för utebliven backupmätpunkt är aktivt i
CloudWatch — det larmar på SAKNAD data, kontrollera att det inte redan
larmar.

**5. Larmen är beväpnade.** Fyra larm i CloudWatch, ingen i `ALARM`,
och SNS-prenumerationen på `larm_epost` är bekräftad, inte
`PendingConfirmation`.

**6. Hemligheterna ligger rätt.** `terraform.tfvars` i paket 04
innehåller inga nyckelvärden; `kubectl get secret -n <namnrymd>` visar
speglade hemligheter från External Secrets, inte handlagda.

## Rapporten

Slutrapporten listar varje kontroll med utfall och belägg (kommandot
och dess svar), bildtagg + digest per tjänst, och det som medvetet
lämnats: obekräftade prenumerationer, öppna CIDR, uppskjutna punkter
ur paket 01. En avvikelse gör inte rapporten misslyckad — en
orapporterad avvikelse gör det.

Driftdokumentationen som gäller därefter: `docs/OPERATIONS.md`
(drift), `docs/ALVA-SYSTEMBESKRIVNING.md` (systemet),
`docs/GARANTISTANDARD-FGS.md` (garantiflödet).
