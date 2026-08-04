# Klustret.
#
# Noderna ligger i de privata subnäten och har inga publika adresser.
# API-servern har både en privat och en publik slutpunkt: den privata så
# att noderna når den utan att gå ut, den publika begränsad till
# var.tillatna_api_cidr så att drift och byggrunners kommer åt.
#
# IRSA (IAM Roles for Service Accounts) i stället för nodroller: en pod
# som behöver läsa en hemlighet får en egen roll, och grannpodden på
# samma nod får inte samma rättigheter på köpet.

resource "aws_iam_role" "kluster" {
  name = "${local.namn}-kluster"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "eks.amazonaws.com" }
      Action    = ["sts:AssumeRole", "sts:TagSession"]
    }]
  })
}

resource "aws_iam_role_policy_attachment" "kluster" {
  for_each = toset([
    "arn:${data.aws_partition.denna.partition}:iam::aws:policy/AmazonEKSClusterPolicy",
  ])

  role       = aws_iam_role.kluster.name
  policy_arn = each.value
}

resource "aws_security_group" "kluster" {
  name        = "${local.namn}-kluster"
  description = "EKS kontrollplan."
  vpc_id      = aws_vpc.denna.id

  egress {
    description = "Ut till noderna och AWS API"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "${local.namn}-kluster" }
}

resource "aws_security_group" "noder" {
  name        = "${local.namn}-noder"
  description = "Arbetsnoder."
  vpc_id      = aws_vpc.denna.id

  ingress {
    description = "Noder emellan (pod-till-pod, DNS, kubelet)"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    self        = true
  }

  ingress {
    description     = "Kontrollplanet till kubelet och webhooks"
    from_port       = 1025
    to_port         = 65535
    protocol        = "tcp"
    security_groups = [aws_security_group.kluster.id]
  }

  egress {
    description = "Ut mot internet via NAT och till VPC-endpoints"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${local.namn}-noder"
  }
}

resource "aws_cloudwatch_log_group" "kluster" {
  name              = "/aws/eks/${local.namn}/cluster"
  retention_in_days = 90
  kms_key_id        = aws_kms_key.loggar.arn
}

resource "aws_eks_cluster" "denna" {
  name     = local.namn
  role_arn = aws_iam_role.kluster.arn
  version  = var.kubernetes_version

  vpc_config {
    subnet_ids              = concat(aws_subnet.privat[*].id, aws_subnet.publikt[*].id)
    security_group_ids      = [aws_security_group.kluster.id]
    endpoint_private_access = true
    endpoint_public_access  = true
    public_access_cidrs     = var.tillatna_api_cidr
  }

  # Hemligheter i etcd krypteras med vår egen nyckel, inte AWS delade.
  encryption_config {
    provider {
      key_arn = aws_kms_key.eks.arn
    }
    resources = ["secrets"]
  }

  # Revisionsspåret. Utan "audit" går det inte att i efterhand svara på
  # vem som gjorde vad i klustret.
  enabled_cluster_log_types = ["api", "audit", "authenticator", "controllerManager", "scheduler"]

  access_config {
    authentication_mode                         = "API"
    bootstrap_cluster_creator_admin_permissions = true
  }

  tags = { Name = local.namn }

  depends_on = [
    aws_iam_role_policy_attachment.kluster,
    aws_cloudwatch_log_group.kluster,
  ]
}

# ---- IRSA ---------------------------------------------------------------

data "tls_certificate" "oidc" {
  url = aws_eks_cluster.denna.identity[0].oidc[0].issuer
}

resource "aws_iam_openid_connect_provider" "denna" {
  url             = aws_eks_cluster.denna.identity[0].oidc[0].issuer
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = [data.tls_certificate.oidc.certificates[0].sha1_fingerprint]
}

# Hjälpare: förtroendepolicy som binder en roll till EN namnrymd och ETT
# tjänstekonto. Utan sub-villkoret skulle vilket tjänstekonto som helst i
# klustret kunna anta rollen.
locals {
  oidc_utfardare = replace(aws_iam_openid_connect_provider.denna.url, "https://", "")

  irsa_fortroende = { for k, v in {
    plattform       = "guidad-felsokning:plattform"
    lastbalanserare = "kube-system:aws-load-balancer-controller"
    gitea           = "gitea:gitea"
    } : k => jsonencode({
      Version = "2012-10-17"
      Statement = [{
        Effect    = "Allow"
        Principal = { Federated = aws_iam_openid_connect_provider.denna.arn }
        Action    = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "${local.oidc_utfardare}:aud" = "sts.amazonaws.com"
            "${local.oidc_utfardare}:sub" = "system:serviceaccount:${v}"
          }
        }
      }]
  }) }
}

# ---- Noder --------------------------------------------------------------

resource "aws_iam_role" "nod" {
  name = "${local.namn}-nod"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "nod" {
  for_each = toset([
    "arn:${data.aws_partition.denna.partition}:iam::aws:policy/AmazonEKSWorkerNodePolicy",
    "arn:${data.aws_partition.denna.partition}:iam::aws:policy/AmazonEKS_CNI_Policy",
    "arn:${data.aws_partition.denna.partition}:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly",
    # Loggar och mätvärden från noden — inte podarnas rättigheter.
    "arn:${data.aws_partition.denna.partition}:iam::aws:policy/CloudWatchAgentServerPolicy",
    # SSM i stället för SSH: ingen nyckel att tappa bort, och varje
    # session hamnar i revisionsloggen.
    "arn:${data.aws_partition.denna.partition}:iam::aws:policy/AmazonSSMManagedInstanceCore",
  ])

  role       = aws_iam_role.nod.name
  policy_arn = each.value
}

resource "aws_launch_template" "nod" {
  name_prefix = "${local.namn}-nod-"

  vpc_security_group_ids = [aws_security_group.noder.id]

  # IMDSv2 obligatoriskt och hoppgräns 1: en pod kan inte nå
  # instansmetadata och därmed inte låna nodens roll.
  metadata_options {
    http_endpoint               = "enabled"
    http_tokens                 = "required"
    http_put_response_hop_limit = 1
  }

  block_device_mappings {
    device_name = "/dev/xvda"

    ebs {
      volume_size           = 50
      volume_type           = "gp3"
      encrypted             = true
      delete_on_termination = true
    }
  }

  monitoring {
    enabled = true
  }

  tag_specifications {
    resource_type = "instance"
    tags          = merge(local.taggar, { Name = "${local.namn}-nod" })
  }

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_eks_node_group" "denna" {
  cluster_name    = aws_eks_cluster.denna.name
  node_group_name = "${local.namn}-noder"
  node_role_arn   = aws_iam_role.nod.arn
  subnet_ids      = aws_subnet.privat[*].id
  instance_types  = var.nod_typer

  # Graviton: bättre pris per prestanda. Bilderna byggs för arm64.
  ami_type = "AL2023_ARM_64_STANDARD"

  scaling_config {
    min_size     = var.noder.minsta
    desired_size = var.noder.onskad
    max_size     = var.noder.hogsta
  }

  # En nod i taget ur drift vid uppdatering — PodDisruptionBudget i
  # arbetslastlagret ser till att replikerna inte försvinner samtidigt.
  update_config {
    max_unavailable = 1
  }

  launch_template {
    id      = aws_launch_template.nod.id
    version = aws_launch_template.nod.latest_version
  }

  tags = { Name = "${local.namn}-noder" }

  depends_on = [aws_iam_role_policy_attachment.nod]

  lifecycle {
    # Autoskalning ändrar önskat antal — Terraform ska inte dra tillbaka det.
    ignore_changes = [scaling_config[0].desired_size]
  }
}

# ---- Tillägg ------------------------------------------------------------
#
# Läggs till efter nodgruppen: de behöver noder att köra på.

resource "aws_eks_addon" "denna" {
  for_each = toset(["vpc-cni", "coredns", "kube-proxy", "eks-pod-identity-agent"])

  cluster_name                = aws_eks_cluster.denna.name
  addon_name                  = each.key
  resolve_conflicts_on_update = "PRESERVE"

  depends_on = [aws_eks_node_group.denna]
}

# EBS-drivrutinen behöver egna rättigheter för att skapa volymer.
resource "aws_iam_role" "ebs" {
  name = "${local.namn}-ebs"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Federated = aws_iam_openid_connect_provider.denna.arn }
      Action    = "sts:AssumeRoleWithWebIdentity"
      Condition = {
        StringEquals = {
          "${local.oidc_utfardare}:aud" = "sts.amazonaws.com"
          "${local.oidc_utfardare}:sub" = "system:serviceaccount:kube-system:ebs-csi-controller-sa"
        }
      }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "ebs" {
  role       = aws_iam_role.ebs.name
  policy_arn = "arn:${data.aws_partition.denna.partition}:iam::aws:policy/service-role/AmazonEBSCSIDriverPolicy"
}

resource "aws_eks_addon" "ebs" {
  cluster_name                = aws_eks_cluster.denna.name
  addon_name                  = "aws-ebs-csi-driver"
  service_account_role_arn    = aws_iam_role.ebs.arn
  resolve_conflicts_on_update = "PRESERVE"

  depends_on = [aws_eks_node_group.denna]
}
