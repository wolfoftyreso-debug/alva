# Det arbetslastlagret behöver, och kartan i klartext.
#
#   terraform output karta        hela AWS-basen
#   terraform output -json for_arbetslast  matas in i felsokning/infra/terraform

output "karta" {
  description = "AWS-basen: nät, kluster, data, hemligheter och gränser."

  value = {
    region = var.region
    miljo  = var.miljo
    doman  = "https://${var.doman}"

    nat = {
      vpc          = "${aws_vpc.denna.id} (${var.vpc_cidr})"
      zoner        = local.zoner
      publikt      = "bara lastbalanserare och NAT"
      privat       = "noderna — inga publika adresser"
      data         = "Aurora — ingen väg ut alls"
      nat_gateways = var.nat_per_zon ? "en per zon" : "en delad (ej produktion)"
      endpoints    = "S3 via gateway; ECR, loggar, Secrets Manager, STS och ELB via gränssnitt — trafiken lämnar aldrig nätet"
    }

    kluster = {
      namn      = aws_eks_cluster.denna.name
      version   = aws_eks_cluster.denna.version
      slutpunkt = aws_eks_cluster.denna.endpoint
      noder     = "${var.noder.minsta}–${var.noder.hogsta} × ${join(", ", var.nod_typer)} (arm64)"
      auth      = "IRSA — varje tjänstekonto har egen roll; noderna delar inga rättigheter"
      loggar    = "api, audit, authenticator, controllerManager, scheduler"
      metadata  = "IMDSv2 obligatoriskt, hoppgräns 1 — podar kan inte låna nodens roll"
    }

    databas = {
      motor      = "Aurora PostgreSQL ${aws_rds_cluster.denna.engine_version} Serverless v2"
      kapacitet  = "${var.databas.min_kapacitet}–${var.databas.max_kapacitet} ACU × ${var.databas.instanser} instanser"
      slutpunkt  = aws_rds_cluster.denna.endpoint
      backup     = "${var.databas.backup_dagar} dagar med PITR ned till sekunden"
      kryptering = "KMS med egen nyckel, i vila och över nätet (sslmode=require)"
      atkomst    = "endast från klustrets noder, i ett subnätlager utan routing ut"
    }

    bilagor = {
      hink       = aws_s3_bucket.bilagor.id
      kryptering = "SSE-KMS med egen nyckel"
      skydd      = "publik åtkomst blockerad, TLS obligatoriskt, versionshantering på"
      atkomst    = "plattformens roll får läsa och skriva — men aldrig radera"
    }

    register = {
      for namn, r in aws_ecr_repository.denna : namn => "${r.repository_url} (oföränderliga taggar, sårbarhetsskanning)"
    }

    hemligheter = {
      databas = aws_secretsmanager_secret.databas.name
      app     = "${aws_secretsmanager_secret.app.name} — Claude-nyckeln fylls i för hand efter första apply"
      lasare  = "endast rollen ${aws_iam_role.plattform.name}, via IRSA"
    }

    roller = {
      plattform       = aws_iam_role.plattform.arn
      lastbalanserare = aws_iam_role.lastbalanserare.arn
      bygg            = "${aws_iam_role.bygg.arn} — får publicera till ECR, får inte röra klustret"
      drift           = "${aws_iam_role.drift.arn} — får röra klustret, får inte publicera bilder"
    }

    observation = {
      instrumentpanel = "https://${var.region}.console.aws.amazon.com/cloudwatch/home?region=${var.region}#dashboards:name=${aws_cloudwatch_dashboard.denna.dashboard_name}"
      larm            = var.larm_epost != "" ? "till ${var.larm_epost}" : "INGEN mottagare satt — larm går ingenstans"
      flodesloggar    = "avvisad trafik, 30 dagar"
    }

    kvar_att_gora = compact([
      "Fyll i Claude-nyckeln: aws secretsmanager put-secret-value --secret-id ${aws_secretsmanager_secret.app.name}",
      "Kör felsokning/infra/postgres-init.sql mot databasen — schemat med append-only-triggarna.",
      "Kör arbetslastlagret: cd ../terraform && terraform apply",
      var.larm_epost == "" ? "Sätt larm_epost — annars larmar ingenting till någon." : "",
      var.tillatna_api_cidr == ["0.0.0.0/0"] ? "Begränsa tillatna_api_cidr — API-servern är öppen mot hela internet." : "",
    ])
  }
}

# Matas in i arbetslastlagret så det inte behöver upprepa någonting.
output "for_arbetslast" {
  description = "Värden som felsokning/infra/terraform behöver."

  value = {
    region              = var.region
    kluster             = aws_eks_cluster.denna.name
    kluster_slutpunkt   = aws_eks_cluster.denna.endpoint
    kluster_ca          = aws_eks_cluster.denna.certificate_authority[0].data
    doman               = var.doman
    certifikat_arn      = aws_acm_certificate_validation.denna.certificate_arn
    register            = split("/", aws_ecr_repository.denna["guidad-felsokning-web"].repository_url)[0]
    plattform_roll      = aws_iam_role.plattform.arn
    lastbalanserar_roll = aws_iam_role.lastbalanserare.arn
    bilage_hink         = aws_s3_bucket.bilagor.id
    hemlighet_databas   = aws_secretsmanager_secret.databas.name
    hemlighet_app       = aws_secretsmanager_secret.app.name
    zon_id              = local.zon
  }
}

output "databas_url" {
  description = "Anslutningssträng. Hämtas normalt ur Secrets Manager — den här är för engångskörning av schemat."
  sensitive   = true
  value       = "postgresql://${aws_rds_cluster.denna.master_username}:${random_password.databas.result}@${aws_rds_cluster.denna.endpoint}:5432/${aws_rds_cluster.denna.database_name}?sslmode=require"
}
