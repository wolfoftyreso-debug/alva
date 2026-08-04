# Trafiken utifrån och in.
#
# En ALB, skapad av lastbalanserar-kontrollern ur det här objektet.
# Certifikatet kommer från ACM och terminerar på lastbalanseraren; all
# trafik mot :80 skickas vidare till :443.
#
# Kroppsgränsen är inte kosmetisk: teknikern dokumenterar med foto och
# video. En för snäv gräns avvisar dokumentationen redan vid dörren.

resource "kubernetes_ingress_v1" "denna" {
  metadata {
    name      = local.namn
    namespace = kubernetes_namespace_v1.denna.metadata[0].name
    labels    = local.etiketter

    annotations = {
      "alb.ingress.kubernetes.io/scheme"          = "internet-facing"
      "alb.ingress.kubernetes.io/target-type"     = "ip"
      "alb.ingress.kubernetes.io/certificate-arn" = local.aws.certifikat_arn
      "alb.ingress.kubernetes.io/listen-ports"    = jsonencode([{ HTTP = 80 }, { HTTPS = 443 }])
      "alb.ingress.kubernetes.io/ssl-redirect"    = "443"
      "alb.ingress.kubernetes.io/ssl-policy"      = "ELBSecurityPolicy-TLS13-1-2-2021-06"

      # Hälsokontrollen går mot plattformen — den vet om databasen svarar.
      "alb.ingress.kubernetes.io/healthcheck-path" = "/halsa"

      # AI-svar kan ta tid; standardgränsen på 60 s räcker inte.
      "alb.ingress.kubernetes.io/load-balancer-attributes" = join(",", [
        "idle_timeout.timeout_seconds=180",
        "routing.http.drop_invalid_header_fields.enabled=true",
        "access_logs.s3.enabled=false",
      ])

      # Alla tre tjänsterna delar en lastbalanserare.
      "alb.ingress.kubernetes.io/group.name" = local.namn
    }
  }

  spec {
    ingress_class_name = "alb"

    rule {
      host = local.aws.doman

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
    helm_release.lastbalanserare,
    kubernetes_service_v1.web,
    kubernetes_service_v1.plattform,
    kubernetes_service_v1.orkester,
  ]
}

# DNS pekar på lastbalanseraren. Alias i stället för CNAME så att
# domänens rot kan användas om ni vill det senare.
resource "aws_route53_record" "denna" {
  zone_id = local.aws.zon_id
  name    = local.aws.doman
  type    = "A"

  alias {
    name                   = kubernetes_ingress_v1.denna.status[0].load_balancer[0].ingress[0].hostname
    zone_id                = data.aws_lb.denna.zone_id
    evaluate_target_health = true
  }
}

data "aws_lb" "denna" {
  tags = {
    "elbv2.k8s.aws/cluster"    = local.aws.kluster
    "ingress.k8s.aws/stack"    = local.namn
    "ingress.k8s.aws/resource" = "LoadBalancer"
  }

  depends_on = [kubernetes_ingress_v1.denna]
}
