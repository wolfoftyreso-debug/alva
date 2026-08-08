# Kartan utskriven.
#
#   terraform output karta        hela systemet i klartext
#   terraform output -json karta  samma sak maskinläsbart

output "karta" {
  description = "Hela systemet: tjänster, routing, hemligheter, dataflöden och gränser."

  value = {
    miljo    = var.miljo
    domän    = "https://${local.aws.doman}"
    namnrymd = var.namnrymd
    bildtagg = var.bildtagg

    tjanster = {
      for namn, t in local.tjanster : namn => {
        gör           = t.roll
        bild          = t.bild
        ser_hemlighet = length(t.hemligt) > 0 ? join(", ", t.hemligt) : "inga"
        ringer        = length(t.utat) > 0 ? join("; ", t.utat) : "ingenting"
      }
    }

    routing = [
      for r in local.routing : "https://${local.aws.doman}${r.prefix}  →  ${r.till}   (${r.varfor})"
    ]

    dataflöden = local.dataflode
    gränser    = local.granser

    databas = {
      motor    = "Aurora PostgreSQL Serverless v2 — utanför klustret, se AWS-basen"
      säkerhet = "append-only via triggers; ingen roll kan ändra eller radera en händelse"
      backup   = "Auroras automatiska säkerhetskopiering med PITR"
      atkomst  = "endast från klustrets noder, i ett subnätlager utan routing ut"
    }

    bilagor = local.bilagor

    drift = {
      registrering_öppen       = var.registrering_oppen
      interna_uppslag_tillåtna = var.tillat_interna_uppslag
      max_kropp                = "${var.max_kropp_mb} MB (lastbalanserare) / 32 MB (bilaga) / 4 MB (händelse)"
      cors                     = "https://${local.aws.doman}"
      hemligheter              = "AWS Secrets Manager, speglade av External Secrets"
    }

    avgränsningar = local.avgransningar
  }
}

output "endpoints" {
  description = "Adresser att kontrollera efter driftsättning."

  value = {
    klient       = "https://${local.aws.doman}/felsokning"
    hälsa        = "https://${local.aws.doman}/halsa"
    api_spec     = "https://${local.aws.doman}/api/openapi.yaml"
    ai           = "https://${local.aws.doman}/api/ai"
    delningslänk = "https://${local.aws.doman}/felsokning/delad/<kod>"
    git          = var.gitea.aktiv && var.gitea.doman != "" ? "https://${var.gitea.doman}" : "(gitea av)"
  }
}

