variable "region" {
  description = "AWS-region. eu-north-1 (Stockholm) håller fordonsdata inom EU."
  type        = string
  default     = "eu-north-1"
}

variable "miljo" {
  description = "Miljöns namn — ingår i alla resursnamn och taggar."
  type        = string
  default     = "produktion"
}

variable "doman" {
  description = "Domänen tjänsten nås på, t.ex. felsokning.exempel.se."
  type        = string
}

variable "zon_id" {
  description = <<-TEXT
    Befintlig Route 53-zon att skapa posten i. Lämnas den tom skapas en
    ny publik zon för domänens rot — då måste namnservrarna pekas om hos
    registraren innan certifikatet kan utfärdas.
  TEXT
  type        = string
  default     = ""
}

# ---- Nät ---------------------------------------------------------------

variable "vpc_cidr" {
  description = "Adressrymd för VPC:n."
  type        = string
  default     = "10.42.0.0/16"

  validation {
    condition     = can(cidrsubnet(var.vpc_cidr, 4, 0))
    error_message = "vpc_cidr måste vara ett giltigt CIDR med plats för /20-subnät."
  }
}

variable "antal_zoner" {
  description = "Antal tillgänglighetszoner. Tre ger failover som överlever att en zon försvinner."
  type        = number
  default     = 3

  validation {
    condition     = var.antal_zoner >= 2 && var.antal_zoner <= 4
    error_message = "antal_zoner måste vara mellan 2 och 4."
  }
}

variable "nat_per_zon" {
  description = <<-TEXT
    En NAT-gateway per zon i stället för en delad. Rätt i produktion —
    med en delad blir den zonen en enskild felkälla för all utgående
    trafik. Kostar mer, så av i test.
  TEXT
  type        = bool
  default     = true
}

# ---- Kluster -----------------------------------------------------------

variable "kubernetes_version" {
  description = "EKS-version."
  type        = string
  default     = "1.31"
}

variable "nod_typer" {
  description = "Instanstyper för nodgruppen. Flera ökar chansen att kapacitet finns."
  type        = list(string)
  default     = ["m7g.large", "m6g.large"]
}

variable "noder" {
  description = "Nodgruppens storlek."
  type = object({
    minsta = number
    onskad = number
    hogsta = number
  })
  default = {
    minsta = 3
    onskad = 3
    hogsta = 10
  }
}

variable "tillatna_api_cidr" {
  description = <<-TEXT
    Varifrån EKS API-server får nås. Standard är öppet eftersom det
    annars inte går att komma åt klustret alls från en ny miljö —
    begränsa till kontorets och byggrunnernas adresser i produktion.
  TEXT
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

# ---- Databas -----------------------------------------------------------

variable "databas" {
  description = <<-TEXT
    Aurora PostgreSQL. Serverless v2 skalar efter last; min_kapacitet
    0.5 ACU räcker för en liten verkstad, max sätter taket.
    backup_dagar styr både automatisk säkerhetskopiering och hur långt
    tillbaka PITR går.
  TEXT
  type = object({
    version        = optional(string, "16.6")
    min_kapacitet  = optional(number, 0.5)
    max_kapacitet  = optional(number, 8)
    instanser      = optional(number, 2)
    backup_dagar   = optional(number, 30)
    raderingsskydd = optional(bool, true)
  })
  default = {}
}

# ---- Larm --------------------------------------------------------------

variable "larm_epost" {
  description = "Adress som larm skickas till. Tom = inget SNS-abonnemang skapas."
  type        = string
  default     = ""
}

# ---- Självhostad git ---------------------------------------------------

variable "gitea" {
  description = <<-TEXT
    Självhostad git med egna byggrunners, så varken källkod, bygge eller
    register ligger hos någon annan. Slås av om ni tills vidare kör git
    någon annanstans.
  TEXT
  type = object({
    aktiv   = optional(bool, true)
    doman   = optional(string, "")
    runners = optional(number, 2)
  })
  default = {}
}
