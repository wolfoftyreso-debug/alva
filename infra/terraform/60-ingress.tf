# Trafiken utifrån och in. En domän, fyra prefix — se local.routing.
#
# Kroppsgränsen är inte kosmetisk: teknikern dokumenterar med foto och
# video som följer med händelseloggen. Ingressens standardgräns (1 MB)
# skulle avvisa dokumentationen redan vid dörren, medan tjänsten själv
# accepterar 4 MB. Gränsen sätts därför uttryckligen och med marginal.

resource "kubernetes_ingress_v1" "denna" {
  metadata {
    name      = local.namn
    namespace = kubernetes_namespace_v1.denna.metadata[0].name
    labels    = local.etiketter

    annotations = {
      "cert-manager.io/cluster-issuer"                 = var.cert_issuer
      "nginx.ingress.kubernetes.io/proxy-body-size"    = "${var.max_kropp_mb}m"
      "nginx.ingress.kubernetes.io/proxy-read-timeout" = "120" # AI-svar kan ta tid
      "nginx.ingress.kubernetes.io/ssl-redirect"       = "true"
    }
  }

  spec {
    ingress_class_name = var.ingress_klass

    tls {
      hosts       = [var.doman]
      secret_name = "${local.namn}-tls"
    }

    rule {
      host = var.doman

      http {
        dynamic "path" {
          for_each = local.routing

          content {
            path      = path.value.prefix
            path_type = "Prefix"

            backend {
              service {
                name = path.value.till

                port {
                  number = local.port_tjanst
                }
              }
            }
          }
        }
      }
    }
  }

  depends_on = [
    kubernetes_service_v1.web,
    kubernetes_service_v1.plattform,
    kubernetes_service_v1.orkester,
  ]
}
