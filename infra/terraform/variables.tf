# Allt som skiljer en installation från en annan. Inget annat ska
# behöva ändras i .tf-filerna för att driftsätta i en ny miljö.

# ---- Kluster -----------------------------------------------------------

variable "kubeconfig" {
  description = "Sökväg till kubeconfig."
  type        = string
  default     = "~/.kube/config"
}

variable "kube_context" {
  description = "Kubernetes-kontext att driftsätta i. Tom = kubeconfigens aktuella."
  type        = string
  default     = ""
}

variable "namnrymd" {
  description = "Namnrymd för hela systemet."
  type        = string
  default     = "guidad-felsokning"
}

variable "miljo" {
  description = "Miljöns namn (produktion, test, demo). Sätts som label på allt."
  type        = string
  default     = "produktion"
}

# ---- Domän och certifikat ---------------------------------------------

variable "doman" {
  description = "Domänen klienten och API:t nås på, t.ex. app.exempel.se."
  type        = string
}

variable "cert_issuer" {
  description = "cert-manager ClusterIssuer som utfärdar TLS-certifikatet."
  type        = string
  default     = "letsencrypt"
}

variable "ingress_klass" {
  description = "IngressClass. Nätverkspolicyn öppnar för ingress-kontrollerns namnrymd nedan."
  type        = string
  default     = "nginx"
}

variable "ingress_namnrymd" {
  description = "Namnrymd där ingress-kontrollern kör — behövs av nätverkspolicyn."
  type        = string
  default     = "ingress-nginx"
}

# ---- Bilder ------------------------------------------------------------

variable "register" {
  description = "Containerregister, t.ex. ghcr.io/min-organisation."
  type        = string
}

variable "bildtagg" {
  description = <<-TEXT
    Taggen alla tre bilderna körs med — normalt git-SHA:t från
    publiceringsflödet. "latest" duger för prov men gör en rullning
    omöjlig att spåra.
  TEXT
  type        = string

  validation {
    condition     = var.bildtagg != ""
    error_message = "Ange en bildtagg — helst git-SHA:t, aldrig tomt."
  }
}

# ---- Hemligheter -------------------------------------------------------
#
# Sätts helst via en secrets-hanterare (External Secrets, Vault, molnets
# secret manager) i stället för tfvars. Lämnas de tomma genererar
# Terraform slumpvärden vid första körningen och behåller dem i
# tillståndet — bekvämt för prov, men då måste tillståndet skyddas
# därefter.

variable "anthropic_api_nyckel" {
  description = "Claude API-nyckel. Ägs av plattformen, når aldrig klienten."
  type        = string
  sensitive   = true
}

variable "jwt_hemlighet" {
  description = "HS256-hemlighet. Delas av plattformen och orkestern. Tom = genereras."
  type        = string
  sensitive   = true
  default     = ""
}

variable "postgres_losenord" {
  description = "Databaslösenord. Tom = genereras."
  type        = string
  sensitive   = true
  default     = ""
}

variable "integration_nyckel" {
  description = <<-TEXT
    32 byte hex som krypterar kundernas leverantörsuppgifter i vila.
    Tom = genereras. Byts nyckeln måste alla kopplingar sparas om —
    tjänsten visar då inga värden i stället för att gissa.
  TEXT
  type        = string
  sensitive   = true
  default     = ""
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
    Största tillåtna anropskropp. Foton och videoklipp följer med i
    händelseloggen, så ingressens gräns måste minst motsvara tjänstens
    egen (4 MB) — annars avvisas dokumentationen redan vid dörren.
  TEXT
  type        = number
  default     = 8
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

variable "databas_storlek" {
  description = "Volymstorlek för händelseloggen. Foton och video ligger inline i loggen."
  type        = string
  default     = "50Gi"
}

variable "lagringsklass" {
  description = "StorageClass för databasvolymen. Tom = klustrets standard."
  type        = string
  default     = ""
}
