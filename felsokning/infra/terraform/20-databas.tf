# Händelseloggen — systemets enda sanningskälla.
#
# Append-only garanteras av triggers i schemat, inte av att API:t låter
# bli att skriva. Det gör historiken oantastlig även för den som har
# databasåtkomst med rätt roll.
#
# Tre lägen, valda med var.databas_lage. Skillnaden mellan dem är
# säkerhetskopiering, och det är därför variabeln saknar standardvärde:
#
#   extern    managerad Postgres — leverantören sköter backup och PITR
#   cnpg      CloudNativePG — basbackup + WAL-arkivering + failover
#   inbyggd   en volym, ingen backup — prov och demo
#
# Går loggen förlorad är det inte "data" som försvinner utan varje
# ärendes bevisvärde: vad som kontrollerades, av vem, när, med vilken
# evidens. Det går inte att återskapa i efterhand.

locals {
  inbyggd_databas = var.databas_lage == "inbyggd"
  cnpg_databas    = var.databas_lage == "cnpg"
  extern_databas  = var.databas_lage == "extern"

  # Vart plattformstjänsten ansluter. CloudNativePG skapar en tjänst som
  # alltid pekar på den skrivbara instansen (-rw), så en failover kräver
  # ingen ändring här.
  databas_anslutning = (
    local.extern_databas
    ? var.databas_url
    : local.cnpg_databas
    ? "postgresql://plattform:$(POSTGRES_LOSENORD)@felsokning-db-rw:5432/felsokning"
    : "postgresql://plattform:$(POSTGRES_LOSENORD)@postgres:5432/felsokning"
  )
}

# Fångar felkonfiguration vid plan i stället för vid drift.
resource "terraform_data" "databaskontroll" {
  lifecycle {
    precondition {
      condition     = !local.extern_databas || var.databas_url != ""
      error_message = "databas_lage = \"extern\" kräver databas_url."
    }

    precondition {
      condition     = !local.cnpg_databas || var.backup.mal != ""
      error_message = "databas_lage = \"cnpg\" kräver backup.mal — poängen med läget är säkerhetskopieringen."
    }

    precondition {
      condition     = !local.cnpg_databas || (var.backup_nyckel_id != "" && var.backup_nyckel != "")
      error_message = "databas_lage = \"cnpg\" kräver backup_nyckel_id och backup_nyckel."
    }

    precondition {
      condition     = var.bilage_lage != "s3" || (var.s3.endpoint != "" && var.s3.hink != "" && var.s3.region != "" && var.s3_nyckel_id != "" && var.s3_nyckel != "")
      error_message = "bilage_lage = \"s3\" kräver s3.endpoint, s3.hink, s3.region, s3_nyckel_id och s3_nyckel."
    }

    precondition {
      condition     = !local.inbyggd_databas || var.miljo != "produktion"
      error_message = "databas_lage = \"inbyggd\" saknar säkerhetskopiering och kan inte användas med miljo = \"produktion\". Välj \"extern\" eller \"cnpg\"."
    }
  }
}

# ---- Läge: cnpg ---------------------------------------------------------
#
# Kräver att CloudNativePG-operatorn redan är installerad i klustret —
# Terraform slår upp dess CRD vid plan. Installera först:
#   kubectl apply --server-side -f \
#     https://raw.githubusercontent.com/cloudnative-pg/cloudnative-pg/release-1.25/releases/cnpg-1.25.0.yaml

resource "kubernetes_secret_v1" "backup" {
  count = local.cnpg_databas ? 1 : 0

  metadata {
    name      = "felsokning-backup"
    namespace = kubernetes_namespace_v1.denna.metadata[0].name
    labels    = local.etiketter
  }

  type = "Opaque"

  data = {
    ACCESS_KEY_ID     = var.backup_nyckel_id
    ACCESS_SECRET_KEY = var.backup_nyckel
  }
}

# Rollen och schemat skapas av operatorn vid initiering. Samma
# schemafil som integrationstestet kör, så de kan inte glida isär.
resource "kubernetes_secret_v1" "databas_konto" {
  count = local.cnpg_databas ? 1 : 0

  metadata {
    name      = "felsokning-db-konto"
    namespace = kubernetes_namespace_v1.denna.metadata[0].name
    labels    = local.etiketter
  }

  type = "kubernetes.io/basic-auth"

  data = {
    username = "plattform"
    password = local.hemligheter["postgres-losenord"]
  }
}

resource "kubernetes_manifest" "databas" {
  count = local.cnpg_databas ? 1 : 0

  manifest = {
    apiVersion = "postgresql.cnpg.io/v1"
    kind       = "Cluster"

    metadata = {
      name      = "felsokning-db"
      namespace = kubernetes_namespace_v1.denna.metadata[0].name
      labels    = local.etiketter
    }

    spec = {
      instances = var.databas_instanser
      imageName = "ghcr.io/cloudnative-pg/postgresql:17.2"

      storage = merge(
        { size = var.databas_storlek },
        var.lagringsklass != "" ? { storageClass = var.lagringsklass } : {},
      )

      bootstrap = {
        initdb = {
          database = "felsokning"
          owner    = "plattform"
          secret   = { name = kubernetes_secret_v1.databas_konto[0].metadata[0].name }

          # Schemat körs som HEL fil, inte som uppdelade satser: det
          # innehåller en plpgsql-funktion vars kropp har egna semikolon
          # ($$ ... end $$), och en naiv uppdelning skulle klippa itu den.
          postInitApplicationSQLRefs = {
            configMapRefs = [{
              name = kubernetes_config_map_v1.postgres_init[0].metadata[0].name
              key  = "init.sql"
            }]
          }
        }
      }

      # Basbackup varje natt plus kontinuerlig WAL-arkivering. Det är
      # WAL-arkivet som ger PITR — utan det är en nattlig kopia bara en
      # nattlig kopia.
      backup = {
        barmanObjectStore = merge(
          var.backup.endpoint != "" ? { endpointURL = var.backup.endpoint } : {},
          {
            destinationPath = var.backup.mal

            s3Credentials = {
              accessKeyId = {
                name = kubernetes_secret_v1.backup[0].metadata[0].name
                key  = "ACCESS_KEY_ID"
              }
              secretAccessKey = {
                name = kubernetes_secret_v1.backup[0].metadata[0].name
                key  = "ACCESS_SECRET_KEY"
              }
            }

            wal  = { compression = "gzip" }
            data = { compression = "gzip" }
          },
        )

        retentionPolicy = "${var.backup.behall_dagar}d"
      }

      resources = {
        requests = { cpu = "250m", memory = "512Mi" }
        limits   = { cpu = "2", memory = "2Gi" }
      }

      # Sprid instanserna så att en nod som försvinner inte tar hela
      # klustret med sig.
      affinity = { enablePodAntiAffinity = true, topologyKey = "kubernetes.io/hostname" }
    }
  }
}

resource "kubernetes_manifest" "backup_schema" {
  count = local.cnpg_databas ? 1 : 0

  manifest = {
    apiVersion = "postgresql.cnpg.io/v1"
    kind       = "ScheduledBackup"

    metadata = {
      name      = "felsokning-db-natt"
      namespace = kubernetes_namespace_v1.denna.metadata[0].name
      labels    = local.etiketter
    }

    spec = {
      # Sekund-fältet först (CNPG använder sex fält): 02:30 varje natt.
      schedule             = "0 30 2 * * *"
      backupOwnerReference = "self"
      cluster              = { name = "felsokning-db" }
    }
  }

  depends_on = [kubernetes_manifest.databas]
}

# ---- Läge: inbyggd ------------------------------------------------------
#
# En StatefulSet med en volym. Ingen säkerhetskopiering, ingen failover.
# Precondition ovan stoppar läget i produktionsmiljö.

resource "kubernetes_stateful_set_v1" "postgres" {
  count = local.inbyggd_databas ? 1 : 0

  metadata {
    name      = "postgres"
    namespace = kubernetes_namespace_v1.denna.metadata[0].name
    labels    = merge(local.etiketter, { app = "postgres" })
  }

  spec {
    service_name = "postgres"
    replicas     = 1

    selector {
      match_labels = { app = "postgres" }
    }

    template {
      metadata {
        labels = merge(local.etiketter, { app = "postgres" })
      }

      spec {
        automount_service_account_token = false

        security_context {
          run_as_non_root = true
          run_as_user     = 70 # postgres i alpine-bilden
          fs_group        = 70

          seccomp_profile {
            type = "RuntimeDefault"
          }
        }

        container {
          name  = "postgres"
          image = local.tjanster.postgres.bild

          port {
            container_port = 5432
          }

          env {
            name  = "POSTGRES_DB"
            value = "felsokning"
          }

          env {
            name  = "POSTGRES_USER"
            value = "plattform"
          }

          env {
            name = "POSTGRES_PASSWORD"

            value_from {
              secret_key_ref {
                name = kubernetes_secret_v1.hemligheter.metadata[0].name
                key  = "postgres-losenord"
              }
            }
          }

          env {
            name  = "PGDATA"
            value = "/var/lib/postgresql/data/pgdata"
          }

          volume_mount {
            name       = "data"
            mount_path = "/var/lib/postgresql/data"
          }

          volume_mount {
            name       = "init"
            mount_path = "/docker-entrypoint-initdb.d"
          }

          resources {
            requests = { cpu = "250m", memory = "512Mi" }
            limits   = { cpu = "2", memory = "2Gi" }
          }

          readiness_probe {
            exec {
              command = ["pg_isready", "-U", "plattform", "-d", "felsokning"]
            }

            initial_delay_seconds = 5
            period_seconds        = 10
          }

          # Startprob i stället för liveness under uppstart: en stor
          # återställning får ta tid utan att poden dödas i loop.
          startup_probe {
            exec {
              command = ["pg_isready", "-U", "plattform", "-d", "felsokning"]
            }

            period_seconds    = 10
            failure_threshold = 30
          }

          security_context {
            allow_privilege_escalation = false

            capabilities {
              drop = ["ALL"]
            }
          }
        }

        volume {
          name = "init"

          config_map {
            name = kubernetes_config_map_v1.postgres_init[0].metadata[0].name
          }
        }
      }
    }

    volume_claim_template {
      metadata {
        name = "data"
      }

      spec {
        access_modes       = ["ReadWriteOnce"]
        storage_class_name = var.lagringsklass != "" ? var.lagringsklass : null

        resources {
          requests = { storage = var.databas_storlek }
        }
      }
    }
  }
}

resource "kubernetes_service_v1" "postgres" {
  count = local.inbyggd_databas ? 1 : 0

  metadata {
    name      = "postgres"
    namespace = kubernetes_namespace_v1.denna.metadata[0].name
    labels    = merge(local.etiketter, { app = "postgres" })
  }

  spec {
    selector = { app = "postgres" }

    port {
      port        = 5432
      target_port = 5432
    }
  }
}
