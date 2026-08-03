# Kartan utskriven.
#
#   terraform output karta        hela systemet i klartext
#   terraform output -json karta  samma sak maskinläsbart

output "karta" {
  description = "Hela systemet: tjänster, routing, hemligheter, dataflöden och gränser."

  value = {
    miljo    = var.miljo
    domän    = "https://${var.doman}"
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
      for r in local.routing : "https://${var.doman}${r.prefix}  →  ${r.till}   (${r.varfor})"
    ]

    dataflöden = local.dataflode
    gränser    = local.granser

    databas = {
      läge     = var.databas_lage
      motor    = "PostgreSQL 17"
      säkerhet = "append-only via triggers — historik kan inte ändras eller raderas av någon roll"

      backup = (
        var.databas_lage == "extern"
        ? "Leverantörens — verifiera att PITR faktiskt är påslaget."
        : var.databas_lage == "cnpg"
        ? "Basbackup 02:30 + kontinuerlig WAL-arkivering till ${var.backup.mal}, ${var.backup.behall_dagar} dagars retention. PITR möjlig."
        : "INGEN. Går volymen förlorad är händelseloggen borta."
      )

      volym = var.databas_lage == "extern" ? "(leverantörens)" : var.databas_storlek
      instanser = (
        var.databas_lage == "cnpg"
        ? "${var.databas_instanser} (failover)"
        : var.databas_lage == "extern" ? "(leverantörens)" : "1 (ingen failover)"
      )
    }

    drift = {
      registrering_öppen       = var.registrering_oppen
      interna_uppslag_tillåtna = var.tillat_interna_uppslag
      max_kropp                = "${var.max_kropp_mb} MB (ingress) / 4 MB (tjänst)"
      cors                     = "https://${var.doman}"
    }

    avgränsningar = local.avgransningar
  }
}

output "endpoints" {
  description = "Adresser att kontrollera efter driftsättning."

  value = {
    klient       = "https://${var.doman}/felsokning"
    hälsa        = "https://${var.doman}/halsa"
    api_spec     = "https://${var.doman}/api/openapi.yaml"
    ai           = "https://${var.doman}/api/ai"
    delningslänk = "https://${var.doman}/felsokning/delad/<kod>"
  }
}

output "genererade_hemligheter" {
  description = "Hemligheter Terraform genererat (tomma om ni satt egna). Finns i tillståndet — skydda det."
  sensitive   = true

  value = {
    jwt_hemlighet      = var.jwt_hemlighet == "" ? random_password.jwt.result : "(egen)"
    postgres_losenord  = var.postgres_losenord == "" ? random_password.postgres.result : "(egen)"
    integration_nyckel = var.integration_nyckel == "" ? random_id.integration_nyckel.hex : "(egen)"
  }
}
