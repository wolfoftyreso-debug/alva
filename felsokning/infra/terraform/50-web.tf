# Klienten.
#
# Statisk SPA bakom oprivilegierad nginx. Innehåller ingen hemlighet —
# men API-adressen bakas in vid bygget (Vite), så bilden är miljöbunden.
# Det är därför bildtaggen måste vara samma git-SHA som byggdes mot den
# här domänen; en bild från en annan miljö pekar på fel API.
#
# nginx-unprivileged behöver skriva till sina temp-kataloger, därför
# emptyDir-monteringar i stället för skrivbart rotfilsystem.

resource "kubernetes_deployment_v1" "web" {
  metadata {
    name      = "web"
    namespace = kubernetes_namespace_v1.denna.metadata[0].name
    labels    = merge(local.etiketter, { app = "web" })
  }

  spec {
    replicas = var.repliker.web

    selector {
      match_labels = { app = "web" }
    }

    template {
      metadata {
        labels = merge(local.etiketter, { app = "web" })
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
          name  = "web"
          image = local.tjanster.web.bild

          port {
            container_port = local.port_container
          }

          volume_mount {
            name       = "cache"
            mount_path = "/var/cache/nginx"
          }

          volume_mount {
            name       = "run"
            mount_path = "/tmp"
          }

          resources {
            requests = { cpu = "50m", memory = "64Mi" }
            limits   = { cpu = "250m", memory = "128Mi" }
          }

          readiness_probe {
            http_get {
              path = "/"
              port = local.port_container
            }

            initial_delay_seconds = 3
            period_seconds        = 10
          }

          liveness_probe {
            http_get {
              path = "/"
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

        volume {
          name = "cache"
          empty_dir {}
        }

        volume {
          name = "run"
          empty_dir {}
        }
      }
    }
  }
}

resource "kubernetes_service_v1" "web" {
  metadata {
    name      = "web"
    namespace = kubernetes_namespace_v1.denna.metadata[0].name
    labels    = merge(local.etiketter, { app = "web" })
  }

  spec {
    selector = { app = "web" }

    port {
      port        = local.port_tjanst
      target_port = local.port_container
    }
  }
}

resource "kubernetes_horizontal_pod_autoscaler_v2" "web" {
  metadata {
    name      = "web"
    namespace = kubernetes_namespace_v1.denna.metadata[0].name
    labels    = local.etiketter
  }

  spec {
    min_replicas = var.repliker.web
    max_replicas = var.max_repliker.web

    scale_target_ref {
      api_version = "apps/v1"
      kind        = "Deployment"
      name        = kubernetes_deployment_v1.web.metadata[0].name
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

resource "kubernetes_pod_disruption_budget_v1" "web" {
  metadata {
    name      = "web"
    namespace = kubernetes_namespace_v1.denna.metadata[0].name
    labels    = local.etiketter
  }

  spec {
    min_available = 1

    selector {
      match_labels = { app = "web" }
    }
  }
}
