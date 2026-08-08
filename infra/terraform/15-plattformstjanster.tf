# Det klustret behöver innan vår egen arbetslast är meningsfull.
#
# Tre stycken, och alla tre finns av ett skäl som är synligt i systemet:
#   ALB-kontrollern     gör Ingress till en riktig lastbalanserare
#   External Secrets    hämtar hemligheter ur Secrets Manager
#   metrics-server      autoskalningen har inget att skala på utan den

resource "helm_release" "lastbalanserare" {
  name       = "aws-load-balancer-controller"
  repository = "https://aws.github.io/eks-charts"
  chart      = "aws-load-balancer-controller"
  version    = "1.10.1"
  namespace  = "kube-system"

  set {
    name  = "clusterName"
    value = local.aws.kluster
  }

  set {
    name  = "serviceAccount.create"
    value = "true"
  }

  set {
    name  = "serviceAccount.name"
    value = "aws-load-balancer-controller"
  }

  # IRSA: kontrollern antar rollen basen skapade. Rollen är bunden till
  # exakt det här tjänstekontot i den här namnrymden.
  set {
    name  = "serviceAccount.annotations.eks\\.amazonaws\\.com/role-arn"
    value = local.aws.lastbalanserar_roll
  }

  set {
    name  = "region"
    value = local.aws.region
  }
}

resource "helm_release" "external_secrets" {
  name             = "external-secrets"
  repository       = "https://charts.external-secrets.io"
  chart            = "external-secrets"
  version          = "0.10.7"
  namespace        = "external-secrets"
  create_namespace = true

  set {
    name  = "installCRDs"
    value = "true"
  }
}

resource "helm_release" "metrics" {
  name       = "metrics-server"
  repository = "https://kubernetes-sigs.github.io/metrics-server/"
  chart      = "metrics-server"
  version    = "3.12.2"
  namespace  = "kube-system"
}

# CloudWatch-agenten: containerloggar och Container Insights. Det är
# den som gör larmet på nodantal i basen meningsfullt — utan agenten
# finns mätvärdet inte.
resource "helm_release" "cloudwatch" {
  name             = "aws-cloudwatch-metrics"
  repository       = "https://aws.github.io/eks-charts"
  chart            = "aws-cloudwatch-metrics"
  version          = "0.0.11"
  namespace        = "amazon-cloudwatch"
  create_namespace = true

  set {
    name  = "clusterName"
    value = local.aws.kluster
  }
}
