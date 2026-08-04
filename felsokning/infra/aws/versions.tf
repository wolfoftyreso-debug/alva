# Guidad Felsökning — AWS-basen.
#
# Två lager, medvetet åtskilda:
#
#   felsokning/infra/aws/        det här — VPC, EKS, Aurora, S3, ECR,
#                                Secrets Manager, Route 53/ACM, CloudWatch
#   felsokning/infra/terraform/  arbetslasten i klustret
#
# Anledningen är inte smak: en enda apply som både skapar ett EKS-kluster
# och schemalägger in i det är en känd fälla — kubernetes-leverantören
# måste konfigureras med uppgifter som inte finns förrän klustret är
# skapat, och planen blir därför opålitlig. Kör basen först, arbetslasten
# sedan. Arbetslasten läser basens utdata.
#
# Läsordning:
#   variables.tf      alla rattar
#   10-natverk.tf     VPC, subnät, NAT, VPC-endpoints
#   20-eks.tf         klustret, noderna, IRSA
#   30-databas.tf     Aurora PostgreSQL
#   40-lagring.tf     S3 för bilagor, ECR för bilder
#   50-hemligheter.tf Secrets Manager + rollerna som får läsa dem
#   60-doman.tf       Route 53 och certifikat
#   70-observation.tf CloudWatch: loggar, mätvärden, larm
#   80-gitea.tf       självhostad git + byggrunners
#   outputs.tf        det arbetslastlagret behöver

terraform {
  required_version = ">= 1.6"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.80"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
    tls = {
      source  = "hashicorp/tls"
      version = "~> 4.0"
    }
  }

  # Tillståndet innehåller databasens slutpunkt och rollnamn. Lägg det i
  # S3 med versionshantering och lås — aldrig lokalt i git.
  #
  # backend "s3" {
  #   bucket       = "felsokning-tfstate"
  #   key          = "aws/terraform.tfstate"
  #   region       = "eu-north-1"
  #   encrypt      = true
  #   use_lockfile = true
  # }
}

provider "aws" {
  region = var.region

  default_tags {
    tags = local.taggar
  }
}

# ACM-certifikat för CloudFront måste ligga i us-east-1. Vi använder inte
# CloudFront i dag, men leverantören står redo så tillägget inte kräver
# en omstrukturering.
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"

  default_tags {
    tags = local.taggar
  }
}

data "aws_caller_identity" "denna" {}

data "aws_partition" "denna" {}
