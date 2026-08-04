# Namnrymden och den enda hemligheten.

resource "kubernetes_namespace_v1" "denna" {
  metadata {
    name   = var.namnrymd
    labels = local.etiketter
  }
}

# En Secret, men varje tjänst monterar bara sina egna nycklar — se
# hemligt-fältet per tjänst i karta.tf.
#
# Vill ni hellre ha hemligheterna utanför Terraform-tillståndet: byt den
# här resursen mot ett ExternalSecret och peka manifesten på samma namn.
resource "kubernetes_secret_v1" "hemligheter" {
  metadata {
    name      = "felsokning-hemligheter"
    namespace = kubernetes_namespace_v1.denna.metadata[0].name
    labels    = local.etiketter
  }

  type = "Opaque"
  data = local.hemligheter
}

# Databasschemat körs vid databasens första start. Samma fil används av
# integrationstestet, så schemat kan aldrig glida isär från det som testas.
# I inbyggt läge körs schemat av postgres-bilden vid första starten, i
# cnpg-läget av operatorn via postInitApplicationSQLRefs. I externt läge
# ansvarar ni för att köra filen mot er databas.
resource "kubernetes_config_map_v1" "postgres_init" {
  count = local.extern_databas ? 0 : 1

  metadata {
    name      = "postgres-init"
    namespace = kubernetes_namespace_v1.denna.metadata[0].name
    labels    = local.etiketter
  }

  data = {
    "init.sql" = file("${path.module}/../postgres-init.sql")
  }
}
