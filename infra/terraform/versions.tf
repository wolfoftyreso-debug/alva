# Guidad Felsökning — infrastrukturens definition.
#
# Läsordning för den som vill förstå hela systemet:
#   versions.tf      det här — leverantörer och tillstånd
#   variables.tf     alla rattar som finns att vrida på
#   karta.tf         locals: hela systemet som data (tjänster, portar,
#                    routing, hemligheter, dataflöden) — kartans källa
#   10-namnrymd.tf   namnrymd + hemligheter
#   20-databas.tf    Postgres: händelseloggen
#   30-plattform.tf  backend: auth, händelse-API, delning, integrationer
#   40-orkester.tf   AI-orkestern: modellrouting mot Claude
#   50-web.tf        klienten
#   60-ingress.tf    trafiken utifrån och in
#   70-natverk.tf    nätverkspolicyer: vem får prata med vem
#   outputs.tf       kartan utskriven — kör `terraform output karta`

terraform {
  required_version = ">= 1.6"

  required_providers {
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.35"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }

  # Tillståndet innehåller hemligheter (JWT-hemlighet, databaslösenord,
  # krypteringsnyckeln för kundernas leverantörsuppgifter). Lägg det i en
  # backend med kryptering och åtkomststyrning — aldrig lokalt i git.
  #
  # backend "s3" {
  #   bucket       = "guidad-felsokning-tfstate"
  #   key          = "produktion/terraform.tfstate"
  #   region       = "eu-north-1"
  #   encrypt      = true
  #   use_lockfile = true
  # }
}

provider "kubernetes" {
  config_path    = var.kubeconfig
  config_context = var.kube_context
}
