# Hemligheterna och vem som får läsa dem.
#
# Secrets Manager i stället för Kubernetes-secrets som sanningskälla:
# rotation, revisionsspår per läsning och kryptering med vår egen nyckel.
# Klustret hämtar dem via IRSA — plattformens tjänstekonto får en egen
# roll, och grannpodden på samma nod får ingenting på köpet.

resource "aws_secretsmanager_secret" "databas" {
  name                    = "${local.namn}/databas"
  description             = "Aurora-uppgifter för plattformstjänsten."
  kms_key_id              = aws_kms_key.data.arn
  recovery_window_in_days = 30
}

resource "aws_secretsmanager_secret_version" "databas" {
  secret_id = aws_secretsmanager_secret.databas.id

  secret_string = jsonencode({
    username = aws_rds_cluster.denna.master_username
    password = random_password.databas.result
    host     = aws_rds_cluster.denna.endpoint
    port     = 5432
    dbname   = aws_rds_cluster.denna.database_name
    # Färdig anslutningssträng — plattformstjänsten läser DATABASE_URL.
    url = "postgresql://${aws_rds_cluster.denna.master_username}:${random_password.databas.result}@${aws_rds_cluster.denna.endpoint}:5432/${aws_rds_cluster.denna.database_name}?sslmode=require"
  })
}

# Applikationens egna hemligheter. Värdena sätts EN gång — Terraform
# äger inte innehållet efteråt, så en rotation i Secrets Manager inte
# skrivs över av nästa apply.
resource "aws_secretsmanager_secret" "app" {
  name                    = "${local.namn}/app"
  description             = "Claude-nyckel, JWT-hemlighet, krypteringsnyckel för kundernas leverantörsuppgifter."
  kms_key_id              = aws_kms_key.data.arn
  recovery_window_in_days = 30
}

resource "random_password" "jwt" {
  length  = 64
  special = false
}

resource "random_id" "integration" {
  byte_length = 32
}

# Huvudnyckeln som personnycklarna kuverteras under (TÜV T-3).
#
# Den ligger i Secrets Manager och INTE i databasen — det är hela poängen.
# Låg nyckeln kvar bredvid chiffertexten var krypto-shredding bara "radera
# en rad i samma databas", och en återställd dump gav uppgifterna i
# läsbart skick igen.
resource "random_id" "personnyckel_huvud" {
  byte_length = 32
}

resource "aws_secretsmanager_secret_version" "app" {
  secret_id = aws_secretsmanager_secret.app.id

  secret_string = jsonencode({
    # Fylls i efter första apply — Terraform ska inte känna Claude-nyckeln.
    anthropic_api_key  = "ERSATT-MIG"
    jwt_secret          = random_password.jwt.result
    integration_nyckel  = random_id.integration.hex
    personnyckel_huvud  = random_id.personnyckel_huvud.hex
  })

  lifecycle {
    ignore_changes = [secret_string]
  }
}

# ---- Rollen plattformstjänsten kör som ----------------------------------

resource "aws_iam_role" "plattform" {
  name               = "${local.namn}-plattform"
  assume_role_policy = local.irsa_fortroende["plattform"]
}

resource "aws_iam_role_policy" "plattform" {
  name = "las-hemligheter-och-bilagor"
  role = aws_iam_role.plattform.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "LasEgnaHemligheter"
        Effect = "Allow"
        Action = ["secretsmanager:GetSecretValue", "secretsmanager:DescribeSecret"]
        Resource = [
          aws_secretsmanager_secret.databas.arn,
          aws_secretsmanager_secret.app.arn,
        ]
      },
      {
        Sid    = "Bilagor"
        Effect = "Allow"
        # Ingen DeleteObject: bilagor hör till en append-only
        # händelselogg och tjänsten har ingen anledning att radera dem.
        Action   = ["s3:GetObject", "s3:PutObject"]
        Resource = "${aws_s3_bucket.bilagor.arn}/*"
      },
      {
        Effect   = "Allow"
        Action   = ["s3:ListBucket"]
        Resource = aws_s3_bucket.bilagor.arn
      },
      {
        Sid      = "KrypteringForOvanstaende"
        Effect   = "Allow"
        Action   = ["kms:Decrypt", "kms:GenerateDataKey"]
        Resource = aws_kms_key.data.arn
      },
    ]
  })
}

# ---- Lastbalanserar-kontrollern -----------------------------------------
#
# Kör i klustret och skapar ALB:er ur Ingress-objekt. Rättigheterna är
# breda till sin natur — den måste kunna skapa och ta bort
# lastbalanserare — men begränsade till den här VPC:n där det går.

resource "aws_iam_role" "lastbalanserare" {
  name               = "${local.namn}-lastbalanserare"
  assume_role_policy = local.irsa_fortroende["lastbalanserare"]
}

resource "aws_iam_role_policy" "lastbalanserare" {
  name = "hantera-lastbalanserare"
  role = aws_iam_role.lastbalanserare.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "elasticloadbalancing:*",
          "ec2:Describe*",
          "ec2:CreateSecurityGroup",
          "ec2:CreateTags",
          "ec2:DeleteTags",
          "ec2:AuthorizeSecurityGroupIngress",
          "ec2:RevokeSecurityGroupIngress",
          "ec2:DeleteSecurityGroup",
          "acm:DescribeCertificate",
          "acm:ListCertificates",
          "iam:CreateServiceLinkedRole",
          "cognito-idp:DescribeUserPoolClient",
          "wafv2:GetWebACL",
          "wafv2:AssociateWebACL",
          "shield:GetSubscriptionState",
        ]
        Resource = "*"
      },
    ]
  })
}

# ---- Rollerna bygget och driftsättningen antar --------------------------
#
# Byggrunnern får publicera till ECR men inte röra klustret.
# Driftsättningen får röra klustret men inte publicera bilder. Två
# separata roller så ett komprometterat bygge inte kan driftsätta.

resource "aws_iam_role" "bygg" {
  name = "${local.namn}-bygg"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Federated = aws_iam_openid_connect_provider.denna.arn }
      Action    = "sts:AssumeRoleWithWebIdentity"
      Condition = {
        StringEquals = {
          "${local.oidc_utfardare}:aud" = "sts.amazonaws.com"
          "${local.oidc_utfardare}:sub" = "system:serviceaccount:gitea:runner"
        }
      }
    }]
  })
}

resource "aws_iam_role_policy" "bygg" {
  name = "publicera-till-ecr"
  role = aws_iam_role.bygg.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = "ecr:GetAuthorizationToken"
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "ecr:BatchCheckLayerAvailability",
          "ecr:CompleteLayerUpload",
          "ecr:InitiateLayerUpload",
          "ecr:PutImage",
          "ecr:UploadLayerPart",
          "ecr:BatchGetImage",
        ]
        Resource = [for r in aws_ecr_repository.denna : r.arn]
      },
      {
        Effect   = "Allow"
        Action   = ["kms:Encrypt", "kms:GenerateDataKey", "kms:Decrypt"]
        Resource = aws_kms_key.data.arn
      },
    ]
  })
}

resource "aws_iam_role" "drift" {
  name = "${local.namn}-drift"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Federated = aws_iam_openid_connect_provider.denna.arn }
      Action    = "sts:AssumeRoleWithWebIdentity"
      Condition = {
        StringEquals = {
          "${local.oidc_utfardare}:aud" = "sts.amazonaws.com"
          "${local.oidc_utfardare}:sub" = "system:serviceaccount:gitea:drift"
        }
      }
    }]
  })
}

resource "aws_iam_role_policy" "drift" {
  name = "driftsatt"
  role = aws_iam_role.drift.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["eks:DescribeCluster", "eks:ListClusters"]
        Resource = aws_eks_cluster.denna.arn
      },
      {
        # Terraform-tillståndet.
        Effect   = "Allow"
        Action   = ["s3:GetObject", "s3:PutObject", "s3:ListBucket"]
        Resource = [aws_s3_bucket.tillstand.arn, "${aws_s3_bucket.tillstand.arn}/*"]
      },
    ]
  })
}

# Driftsättningen behöver också rättigheter i klustret, inte bara i IAM.
resource "aws_eks_access_entry" "drift" {
  cluster_name  = aws_eks_cluster.denna.name
  principal_arn = aws_iam_role.drift.arn
  type          = "STANDARD"
}

resource "aws_eks_access_policy_association" "drift" {
  cluster_name  = aws_eks_cluster.denna.name
  principal_arn = aws_iam_role.drift.arn
  policy_arn    = "arn:${data.aws_partition.denna.partition}:eks::aws:cluster-access-policy/AmazonEKSClusterAdminPolicy"

  access_scope {
    type = "cluster"
  }

  depends_on = [aws_eks_access_entry.drift]
}

# ---- Terraform-tillståndet ----------------------------------------------

resource "aws_s3_bucket" "tillstand" {
  bucket = "${local.namn}-tfstate-${data.aws_caller_identity.denna.account_id}"

  tags = { Name = "${local.namn}-tfstate" }

  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_s3_bucket_public_access_block" "tillstand" {
  bucket = aws_s3_bucket.tillstand.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_versioning" "tillstand" {
  bucket = aws_s3_bucket.tillstand.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "tillstand" {
  bucket = aws_s3_bucket.tillstand.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.data.arn
    }
  }
}
