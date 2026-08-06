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
PGPASSWORD=test "$PGBIN/psql" -h 127.0.0.1 -p $PGPORT -U plattform -d felsokning -q -f ../../infra/postgres-init.sql

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
# Det blindade fordonsindexet är en HÄRLEDD kolumn på ärenderaden, och
# den skrivs efter att ärendet skapats. En trigger som förbjöd all update
# gjorde den skrivningen omöjlig och lät hela synken falla med 500 —
# osynligt här, eftersom svaret kastades bort. Statuskoden granskas nu.
KOD=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BAS/api/arenden/arende-test2/handelser" \
  -H "Authorization: Bearer $TOKEN_A" -H 'Content-Type: application/json' \
  -d '{"handelser":[{"id":"f1b","tidpunkt":"2026-08-03T09:03:00Z","anvandare":"Anna","handelse":{"typ":"observation","text":"Fortsatt läckage vid axeltätningen."}}]}')
kontroll "synk av händelser lyckas" "$KOD" "200"

# Skyddet är kolumnvis, inte bortplockat: identiteten är fortfarande låst.
if PGPASSWORD=test "$PGBIN/psql" -h 127.0.0.1 -p $PGPORT -U plattform -d felsokning \
  -qc "update felsokning_arenden set nummer = 999 where id='arende-test2'" 2>/dev/null; then
  echo "✗ ärendets identitet går att ändra"; exit 1
else
  echo "✓ ärendets identitet är fortfarande oföränderlig"
fi
if PGPASSWORD=test "$PGBIN/psql" -h 127.0.0.1 -p $PGPORT -U plattform -d felsokning \
  -qc "delete from felsokning_arenden where id='arende-test2'" 2>/dev/null; then
  echo "✗ ärenden går att radera"; exit 1
else
  echo "✓ ärenden går fortfarande inte att radera"
fi

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
kontroll "regelpaketet innehåller garantiregler" "$(echo "$REGLER" | falt '.arendetypRegler.Warranty.length')" "3"

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

# 10e. Kontospärr, återkallelse och takt-begränsning på inloggning
# Skapa en tekniker att stänga av.
SVAR=$(curl -s -X POST "$BAS/api/anvandare" -H "Authorization: Bearer $TOKEN_A" -H 'Content-Type: application/json' \
  -d '{"epost":"karin@a.se","losenord":"hemligt123","namn":"Karin","roll":"tekniker"}')
KARIN_ID=$(echo "$SVAR" | falt .id)
kontroll "ny användare är aktiv" "$(echo "$SVAR" | falt .aktiv)" "true"

TOKEN_K=$(curl -s -X POST "$BAS/api/auth/logga-in" -H 'Content-Type: application/json' \
  -d '{"epost":"karin@a.se","losenord":"hemligt123"}' | falt .token)
KOD=$(curl -s -o /dev/null -w "%{http_code}" "$BAS/api/arenden" -H "Authorization: Bearer $TOKEN_K")
kontroll "teknikern kommer in" "$KOD" "200"

# Tekniker får inte stänga av någon
KOD=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BAS/api/anvandare/$KARIN_ID/avaktivera" \
  -H "Authorization: Bearer $TOKEN_K")
kontroll "tekniker kan inte stänga av konton" "$KOD" "403"

# Administratören kan inte stänga av sig själv
ANNA_ID=$(curl -s "$BAS/api/anvandare" -H "Authorization: Bearer $TOKEN_A" \
  | falt '.anvandare.find(a=>a.epost==="anna@a.se").id')
KOD=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BAS/api/anvandare/$ANNA_ID/avaktivera" \
  -H "Authorization: Bearer $TOKEN_A")
kontroll "admin kan inte stänga av sig själv" "$KOD" "400"

# Org B kan inte röra org A:s användare
KOD=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BAS/api/anvandare/$KARIN_ID/avaktivera" \
  -H "Authorization: Bearer $TOKEN_B")
kontroll "org B kan inte stänga av org A:s användare" "$KOD" "404"

# Avstängningen gäller OMEDELBART för redan utfärdad token
curl -s -X POST "$BAS/api/anvandare/$KARIN_ID/avaktivera" -H "Authorization: Bearer $TOKEN_A" >/dev/null
KOD=$(curl -s -o /dev/null -w "%{http_code}" "$BAS/api/arenden" -H "Authorization: Bearer $TOKEN_K")
kontroll "utfärdad token slutar gälla direkt vid avstängning" "$KOD" "401"

# … och inloggning stängs
KOD=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BAS/api/auth/logga-in" -H 'Content-Type: application/json' \
  -d '{"epost":"karin@a.se","losenord":"hemligt123"}')
kontroll "avstängt konto kan inte logga in" "$KOD" "403"

# Öppnas kontot igen fungerar inloggning, men den gamla token är död för gott
curl -s -X POST "$BAS/api/anvandare/$KARIN_ID/aktivera" -H "Authorization: Bearer $TOKEN_A" >/dev/null
TOKEN_K2=$(curl -s -X POST "$BAS/api/auth/logga-in" -H 'Content-Type: application/json' \
  -d '{"epost":"karin@a.se","losenord":"hemligt123"}' | falt .token)
kontroll "återöppnat konto kan logga in" "$(curl -s -o /dev/null -w "%{http_code}" "$BAS/api/arenden" -H "Authorization: Bearer $TOKEN_K2")" "200"
kontroll "den återkallade token förblir ogiltig" "$(curl -s -o /dev/null -w "%{http_code}" "$BAS/api/arenden" -H "Authorization: Bearer $TOKEN_K")" "401"

# Logga ut på alla enheter återkallar den egna sessionen
curl -s -X POST "$BAS/api/auth/logga-ut-alla" -H "Authorization: Bearer $TOKEN_K2" >/dev/null
kontroll "logga-ut-alla dödar den egna token" "$(curl -s -o /dev/null -w "%{http_code}" "$BAS/api/arenden" -H "Authorization: Bearer $TOKEN_K2")" "401"

# Takt-begränsning: efter tio misslyckade försök spärras kontot en stund
SISTA=""
for i in $(seq 1 11); do
  SISTA=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BAS/api/auth/logga-in" \
    -H 'Content-Type: application/json' -d '{"epost":"karin@a.se","losenord":"fel-losenord"}')
done
kontroll "upprepade misslyckade inloggningar spärras" "$SISTA" "429"
# Spärren gäller kontot även med RÄTT lösenord — annars vore den meningslös
KOD=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BAS/api/auth/logga-in" \
  -H 'Content-Type: application/json' -d '{"epost":"karin@a.se","losenord":"hemligt123"}')
kontroll "spärren gäller även rätt lösenord" "$KOD" "429"
# Ett annat konto påverkas inte av spärren på det första
KOD=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BAS/api/auth/logga-in" \
  -H 'Content-Type: application/json' -d '{"epost":"anna@a.se","losenord":"hemligt123"}')
kontroll "andra konton påverkas inte" "$KOD" "200"

# 10f. Bilagor: innehållet ligger utanför händelsen, hashen i loggen
PNG=$(mktemp); printf '\x89PNG\r\n\x1a\nTESTBILD-1' > "$PNG"
SVAR=$(curl -s -X POST "$BAS/api/arenden/arende-test1/bilagor" -H "Authorization: Bearer $TOKEN_A" \
  -H 'Content-Type: image/png' --data-binary "@$PNG")
BIL_ID=$(echo "$SVAR" | falt .id)
BIL_HASH=$(echo "$SVAR" | falt .hash)
kontroll "bilagan får en hash" "${#BIL_HASH}" "64"
kontroll "hashen är innehållets" "$BIL_HASH" "$(sha256sum "$PNG" | cut -d' ' -f1)"

# Samma innehåll igen: ny referens, men bara ett lagrat innehåll
SVAR2=$(curl -s -X POST "$BAS/api/arenden/arende-test1/bilagor" -H "Authorization: Bearer $TOKEN_A" \
  -H 'Content-Type: image/png' --data-binary "@$PNG")
kontroll "identiskt innehåll ger samma hash" "$(echo "$SVAR2" | falt .hash)" "$BIL_HASH"
ANTAL_INNEHALL=$(PGPASSWORD=test "$PGBIN/psql" -h 127.0.0.1 -p $PGPORT -U plattform -d felsokning \
  -tAc "select count(*) from bilage_innehall where hash='$BIL_HASH'")
kontroll "innehållsadresserat — lagras en gång" "$ANTAL_INNEHALL" "1"

# Hämtning ger tillbaka exakt samma bytes
curl -s "$BAS/api/bilagor/$BIL_ID" -H "Authorization: Bearer $TOKEN_A" -o /tmp/hamtad.png
kontroll "hämtat innehåll är identiskt" "$(sha256sum /tmp/hamtad.png | cut -d' ' -f1)" "$BIL_HASH"

# Fel mediatyp och tom kropp avvisas
KOD=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BAS/api/arenden/arende-test1/bilagor" \
  -H "Authorization: Bearer $TOKEN_A" -H 'Content-Type: application/pdf' --data-binary "@$PNG")
kontroll "endast bilder och video tas emot" "$KOD" "415"

# Organisationsgränsen gäller bilagor
KOD=$(curl -s -o /dev/null -w "%{http_code}" "$BAS/api/bilagor/$BIL_ID" -H "Authorization: Bearer $TOKEN_B")
kontroll "org B kommer inte åt org A:s bilaga" "$KOD" "404"
KOD=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BAS/api/arenden/arende-test1/bilagor" \
  -H "Authorization: Bearer $TOKEN_B" -H 'Content-Type: image/png' --data-binary "@$PNG")
kontroll "org B kan inte ladda upp till org A:s ärende" "$KOD" "404"

# Manipulerat innehåll upptäcks: hashen i loggen är facit
PGPASSWORD=test "$PGBIN/psql" -h 127.0.0.1 -p $PGPORT -U plattform -d felsokning \
  -qc "update bilage_innehall set data = decode('4d414e4950554c45524154', 'hex') where hash='$BIL_HASH'"
KOD=$(curl -s -o /dev/null -w "%{http_code}" "$BAS/api/bilagor/$BIL_ID" -H "Authorization: Bearer $TOKEN_A")
kontroll "utbytt innehåll upptäcks och lämnas inte ut" "$KOD" "409"
PGPASSWORD=test "$PGBIN/psql" -h 127.0.0.1 -p $PGPORT -U plattform -d felsokning \
  -qc "update bilage_innehall set data = pg_read_binary_file('$PNG') where hash='$BIL_HASH'" 2>/dev/null \
  || PGPASSWORD=test "$PGBIN/psql" -h 127.0.0.1 -p $PGPORT -U plattform -d felsokning \
       -qc "delete from bilage_innehall where hash='$BIL_HASH'"

# Delningsfiltret gäller även bilagor: en bilaga som hör till en intern
# händelsetyp får inte hämtas via kundlänken.
BIL2=$(curl -s -X POST "$BAS/api/arenden/arende-test1/bilagor" -H "Authorization: Bearer $TOKEN_A" \
  -H 'Content-Type: image/png' --data-binary "@$PNG" | falt .id)
BIL3=$(curl -s -X POST "$BAS/api/arenden/arende-test1/bilagor" -H "Authorization: Bearer $TOKEN_A" \
  -H 'Content-Type: image/png' --data-binary "@$PNG" | falt .id)
curl -s -X POST "$BAS/api/arenden/arende-test1/handelser" -H "Authorization: Bearer $TOKEN_A" -H 'Content-Type: application/json' \
  -d "{\"handelser\":[
    {\"id\":\"h-foto\",\"tidpunkt\":\"2026-08-03T08:07:00Z\",\"anvandare\":\"Anna\",\"handelse\":{\"typ\":\"foto\",\"beskrivning\":\"Hjul\",\"bilagaId\":\"$BIL2\"}},
    {\"id\":\"h-ao\",\"tidpunkt\":\"2026-08-03T08:08:00Z\",\"anvandare\":\"Anna\",\"handelse\":{\"typ\":\"arbetsorder_skannad\",\"falt\":[],\"bilagaId\":\"$BIL3\"}}
  ]}" >/dev/null
NYKUND=$(curl -s -X POST "$BAS/api/arenden/arende-test1/delningar" -H "Authorization: Bearer $TOKEN_A" \
  -H 'Content-Type: application/json' -d '{"niva":"kund"}' | falt .kod)
KOD=$(curl -s -o /dev/null -w "%{http_code}" "$BAS/api/delad/$NYKUND/bilagor/$BIL2")
kontroll "kunden når bilagan till ett foto" "$KOD" "200"
KOD=$(curl -s -o /dev/null -w "%{http_code}" "$BAS/api/delad/$NYKUND/bilagor/$BIL3")
kontroll "kunden når INTE arbetsorderbilden" "$KOD" "404"
KOD=$(curl -s -o /dev/null -w "%{http_code}" "$BAS/api/delad/$NYKUND/bilagor/$BIL_ID")
kontroll "bilaga utan händelse lämnas inte ut publikt" "$KOD" "404"
rm -f "$PNG" /tmp/hamtad.png

# 11. API-first: OpenAPI-specen serveras live, utan inloggning
SPEC=$(curl -s "$BAS/api/openapi.yaml")
case "$SPEC" in
  "openapi: 3.0.3"*) echo "✓ OpenAPI-specen serveras på /api/openapi.yaml" ;;
  *) echo "✗ OpenAPI-specen saknas"; exit 1 ;;
esac

# 12. Fakturering (ALVA-PROC-0001)
#
# Två egenskaper avgör om det här är ett bokföringsunderlag eller en
# anteckning: att beloppet HÄRLEDS ur organisationens tillstånd i stället
# för att tas emot, och att en utfärdad faktura aldrig ändras. Bägge
# prövas nedan, tillsammans med gränsen mellan kund och utfärdare.

ORG_A=$(PGPASSWORD=test "$PGBIN/psql" -h 127.0.0.1 -p $PGPORT -U plattform -d felsokning \
  -tAc "select id from organisationer where namn='Verkstad A'")
PERIOD='{"fran":"2026-01-01","till":"2026-12-31"}'

# Utan nyckel i miljön kan ingen faktura utfärdas — fallerar stängt.
KOD=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BAS/api/fakturor" -H 'Content-Type: application/json' \
  -H 'X-Fakturering: gissning' -d "{\"organisation_id\":\"$ORG_A\",\"period\":$PERIOD}")
kontroll "utan konfigurerad utfärdarnyckel utfärdas ingenting" "$KOD" "403"

# Starta om med utfärdarnyckel konfigurerad
kill "$SERVER_PID" 2>/dev/null || true
wait "$SERVER_PID" 2>/dev/null || true
DATABASE_URL="postgresql://plattform:test@127.0.0.1:$PGPORT/felsokning" \
  JWT_SECRET=integrationshemlighet PORT=$APPPORT \
  INTEGRATION_NYCKEL=$(node -pe "require('crypto').randomBytes(32).toString('hex')") \
  FAKTURERING_NYCKEL=utfardarnyckel \
  node server.mjs &
SERVER_PID=$!
sleep 1

# Kundens administratör är inte utfärdare, hur inloggad den än är.
KOD=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BAS/api/fakturor" \
  -H "Authorization: Bearer $TOKEN_A" -H 'Content-Type: application/json' \
  -d "{\"organisation_id\":\"$ORG_A\",\"period\":$PERIOD}")
kontroll "kundens admin kan inte utfärda sin egen faktura" "$KOD" "403"

# Fel nyckel duger inte heller.
KOD=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BAS/api/fakturor" -H 'Content-Type: application/json' \
  -H 'X-Fakturering: fel-nyckel-samma-langd' -d "{\"organisation_id\":\"$ORG_A\",\"period\":$PERIOD}")
kontroll "fel utfärdarnyckel avvisas" "$KOD" "403"

# Beloppet tas aldrig emot. Ett anrop som försöker sätta det avvisas
# högt i stället för att tigas ihjäl.
KOD=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BAS/api/fakturor" -H 'Content-Type: application/json' \
  -H 'X-Fakturering: utfardarnyckel' \
  -d "{\"organisation_id\":\"$ORG_A\",\"period\":$PERIOD,\"totalt\":1}")
kontroll "angivet belopp avvisas" "$KOD" "400"

# En bakvänd period ger annars noll månader och en faktura som SER
# rimlig ut — värre än ett avslag.
KOD=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BAS/api/fakturor" -H 'Content-Type: application/json' \
  -H 'X-Fakturering: utfardarnyckel' \
  -d "{\"organisation_id\":\"$ORG_A\",\"period\":{\"fran\":\"2026-12-31\",\"till\":\"2026-01-01\"}}")
kontroll "bakvänd period avvisas" "$KOD" "400"

KOD=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BAS/api/fakturor" -H 'Content-Type: application/json' \
  -H 'X-Fakturering: utfardarnyckel' \
  -d "{\"organisation_id\":\"00000000-0000-0000-0000-000000000000\",\"period\":$PERIOD}")
kontroll "okänd organisation avvisas" "$KOD" "404"

# Utfärda på riktigt.
FAKTURA=$(curl -s -X POST "$BAS/api/fakturor" -H 'Content-Type: application/json' \
  -H 'X-Fakturering: utfardarnyckel' -d "{\"organisation_id\":\"$ORG_A\",\"period\":$PERIOD,\"utfardad\":\"2026-01-15\"}")
FAKTURA_ID=$(echo "$FAKTURA" | falt .id)
kontroll "beteckningen följer nomenklaturen" "$(echo "$FAKTURA" | falt .beteckning)" "ALVA-INV-0001"
kontroll "förfallodagen följer betalningsvillkoret" "$(echo "$FAKTURA" | falt .forfaller)" "2026-02-14"

# Kärnan: summan ska vara densamma som modulen räknar fram ur DATABASENS
# egna aktiva konton. Ett hårdkodat facit hade bara testat aritmetiken;
# det här testar att beloppet verkligen härleds ur tillståndet.
AKTIVA=$(PGPASSWORD=test "$PGBIN/psql" -h 127.0.0.1 -p $PGPORT -U plattform -d felsokning \
  -tAc "select count(*) from anvandare where organisation_id='$ORG_A' and aktiv")
VANTAT=$(node -e "
  import('./fakturering.mjs').then(({ fakturera }) => {
    const f = fakturera({ nummer: 1, org: { namn: 'Verkstad A', moduler: [] }, aktiva: $AKTIVA,
      period: { fran: '2026-01-01', till: '2026-12-31' }, utfardad: '2026-01-15' });
    console.log(f.totalt);
  });
")
kontroll "summan härleds ur organisationens aktiva konton" "$(echo "$FAKTURA" | falt .totalt)" "$VANTAT"

# Kunden läser sina egna fakturor, och bara sina egna.
LISTA=$(curl -s "$BAS/api/fakturor" -H "Authorization: Bearer $TOKEN_A")
kontroll "kunden ser sin faktura" "$(echo "$LISTA" | falt .fakturor.length)" "1"
kontroll "statusen är utfärdad" "$(echo "$LISTA" | falt '.fakturor[0].status')" "utfardad"
kontroll "org B ser inga fakturor" "$(curl -s "$BAS/api/fakturor" -H "Authorization: Bearer $TOKEN_B" | falt .fakturor.length)" "0"
KOD=$(curl -s -o /dev/null -w "%{http_code}" "$BAS/api/fakturor" -H "Authorization: Bearer $TOKEN_J")
kontroll "tekniker når inte kommersiella uppgifter" "$KOD" "403"

# Oföränderligheten är en egenskap i databasen, inte en ambition i koden.
if PGPASSWORD=test "$PGBIN/psql" -h 127.0.0.1 -p $PGPORT -U plattform -d felsokning \
  -qc "update fakturor set totalt = 0 where id='$FAKTURA_ID'" 2>/dev/null; then
  echo "✗ fakturor går att ändra i databasen"; exit 1
else
  echo "✓ databastriggern avvisar ändring av utfärdad faktura"
fi

# Betalning: registreras av en människa, med en referens som går att
# spåra, och skrivs som en händelse — aldrig som en uppdatering.
KOD=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BAS/api/fakturor/$FAKTURA_ID/betald" \
  -H 'X-Fakturering: utfardarnyckel' -H 'Content-Type: application/json' -d '{}')
kontroll "betalning utan referens avvisas" "$KOD" "400"
KOD=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BAS/api/fakturor/$FAKTURA_ID/betald" \
  -H "Authorization: Bearer $TOKEN_A" -H 'Content-Type: application/json' -d '{"referens":"BG 123"}')
kontroll "kunden kan inte bokföra sin egen betalning" "$KOD" "403"

curl -s -X POST "$BAS/api/fakturor/$FAKTURA_ID/betald" -H 'X-Fakturering: utfardarnyckel' \
  -H 'Content-Type: application/json' -d '{"referens":"BG 5402-1178","betaldatum":"2026-02-03"}' >/dev/null
STATUS=$(curl -s "$BAS/api/fakturor" -H "Authorization: Bearer $TOKEN_A" | falt '.fakturor[0].status')
kontroll "statusen härleds ur betalningshändelsen" "$STATUS" "betald"
KOD=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BAS/api/fakturor/$FAKTURA_ID/betald" \
  -H 'X-Fakturering: utfardarnyckel' -H 'Content-Type: application/json' -d '{"referens":"BG 5402-1178"}')
kontroll "en betald faktura betalas inte igen" "$KOD" "409"

# Rättelse: originalet rörs inte, en kreditfaktura pekar tillbaka.
KOD=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BAS/api/fakturor/$FAKTURA_ID/kreditera" \
  -H 'X-Fakturering: utfardarnyckel' -H 'Content-Type: application/json' -d '{"orsak":"fel"}')
kontroll "kreditering utan granskbart skäl avvisas" "$KOD" "400"
KREDIT=$(curl -s -X POST "$BAS/api/fakturor/$FAKTURA_ID/kreditera" -H 'X-Fakturering: utfardarnyckel' \
  -H 'Content-Type: application/json' \
  -d '{"orsak":"Antalet aktiva användare var felaktigt vid utfärdandet.","utfardad":"2026-02-10"}')
kontroll "kreditfakturan får nästa nummer" "$(echo "$KREDIT" | falt .beteckning)" "ALVA-INV-0002"
kontroll "kreditfakturan pekar tillbaka" "$(echo "$KREDIT" | falt .krediterar)" "ALVA-INV-0001"
kontroll "kreditfakturan har omvänt tecken" "$(echo "$KREDIT" | falt .totalt)" "-$VANTAT"

LISTA=$(curl -s "$BAS/api/fakturor" -H "Authorization: Bearer $TOKEN_A")
kontroll "originalet står kvar med sitt belopp" \
  "$(echo "$LISTA" | falt '.fakturor.find(f => f.beteckning === "ALVA-INV-0001").totalt')" "$VANTAT"
kontroll "originalets status är nu krediterad" \
  "$(echo "$LISTA" | falt '.fakturor.find(f => f.beteckning === "ALVA-INV-0001").status')" "krediterad"
KOD=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BAS/api/fakturor/$FAKTURA_ID/kreditera" \
  -H 'X-Fakturering: utfardarnyckel' -H 'Content-Type: application/json' \
  -d '{"orsak":"Samma skäl en gång till, vilket inte ska gå."}')
kontroll "en krediterad faktura krediteras inte igen" "$KOD" "409"

# Nummerserien är utan luckor — annars är den inte ett underlag.
LUCKOR=$(PGPASSWORD=test "$PGBIN/psql" -h 127.0.0.1 -p $PGPORT -U plattform -d felsokning \
  -tAc "select (select max(nummer) from fakturor) - (select count(*) from fakturor)")
kontroll "nummerserien är utan luckor" "$LUCKOR" "0"

# 13. Motspelande hyresgäst (TÜV T-1)
#
# Revisionens huvudfynd: händelse-id sattes av klienten och var
# förutsägbart, primärnyckeln var global, och insert skedde med
# `on conflict do nothing`. Org B kunde ockupera id på SITT EGET ärende
# som org A snart skulle använda — och org A:s händelse föll tyst bort
# med statuskod 200.
#
# Ingen befintlig svit kunde se det: varje test kör en organisation, eller
# två isolerade. Ingen modellerar den enas skrivningar som indata till den
# andras misslyckande. Det gör den här.

IDN="mshhkoq9-0 mshhkoq9-1 mshhkoq9-2"
FORSTA=$(echo "$IDN" | cut -d' ' -f1)

curl -s -X POST "$BAS/api/arenden" -H "Authorization: Bearer $TOKEN_B" -H 'Content-Type: application/json' \
  -d '{"id":"arende-motspel-b","nummer":90,"skapad":"2026-08-06T08:00:00Z"}' >/dev/null
curl -s -X POST "$BAS/api/arenden" -H "Authorization: Bearer $TOKEN_A" -H 'Content-Type: application/json' \
  -d '{"id":"arende-motspel-a","nummer":91,"skapad":"2026-08-06T08:00:00Z"}' >/dev/null

# Org B ockuperar id:na på sitt eget ärende.
POSTER=$(node -pe "
  JSON.stringify({ handelser: '$IDN'.split(' ').map((id) => ({
    id, tidpunkt: '2026-08-06T08:01:00Z', anvandare: 'Bo',
    handelse: { typ: 'observation', text: 'Ockuperad.' } })) })
")
curl -s -X POST "$BAS/api/arenden/arende-motspel-b/handelser" -H "Authorization: Bearer $TOKEN_B" \
  -H 'Content-Type: application/json' -d "$POSTER" >/dev/null

# Org A dokumenterar en felorsak med exakt samma id.
KOD=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BAS/api/arenden/arende-motspel-a/handelser" \
  -H "Authorization: Bearer $TOKEN_A" -H 'Content-Type: application/json' \
  -d "{\"handelser\":[{\"id\":\"$FORSTA\",\"tidpunkt\":\"2026-08-06T08:02:00Z\",\"anvandare\":\"Anna\",
       \"handelse\":{\"typ\":\"felorsak\",\"avvikelse\":\"Bromsledning skavd mot chassi.\",
       \"orsaker\":[\"Montagefel\"],\"underlag\":[\"Foto\"],\"sakerhet\":\"hog\",
       \"atgard\":\"Byt ledning och satt ny klammer.\"}}]}")
kontroll "org A:s skrivning lyckas trots ockuperat id" "$KOD" "200"
ANTAL=$(curl -s "$BAS/api/arenden/arende-motspel-a/handelser" -H "Authorization: Bearer $TOKEN_A" | falt .handelser.length)
kontroll "org A:s felorsak finns i loggen" "$ANTAL" "1"
ANTAL_B=$(curl -s "$BAS/api/arenden/arende-motspel-b/handelser" -H "Authorization: Bearer $TOKEN_B" | falt .handelser.length)
kontroll "org B:s egna poster är orörda" "$ANTAL_B" "3"

# Samma id, samma innehåll, en gång till: en ofarlig omsändning ska förbli tyst.
KOD=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BAS/api/arenden/arende-motspel-b/handelser" \
  -H "Authorization: Bearer $TOKEN_B" -H 'Content-Type: application/json' -d "$POSTER")
kontroll "identisk omsandning ar fortfarande idempotent" "$KOD" "200"

# Samma id, ANNAT innehåll: ska falla högt i stället för att tigas ihjäl.
KOD=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BAS/api/arenden/arende-motspel-b/handelser" \
  -H "Authorization: Bearer $TOKEN_B" -H 'Content-Type: application/json' \
  -d "{\"handelser\":[{\"id\":\"$FORSTA\",\"tidpunkt\":\"2026-08-06T08:03:00Z\",\"anvandare\":\"Bo\",
       \"handelse\":{\"typ\":\"observation\",\"text\":\"NAGOT HELT ANNAT\"}}]}")
kontroll "samma id med annat innehall ger 409" "$KOD" "409"
ANTAL_B=$(curl -s "$BAS/api/arenden/arende-motspel-b/handelser" -H "Authorization: Bearer $TOKEN_B" | falt .handelser.length)
kontroll "ingenting skrevs vid 409" "$ANTAL_B" "3"

# Samma attack en niva upp: arende-id ar lika forutsagbart.
KOD=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BAS/api/arenden" -H "Authorization: Bearer $TOKEN_A" \
  -H 'Content-Type: application/json' -d '{"id":"arende-motspel-b","nummer":92,"skapad":"2026-08-06T09:00:00Z"}')
kontroll "arende-id upptaget av annan org ger 409" "$KOD" "409"

# 14. Matkedjan slas upp i registret (TÜV T-2)
#
# Evidensgraden E4 kraver att det gar att visa VAD som matte och att
# instrumentet var kalibrerat. Bagge falten kom fran klienten och lagrades
# oprovade — en organisation utan ett enda registrerat matdon kunde skicka
# kalibrering 2099-12-31 och fa E4.

KOD=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BAS/api/arenden/arende-motspel-a/handelser" \
  -H "Authorization: Bearer $TOKEN_A" -H 'Content-Type: application/json' \
  -d '{"handelser":[{"id":"m-falsk","tidpunkt":"2026-08-06T08:10:00Z","anvandare":"Anna",
       "handelse":{"typ":"matvarde","beskrivning":"Kokpunkt","varde":"238","enhet":"C",
       "matdonId":"finns-inte-i-registret","matdonBeteckning":"Kalibrerad testare 9000",
       "matdonKalibreradTill":"2099-12-31"}}]}')
kontroll "okant matdon avvisas" "$KOD" "400"

# Ett riktigt matdon, med ett kalibreringsdatum registret ager.
MATDON=$(curl -s -X POST "$BAS/api/matdon" -H "Authorization: Bearer $TOKEN_A" -H 'Content-Type: application/json' \
  -d '{"beteckning":"Bromsvatsketestare BT-2","serienummer":"SN-4471","kalibrerad_till":"2027-06-30"}' | falt .id)
curl -s -X POST "$BAS/api/arenden/arende-motspel-a/handelser" -H "Authorization: Bearer $TOKEN_A" \
  -H 'Content-Type: application/json' \
  -d "{\"handelser\":[{\"id\":\"m-akta\",\"tidpunkt\":\"2026-08-06T08:11:00Z\",\"anvandare\":\"Anna\",
       \"handelse\":{\"typ\":\"matvarde\",\"beskrivning\":\"Kokpunkt\",\"varde\":\"238\",\"enhet\":\"C\",
       \"matdonId\":\"$MATDON\",\"matdonBeteckning\":\"PAHITTAD BETECKNING\",
       \"matdonKalibreradTill\":\"2099-12-31\"}}]}" >/dev/null

HAMTAT=$(curl -s "$BAS/api/arenden/arende-motspel-a/handelser" -H "Authorization: Bearer $TOKEN_A")
kontroll "beteckningen kommer fran registret" \
  "$(echo "$HAMTAT" | falt '.handelser.find(h=>h.id==="m-akta").handelse.matdonBeteckning')" "Bromsvatsketestare BT-2"
kontroll "kalibreringen kommer fran registret" \
  "$(echo "$HAMTAT" | falt '.handelser.find(h=>h.id==="m-akta").handelse.matdonKalibreradTill')" "2027-06-30"

# Ett matvarde utan matdon far inte bara pasta en beteckning heller.
curl -s -X POST "$BAS/api/arenden/arende-motspel-a/handelser" -H "Authorization: Bearer $TOKEN_A" \
  -H 'Content-Type: application/json' \
  -d '{"handelser":[{"id":"m-utan","tidpunkt":"2026-08-06T08:12:00Z","anvandare":"Anna",
       "handelse":{"typ":"matvarde","beskrivning":"Tryck","varde":"2.4","enhet":"bar",
       "matdonBeteckning":"PASTADD","matdonKalibreradTill":"2099-12-31"}}]}' >/dev/null
HAMTAT=$(curl -s "$BAS/api/arenden/arende-motspel-a/handelser" -H "Authorization: Bearer $TOKEN_A")
kontroll "pastadd kalibrering utan matdon tas bort" \
  "$(echo "$HAMTAT" | falt '.handelser.find(h=>h.id==="m-utan").handelse.matdonKalibreradTill ?? "borta"')" "borta"

# 15. Underlagen om atkomst och radering ar append-only (TÜV T-7)
#
# Radniva-triggern fyrar per RAD. En tom tabell later darfor `delete`
# lyckas utan att skyddet ens provats — forsta versionen av det har testet
# var gron pa raderingar just darfor, och bevisade ingenting. Bagge
# tabellerna maste ha innehall innan de provas.
PGPASSWORD=test "$PGBIN/psql" -h 127.0.0.1 -p $PGPORT -U plattform -d felsokning -qc \
  "insert into raderingar (organisation_id, subjekt_hash, begard, begard_av, antal_arenden)
   select id, 'prov', now(), 'Integrationstest', 0 from organisationer limit 1"
for TABELL in atkomstlogg raderingar; do
  RADER=$(PGPASSWORD=test "$PGBIN/psql" -h 127.0.0.1 -p $PGPORT -U plattform -d felsokning \
    -tAc "select count(*) from $TABELL")
  if [ "$RADER" = "0" ]; then echo "✗ $TABELL ar tom — provet sager ingenting"; exit 1; fi
  if PGPASSWORD=test "$PGBIN/psql" -h 127.0.0.1 -p $PGPORT -U plattform -d felsokning \
    -qc "delete from $TABELL" 2>/dev/null; then
    echo "✗ $TABELL gar att radera"; exit 1
  else
    echo "✓ $TABELL gar inte att radera"
  fi
done
if PGPASSWORD=test "$PGBIN/psql" -h 127.0.0.1 -p $PGPORT -U plattform -d felsokning \
  -qc "update personnycklar set subjekt = 'annat'" 2>/dev/null; then
  echo "✗ personnyckelns subjekt gar att flytta"; exit 1
else
  echo "✓ personnyckelns tillhorighet kan inte andras"
fi
# Men raderingen sjalv maste fungera — det ar vad radering ÄR.
PGPASSWORD=test "$PGBIN/psql" -h 127.0.0.1 -p $PGPORT -U plattform -d felsokning \
  -qc "delete from personnycklar where subjekt = 'arende-motspel-b'" >/dev/null
echo "✓ personnycklar gar fortfarande att forstora"

# 16. Utgangstid kravs i token (TÜV T-11)
EVIG=$(node -e "
  const c = require('crypto');
  const b = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const h = b({ alg: 'HS256', typ: 'JWT' });
  const p = b({ sub: '00000000-0000-0000-0000-000000000000', org: '0', roll: 'admin', tv: 0 });
  const s = c.createHmac('sha256', 'integrationshemlighet').update(h + '.' + p).digest('base64url');
  console.log(h + '.' + p + '.' + s);
")
KOD=$(curl -s -o /dev/null -w "%{http_code}" "$BAS/api/arenden" -H "Authorization: Bearer $EVIG")
kontroll "token utan utgangstid avvisas" "$KOD" "401"

# 17. Gallringen verkstalls (TÜV T-4)
NYCKLAR_FORE=$(PGPASSWORD=test "$PGBIN/psql" -h 127.0.0.1 -p $PGPORT -U plattform -d felsokning \
  -tAc "select count(*) from personnycklar")
PGPASSWORD=test "$PGBIN/psql" -h 127.0.0.1 -p $PGPORT -U plattform -d felsokning \
  -qc "update felsokning_arenden set gallras_efter = now() - interval '1 day' where id = 'arende-motspel-a'"
DATABASE_URL="postgresql://plattform:test@127.0.0.1:$PGPORT/felsokning" \
  node gallring.mjs > /tmp/gallring.json
FORSTORDA=$(cat /tmp/gallring.json | falt .forstorda)
kontroll "gallringen forstorde nyckeln for det passerade arendet" "$FORSTORDA" "1"
NYCKLAR_EFTER=$(PGPASSWORD=test "$PGBIN/psql" -h 127.0.0.1 -p $PGPORT -U plattform -d felsokning \
  -tAc "select count(*) from personnycklar")
kontroll "en nyckel farre finns kvar" "$NYCKLAR_EFTER" "$((NYCKLAR_FORE - 1))"
SPAR=$(PGPASSWORD=test "$PGBIN/psql" -h 127.0.0.1 -p $PGPORT -U plattform -d felsokning \
  -tAc "select count(*) from raderingar where begard_av like 'Gallring%'")
kontroll "gallringen lamnade spar i raderingsregistret" "$SPAR" "1"
# Ett arende som INTE passerat far inte roras.
DATABASE_URL="postgresql://plattform:test@127.0.0.1:$PGPORT/felsokning" \
  node gallring.mjs > /tmp/gallring2.json
kontroll "andra korningen gallrar ingenting" "$(cat /tmp/gallring2.json | falt .forstorda)" "0"

# 18. Kuvertkryptering av personnycklarna (TÜV T-3)
#
# Nycklarna lag i klartext i samma databas som chiffertexten de skyddade,
# och aterstallningstestet slog fast att de foljer med en aterstallning.
# Kuverterade under en huvudnyckel utanfor databasen ger en aterstalld
# dump nycklar som inte gar att oppna utan den.
kill "$SERVER_PID" 2>/dev/null || true
wait "$SERVER_PID" 2>/dev/null || true
HUVUD=$(node -pe "require('crypto').randomBytes(32).toString('hex')")
DATABASE_URL="postgresql://plattform:test@127.0.0.1:$PGPORT/felsokning" \
  JWT_SECRET=integrationshemlighet PORT=$APPPORT \
  INTEGRATION_NYCKEL=$(node -pe "require('crypto').randomBytes(32).toString('hex')") \
  PERSONNYCKEL_HUVUD=$HUVUD \
  node server.mjs &
SERVER_PID=$!
sleep 1

curl -s -X POST "$BAS/api/arenden" -H "Authorization: Bearer $TOKEN_A" -H 'Content-Type: application/json' \
  -d '{"id":"arende-kuvert","nummer":93,"skapad":"2026-08-06T10:00:00Z"}' >/dev/null
curl -s -X POST "$BAS/api/arenden/arende-kuvert/handelser" -H "Authorization: Bearer $TOKEN_A" \
  -H 'Content-Type: application/json' \
  -d '{"handelser":[{"id":"k1","tidpunkt":"2026-08-06T10:01:00Z","anvandare":"Anna",
       "handelse":{"typ":"objekt_identifierat","objekt":{"typ":"Personbil","identifierare":"KUV123",
       "identifieringsmetod":"Regnr","beskrivning":"VW Golf"}}}]}' >/dev/null

LAGRAD=$(PGPASSWORD=test "$PGBIN/psql" -h 127.0.0.1 -p $PGPORT -U plattform -d felsokning \
  -tAc "select encode(nyckel, 'escape') from personnycklar where subjekt = 'arende-kuvert'")
case "$LAGRAD" in
  v1.*) echo "✓ nyckeln ligger kuverterad i databasen" ;;
  *) echo "✗ nyckeln ligger i klartext: ${LAGRAD:0:12}"; exit 1 ;;
esac

# Med huvudnyckeln gar identifieraren fortfarande att lasa.
IDENT=$(curl -s "$BAS/api/arenden/arende-kuvert/handelser" -H "Authorization: Bearer $TOKEN_A" \
  | falt '.handelser[0].handelse.objekt.identifierare')
kontroll "identifieraren gar att lasa med huvudnyckeln" "$IDENT" "KUV123"

# Utan huvudnyckeln — en aterstalld dump pa en annan maskin — gar den inte.
kill "$SERVER_PID" 2>/dev/null || true
wait "$SERVER_PID" 2>/dev/null || true
DATABASE_URL="postgresql://plattform:test@127.0.0.1:$PGPORT/felsokning" \
  JWT_SECRET=integrationshemlighet PORT=$APPPORT node server.mjs >/dev/null 2>&1 &
SERVER_PID=$!
sleep 1
# Utan huvudnyckeln MASKERAS uppgiften — anropet kraschar inte.
#
# Forsta versionen av det har testet krävde 500, och det gick igenom
# eftersom oppnaKuvert kastade. Men eftersom nycklarFor laddar HELA
# organisationens nycklar gjorde en enda kuverterad nyckel varje ANNAT
# arende i organisationen olasbart — en delvis migrerad organisation blev
# helt stum av ett fel som bara gallde ett arende.
#
# Maskering ar dessutom ratt utfall i sak: det ar precis vad
# krypto-shredding lamnar efter sig.
SVAR=$(curl -s "$BAS/api/arenden/arende-kuvert/handelser" -H "Authorization: Bearer $TOKEN_A")
kontroll "utan huvudnyckel maskeras uppgiften" \
  "$(echo "$SVAR" | falt '.handelser[0].handelse.objekt.identifierare')" "[raderat på begäran]"
kontroll "men anropet gar fortfarande igenom" "$(echo "$SVAR" | falt .handelser.length)" "1"

# 18b. Grinden talar organisationens språk (ALVA-SPEC-060)
#
# Det som prövas är inte att en översättning finns — det gör testerna i
# app/ — utan att språket följer HELA vägen: organisationens inställning,
# genom servern, ut i det 409-svar som faktiskt nekar ett avslut.
#
# En spärr på fel språk är en spärr utan väg förbi. Teknikern ser att
# systemet vägrar men inte varför, och den enda utvägen blir att ringa
# någon. Det är då regeln slutar vara en regel.
curl -s -X POST "$BAS/api/arenden" -H "Authorization: Bearer $TOKEN_A" -H 'Content-Type: application/json' \
  -d '{"id":"arende-sprak","nummer":77,"skapad":"2026-08-06T09:00:00Z"}' >/dev/null
AVSLUT='{"handelser":[{"id":"h-sprak-avslut","tidpunkt":"2026-08-06T09:05:00Z","anvandare":"Anna","handelse":{"typ":"arende_avslutat"}}]}'

SVAR=$(curl -s -X POST "$BAS/api/arenden/arende-sprak/handelser" -H "Authorization: Bearer $TOKEN_A" \
  -H 'Content-Type: application/json' -d "$AVSLUT")
kontroll "avslut utan underlag nekas" "$(echo "$SVAR" | falt '.hinder.length > 0')" "true"
kontroll "hindret star pa engelska som standard" \
  "$(echo "$SVAR" | falt '.hinder.find(h=>h.id==="objekt").rubrik')" "Vehicle or object identification verified"
kontroll "hindret bar sin nyckel" \
  "$(echo "$SVAR" | falt '.hinder.find(h=>h.id==="objekt").nyckel')" "grind.objekt"

# Organisationen byter dokumentationsspråk.
curl -s -X POST "$BAS/api/organisation/installningar" -H "Authorization: Bearer $TOKEN_A" \
  -H 'Content-Type: application/json' \
  -d '{"objekttyper":["Personbil"],"identifieringsmetoder":["Registreringsnummer"],"sprak":"de"}' >/dev/null

SVAR=$(curl -s -X POST "$BAS/api/arenden/arende-sprak/handelser" -H "Authorization: Bearer $TOKEN_A" \
  -H 'Content-Type: application/json' -d "$AVSLUT")
kontroll "hindret foljer organisationens sprak" \
  "$(echo "$SVAR" | falt '.hinder.find(h=>h.id==="objekt").rubrik')" \
  "Identität des Fahrzeugs oder Objekts verifiziert"
# Nyckeln ar oforandrad: identiteten pa hindret ar inte sprakberoende,
# vilket ar hela poangen med att bara texten oversatts.
kontroll "nyckeln ar densamma pa bada spraken" \
  "$(echo "$SVAR" | falt '.hinder.find(h=>h.id==="objekt").nyckel')" "grind.objekt"

# En felstavad sprakkod far inte hindra nagon fran att spara sina
# objekttyper — sprakinstallningen ar en etikett, inte ett krav.
KOD=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BAS/api/organisation/installningar" \
  -H "Authorization: Bearer $TOKEN_A" -H 'Content-Type: application/json' \
  -d '{"objekttyper":["Personbil"],"identifieringsmetoder":["Registreringsnummer"],"sprak":"klingon"}')
kontroll "okand sprakkod avvisas inte" "$KOD" "200"
SVAR=$(curl -s -X POST "$BAS/api/arenden/arende-sprak/handelser" -H "Authorization: Bearer $TOKEN_A" \
  -H 'Content-Type: application/json' -d "$AVSLUT")
kontroll "okand sprakkod blir engelska" \
  "$(echo "$SVAR" | falt '.hinder.find(h=>h.id==="objekt").rubrik')" "Vehicle or object identification verified"

# 19. Support och felanmälan (ALVA-PROC-0050)
kill "$SERVER_PID" 2>/dev/null || true
wait "$SERVER_PID" 2>/dev/null || true
DATABASE_URL="postgresql://plattform:test@127.0.0.1:$PGPORT/felsokning" \
  JWT_SECRET=integrationshemlighet PORT=$APPPORT SUPPORT_NYCKEL=supportnyckel \
  FAKTURERING_NYCKEL=utfardarnyckel node server.mjs &
SERVER_PID=$!
sleep 1

# Teknikern far anmala. En troskel har ger farre anmalningar, inte farre fel.
ANMALAN=$(curl -s -X POST "$BAS/api/support" -H "Authorization: Bearer $TOKEN_J" -H 'Content-Type: application/json' \
  -d '{"typ":"felanmalan","rubrik":"Matsteget vagrar komma","arendeId":"arende-test1",
       "beskrivning":"Kontrollen tar inte emot 2,4 men accepterar 2.4. Verkstaden skriver komma.",
       "sammanhang":{"metodikId":"vibration","regnr":"ABC123","plattformsversion":"ALVA 1.0"}}')
SUP_ID=$(echo "$ANMALAN" | falt .id)
kontroll "teknikern kan anmala" "$(echo "$ANMALAN" | falt .beteckning)" "ALVA-SUP-0001"
kontroll "nya anmalningar ar mottagna" "$(echo "$ANMALAN" | falt .status)" "mottagen"

LISTA=$(curl -s "$BAS/api/support" -H "Authorization: Bearer $TOKEN_A")
kontroll "anmalan syns i organisationen" "$(echo "$LISTA" | falt .arenden.length)" "1"
kontroll "sammanhanget bar metodiken" "$(echo "$LISTA" | falt '.arenden[0].sammanhang.metodik')" "vibration"
kontroll "sammanhanget bar sparId" "$(echo "$LISTA" | falt '.arenden[0].sammanhang.spar ? "ja" : "nej"')" "ja"
# Det viktigaste: ett regnr kan inte smugglas in i en supportanmalan.
kontroll "identifierande falt slapps inte igenom" \
  "$(echo "$LISTA" | falt '.arenden[0].sammanhang.regnr ?? "borta"')" "borta"

kontroll "org B ser inga anmalningar" "$(curl -s "$BAS/api/support" -H "Authorization: Bearer $TOKEN_B" | falt .arenden.length)" "0"

KOD=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BAS/api/support" -H "Authorization: Bearer $TOKEN_A" \
  -H 'Content-Type: application/json' -d '{"typ":"felanmalan","rubrik":"fel","beskrivning":"gar ej"}')
kontroll "for tunn anmalan avvisas" "$KOD" "400"

KOD=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BAS/api/support" -H "Authorization: Bearer $TOKEN_B" \
  -H 'Content-Type: application/json' \
  -d '{"typ":"felanmalan","rubrik":"Nagot om org A","arendeId":"arende-test1","beskrivning":"En anmalan ar inte en vag runt organisationsgransen."}')
kontroll "anmalan kan inte peka pa annan orgs arende" "$KOD" "404"

# Verkstaden svarar i sitt eget arende; status ar var sida av bordet.
curl -s -X POST "$BAS/api/support/$SUP_ID/inlagg" -H "Authorization: Bearer $TOKEN_A" \
  -H 'Content-Type: application/json' -d '{"text":"Hander aven i Chrome."}' >/dev/null
KOD=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BAS/api/support/$SUP_ID/inlagg" \
  -H "Authorization: Bearer $TOKEN_A" -H 'Content-Type: application/json' \
  -d '{"text":"Vi tittar.","status":"under_arbete"}')
kontroll "verkstaden kan inte satta status" "$KOD" "403"

curl -s -X POST "$BAS/api/support/$SUP_ID/inlagg" -H 'X-Support: supportnyckel' \
  -H "Authorization: Bearer $TOKEN_A" -H 'Content-Type: application/json' \
  -d '{"text":"Ratta i nasta utgava.","status":"atgardad"}' >/dev/null
LISTA=$(curl -s "$BAS/api/support" -H "Authorization: Bearer $TOKEN_A")
kontroll "statusen harleds ur inlaggen" "$(echo "$LISTA" | falt '.arenden[0].status')" "atgardad"
kontroll "svaret finns kvar bredvid statusbytet" "$(echo "$LISTA" | falt '.arenden[0].inlagg.length')" "2"

if PGPASSWORD=test "$PGBIN/psql" -h 127.0.0.1 -p $PGPORT -U plattform -d felsokning \
  -qc "update supportarenden set rubrik = 'omskrivet'" 2>/dev/null; then
  echo "✗ supportarenden gar att skriva om"; exit 1
else
  echo "✓ supportarenden gar inte att skriva om"
fi

# 20. Abonnemang (ALVA-PROC-0002)
AB=$(curl -s "$BAS/api/abonnemang" -H "Authorization: Bearer $TOKEN_A")
kontroll "registrering startar pa Free" "$(echo "$AB" | falt .niva)" "free"
kontroll "nystartat abonnemang ar aktivt" "$(echo "$AB" | falt .tillstand)" "aktiv"
kontroll "lasning ar tillaten" "$(echo "$AB" | falt .behorighet.lasa)" "true"

KOD=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BAS/api/abonnemang/niva" \
  -H "Authorization: Bearer $TOKEN_J" -H 'Content-Type: application/json' -d '{"niva":"premium"}')
kontroll "tekniker kan inte byta niva" "$KOD" "403"

curl -s -X POST "$BAS/api/abonnemang/niva" -H "Authorization: Bearer $TOKEN_A" \
  -H 'Content-Type: application/json' -d '{"niva":"standard"}' >/dev/null
kontroll "admin byter niva" "$(curl -s "$BAS/api/abonnemang" -H "Authorization: Bearer $TOKEN_A" | falt .niva)" "standard"

KOD=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BAS/api/abonnemang/fakturaepost" \
  -H "Authorization: Bearer $TOKEN_A" -H 'Content-Type: application/json' -d '{"epost":"inte en adress"}')
kontroll "ogiltig fakturaepost avvisas" "$KOD" "400"
curl -s -X POST "$BAS/api/abonnemang/fakturaepost" -H "Authorization: Bearer $TOKEN_A" \
  -H 'Content-Type: application/json' -d '{"epost":"faktura@verkstadnord.se"}' >/dev/null
kontroll "fakturaepost sparas" \
  "$(curl -s "$BAS/api/abonnemang" -H "Authorization: Bearer $TOKEN_A" | falt .fakturaepost)" "faktura@verkstadnord.se"
# Tom adress ar ett giltigt val: kunden hamtar fakturan sjalv.
curl -s -X POST "$BAS/api/abonnemang/fakturaepost" -H "Authorization: Bearer $TOKEN_A" \
  -H 'Content-Type: application/json' -d '{"epost":""}' >/dev/null
kontroll "tom fakturaepost ar tillaten" \
  "$(curl -s "$BAS/api/abonnemang" -H "Authorization: Bearer $TOKEN_A" | falt '.fakturaepost')" ""

# Nivan ar en HANDELSE — historiken finns kvar.
NIVAER=$(PGPASSWORD=test "$PGBIN/psql" -h 127.0.0.1 -p $PGPORT -U plattform -d felsokning \
  -tAc "select count(*) from abonnemangshandelser h join organisationer o on o.id = h.organisation_id
        where h.typ='niva' and o.namn='Verkstad A'")
kontroll "nivabytet lamnade spar" "$NIVAER" "2"

# 21. Fakturan som PDF, utan beroenden
FAKTURA_PDF_ID=$(PGPASSWORD=test "$PGBIN/psql" -h 127.0.0.1 -p $PGPORT -U plattform -d felsokning \
  -tAc "select id from fakturor order by nummer limit 1")
curl -s "$BAS/api/fakturor/$FAKTURA_PDF_ID/pdf" -H "Authorization: Bearer $TOKEN_A" -o /tmp/f.pdf
kontroll "PDF-huvudet stammer" "$(head -c 8 /tmp/f.pdf)" "%PDF-1.4"
case "$(tail -c 6 /tmp/f.pdf)" in
  *"%%EOF"*) echo "✓ PDF avslutas korrekt" ;;
  *) echo "✗ PDF saknar EOF"; exit 1 ;;
esac
KOD=$(curl -s -o /dev/null -w "%{http_code}" "$BAS/api/fakturor/$FAKTURA_PDF_ID/pdf" -H "Authorization: Bearer $TOKEN_B")
kontroll "org B kommer inte at org A:s faktura-PDF" "$KOD" "404"

# 22. Manadsfaktureringen ar idempotent pa perioden
# `registrerad` gar inte att andra — triggern skyddar startdatumet, och
# den fangade det har testet nar det forsokte backdatera. Perioden flyttas
# i stallet via senast_fakturerad, som ar en HARLEDD kolumn och darfor
# skrivbar. Att testet fick boja sig for regeln och inte tvartom ar
# poangen med regeln.
PGPASSWORD=test "$PGBIN/psql" -h 127.0.0.1 -p $PGPORT -U plattform -d felsokning \
  -qc "update abonnemang set senast_fakturerad = current_date - 60"
DATABASE_URL="postgresql://plattform:test@127.0.0.1:$PGPORT/felsokning" \
  node manadsfakturering.mjs > /tmp/mf1.json
ANTAL1=$(cat /tmp/mf1.json | falt .antal)
if [ "$ANTAL1" -ge 1 ]; then echo "✓ manadsjobbet fakturerade $ANTAL1"; else echo "✗ manadsjobbet fakturerade inget"; exit 1; fi
DATABASE_URL="postgresql://plattform:test@127.0.0.1:$PGPORT/felsokning" \
  node manadsfakturering.mjs > /tmp/mf2.json
kontroll "andra korningen dubbelfakturerar inte" "$(cat /tmp/mf2.json | falt .antal)" "0"

# 23. Spärren: last abonnemang stoppar nya arenden men aldrig lasning
# Fakturor ar oforanderliga, sa forfallet kan inte backas in i en
# befintlig. Det utfardas i stallet en faktura med gammalt
# utfardandedatum — forfallodagen harleds ur det, och blir da passerad.
ORG_A_AB=$(PGPASSWORD=test "$PGBIN/psql" -h 127.0.0.1 -p $PGPORT -U plattform -d felsokning \
  -tAc "select id from organisationer where namn='Verkstad A'")
curl -s -X POST "$BAS/api/fakturor" -H 'Content-Type: application/json' -H 'X-Fakturering: utfardarnyckel' \
  -d "{\"organisation_id\":\"$ORG_A_AB\",\"period\":{\"fran\":\"2025-01-01\",\"till\":\"2025-01-31\"},\"utfardad\":\"2025-01-01\"}" >/dev/null

AB=$(curl -s "$BAS/api/abonnemang" -H "Authorization: Bearer $TOKEN_A")
kontroll "en langt forfallen faktura laser abonnemanget" "$(echo "$AB" | falt .tillstand)" "last"
kontroll "beskedet namner fakturan" "$(echo "$AB" | falt '.besked.includes("ALVA-INV") ? "ja" : "nej"')" "ja"

# Sparren stoppar nya arenden.
KOD=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BAS/api/arenden" -H "Authorization: Bearer $TOKEN_A" \
  -H 'Content-Type: application/json' -d '{"id":"arende-last","nummer":99,"skapad":"2026-08-06T10:00:00Z"}')
kontroll "last abonnemang stoppar nya arenden" "$KOD" "402"

# Men ALDRIG lasningen. Det ar regeln som inte far tummas pa: loggen ar
# verkstadens underlag i en tvist som galler DERAS kund.
kontroll "lasning ar sann aven i last lage" "$(echo "$AB" | falt .behorighet.lasa)" "true"
kontroll "export ar sann aven i last lage" "$(echo "$AB" | falt .behorighet.exportera)" "true"
# Statuskoden, inte kroppen: det som ska bevisas ar att lasningen slapps
# igenom i last lage, och en kropp som tolkas fel skulle dolja det.
KOD=$(curl -s -o /dev/null -w "%{http_code}" "$BAS/api/arenden/arende-test1/handelser" -H "Authorization: Bearer $TOKEN_A")
kontroll "historiken ar fortfarande lasbar i last lage" "$KOD" "200"
KOD=$(curl -s -o /dev/null -w "%{http_code}" "$BAS/api/fakturor" -H "Authorization: Bearer $TOKEN_A")
kontroll "fakturorna gar att lasa i last lage" "$KOD" "200"

echo "Integrationstest: allt grönt"
