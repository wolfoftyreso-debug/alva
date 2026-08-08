# Det lilla som inte kommer från AWS-basen.
#
# Domän, register, roller, certifikat, hink och hemligheternas namn läses
# ur basens utdata (05-aws.tf) — de ska inte anges två gånger.

variable "tillstandshink" {
  description = "S3-hinken där AWS-basens Terraform-tillstånd ligger. Basen skriver ut namnet."
  type        = string
}

variable "region" {
  description = "Region för tillståndshinken. Samma som basens."
  type        = string
  default     = "eu-north-1"
}

variable "namnrymd" {
  description = "Namnrymd för arbetslasten."
  type        = string
  default     = "guidad-felsokning"
}

variable "miljo" {
  description = "Miljöns namn. Sätts som label på allt."
  type        = string
  default     = "produktion"
}

variable "bildtagg" {
  description = <<-TEXT
    Taggen alla tre bilderna körs med — commit-SHA:t från
    publiceringsflödet. ECR har oföränderliga taggar, så en tagg pekar
    alltid på samma bygge.
  TEXT
  type        = string

  validation {
    condition     = var.bildtagg != ""
    error_message = "Ange en bildtagg — helst commit-SHA:t, aldrig tomt."
  }
}

# ---- Drift -------------------------------------------------------------

variable "registrering_oppen" {
  description = "Om vem som helst får skapa en ny organisation. Stäng i produktion."
  type        = bool
  default     = false
}

variable "tillat_interna_uppslag" {
  description = <<-TEXT
    Tillåter märkesspecifika uppslag mot privata nät. Behövs bara när
    verkstaden har en OEM-server på sitt eget nät. Öppnar samtidigt en
    väg från en tenant-administratör in i klustrets interna adresser —
    lämna av om ni inte vet att ni behöver det.
  TEXT
  type        = bool
  default     = false
}

variable "max_kropp_mb" {
  description = <<-TEXT
    Största tillåtna anropskropp. Bilagor laddas upp separat och kan
    vara upp till 32 MB — lastbalanserarens gräns måste rymma dem,
    annars avvisas dokumentationen redan vid dörren.
  TEXT
  type        = number
  default     = 64
}

variable "repliker" {
  description = "Grundantal repliker per tjänst (autoskalning tar över uppåt)."
  type = object({
    web       = number
    plattform = number
    orkester  = number
  })
  default = {
    web       = 2
    plattform = 2
    orkester  = 2
  }
}

variable "max_repliker" {
  description = "Tak för autoskalningen per tjänst."
  type = object({
    web       = number
    plattform = number
    orkester  = number
  })
  default = {
    web       = 10
    plattform = 10
    orkester  = 10
  }
}

# ---- Självhostad git ---------------------------------------------------

variable "gitea" {
  description = <<-TEXT
    Gitea med egna Actions-runners i samma kluster. Med den på finns
    inget externt beroende alls: källkod, bygge, register och drift
    ligger i vår egen AWS-miljö.
  TEXT
  type = object({
    aktiv   = optional(bool, true)
    doman   = optional(string, "")
    runners = optional(number, 2)
    lagring = optional(string, "20Gi")
  })
  default = {}
}
