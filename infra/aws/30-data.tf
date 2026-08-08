# Data: händelseloggen, bilagorna och bilderna.

# ---- Nycklar ------------------------------------------------------------
#
# Egna KMS-nycklar i stället för AWS delade. Det som vinns är
# åtkomstkontroll och revisionsspår per nyckel — och möjligheten att
# rotera eller spärra utan att röra något annat.

resource "aws_kms_key" "eks" {
  description             = "${local.namn} — hemligheter i etcd"
  enable_key_rotation     = true
  deletion_window_in_days = 30
}

resource "aws_kms_alias" "eks" {
  name          = "alias/${local.namn}-eks"
  target_key_id = aws_kms_key.eks.key_id
}

resource "aws_kms_key" "data" {
  description             = "${local.namn} — databas och bilagor"
  enable_key_rotation     = true
  deletion_window_in_days = 30
}

resource "aws_kms_alias" "data" {
  name          = "alias/${local.namn}-data"
  target_key_id = aws_kms_key.data.key_id
}

resource "aws_kms_key" "loggar" {
  description             = "${local.namn} — loggar"
  enable_key_rotation     = true
  deletion_window_in_days = 30

  # CloudWatch måste kunna kryptera med nyckeln.
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect    = "Allow"
        Principal = { AWS = "arn:${data.aws_partition.denna.partition}:iam::${data.aws_caller_identity.denna.account_id}:root" }
        Action    = "kms:*"
        Resource  = "*"
      },
      {
        Effect    = "Allow"
        Principal = { Service = "logs.${var.region}.amazonaws.com" }
        Action    = ["kms:Encrypt*", "kms:Decrypt*", "kms:ReEncrypt*", "kms:GenerateDataKey*", "kms:Describe*"]
        Resource  = "*"
        Condition = {
          ArnLike = {
            "kms:EncryptionContext:aws:logs:arn" = "arn:${data.aws_partition.denna.partition}:logs:${var.region}:${data.aws_caller_identity.denna.account_id}:log-group:*"
          }
        }
      },
    ]
  })
}

resource "aws_kms_alias" "loggar" {
  name          = "alias/${local.namn}-loggar"
  target_key_id = aws_kms_key.loggar.key_id
}

# ---- Aurora PostgreSQL --------------------------------------------------
#
# Serverless v2 skalar med lasten. Det som gör att den här databasen
# duger till händelseloggen är inte prestandan utan
# säkerhetskopieringen: automatisk backup med PITR ned till sekunden
# inom retentionsfönstret. Går loggen förlorad är varje ärendes
# bevisvärde borta, och det går inte att återskapa i efterhand.

resource "aws_db_subnet_group" "denna" {
  name       = local.namn
  subnet_ids = aws_subnet.data[*].id

  tags = { Name = local.namn }
}

resource "aws_security_group" "databas" {
  name        = "${local.namn}-databas"
  description = "Aurora — tar bara emot från noderna."
  vpc_id      = aws_vpc.denna.id

  ingress {
    description     = "PostgreSQL från klustrets noder"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.noder.id]
  }

  # Ingen egress-regel: databasen ska inte kunna ringa någonstans.

  tags = { Name = "${local.namn}-databas" }
}

resource "random_password" "databas" {
  length  = 40
  special = false # undviker citeringsproblem i anslutningssträngar
}

resource "aws_rds_cluster" "denna" {
  cluster_identifier = local.namn
  engine             = "aurora-postgresql"
  engine_mode        = "provisioned"
  engine_version     = var.databas.version
  database_name      = "felsokning"
  master_username    = "plattform"
  master_password    = random_password.databas.result

  db_subnet_group_name   = aws_db_subnet_group.denna.name
  vpc_security_group_ids = [aws_security_group.databas.id]

  storage_encrypted = true
  kms_key_id        = aws_kms_key.data.arn

  backup_retention_period      = var.databas.backup_dagar
  preferred_backup_window      = "02:00-03:00"
  preferred_maintenance_window = "sun:03:30-sun:04:30"
  copy_tags_to_snapshot        = true

  deletion_protection       = var.databas.raderingsskydd
  skip_final_snapshot       = false
  final_snapshot_identifier = "${local.namn}-slutlig"

  # Loggarna behövs för att i efterhand kunna se vad som kördes.
  enabled_cloudwatch_logs_exports = ["postgresql"]

  serverlessv2_scaling_configuration {
    min_capacity = var.databas.min_kapacitet
    max_capacity = var.databas.max_kapacitet
  }

  tags = { Name = local.namn }

  lifecycle {
    ignore_changes = [master_password] # roteras via Secrets Manager
  }
}

resource "aws_rds_cluster_instance" "denna" {
  count = var.databas.instanser

  identifier          = "${local.namn}-${count.index}"
  cluster_identifier  = aws_rds_cluster.denna.id
  instance_class      = "db.serverless"
  engine              = aws_rds_cluster.denna.engine
  engine_version      = aws_rds_cluster.denna.engine_version
  publicly_accessible = false

  performance_insights_enabled    = true
  performance_insights_kms_key_id = aws_kms_key.data.arn
  monitoring_interval             = 30
  monitoring_role_arn             = aws_iam_role.rds_overvakning.arn

  tags = { Name = "${local.namn}-${count.index}" }
}

resource "aws_iam_role" "rds_overvakning" {
  name = "${local.namn}-rds-overvakning"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "monitoring.rds.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "rds_overvakning" {
  role       = aws_iam_role.rds_overvakning.name
  policy_arn = "arn:${data.aws_partition.denna.partition}:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
}

# ---- S3 för bilagor -----------------------------------------------------
#
# Foton och videoklipp. Innehållsadresserade — nyckeln är innehållets
# SHA-256 — så versionshantering skyddar mot oavsiktlig radering snarare
# än mot överskrivning: samma nyckel har alltid samma innehåll.

resource "aws_s3_bucket" "bilagor" {
  bucket = "${local.namn}-bilagor-${data.aws_caller_identity.denna.account_id}"

  tags = { Name = "${local.namn}-bilagor" }
}

resource "aws_s3_bucket_public_access_block" "bilagor" {
  bucket = aws_s3_bucket.bilagor.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_versioning" "bilagor" {
  bucket = aws_s3_bucket.bilagor.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "bilagor" {
  bucket = aws_s3_bucket.bilagor.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.data.arn
    }
    bucket_key_enabled = true # färre KMS-anrop, lägre kostnad
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "bilagor" {
  bucket = aws_s3_bucket.bilagor.id

  rule {
    id     = "stada-gamla-versioner"
    status = "Enabled"

    filter {}

    noncurrent_version_expiration {
      noncurrent_days = 90
    }

    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }
}

resource "aws_s3_bucket_policy" "bilagor" {
  bucket = aws_s3_bucket.bilagor.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "KravTLS"
      Effect    = "Deny"
      Principal = "*"
      Action    = "s3:*"
      Resource  = [aws_s3_bucket.bilagor.arn, "${aws_s3_bucket.bilagor.arn}/*"]
      Condition = { Bool = { "aws:SecureTransport" = "false" } }
    }]
  })

  depends_on = [aws_s3_bucket_public_access_block.bilagor]
}

# ---- ECR ----------------------------------------------------------------
#
# Vårt eget register. Oföränderliga taggar: en tagg som en gång pekat på
# ett bygge kan inte peka på ett annat, så "vilken kod kör i produktion"
# har ett entydigt svar.

resource "aws_ecr_repository" "denna" {
  for_each = toset([
    "guidad-felsokning-web",
    "guidad-felsokning-plattform",
    "guidad-felsokning-ai-orkester",
  ])

  name                 = each.key
  image_tag_mutability = "IMMUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "KMS"
    kms_key         = aws_kms_key.data.arn
  }

  tags = { Name = each.key }
}

resource "aws_ecr_lifecycle_policy" "denna" {
  for_each = aws_ecr_repository.denna

  repository = each.value.name

  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Behåll de 30 senaste bilderna."
      selection = {
        tagStatus   = "any"
        countType   = "imageCountMoreThan"
        countNumber = 30
      }
      action = { type = "expire" }
    }]
  })
}
