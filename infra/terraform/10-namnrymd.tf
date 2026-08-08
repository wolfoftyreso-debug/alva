# Namnrymden, tjänstekontot och hemligheterna.
#
# Hemligheterna bor i AWS Secrets Manager, inte här. External Secrets
# speglar dem in i klustret så att podarna kan läsa dem som vanliga
# miljövariabler — men sanningskällan är Secrets Manager, med rotation,
# revisionsspår per läsning och kryptering med egen KMS-nyckel.
#
# Terraform ser aldrig värdena, och det är själva poängen: en hemlighet
# som passerar Terraform hamnar i tillståndsfilen.

resource "kubernetes_namespace_v1" "denna" {
  metadata {
    name   = var.namnrymd
    labels = local.etiketter
  }
}

# Tjänstekontot plattformstjänsten kör som. IRSA-annoteringen binder det
# till rollen basen skapade — och rollen är i sin tur bunden till exakt
# det här kontot i den här namnrymden. Ingen annan pod kan anta den.
resource "kubernetes_service_account_v1" "plattform" {
  metadata {
    name      = "plattform"
    namespace = kubernetes_namespace_v1.denna.metadata[0].name
    labels    = local.etiketter

    annotations = {
      "eks.amazonaws.com/role-arn" = local.aws.plattform_roll
    }
  }
}

# Var hemligheterna hämtas ifrån. Autentiseringen sker med
# tjänstekontots roll — inga nycklar att distribuera.
resource "kubernetes_manifest" "hemlighetskalla" {
  manifest = {
    apiVersion = "external-secrets.io/v1beta1"
    kind       = "SecretStore"

    metadata = {
      name      = "aws"
      namespace = kubernetes_namespace_v1.denna.metadata[0].name
    }

    spec = {
      provider = {
        aws = {
          service = "SecretsManager"
          region  = local.aws.region

          auth = {
            jwt = {
              serviceAccountRef = {
                name = kubernetes_service_account_v1.plattform.metadata[0].name
              }
            }
          }
        }
      }
    }
  }

  depends_on = [helm_release.external_secrets]
}

# Speglingen. Namnen till vänster är miljövariablerna tjänsterna läser;
# till höger nycklarna i Secrets Manager.
resource "kubernetes_manifest" "hemligheter" {
  manifest = {
    apiVersion = "external-secrets.io/v1beta1"
    kind       = "ExternalSecret"

    metadata = {
      name      = "felsokning-hemligheter"
      namespace = kubernetes_namespace_v1.denna.metadata[0].name
    }

    spec = {
      # Roteras en hemlighet i Secrets Manager följer klustret efter inom
      # en timme, utan att någon behöver göra något.
      refreshInterval = "1h"

      secretStoreRef = {
        name = "aws"
        kind = "SecretStore"
      }

      target = {
        name           = "felsokning-hemligheter"
        creationPolicy = "Owner"
      }

      data = [
        {
          secretKey = "DATABASE_URL"
          remoteRef = { key = local.aws.hemlighet_databas, property = "url" }
        },
        {
          secretKey = "ANTHROPIC_API_KEY"
          remoteRef = { key = local.aws.hemlighet_app, property = "anthropic_api_key" }
        },
        {
          secretKey = "JWT_SECRET"
          remoteRef = { key = local.aws.hemlighet_app, property = "jwt_secret" }
        },
        {
          secretKey = "INTEGRATION_NYCKEL"
          remoteRef = { key = local.aws.hemlighet_app, property = "integration_nyckel" }
        },
        # Kuverterar personnycklarna. Utan den går en återställd databas
        # inte att läsa — vilket är avsikten (TÜV T-3).
        {
          secretKey = "PERSONNYCKEL_HUVUD"
          remoteRef = { key = local.aws.hemlighet_app, property = "personnyckel_huvud" }
        },
      ]
    }
  }

  depends_on = [kubernetes_manifest.hemlighetskalla]
}
