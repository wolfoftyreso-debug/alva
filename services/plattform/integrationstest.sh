#!/usr/bin/env bash
# Integrationstest för plattformstjänsten mot en riktig Postgres.
# Kör hela flödet: registrering (org + admin), synk av händelser,
# idempotens, append-only-triggern, organisationsisolering, publik
# delning med filtrering samt rollstyrd användarhantering.
#
# Krav: postgres (initdb/pg_ctl), node, curl. Kör: bash integrationstest.sh
set -euo pipefail
cd "$(dirname "$0")"

PGPORT=5499
APPPORT=8399
BAS="http://127.0.0.1:$APPPORT"
DATADIR=$(mktemp -d)
PGBIN=$(ls -d /usr/lib/postgresql/*/bin | head -1)

stada() {
  kill "$SERVER_PID" 2>/dev/null || true
  su postgres -c "$PGBIN/pg_ctl -D '$DATADIR' stop -m immediate" >/dev/null 2>&1 || true
  rm -rf "$DATADIR"
}
trap stada EXIT

# ---- Postgres upp ----
chown postgres "$DATADIR"
su postgres -c "$PGBIN/initdb -D '$DATADIR' -A trust" >/dev/null
su postgres -c "$PGBIN/pg_ctl -D '$DATADIR' -o '-p $PGPORT -k /tmp -c listen_addresses=127.0.0.1' -l '$DATADIR/logg' start" >/dev/null
su postgres -c "$PGBIN/psql -h /tmp -p $PGPORT -d postgres -qc \"create role plattform login password 'test'\""
su postgres -c "$PGBIN/psql -h /tmp -p $PGPORT -d postgres -qc 'create database felsokning owner plattform'"
PGPASSWORD=test "$PGBIN/psql" -h 127.0.0.1 -p $PGPORT -U plattform -d felsokning -q -f ../../infra/k8s/postgres-init.sql

# ---- Tjänsten upp ----
DATABASE_URL="postgresql://plattform:test@127.0.0.1:$PGPORT/felsokning" \
  JWT_SECRET=integrationshemlighet PORT=$APPPORT node server.mjs &
SERVER_PID=$!
sleep 1

falt() { node -pe "JSON.parse(require('fs').readFileSync(0,'utf8'))$1"; }
kontroll() { # kontroll <namn> <faktiskt> <forvantat>
  if [ "$2" = "$3" ]; then echo "✓ $1"; else echo "✗ $1: fick '$2', väntade '$3'"; exit 1; fi
}

# 1. Registrera organisation A (admin)
SVAR=$(curl -s -X POST "$BAS/api/auth/registrera" -H 'Content-Type: application/json' \
  -d '{"epost":"anna@a.se","losenord":"hemligt123","namn":"Anna","organisation":"Verkstad A"}')
TOKEN_A=$(echo "$SVAR" | falt .token); kontroll "registrering ger admin" "$(echo "$SVAR" | falt .roll)" "admin"
kontroll "organisationsnamn" "$(echo "$SVAR" | falt .organisation)" "Verkstad A"

# 2. Skapa ärende + händelser (inkl. internt kategoribyte)
curl -s -X POST "$BAS/api/arenden" -H "Authorization: Bearer $TOKEN_A" -H 'Content-Type: application/json' \
  -d '{"id":"arende-test1","nummer":1,"skapad":"2026-08-03T08:00:00Z","delningskod":"delkod123"}' >/dev/null
curl -s -X POST "$BAS/api/arenden/arende-test1/handelser" -H "Authorization: Bearer $TOKEN_A" -H 'Content-Type: application/json' \
  -d '{"handelser":[
    {"id":"h1","tidpunkt":"2026-08-03T08:01:00Z","anvandare":"Anna","handelse":{"typ":"felbeskrivning","text":"Startar inte"}},
    {"id":"h2","tidpunkt":"2026-08-03T08:02:00Z","anvandare":"Anna","handelse":{"typ":"kategori_byte","kategori":"provkorning"}}
  ]}' >/dev/null
ANTAL=$(curl -s "$BAS/api/arenden/arende-test1/handelser" -H "Authorization: Bearer $TOKEN_A" | falt .handelser.length)
kontroll "händelser sparade" "$ANTAL" "2"

# 3. Idempotens: samma push igen ändrar ingenting
curl -s -X POST "$BAS/api/arenden/arende-test1/handelser" -H "Authorization: Bearer $TOKEN_A" -H 'Content-Type: application/json' \
  -d '{"handelser":[{"id":"h1","tidpunkt":"2026-08-03T08:01:00Z","anvandare":"Anna","handelse":{"typ":"felbeskrivning","text":"ÄNDRAD"}}]}' >/dev/null
TEXT=$(curl -s "$BAS/api/arenden/arende-test1/handelser" -H "Authorization: Bearer $TOKEN_A" | falt '.handelser[0].handelse.text')
kontroll "händelser skrivs aldrig över" "$TEXT" "Startar inte"

# 4. Append-only-triggern stoppar direkta ändringar i databasen
if PGPASSWORD=test "$PGBIN/psql" -h 127.0.0.1 -p $PGPORT -U plattform -d felsokning \
  -qc "update felsokning_handelser set anvandare='hackad' where id='h1'" 2>/dev/null; then
  echo "✗ append-only-trigger saknas"; exit 1
else
  echo "✓ databastriggern avvisar update"
fi

# 5. Organisationsisolering: org B ser inte org A:s ärenden
TOKEN_B=$(curl -s -X POST "$BAS/api/auth/registrera" -H 'Content-Type: application/json' \
  -d '{"epost":"bo@b.se","losenord":"hemligt123","namn":"Bo","organisation":"Verkstad B"}' | falt .token)
KOD=$(curl -s -o /dev/null -w "%{http_code}" "$BAS/api/arenden/arende-test1/handelser" -H "Authorization: Bearer $TOKEN_B")
kontroll "org B nekas org A:s händelser" "$KOD" "404"
ANTAL_B=$(curl -s "$BAS/api/arenden" -H "Authorization: Bearer $TOKEN_B" | falt .arenden.length)
kontroll "org B:s ärendelista är tom" "$ANTAL_B" "0"

# 6. Publik delning: utan inloggning, interna poster filtrerade
DELAT=$(curl -s "$BAS/api/delad/delkod123")
kontroll "delning nås utan inloggning" "$(echo "$DELAT" | falt .handelser.length)" "1"
kontroll "kategoribyte filtreras ur delning" "$(echo "$DELAT" | falt '.handelser[0].handelse.typ')" "felbeskrivning"

# 7. Rollstyrning: admin skapar tekniker; tekniker får inte hantera användare
curl -s -X POST "$BAS/api/anvandare" -H "Authorization: Bearer $TOKEN_A" -H 'Content-Type: application/json' \
  -d '{"epost":"johan@a.se","losenord":"hemligt123","namn":"Johan","roll":"tekniker"}' >/dev/null
TOKEN_J=$(curl -s -X POST "$BAS/api/auth/logga-in" -H 'Content-Type: application/json' \
  -d '{"epost":"johan@a.se","losenord":"hemligt123"}' | falt .token)
KOD=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BAS/api/anvandare" -H "Authorization: Bearer $TOKEN_J" \
  -H 'Content-Type: application/json' -d '{"epost":"x@a.se","losenord":"hemligt123","namn":"X","roll":"admin"}')
kontroll "tekniker nekas användarhantering" "$KOD" "403"
ANTAL_ANV=$(curl -s "$BAS/api/anvandare" -H "Authorization: Bearer $TOKEN_A" | falt .anvandare.length)
kontroll "org A har två användare" "$ANTAL_ANV" "2"

# 8. Tekniker i org A når ärendet (delad arbetsyta inom organisationen)
ANTAL=$(curl -s "$BAS/api/arenden/arende-test1/handelser" -H "Authorization: Bearer $TOKEN_J" | falt .handelser.length)
kontroll "tekniker i samma org når ärendet" "$ANTAL" "2"

# 9. Organisationsöversikten: tekniker nekas; arbetsledare får status ur loggen
KOD=$(curl -s -o /dev/null -w "%{http_code}" "$BAS/api/oversikt" -H "Authorization: Bearer $TOKEN_J")
kontroll "tekniker nekas översikten" "$KOD" "403"
curl -s -X POST "$BAS/api/anvandare" -H "Authorization: Bearer $TOKEN_A" -H 'Content-Type: application/json' \
  -d '{"epost":"lisa@a.se","losenord":"hemligt123","namn":"Lisa","roll":"arbetsledare"}' >/dev/null
TOKEN_L=$(curl -s -X POST "$BAS/api/auth/logga-in" -H 'Content-Type: application/json' \
  -d '{"epost":"lisa@a.se","losenord":"hemligt123"}' | falt .token)
OVERSIKT=$(curl -s "$BAS/api/oversikt" -H "Authorization: Bearer $TOKEN_L")
kontroll "arbetsledaren ser organisationens ärenden" "$(echo "$OVERSIKT" | falt .arenden.length)" "1"
kontroll "översikten härleder felbeskrivning" "$(echo "$OVERSIKT" | falt '.arenden[0].felbeskrivning')" "Startar inte"
kontroll "översikten härleder status" "$(echo "$OVERSIKT" | falt '.arenden[0].avslutat')" "false"
kontroll "översikten räknar händelser" "$(echo "$OVERSIKT" | falt '.arenden[0].antal_handelser')" "2"

# 9b. Omfördelning: arbetsledaren listar användare och sätter ny ansvarig
ANTAL_ANV=$(curl -s "$BAS/api/anvandare" -H "Authorization: Bearer $TOKEN_L" | falt .anvandare.length)
kontroll "arbetsledaren kan lista användare" "$ANTAL_ANV" "3"
KOD=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BAS/api/anvandare" -H "Authorization: Bearer $TOKEN_L" \
  -H 'Content-Type: application/json' -d '{"epost":"y@a.se","losenord":"hemligt123","namn":"Y","roll":"tekniker"}')
kontroll "arbetsledaren nekas skapa användare" "$KOD" "403"
curl -s -X POST "$BAS/api/arenden/arende-test1/handelser" -H "Authorization: Bearer $TOKEN_L" -H 'Content-Type: application/json' \
  -d '{"handelser":[{"id":"h-omf","tidpunkt":"2026-08-03T08:05:00Z","anvandare":"Lisa","handelse":{"typ":"ansvarig_satt","ansvarig":"Johan"}}]}' >/dev/null
kontroll "översikten visar ny ansvarig" "$(curl -s "$BAS/api/oversikt" -H "Authorization: Bearer $TOKEN_L" | falt '.arenden[0].ansvarig')" "Johan"

# 9c. Organisationsinställningar: alla läser, bara admin ändrar
INST=$(curl -s "$BAS/api/organisation" -H "Authorization: Bearer $TOKEN_J")
kontroll "inloggad läser organisationen" "$(echo "$INST" | falt .namn)" "Verkstad A"
KOD=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BAS/api/organisation/installningar" \
  -H "Authorization: Bearer $TOKEN_J" -H 'Content-Type: application/json' \
  -d '{"objekttyper":["Fordon"],"identifieringsmetoder":["VIN"]}')
kontroll "tekniker nekas ändra inställningar" "$KOD" "403"
curl -s -X POST "$BAS/api/organisation/installningar" -H "Authorization: Bearer $TOKEN_A" \
  -H 'Content-Type: application/json' \
  -d '{"objekttyper":["Fordon","Hydraulik"],"identifieringsmetoder":["VIN","Manuell inmatning"]}' >/dev/null
INST=$(curl -s "$BAS/api/organisation" -H "Authorization: Bearer $TOKEN_J")
kontroll "inställningarna gäller hela organisationen" "$(echo "$INST" | falt '.installningar.objekttyper.join(",")')" "Fordon,Hydraulik"
KOD=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BAS/api/organisation/installningar" \
  -H "Authorization: Bearer $TOKEN_A" -H 'Content-Type: application/json' \
  -d '{"objekttyper":[],"identifieringsmetoder":["VIN"]}')
kontroll "tomma listor avvisas" "$KOD" "400"

# 10. Live Share-behörighetsnivåer: kund/partner/intern + återkallelse
curl -s -X POST "$BAS/api/arenden/arende-test1/handelser" -H "Authorization: Bearer $TOKEN_A" -H 'Content-Type: application/json' \
  -d '{"handelser":[
    {"id":"h3","tidpunkt":"2026-08-03T08:03:00Z","anvandare":"Anna","handelse":{"typ":"hypotes","text":"Trasigt relä","niva":"lag"}},
    {"id":"h4","tidpunkt":"2026-08-03T08:04:00Z","anvandare":"Anna","handelse":{"typ":"arbetsorder_skannad","falt":[{"id":"kund_namn","etikett":"Namn","varde":"Kalle Kund","konfidens":0.97}]}}
  ]}' >/dev/null
kontroll "kundkoden filtrerar hypoteser och arbetsorder" "$(curl -s "$BAS/api/delad/delkod123" | falt .handelser.length)" "1"

PARTNERKOD=$(curl -s -X POST "$BAS/api/arenden/arende-test1/delningar" -H "Authorization: Bearer $TOKEN_A" \
  -H 'Content-Type: application/json' -d '{"niva":"partner"}' | falt .kod)
PARTNER=$(curl -s "$BAS/api/delad/$PARTNERKOD")
kontroll "partnernivån visar hypoteser men inte arbetsordern" "$(echo "$PARTNER" | falt .handelser.length)" "2"
kontroll "partnernivån döljer kategoribyten" "$(echo "$PARTNER" | falt '.handelser.some(h=>h.handelse.typ==="kategori_byte")')" "false"
kontroll "nivån följer med svaret" "$(echo "$PARTNER" | falt .niva)" "partner"

INTERNKOD=$(curl -s -X POST "$BAS/api/arenden/arende-test1/delningar" -H "Authorization: Bearer $TOKEN_A" \
  -H 'Content-Type: application/json' -d '{"niva":"intern"}' | falt .kod)
kontroll "internnivån visar allt" "$(curl -s "$BAS/api/delad/$INTERNKOD" | falt .handelser.length)" "5"

KOD=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BAS/api/arenden/arende-test1/delningar" \
  -H "Authorization: Bearer $TOKEN_B" -H 'Content-Type: application/json' -d '{"niva":"intern"}')
kontroll "org B kan inte skapa delning av org A:s ärende" "$KOD" "404"

curl -s -X POST "$BAS/api/delningar/$PARTNERKOD/aterkalla" -H "Authorization: Bearer $TOKEN_A" >/dev/null
KOD=$(curl -s -o /dev/null -w "%{http_code}" "$BAS/api/delad/$PARTNERKOD")
kontroll "återkallad delning ger 404" "$KOD" "404"

# 10b. ECM Knowledge Library: regelpaketet serveras till inloggade klienter
REGLER=$(curl -s "$BAS/api/ecm/regler" -H "Authorization: Bearer $TOKEN_J")
kontroll "regelpaketet serveras" "$(echo "$REGLER" | falt .version)" "2.0"
kontroll "regelpaketet innehåller garantiregler" "$(echo "$REGLER" | falt '.arendetypRegler.Garanti.length')" "3"

# 11. API-first: OpenAPI-specen serveras live, utan inloggning
SPEC=$(curl -s "$BAS/api/openapi.yaml")
case "$SPEC" in
  "openapi: 3.0.3"*) echo "✓ OpenAPI-specen serveras på /api/openapi.yaml" ;;
  *) echo "✗ OpenAPI-specen saknas"; exit 1 ;;
esac

echo "Integrationstest: allt grönt"
