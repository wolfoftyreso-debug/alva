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
      bild    = "${local.aws.register}/${local.namn}-web:${var.bildtagg}"
      hemligt = []
      utat    = ["webbläsaren anropar plattform och orkester direkt över ingressen"]
    }
    plattform = {
      roll    = "Backend. Auth, append-only händelse-API, Live Share, organisationsinställningar, ECM-regelpaket, märkesspecifika kopplingar."
      bild    = "${local.aws.register}/${local.namn}-plattform:${var.bildtagg}"
      hemligt = ["allt via Secrets Manager: databas, Claude-nyckel, JWT, krypteringsnyckel"]
      utat    = ["Aurora:5432", "S3 för bilagor", "kundernas leverantörer (spärrat mot privata nät)"]
    }
    orkester = {
      roll    = "AI-orkestern. Routar per uppgift till Claude, äger systemprompt och svarsschema. Verifierar plattformens JWT."
      bild    = "${local.aws.register}/${local.namn}-ai-orkester:${var.bildtagg}"
      hemligt = ["anthropic-api-nyckel", "jwt-hemlighet"]
      utat    = ["api.anthropic.com"]
    }
    postgres = {
      roll    = "Händelseloggen ligger i Aurora utanför klustret — se AWS-basen. Append-only garanteras av databastriggers, säkerhetskopiering och PITR av Aurora."
      bild    = "(Aurora PostgreSQL, managerad)"
      hemligt = ["databasens anslutningssträng, ur Secrets Manager"]
      utat    = []
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
    kalla   = "AWS Secrets Manager — Terraform ser aldrig värdena"
    speglas = "External Secrets, var timme, med tjänstekontots roll"
    lasare  = "endast plattformens tjänstekonto, via IRSA"
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
    lage = "s3"
    var  = "S3-hinken ur AWS-basen"
    hur = join(" ", [
      "Innehållet ligger utanför händelsen; loggen bär referensen och innehållets SHA-256.",
      "Innehållsadresserat, så samma foto lagras en gång.",
      "Hashen kontrolleras vid utlämning — en utbytt bild lämnas inte ut.",
      "Tjänsten signerar mot S3 med tjänstekontots roll; inga nycklar finns.",
    ])
  }

  granser = [
    "Organisationsgränsen: varje fråga mot ärendedata filtreras på organisation_id i SQL:en, inte i klienten.",
    "Delningsgränsen: tillåtelselista över händelsetyper per nivå (kund/partner/intern) — nya typer är interna tills de aktivt släpps fram.",
    "Hemlighetsgränsen: Claude-nyckeln och kundernas leverantörsnycklar finns bara serversidan. Klienten ser maskerade värden.",
    "Historikgränsen: append-only i både API och databas (triggers). Ingen roll kan ändra eller radera en händelse.",
    "AWS-gränsen: varje roll är bunden till exakt ett tjänstekonto i en namnrymd (IRSA). Bygget får publicera men inte driftsätta; driften tvärtom.",
    "Bilagegränsen: en bilaga kan bara hämtas via en delningslänk om händelsen den hör till är synlig på den nivån.",
  ]

  # ---- Det som medvetet inte ingår ------------------------------------

  avgransningar = [
    "Observability är CloudWatch: loggar, Container Insights och fyra larm. Ingen distribuerad tracing.",
    "Takt-begränsning på inloggning är databasbackad och håller bakom flera repliker; övriga endpoints har ingen.",
  ]
}

