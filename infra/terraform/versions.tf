# Guidad Felsökning — arbetslasten i klustret.
#
# Lager två av två. Basen (infra/aws) måste vara applicerad
# först; det här lagret läser dess utdata och behöver därför inte känna
# till en enda AWS-resurs vid namn.
#
# Läsordning:
#   versions.tf       det här — leverantörer, kopplade till EKS
#   05-aws.tf         basens utdata och vad de betyder här
#   variables.tf      det lilla som inte kommer från basen
#   karta.tf          systemet som data — kartans källa
#   10-namnrymd.tf    namnrymd + hemligheter ur Secrets Manager
#   15-plattformstjanster.tf  ALB-kontroller, External Secrets, metrics
#   30-plattform.tf   backend
#   40-orkester.tf    AI-orkestern
#   50-web.tf         klienten
#   60-ingress.tf     ALB
#   70-natverk.tf     nätverkspolicyer
#   90-gitea.tf       självhostad git + byggrunners
#   outputs.tf        kartan utskriven — kör `terraform output karta`

terraform {
  required_version = ">= 1.6"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.80"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.35"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.16"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }

  # Samma hink som basen, annan nyckel.
  #
  # backend "s3" {
  #   bucket       = "felsokning-produktion-tfstate-<konto>"
  #   key          = "arbetslast/terraform.tfstate"
  #   region       = "eu-north-1"
  #   encrypt      = true
  #   use_lockfile = true
  # }
}

provider "aws" {
  region = local.aws.region
}

# Autentisering mot klustret sker med en färsk token från EKS i stället
# för en kubeconfig på disk — inget att distribuera, inget som går ut.
provider "kubernetes" {
  host                   = local.aws.kluster_slutpunkt
  cluster_ca_certificate = base64decode(local.aws.kluster_ca)

  exec {
    api_version = "client.authentication.k8s.io/v1beta1"
    command     = "aws"
    args        = ["eks", "get-token", "--cluster-name", local.aws.kluster, "--region", local.aws.region]
  }
}

provider "helm" {
  kubernetes {
    host                   = local.aws.kluster_slutpunkt
    cluster_ca_certificate = base64decode(local.aws.kluster_ca)

    exec {
      api_version = "client.authentication.k8s.io/v1beta1"
      command     = "aws"
      args        = ["eks", "get-token", "--cluster-name", local.aws.kluster, "--region", local.aws.region]
    }
  }
}
