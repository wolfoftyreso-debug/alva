# Domän, certifikat och det som gör driften synlig.

# ---- Route 53 och ACM ---------------------------------------------------

data "aws_route53_zone" "befintlig" {
  count = var.zon_id != "" ? 1 : 0

  zone_id = var.zon_id
}

resource "aws_route53_zone" "ny" {
  count = var.zon_id == "" ? 1 : 0

  name = join(".", slice(split(".", var.doman), 1, length(split(".", var.doman))))

  tags = { Name = local.namn }
}

locals {
  zon = var.zon_id != "" ? data.aws_route53_zone.befintlig[0].zone_id : aws_route53_zone.ny[0].zone_id
}

resource "aws_acm_certificate" "denna" {
  domain_name       = var.doman
  validation_method = "DNS"

  subject_alternative_names = compact([
    var.gitea.aktiv && var.gitea.doman != "" ? var.gitea.doman : null,
  ])

  tags = { Name = local.namn }

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_route53_record" "validering" {
  for_each = {
    for d in aws_acm_certificate.denna.domain_validation_options : d.domain_name => {
      namn = d.resource_record_name
      typ  = d.resource_record_type
      post = d.resource_record_value
    }
  }

  zone_id         = local.zon
  name            = each.value.namn
  type            = each.value.typ
  records         = [each.value.post]
  ttl             = 60
  allow_overwrite = true
}

resource "aws_acm_certificate_validation" "denna" {
  certificate_arn         = aws_acm_certificate.denna.arn
  validation_record_fqdns = [for r in aws_route53_record.validering : r.fqdn]
}

# ---- Loggar -------------------------------------------------------------

resource "aws_cloudwatch_log_group" "flodeslogg" {
  name              = "/aws/vpc/${local.namn}/avvisad"
  retention_in_days = 30
  kms_key_id        = aws_kms_key.loggar.arn
}

resource "aws_cloudwatch_log_group" "applikation" {
  name              = "/felsokning/${var.miljo}/applikation"
  retention_in_days = 90
  kms_key_id        = aws_kms_key.loggar.arn
}

# ---- Larm ---------------------------------------------------------------
#
# Få larm, men de som finns betyder något. Ett larm som ingen agerar på
# lär folk att ignorera larm.

resource "aws_sns_topic" "larm" {
  name              = "${local.namn}-larm"
  kms_master_key_id = aws_kms_key.loggar.id
}

resource "aws_sns_topic_subscription" "larm" {
  count = var.larm_epost != "" ? 1 : 0

  topic_arn = aws_sns_topic.larm.arn
  protocol  = "email"
  endpoint  = var.larm_epost
}

resource "aws_cloudwatch_metric_alarm" "databas_cpu" {
  alarm_name          = "${local.namn}-databas-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 85
  alarm_description   = "Aurora ligger högt i tre perioder — skalningstaket kan vara nått."
  alarm_actions       = [aws_sns_topic.larm.arn]
  ok_actions          = [aws_sns_topic.larm.arn]
  treat_missing_data  = "notBreaching"

  dimensions = {
    DBClusterIdentifier = aws_rds_cluster.denna.cluster_identifier
  }
}

resource "aws_cloudwatch_metric_alarm" "databas_lagring" {
  alarm_name          = "${local.namn}-databas-fri-lagring"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 2
  metric_name         = "FreeLocalStorage"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 5 * 1024 * 1024 * 1024 # 5 GiB
  alarm_description   = "Lokal lagring håller på att ta slut."
  alarm_actions       = [aws_sns_topic.larm.arn]
  treat_missing_data  = "notBreaching"

  dimensions = {
    DBClusterIdentifier = aws_rds_cluster.denna.cluster_identifier
  }
}

# Det viktigaste larmet av alla: att säkerhetskopieringen faktiskt sker.
# En backup man tror finns är värre än ingen.
resource "aws_cloudwatch_metric_alarm" "backup_alder" {
  alarm_name          = "${local.namn}-backup-alder"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "BackupRetentionPeriodStorageUsed"
  namespace           = "AWS/RDS"
  period              = 3600
  statistic           = "Average"
  threshold           = 0
  alarm_description   = "Saknas mätvärdet finns ingen säkerhetskopiering — larmar på saknad data, inte på överskridet tröskelvärde."
  alarm_actions       = [aws_sns_topic.larm.arn]
  treat_missing_data  = "breaching"

  dimensions = {
    DBClusterIdentifier = aws_rds_cluster.denna.cluster_identifier
  }
}

resource "aws_cloudwatch_metric_alarm" "noder" {
  alarm_name          = "${local.namn}-noder-otillrackliga"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 2
  metric_name         = "cluster_node_count"
  namespace           = "ContainerInsights"
  period              = 300
  statistic           = "Minimum"
  threshold           = var.noder.minsta
  alarm_description   = "Färre noder än minsta önskade — kapacitet saknas eller en zon är nere."
  alarm_actions       = [aws_sns_topic.larm.arn]
  treat_missing_data  = "notBreaching"

  dimensions = {
    ClusterName = aws_eks_cluster.denna.name
  }
}

# ---- Larm på applikationens egna mätvärden ------------------------------
#
# Tjänsterna skriver CloudWatch EMF på stdout, så mätvärdena finns utan
# agent eller SDK. Larmen nedan är på det som teknikern faktiskt märker.

resource "aws_cloudwatch_metric_alarm" "svarstid" {
  alarm_name          = "${local.namn}-svarstid"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  threshold           = 3000
  alarm_description   = "Plattformen svarar långsamt i tre perioder — p95 över tre sekunder märks i verkstaden."
  alarm_actions       = [aws_sns_topic.larm.arn]
  ok_actions          = [aws_sns_topic.larm.arn]
  treat_missing_data  = "notBreaching"

  metric_query {
    id          = "p95"
    return_data = true

    metric {
      metric_name = "Svarstid"
      namespace   = "GuidadFelsokning"
      period      = 300
      # p95, inte medelvärde: medelvärdet döljer att var tjugonde
      # tekniker väntar orimligt länge.
      stat = "p95"

      dimensions = {
        "Tjänst" = "plattform"
      }
    }
  }
}

resource "aws_cloudwatch_metric_alarm" "fel" {
  alarm_name          = "${local.namn}-fel"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "Fel"
  namespace           = "GuidadFelsokning"
  period              = 300
  statistic           = "Sum"
  threshold           = 5
  alarm_description   = "Serverfel. Loggraden bär spår-id — sök på det i Logs Insights för hela kedjan."
  alarm_actions       = [aws_sns_topic.larm.arn]
  treat_missing_data  = "notBreaching"

  dimensions = {
    "Tjänst" = "plattform"
  }
}

resource "aws_cloudwatch_metric_alarm" "modell_avbojd" {
  alarm_name          = "${local.namn}-modell-avbojd"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "ModellAvbojd"
  namespace           = "GuidadFelsokning"
  period              = 900
  statistic           = "Sum"
  threshold           = 3
  alarm_description   = "Modellen avböjer förfrågningar — tyder på att underlaget innehåller något oväntat, inte på ett driftfel."
  alarm_actions       = [aws_sns_topic.larm.arn]
  treat_missing_data  = "notBreaching"
}

# ---- Instrumentpanel ----------------------------------------------------

resource "aws_cloudwatch_dashboard" "denna" {
  dashboard_name = local.namn

  dashboard_body = jsonencode({
    widgets = [
      {
        type = "metric", x = 0, y = 0, width = 12, height = 6
        properties = {
          title  = "Databas — belastning"
          region = var.region
          metrics = [
            ["AWS/RDS", "CPUUtilization", "DBClusterIdentifier", aws_rds_cluster.denna.cluster_identifier],
            [".", "DatabaseConnections", ".", "."],
            [".", "ServerlessDatabaseCapacity", ".", "."],
          ]
          period = 300
          stat   = "Average"
        }
      },
      {
        type = "metric", x = 12, y = 0, width = 12, height = 6
        properties = {
          title  = "Klustret"
          region = var.region
          metrics = [
            ["ContainerInsights", "cluster_node_count", "ClusterName", aws_eks_cluster.denna.name],
            [".", "cluster_failed_node_count", ".", "."],
            [".", "pod_cpu_utilization", ".", "."],
          ]
          period = 300
          stat   = "Average"
        }
      },
      {
        type = "metric", x = 0, y = 6, width = 12, height = 6
        properties = {
          title  = "Svarstid — där teknikern märker det"
          region = var.region
          metrics = [
            ["GuidadFelsokning", "Svarstid", "Tjänst", "plattform", { stat = "p50", label = "median" }],
            ["...", { stat = "p95", label = "p95" }],
            ["...", { stat = "p99", label = "p99" }],
          ]
          period = 300
          yAxis  = { left = { label = "ms" } }
        }
      },
      {
        type = "metric", x = 12, y = 6, width = 12, height = 6
        properties = {
          title  = "Modellanrop per uppgift"
          region = var.region
          metrics = [
            ["GuidadFelsokning", "Svarstid", "Tjänst", "ai-orkester", { stat = "p95" }],
            ["GuidadFelsokning", "ModellTokens", "Uppgift", "handledning", "Modell", "claude-sonnet-5", { stat = "Sum", yAxis = "right" }],
            ["...", "granskning", ".", "claude-opus-5", { stat = "Sum", yAxis = "right" }],
          ]
          period = 300
        }
      },
      {
        type = "log", x = 0, y = 12, width = 24, height = 6
        properties = {
          title  = "Långsammaste anropen — med nedbrytning av tiden"
          region = var.region
          query  = "SOURCE '${aws_cloudwatch_log_group.applikation.name}' | fields tid, väg, ms, delar.databas.ms as databas, delar.modell_handledning.ms as modell, spårId | filter ms > 1000 | sort ms desc | limit 20"
        }
      },
      {
        type = "metric", x = 0, y = 18, width = 12, height = 6
        properties = {
          title  = "Bilagor i objektlagringen"
          region = var.region
          metrics = [
            ["AWS/S3", "BucketSizeBytes", "BucketName", aws_s3_bucket.bilagor.id, "StorageType", "StandardStorage"],
            [".", "NumberOfObjects", ".", ".", ".", "AllStorageTypes"],
          ]
          period = 86400
          stat   = "Average"
        }
      },
    ]
  })
}
