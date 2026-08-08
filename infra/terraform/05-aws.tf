# Kopplingen till AWS-basen.
#
# Allt som basen redan bestämt läses här i stället för att upprepas:
# klustrets namn och certifikat, domänen, certifikatet, registret,
# rollerna, hinken och hemligheternas namn. Ändras något i basen slår
# det igenom här utan att en enda rad ändras.

data "terraform_remote_state" "bas" {
  backend = "s3"

  config = {
    bucket = var.tillstandshink
    key    = "aws/terraform.tfstate"
    region = var.region
  }
}

locals {
  aws = data.terraform_remote_state.bas.outputs.for_arbetslast

  # På AWS är valen redan gjorda: databasen är Aurora med
  # säkerhetskopiering och PITR, bilagorna ligger i S3. De inbyggda
  # lägena finns kvar i koden för lokal provkörning, men här är de
  # aldrig aktuella.
  databas_lage = "extern"
  bilage_lage  = "s3"

  inbyggd_databas = false
  cnpg_databas    = false
  extern_databas  = true

  # Plattformstjänsten läser DATABASE_URL. Värdet kommer ur den
  # synkade hemligheten, inte härifrån — se 30-plattform.tf.
  databas_anslutning = "" # sätts via secretKeyRef
}
