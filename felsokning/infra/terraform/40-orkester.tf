# AI-orkestern.
#
# Egen tjänst av två skäl: Claude-nyckeln ska bara finnas på ett ställe,
# och AI-anrop har helt annan latens- och skalningsprofil än
# händelse-API:t. Den skalar därför separat och kan gå ned utan att
# felsökningen slutar fungera — metodiken är deterministisk och klarar
# sig utan modellsvar.
#
# Orkestern äger modellval, systemprompt och svarsschema. Klienten
# skickar bara uppgiftstyp och underlag. Den verifierar plattformens JWT
# med samma delade hemlighet — den litar aldrig på anroparen.

resource "kubernetes_deployment_v1" "orkester" {
  metadata {
    name      = "ai-orkester"
    namespace = kubernetes_namespace_v1.denna.metadata[0].name
    labels    = merge(local.etiketter, { app = "ai-orkester" })
  }

  spec {
    replicas = var.repliker.orkester

    selector {
      match_labels = { app = "ai-orkester" }
    }

    template {
      metadata {
        labels = merge(local.etiketter, { app = "ai-orkester" })
      }

      spec {
        automount_service_account_token = false

        security_context {
          run_as_non_root = true

          seccomp_profile {
            type = "RuntimeDefault"
          }
        }

        container {
          name  = "ai-orkester"
          image = local.tjanster.orkester.bild

          port {
            container_port = local.port_container
          }

          env {
            name = "ANTHROPIC_API_KEY"

            value_from {
              secret_key_ref {
                name = kubernetes_secret_v1.hemligheter.metadata[0].name
                key  = "anthropic-api-key"
              }
            }
          }

          env {
            name = "JWT_SECRET"

            value_from {
              secret_key_ref {
                name = kubernetes_secret_v1.hemligheter.metadata[0].name
                key  = "jwt-secret"
              }
            }
          }

          resources {
            requests = { cpu = "100m", memory = "128Mi" }
            limits   = { cpu = "1", memory = "512Mi" }
          }

          readiness_probe {
            http_get {
              path = "/halsa"
              port = local.port_container
            }

            initial_delay_seconds = 3
            period_seconds        = 10
          }

          liveness_probe {
            http_get {
              path = "/halsa"
              port = local.port_container
            }

            period_seconds = 15
          }

          security_context {
            allow_privilege_escalation = false
            read_only_root_filesystem  = true

            capabilities {
              drop = ["ALL"]
            }
          }
        }
      }
    }
  }
}

resource "kubernetes_service_v1" "orkester" {
  metadata {
    name      = "ai-orkester"
    namespace = kubernetes_namespace_v1.denna.metadata[0].name
    labels    = merge(local.etiketter, { app = "ai-orkester" })
  }

  spec {
    selector = { app = "ai-orkester" }

    port {
      port        = local.port_tjanst
      target_port = local.port_container
    }
  }
}

resource "kubernetes_horizontal_pod_autoscaler_v2" "orkester" {
  metadata {
    name      = "ai-orkester"
    namespace = kubernetes_namespace_v1.denna.metadata[0].name
    labels    = local.etiketter
  }

  spec {
    min_replicas = var.repliker.orkester
    max_replicas = var.max_repliker.orkester

    scale_target_ref {
      api_version = "apps/v1"
      kind        = "Deployment"
      name        = kubernetes_deployment_v1.orkester.metadata[0].name
    }

    metric {
      type = "Resource"

      resource {
        name = "cpu"

        target {
          type                = "Utilization"
          average_utilization = 70
        }
      }
    }
  }
}

resource "kubernetes_pod_disruption_budget_v1" "orkester" {
  metadata {
    name      = "ai-orkester"
    namespace = kubernetes_namespace_v1.denna.metadata[0].name
    labels    = local.etiketter
  }

  spec {
    min_available = 1

    selector {
      match_labels = { app = "ai-orkester" }
    }
  }
}
