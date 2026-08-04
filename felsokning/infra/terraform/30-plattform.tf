# Plattformstjänsten — systemets mitt.
#
# Äger: inloggning (bcrypt via pgcrypto, HS256-JWT med roll + organisation
# i anspråken), append-only händelse-API, Live Share med serverstyrd
# filtrering, organisationsinställningar, ECM-regelpaketet och de
# märkesspecifika kopplingarna.
#
# Ser tre hemligheter och inga fler: JWT-hemligheten (delas med
# orkestern), databaslösenordet och krypteringsnyckeln för kundernas
# leverantörsuppgifter.

resource "kubernetes_deployment_v1" "plattform" {
  metadata {
    name      = "plattform"
    namespace = kubernetes_namespace_v1.denna.metadata[0].name
    labels    = merge(local.etiketter, { app = "plattform" })
  }

  spec {
    replicas = var.repliker.plattform

    selector {
      match_labels = { app = "plattform" }
    }

    template {
      metadata {
        labels = merge(local.etiketter, { app = "plattform" })
      }

      spec {
        # Behöver token: IRSA hämtar AWS-uppgifter genom det.
        service_account_name = kubernetes_service_account_v1.plattform.metadata[0].name

        security_context {
          run_as_non_root = true

          seccomp_profile {
            type = "RuntimeDefault"
          }
        }

        container {
          name  = "plattform"
          image = local.tjanster.plattform.bild

          port {
            container_port = local.port_container
          }

          # Alla hemligheter kommer ur den spegling External Secrets
          # gör från Secrets Manager. Ingen av dem finns i Terraforms
          # tillstånd eller i något manifest.
          env_from {
            secret_ref {
              name = "felsokning-hemligheter"
            }
          }

          # Klienten serveras från samma domän som API:t, så CORS behöver
          # inte vara öppet.
          env {
            name  = "TILLATNA_URSPRUNG"
            value = "https://${local.aws.doman}"
          }

          env {
            name  = "REGISTRERING_OPPEN"
            value = var.registrering_oppen ? "true" : "false"
          }

          env {
            name  = "TILLAT_INTERNA_UPPSLAG"
            value = var.tillat_interna_uppslag ? "true" : "false"
          }

          # Bilagorna ligger i S3. Inga nycklar behövs — tjänsten
          # signerar med tjänstekontots roll via IRSA.
          env {
            name  = "BILAGE_LAGE"
            value = "s3"
          }

          env {
            name  = "S3_HINK"
            value = local.aws.bilage_hink
          }

          env {
            name  = "S3_REGION"
            value = local.aws.region
          }

          env {
            name  = "S3_ENDPOINT"
            value = "https://s3.${local.aws.region}.amazonaws.com"
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

resource "kubernetes_service_v1" "plattform" {
  metadata {
    name      = "plattform"
    namespace = kubernetes_namespace_v1.denna.metadata[0].name
    labels    = merge(local.etiketter, { app = "plattform" })
  }

  spec {
    selector = { app = "plattform" }

    port {
      port        = local.port_tjanst
      target_port = local.port_container
    }
  }
}

resource "kubernetes_horizontal_pod_autoscaler_v2" "plattform" {
  metadata {
    name      = "plattform"
    namespace = kubernetes_namespace_v1.denna.metadata[0].name
    labels    = local.etiketter
  }

  spec {
    min_replicas = var.repliker.plattform
    max_replicas = var.max_repliker.plattform

    scale_target_ref {
      api_version = "apps/v1"
      kind        = "Deployment"
      name        = kubernetes_deployment_v1.plattform.metadata[0].name
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

resource "kubernetes_pod_disruption_budget_v1" "plattform" {
  metadata {
    name      = "plattform"
    namespace = kubernetes_namespace_v1.denna.metadata[0].name
    labels    = local.etiketter
  }

  spec {
    min_available = 1

    selector {
      match_labels = { app = "plattform" }
    }
  }
}
