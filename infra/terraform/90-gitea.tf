# Självhostad git med egna byggrunners.
#
# Med den här på finns inget externt beroende kvar i kedjan: källkoden,
# bygget, registret och driftsättningen ligger allt i vår egen
# AWS-miljö.
#
# Gitea Actions använder samma workflow-syntax som GitHub Actions, så
# .gitea/workflows/felsokning.yml är samma fil som tidigare låg under
# .github — bara flyttad och pekad på egna runners.
#
# Runnern kör byggen. Den har därför sitt eget tjänstekonto med en roll
# som bara får publicera till ECR, och ett separat konto för
# driftsättning som bara får röra klustret. Ett komprometterat bygge kan
# inte driftsätta.

locals {
  gitea_pa = var.gitea.aktiv
}

resource "kubernetes_namespace_v1" "gitea" {
  count = local.gitea_pa ? 1 : 0

  metadata {
    name   = "gitea"
    labels = local.etiketter
  }
}

# Byggkontot. Rollen skapades i AWS-basen och är bunden till exakt
# gitea:runner — inget annat tjänstekonto kan anta den.
resource "kubernetes_service_account_v1" "runner" {
  count = local.gitea_pa ? 1 : 0

  metadata {
    name      = "runner"
    namespace = kubernetes_namespace_v1.gitea[0].metadata[0].name
    labels    = local.etiketter

    annotations = {
      "eks.amazonaws.com/role-arn" = data.terraform_remote_state.bas.outputs.karta.roller.bygg
    }
  }
}

resource "kubernetes_service_account_v1" "drift" {
  count = local.gitea_pa ? 1 : 0

  metadata {
    name      = "drift"
    namespace = kubernetes_namespace_v1.gitea[0].metadata[0].name
    labels    = local.etiketter

    annotations = {
      "eks.amazonaws.com/role-arn" = data.terraform_remote_state.bas.outputs.karta.roller.drift
    }
  }
}

# Registreringstoken för runnern. Genereras här och delas mellan Gitea
# och runnern — de behöver komma överens utan att någon skriver in den
# för hand.
resource "random_password" "runner_token" {
  count = local.gitea_pa ? 1 : 0

  length  = 40
  special = false
}

resource "kubernetes_secret_v1" "runner" {
  count = local.gitea_pa ? 1 : 0

  metadata {
    name      = "runner-registrering"
    namespace = kubernetes_namespace_v1.gitea[0].metadata[0].name
  }

  data = {
    token = random_password.runner_token[0].result
  }
}

resource "helm_release" "gitea" {
  count = local.gitea_pa ? 1 : 0

  name       = "gitea"
  repository = "https://dl.gitea.com/charts/"
  chart      = "gitea"
  version    = "10.6.0"
  namespace  = kubernetes_namespace_v1.gitea[0].metadata[0].name

  # Gitea kan använda en extern databas. Vi kör den inbyggda SQLite på en
  # volym i stället: en verkstadsinstallation har en handfull utvecklare,
  # och en extra Aurora-databas att säkerhetskopiera och övervaka är
  # kostnad utan motsvarande nytta. Volymen ligger på EBS med
  # ögonblicksbilder.
  values = [yamlencode({
    redis-cluster = { enabled = false }
    postgresql-ha = { enabled = false }

    persistence = {
      enabled      = true
      size         = var.gitea.lagring
      storageClass = "gp2"
    }

    gitea = {
      config = {
        server = {
          DOMAIN     = var.gitea.doman
          ROOT_URL   = "https://${var.gitea.doman}/"
          SSH_DOMAIN = var.gitea.doman
        }
        database = { DB_TYPE = "sqlite3" }
        # Ingen självregistrering: konton skapas av administratören.
        service = {
          DISABLE_REGISTRATION = true
          REQUIRE_SIGNIN_VIEW  = true
        }
        actions = { ENABLED = true }
        # Bygg-loggarna hamnar i CloudWatch via containerloggarna.
        log = { LEVEL = "Info" }
      }
    }

    # Runnern kör i samma namnrymd med byggkontot.
    actions = {
      enabled = true
      statefulset = {
        replicas           = var.gitea.runners
        serviceAccountName = kubernetes_service_account_v1.runner[0].metadata[0].name
      }
      existingSecret    = kubernetes_secret_v1.runner[0].metadata[0].name
      existingSecretKey = "token"
    }
  })]

  depends_on = [
    helm_release.external_secrets,
    kubernetes_secret_v1.runner,
  ]
}

# Gitea får sin egen väg in genom samma lastbalanserare — grupp-namnet
# är detsamma, så ALB:n delas i stället för att en till skapas.
resource "kubernetes_ingress_v1" "gitea" {
  count = local.gitea_pa && var.gitea.doman != "" ? 1 : 0

  metadata {
    name      = "gitea"
    namespace = kubernetes_namespace_v1.gitea[0].metadata[0].name
    labels    = local.etiketter

    annotations = {
      "alb.ingress.kubernetes.io/scheme"          = "internet-facing"
      "alb.ingress.kubernetes.io/target-type"     = "ip"
      "alb.ingress.kubernetes.io/certificate-arn" = local.aws.certifikat_arn
      "alb.ingress.kubernetes.io/listen-ports"    = jsonencode([{ HTTP = 80 }, { HTTPS = 443 }])
      "alb.ingress.kubernetes.io/ssl-redirect"    = "443"
      "alb.ingress.kubernetes.io/group.name"      = local.namn
    }
  }

  spec {
    ingress_class_name = "alb"

    rule {
      host = var.gitea.doman

      http {
        path {
          path      = "/"
          path_type = "Prefix"

          backend {
            service {
              name = "gitea-http"

              port {
                number = 3000
              }
            }
          }
        }
      }
    }
  }

  depends_on = [helm_release.gitea]
}
