# Vem får prata med vem.
#
# Utan nätverkspolicyer är ett Kubernetes-kluster platt: vilken pod som
# helst når databasen på 5432. Här stängs allt först, och bara de
# faktiska flödena öppnas — samma flöden som står i local.dataflode.
#
# Kräver en CNI som tillämpar NetworkPolicy (Cilium, Calico, Antrea).
# Med en CNI som inte gör det är de här reglerna dokumentation, inte
# skydd — kontrollera det innan ni litar på dem.

# Grundregel: ingen inkommande trafik alls i namnrymden.
resource "kubernetes_network_policy_v1" "neka_allt_in" {
  metadata {
    name      = "neka-allt-inkommande"
    namespace = kubernetes_namespace_v1.denna.metadata[0].name
    labels    = local.etiketter
  }

  spec {
    pod_selector {}
    policy_types = ["Ingress"]
  }
}

# Databasen: bara plattformstjänsten, bara 5432.
resource "kubernetes_network_policy_v1" "postgres_in" {
  metadata {
    name      = "postgres-endast-fran-plattform"
    namespace = kubernetes_namespace_v1.denna.metadata[0].name
    labels    = local.etiketter
  }

  spec {
    pod_selector {
      match_labels = { app = "postgres" }
    }

    policy_types = ["Ingress"]

    ingress {
      from {
        pod_selector {
          match_labels = { app = "plattform" }
        }
      }

      ports {
        port     = "5432"
        protocol = "TCP"
      }
    }
  }
}

# De tre webbtjänsterna: bara från ingress-kontrollern.
resource "kubernetes_network_policy_v1" "tjanster_in" {
  for_each = toset(["web", "plattform", "ai-orkester"])

  metadata {
    name      = "${each.key}-endast-fran-ingress"
    namespace = kubernetes_namespace_v1.denna.metadata[0].name
    labels    = local.etiketter
  }

  spec {
    pod_selector {
      match_labels = { app = each.key }
    }

    policy_types = ["Ingress"]

    ingress {
      from {
        namespace_selector {
          match_labels = {
            "kubernetes.io/metadata.name" = var.ingress_namnrymd
          }
        }
      }

      ports {
        port     = tostring(local.port_container)
        protocol = "TCP"
      }
    }
  }
}

# Utgående: DNS åt alla, i övrigt bara det som faktiskt behövs.
resource "kubernetes_network_policy_v1" "dns_ut" {
  metadata {
    name      = "dns-ut"
    namespace = kubernetes_namespace_v1.denna.metadata[0].name
    labels    = local.etiketter
  }

  spec {
    pod_selector {}
    policy_types = ["Egress"]

    egress {
      ports {
        port     = "53"
        protocol = "UDP"
      }

      ports {
        port     = "53"
        protocol = "TCP"
      }
    }
  }
}

# Klienten är statisk och ringer ingenting från podden.
resource "kubernetes_network_policy_v1" "web_ut" {
  metadata {
    name      = "web-inget-utgaende"
    namespace = kubernetes_namespace_v1.denna.metadata[0].name
    labels    = local.etiketter
  }

  spec {
    pod_selector {
      match_labels = { app = "web" }
    }

    policy_types = ["Egress"]
    # Ingen egress-regel = inget utgående (utöver DNS-policyn ovan).
  }
}

# Databasen ringer heller ingenting.
resource "kubernetes_network_policy_v1" "postgres_ut" {
  metadata {
    name      = "postgres-inget-utgaende"
    namespace = kubernetes_namespace_v1.denna.metadata[0].name
    labels    = local.etiketter
  }

  spec {
    pod_selector {
      match_labels = { app = "postgres" }
    }

    policy_types = ["Egress"]
  }
}

# Plattformen: databasen internt, och HTTPS ut till kundernas
# leverantörer. Klustrets och molnets interna adresser är undantagna —
# samma gräns som koden själv upprätthåller (pekarInat), här en gång till
# på nätverksnivå. Två oberoende spärrar för samma sak.
resource "kubernetes_network_policy_v1" "plattform_ut" {
  metadata {
    name      = "plattform-utgaende"
    namespace = kubernetes_namespace_v1.denna.metadata[0].name
    labels    = local.etiketter
  }

  spec {
    pod_selector {
      match_labels = { app = "plattform" }
    }

    policy_types = ["Egress"]

    egress {
      to {
        pod_selector {
          match_labels = { app = "postgres" }
        }
      }

      ports {
        port     = "5432"
        protocol = "TCP"
      }
    }

    egress {
      to {
        ip_block {
          cidr = "0.0.0.0/0"

          except = [
            "10.0.0.0/8",
            "172.16.0.0/12",
            "192.168.0.0/16",
            "169.254.0.0/16", # molnets metadatatjänst
            "127.0.0.0/8",
            "100.64.0.0/10",
          ]
        }
      }

      ports {
        port     = "443"
        protocol = "TCP"
      }
    }
  }
}

# Orkestern: bara HTTPS ut till Claude.
resource "kubernetes_network_policy_v1" "orkester_ut" {
  metadata {
    name      = "ai-orkester-utgaende"
    namespace = kubernetes_namespace_v1.denna.metadata[0].name
    labels    = local.etiketter
  }

  spec {
    pod_selector {
      match_labels = { app = "ai-orkester" }
    }

    policy_types = ["Egress"]

    egress {
      to {
        ip_block {
          cidr = "0.0.0.0/0"

          except = [
            "10.0.0.0/8",
            "172.16.0.0/12",
            "192.168.0.0/16",
            "169.254.0.0/16",
            "127.0.0.0/8",
          ]
        }
      }

      ports {
        port     = "443"
        protocol = "TCP"
      }
    }
  }
}
