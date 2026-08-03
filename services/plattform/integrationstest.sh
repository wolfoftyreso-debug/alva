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

# 10a. Fordonshistorik och felorsaksstatistik
curl -s -X POST "$BAS/api/arenden" -H "Authorization: Bearer $TOKEN_A" -H 'Content-Type: application/json' \
  -d '{"id":"arende-test2","nummer":2,"skapad":"2026-08-03T09:00:00Z"}' >/dev/null
curl -s -X POST "$BAS/api/arenden" -H "Authorization: Bearer $TOKEN_A" -H 'Content-Type: application/json' \
  -d '{"id":"arende-test3","nummer":3,"skapad":"2026-08-03T10:00:00Z"}' >/dev/null
curl -s -X POST "$BAS/api/arenden/arende-test2/handelser" -H "Authorization: Bearer $TOKEN_A" -H 'Content-Type: application/json' \
  -d '{"handelser":[{"id":"f1","tidpunkt":"2026-08-03T09:01:00Z","anvandare":"Anna","handelse":{"typ":"objekt_identifierat","objekt":{"typ":"Personbil","identifierare":"XYZ999","identifieringsmetod":"Regnr","beskrivning":"VW Golf 2023"}}}]}' >/dev/null
curl -s -X POST "$BAS/api/arenden/arende-test3/handelser" -H "Authorization: Bearer $TOKEN_A" -H 'Content-Type: application/json' \
  -d '{"handelser":[
    {"id":"f2","tidpunkt":"2026-08-03T10:01:00Z","anvandare":"Johan","handelse":{"typ":"objekt_identifierat","objekt":{"typ":"Personbil","identifierare":"xyz999","identifieringsmetod":"Regnr","beskrivning":"VW Golf 2023"}}},
    {"id":"f3","tidpunkt":"2026-08-03T10:02:00Z","anvandare":"Johan","handelse":{"typ":"felorsak","avvikelse":"Vattenpumpen läcker vid axeltätningen.","orsaker":["Normalt slitage","Ålder"],"underlag":["Foto"],"sakerhet":"hog","atgard":"Byt vattenpump."}}
  ]}' >/dev/null
HIST=$(curl -s "$BAS/api/fordon/XYZ999/historik" -H "Authorization: Bearer $TOKEN_J")
kontroll "fordonshistoriken hittar båda ärendena (case-okänsligt)" "$(echo "$HIST" | falt .arenden.length)" "2"
kontroll "historiken bär felorsakerna" "$(echo "$HIST" | falt '.arenden.flatMap(a=>a.felorsaker).length')" "1"
KOD=$(curl -s -o /dev/null -w "%{http_code}" "$BAS/api/fordon/XYZ999/historik" -H "Authorization: Bearer $TOKEN_B")
kontroll "org B ser inte org A:s fordonshistorik" "$(curl -s "$BAS/api/fordon/XYZ999/historik" -H "Authorization: Bearer $TOKEN_B" | falt .arenden.length)" "0"
KOD=$(curl -s -o /dev/null -w "%{http_code}" "$BAS/api/statistik/felorsaker" -H "Authorization: Bearer $TOKEN_J")
kontroll "tekniker nekas felorsaksstatistiken" "$KOD" "403"
STAT=$(curl -s "$BAS/api/statistik/felorsaker" -H "Authorization: Bearer $TOKEN_L")
kontroll "statistiken räknar orsakskategorier" "$(echo "$STAT" | falt .orsaker.length)" "2"
kontroll "statistiken är organisationsknuten data" "$(echo "$STAT" | falt '.orsaker[0].antal')" "1"

# 10b. ECM Knowledge Library: regelpaketet serveras till inloggade klienter
REGLER=$(curl -s "$BAS/api/ecm/regler" -H "Authorization: Bearer $TOKEN_J")
kontroll "regelpaketet serveras" "$(echo "$REGLER" | falt .version)" "2.0"
kontroll "regelpaketet innehåller garantiregler" "$(echo "$REGLER" | falt '.arendetypRegler.Garanti.length')" "3"

# 10c. Publikt kundgodkännande — den enda skrivande publika vägen
# Ärendets ursprungliga delningskod saknar registrerad nivå och får
# därför aldrig svara (bara riktiga kundlänkar duger).
KOD=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BAS/api/delad/delkod123/beslut" \
  -H 'Content-Type: application/json' -d '{"beslut":"godkant"}')
kontroll "legacy-delningskod kan inte svara" "$KOD" "404"

# Kundlänk utan åtgärdsförslag: inget att svara på
KUNDKOD=$(curl -s -X POST "$BAS/api/arenden/arende-test1/delningar" -H "Authorization: Bearer $TOKEN_A" \
  -H 'Content-Type: application/json' -d '{"niva":"kund"}' | falt .kod)
KOD=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BAS/api/delad/$KUNDKOD/beslut" \
  -H 'Content-Type: application/json' -d '{"beslut":"godkant"}')
kontroll "beslut utan åtgärdsförslag avvisas" "$KOD" "409"

# Lägg in ett åtgärdsförslag
curl -s -X POST "$BAS/api/arenden/arende-test1/handelser" -H "Authorization: Bearer $TOKEN_A" -H 'Content-Type: application/json' \
  -d '{"handelser":[{"id":"h-forslag","tidpunkt":"2026-08-03T08:06:00Z","anvandare":"Anna","handelse":{"typ":"atgardsforslag","beskrivning":"Byt reläet i kupémodulen.","uppskattadKostnad":"1 450 kr"}}]}' >/dev/null

# Partnerlänk får INTE svara åt kunden
PKOD=$(curl -s -X POST "$BAS/api/arenden/arende-test1/delningar" -H "Authorization: Bearer $TOKEN_A" \
  -H 'Content-Type: application/json' -d '{"niva":"partner"}' | falt .kod)
KOD=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BAS/api/delad/$PKOD/beslut" \
  -H 'Content-Type: application/json' -d '{"beslut":"godkant"}')
kontroll "partnerlänk kan inte svara åt kunden" "$KOD" "404"

# Ogiltigt beslutsvärde avvisas
KOD=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BAS/api/delad/$KUNDKOD/beslut" \
  -H 'Content-Type: application/json' -d '{"beslut":"kanske"}')
kontroll "ogiltigt beslutsvärde avvisas" "$KOD" "400"

# Kunden godkänner via sin länk
KOD=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BAS/api/delad/$KUNDKOD/beslut" \
  -H 'Content-Type: application/json' -d '{"beslut":"godkant","kommentar":"Kör på."}')
kontroll "kunden kan godkänna via sin länk" "$KOD" "200"
BESLUT=$(curl -s "$BAS/api/arenden/arende-test1/handelser" -H "Authorization: Bearer $TOKEN_A" \
  | falt '.handelser.filter(h=>h.handelse.typ==="kundbeslut").map(h=>h.handelse.kanal+"/"+h.anvandare).join(",")')
kontroll "beskedet loggas med kanal och avsändare" "$BESLUT" "Delningslänk/Kund via delningslänk"

# Ett beslut per ärende — svaret kan inte ändras i efterhand
KOD=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BAS/api/delad/$KUNDKOD/beslut" \
  -H 'Content-Type: application/json' -d '{"beslut":"avbojt"}')
kontroll "beskedet kan inte ändras i efterhand" "$KOD" "409"

# Återkallad delning kan inte svara
curl -s -X POST "$BAS/api/delningar/$KUNDKOD/aterkalla" -H "Authorization: Bearer $TOKEN_A" >/dev/null
KOD=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BAS/api/delad/$KUNDKOD/beslut" \
  -H 'Content-Type: application/json' -d '{"beslut":"godkant"}')
kontroll "återkallad länk kan inte svara" "$KOD" "404"

# Takt-begränsning slår till efter upprepade försök
NYKOD=$(curl -s -X POST "$BAS/api/arenden/arende-test1/delningar" -H "Authorization: Bearer $TOKEN_A" \
  -H 'Content-Type: application/json' -d '{"niva":"kund"}' | falt .kod)
SISTA=""
for i in 1 2 3 4 5 6 7; do
  SISTA=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BAS/api/delad/$NYKOD/beslut" \
    -H 'Content-Type: application/json' -d '{"beslut":"godkant"}')
done
kontroll "takt-begränsning stoppar upprepade försök" "$SISTA" "429"

# 10d. Märkesspecifika kopplingar: kundens egna credentials
# Registret är läsbart för alla inloggade (inställningssidan behöver
# veta vilka leverantörer som finns) men innehåller inga uppgifter.
LEV=$(curl -s "$BAS/api/integrationer/leverantorer" -H "Authorization: Bearer $TOKEN_J")
kontroll "leverantörsregistret är läsbart för tekniker" \
  "$(echo "$LEV" | falt '.leverantorer.some(l=>l.id==="generisk_vin")')" "true"
kontroll "registret pekar ut hemliga fält" \
  "$(echo "$LEV" | falt '.leverantorer.every(l=>l.falt.some(f=>f.hemlig===true))')" "true"

# Uppgifterna är administratörens ensak
KOD=$(curl -s -o /dev/null -w "%{http_code}" "$BAS/api/integrationer" -H "Authorization: Bearer $TOKEN_J")
kontroll "tekniker ser inte kopplingarnas uppgifter" "$KOD" "403"

# Utan konfigurerad krypteringsnyckel sparas ingenting — fail closed
KOD=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BAS/api/integrationer" -H "Authorization: Bearer $TOKEN_A" \
  -H 'Content-Type: application/json' \
  -d '{"leverantor":"generisk_vin","uppgifter":{"bas_url":"https://x.se/{vin}","api_nyckel":"k"}}')
kontroll "utan krypteringsnyckel sparas inga uppgifter" "$KOD" "503"

# Starta om tjänsten med krypteringsnyckel konfigurerad
kill "$SERVER_PID" 2>/dev/null || true
wait "$SERVER_PID" 2>/dev/null || true
DATABASE_URL="postgresql://plattform:test@127.0.0.1:$PGPORT/felsokning" \
  JWT_SECRET=integrationshemlighet PORT=$APPPORT \
  INTEGRATION_NYCKEL=$(node -pe "require('crypto').randomBytes(32).toString('hex')") \
  node server.mjs &
SERVER_PID=$!
sleep 1

# Okänd leverantör och ofullständiga uppgifter avvisas
KOD=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BAS/api/integrationer" -H "Authorization: Bearer $TOKEN_A" \
  -H 'Content-Type: application/json' -d '{"leverantor":"hittepa","uppgifter":{"a":"b"}}')
kontroll "okänd leverantör avvisas" "$KOD" "400"
KOD=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BAS/api/integrationer" -H "Authorization: Bearer $TOKEN_A" \
  -H 'Content-Type: application/json' -d '{"leverantor":"generisk_vin","uppgifter":{"bas_url":"https://x.se/{vin}"}}')
kontroll "ofullständiga uppgifter avvisas" "$KOD" "400"

# Administratören sparar organisationens egna credentials
KOD=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BAS/api/integrationer" -H "Authorization: Bearer $TOKEN_A" \
  -H 'Content-Type: application/json' \
  -d '{"leverantor":"generisk_vin","uppgifter":{"bas_url":"http://127.0.0.1:9/vin/{vin}","api_nyckel":"sk-verkstad-123456"}}')
kontroll "administratören kan spara credentials" "$KOD" "200"

# Hemligheten lämnar aldrig servern i klartext
INT=$(curl -s "$BAS/api/integrationer" -H "Authorization: Bearer $TOKEN_A")
kontroll "krypteringen är konfigurerad" "$(echo "$INT" | falt .krypteringKonfigurerad)" "true"
kontroll "hemligt fält maskeras i svaret" "$(echo "$INT" | falt '.integrationer[0].uppgifter.api_nyckel')" "••••3456"
kontroll "öppet fält visas som det är" "$(echo "$INT" | falt '.integrationer[0].uppgifter.bas_url')" "http://127.0.0.1:9/vin/{vin}"

# … och ligger krypterad i databasen
RAD=$(PGPASSWORD=test "$PGBIN/psql" -h 127.0.0.1 -p $PGPORT -U plattform -d felsokning \
  -tAc "select uppgifter_krypt from integrationer where leverantor='generisk_vin'")
case "$RAD" in
  *sk-verkstad-123456*) echo "✗ uppgifterna ligger i klartext i databasen"; exit 1 ;;
  *) echo "✓ uppgifterna ligger krypterade i databasen" ;;
esac

# Uppslag: identifieraren valideras, okonfigurerad koppling ger 404
KOD=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BAS/api/integrationer/generisk_vin/uppslag" \
  -H "Authorization: Bearer $TOKEN_A" -H 'Content-Type: application/json' -d '{"identifierare":"x"}')
kontroll "ogiltig identifierare avvisas" "$KOD" "400"
KOD=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BAS/api/integrationer/volvo_vida/uppslag" \
  -H "Authorization: Bearer $TOKEN_A" -H 'Content-Type: application/json' -d '{"identifierare":"YV1DZ8256F2123456"}')
kontroll "okonfigurerad koppling ger 404" "$KOD" "404"

# Bas-URL:en pekar inåt (127.0.0.1) — uppslaget får inte bli en väg in i
# klustret. Anropet ska stoppas innan det görs och rapporteras ärligt.
SVAR=$(curl -s -X POST "$BAS/api/integrationer/generisk_vin/uppslag" \
  -H "Authorization: Bearer $TOKEN_A" -H 'Content-Type: application/json' -d '{"identifierare":"YV1DZ8256F2123456"}')
KOD=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BAS/api/integrationer/generisk_vin/uppslag" \
  -H "Authorization: Bearer $TOKEN_A" -H 'Content-Type: application/json' -d '{"identifierare":"YV1DZ8256F2123456"}')
kontroll "uppslag mot intern adress avvisas (502)" "$KOD" "502"
kontroll "felet säger varför" "$(echo "$SVAR" | falt '.error.includes("intern adress")')" "true"
STATUS=$(curl -s "$BAS/api/integrationer" -H "Authorization: Bearer $TOKEN_A" \
  | falt '.integrationer[0].senaste_status.slice(0,3)')
kontroll "senaste testresultat sparas på kopplingen" "$STATUS" "fel"

# Kopplingar är organisationsknutna
ANTAL_B=$(curl -s "$BAS/api/integrationer" -H "Authorization: Bearer $TOKEN_B" | falt .integrationer.length)
kontroll "org B ser inte org A:s kopplingar" "$ANTAL_B" "0"

# Borttagning
curl -s -X DELETE "$BAS/api/integrationer/generisk_vin" -H "Authorization: Bearer $TOKEN_A" >/dev/null
ANTAL=$(curl -s "$BAS/api/integrationer" -H "Authorization: Bearer $TOKEN_A" | falt .integrationer.length)
kontroll "kopplingen kan tas bort" "$ANTAL" "0"

# 11. API-first: OpenAPI-specen serveras live, utan inloggning
SPEC=$(curl -s "$BAS/api/openapi.yaml")
case "$SPEC" in
  "openapi: 3.0.3"*) echo "✓ OpenAPI-specen serveras på /api/openapi.yaml" ;;
  *) echo "✗ OpenAPI-specen saknas"; exit 1 ;;
esac

echo "Integrationstest: allt grönt"
