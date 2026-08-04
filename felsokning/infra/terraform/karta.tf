# Kartan — hela systemet beskrivet som data.
#
# Resursfilerna läser härifrån i stället för att upprepa portar, namn och
# gränser. Det gör den här filen till ett ställe där man kan läsa av vad
# systemet faktiskt består av, och `terraform output karta` skriver ut
# samma sak i klartext.

locals {
  namn = "guidad-felsokning"

  etiketter = {
    "app.kubernetes.io/part-of"    = local.namn
    "app.kubernetes.io/managed-by" = "terraform"
    "guidad-felsokning/miljo"      = var.miljo
  }

  # Alla tjänster lyssnar internt på 8080 och exponeras som port 80 i
  # klustret. Databasen är den enda som inte följer mönstret.
  port_container = 8080
  port_tjanst    = 80

  # ---- Tjänsterna -----------------------------------------------------
  #
  # roll      vad den gör
  # bild      containerbilden
  # hemligt   vilka hemligheter den får se (allt annat är den blind för)
  # utat      vem den ringer

  tjanster = {
    web = {
      roll    = "Klienten. Statisk SPA bakom oprivilegierad nginx. Innehåller ingen hemlighet — API-adressen bakas in vid bygget."
      bild    = "${var.register}/${local.namn}-web:${var.bildtagg}"
      hemligt = []
      utat    = ["webbläsaren anropar plattform och orkester direkt över ingressen"]
    }
    plattform = {
      roll = "Backend. Auth, append-only händelse-API, Live Share, organisationsinställningar, ECM-regelpaket, märkesspecifika kopplingar."
      bild = "${var.register}/${local.namn}-plattform:${var.bildtagg}"
      hemligt = concat(
        ["jwt-hemlighet", "postgres-losenord", "integration-nyckel"],
        var.bilage_lage == "s3" ? ["s3-nyckel-id", "s3-nyckel"] : [],
      )
      utat = concat(
        ["postgres:5432", "kundernas leverantörer över internet (spärrat mot privata nät)"],
        var.bilage_lage == "s3" ? ["objektlagringen för bilagor"] : [],
      )
    }
    orkester = {
      roll    = "AI-orkestern. Routar per uppgift till Claude, äger systemprompt och svarsschema. Verifierar plattformens JWT."
      bild    = "${var.register}/${local.namn}-ai-orkester:${var.bildtagg}"
      hemligt = ["anthropic-api-nyckel", "jwt-hemlighet"]
      utat    = ["api.anthropic.com"]
    }
    postgres = {
      roll = join(" ", [
        "Händelseloggen — systemets enda sanningskälla. Append-only garanteras av databastriggers, inte bara av API:t.",
        var.databas_lage == "extern" ? "Läge: extern managerad Postgres — leverantören sköter backup och PITR." :
        var.databas_lage == "cnpg" ? "Läge: CloudNativePG i klustret — basbackup, WAL-arkivering, PITR och failover." :
        "Läge: inbyggd StatefulSet UTAN säkerhetskopiering — endast prov och demo."
      ])
      bild    = var.databas_lage == "cnpg" ? "ghcr.io/cloudnative-pg/postgresql:17.2" : var.databas_lage == "extern" ? "(utanför klustret)" : "postgres:17-alpine"
      hemligt = ["postgres-losenord"]
      utat    = var.databas_lage == "cnpg" ? ["objektlagringen för backup och WAL-arkiv"] : []
    }
  }

  # ---- Routing --------------------------------------------------------
  #
  # Längsta prefix vinner. Ordningen här är den ordning ingressen får
  # reglerna i.

  routing = [
    { prefix = "/api/ai", till = "ai-orkester", varfor = "AI-anrop går till orkestern, aldrig via plattformen" },
    { prefix = "/api", till = "plattform", varfor = "allt övrigt API" },
    { prefix = "/halsa", till = "plattform", varfor = "hälsokontroll" },
    { prefix = "/", till = "web", varfor = "klienten" },
  ]

  # ---- Hemligheterna --------------------------------------------------
  #
  # En enda Secret, men varje tjänst monterar bara sina egna nycklar.

  hemligheter = {
    "anthropic-api-key" = var.anthropic_api_nyckel
    "jwt-secret"        = coalesce(var.jwt_hemlighet, random_password.jwt.result)
    "postgres-losenord" = coalesce(var.postgres_losenord, random_password.postgres.result)
    "integration-nyckel" = coalesce(
      var.integration_nyckel,
      random_id.integration_nyckel.hex,
    )
    "s3-nyckel-id" = var.s3_nyckel_id
    "s3-nyckel"    = var.s3_nyckel
  }

  # ---- Dataflöden -----------------------------------------------------
  #
  # Det som är värt att förstå innan man ändrar något: vad som rör sig
  # var, och var gränserna går.

  dataflode = [
    "Tekniker → web → ingress → plattform → postgres    all ärendedata, append-only",
    "Tekniker → web → ingress → orkester → Claude       underlag ut, klassificerade svar in",
    "Kund     → ingress → plattform → postgres          Live Share: bara tillåtna händelsetyper",
    "Plattform → kundens leverantör                     VIN/regnr ut, fordonsuppgifter in",
  ]

  bilagor = {
    lage = var.bilage_lage
    var  = var.bilage_lage == "s3" ? "${var.s3.endpoint}/${var.s3.hink}/${var.s3.prefix}" : "tabellen bilage_innehall"
    hur = join(" ", [
      "Innehållet ligger utanför händelsen; loggen bär referensen och innehållets SHA-256.",
      "Innehållsadresserat, så samma foto lagras en gång.",
      "Hashen kontrolleras vid utlämning — en utbytt bild lämnas inte ut.",
    ])
  }

  granser = [
    "Organisationsgränsen: varje fråga mot ärendedata filtreras på organisation_id i SQL:en, inte i klienten.",
    "Delningsgränsen: tillåtelselista över händelsetyper per nivå (kund/partner/intern) — nya typer är interna tills de aktivt släpps fram.",
    "Hemlighetsgränsen: Claude-nyckeln och kundernas leverantörsnycklar finns bara serversidan. Klienten ser maskerade värden.",
    "Historikgränsen: append-only i både API och databas (triggers). Ingen roll kan ändra eller radera en händelse.",
    "Bilagegränsen: en bilaga kan bara hämtas via en delningslänk om händelsen den hör till är synlig på den nivån.",
  ]

  # ---- Det som medvetet inte ingår ------------------------------------

  avgransningar = concat(
    var.databas_lage == "inbyggd" ? ["INGEN SÄKERHETSKOPIERING — läget inbyggd har en volym och inget mer. Endast prov och demo."] : [],
    [
      "Observability. Ingen metrikexport, ingen tracing — bara containerloggar.",
      "Takt-begränsning på inloggning. Endast den publika beslutsvägen är begränsad, och bara per pod.",
      "Återkallelse av utfärdade JWT. En token gäller sin livstid ut även om användaren tas bort.",
    ],
  )
}

# Genereras bara när motsvarande variabel lämnats tom.
resource "random_password" "jwt" {
  length  = 64
  special = false
}

resource "random_password" "postgres" {
  length  = 32
  special = false
}

resource "random_id" "integration_nyckel" {
  byte_length = 32
}
