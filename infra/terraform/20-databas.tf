# Postgres — händelseloggen.
#
# Append-only garanteras av triggers i schemat, inte av att API:t låter
# bli att skriva. Det gör historiken oantastlig även för den som har
# databasåtkomst med rätt roll.
#
# En StatefulSet med en PVC är INTE säkerhetskopiering. Innan skarp drift:
# byt mot CloudNativePG-operatorn (basbackup + WAL-arkivering + PITR +
# failover) och peka plattformens DATABASE_URL på dess tjänst.

resource "kubernetes_stateful_set_v1" "postgres" {
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
            name = kubernetes_config_map_v1.postgres_init.metadata[0].name
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
