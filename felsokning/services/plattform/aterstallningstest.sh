#!/usr/bin/env bash
# Återställningstest.
#
# Revisionen (docs/QUALITY-AUDIT.md, M-5) fann att backup-larmet bevisar
# att säkerhetskopiering *sker* — inte att den *går att återställa*. Det
# är två helt olika påståenden, och bara det andra spelar roll den dag
# det behövs.
#
# Testet gör det som en riktig återställning gör, i miniatyr: bygger ett
# schema, fyller det med ett ärende som bär evidens, tar en dump,
# återställer den i en tom databas och kontrollerar att bevisvärdet
# överlevde — inte bara att raderna finns.
#
# Det som kontrolleras efter återställning:
#   1. Händelserna finns kvar, i rätt ordning och med rätt härkomst.
#   2. Append-only-triggarna följde med. En återställd databas utan dem
#      vore tyst obrukbar: den ser rätt ut och skyddar ingenting.
#   3. Bilagornas hash stämmer mot innehållet.
#   4. Personnycklarna finns, så ett skyddat regnr går att läsa igen.
#
# Punkt 2 är den som motiverar hela skriptet. Ett schema återställs oftast
# rätt; det som brukar tappas är sådant som ligger utanför tabellerna.

set -euo pipefail

KALLA="felsokning_ater_kalla"
MAL="felsokning_ater_mal"
# Dumpen skrivs av postgres-användaren och måste ligga där den kan skriva.
ARBETSKATALOG="$(mktemp -d)"
chmod 777 "$ARBETSKATALOG"
DUMP="$ARBETSKATALOG/dump.sql"
SCHEMA="$(dirname "$0")/../../infra/postgres-init.sql"

if ! pg_isready -q 2>/dev/null; then
  service postgresql start >/dev/null 2>&1 || pg_ctlcluster "$(ls /etc/postgresql | head -1)" main start
  for _ in $(seq 1 30); do pg_isready -q && break; sleep 1; done
fi

kor() { su postgres -c "psql -v ON_ERROR_STOP=1 -qtAX -d $1 -c \"$2\""; }

echo "→ bygger källdatabasen"
su postgres -c "dropdb --if-exists $KALLA; dropdb --if-exists $MAL"
su postgres -c "createdb $KALLA; createdb $MAL"
su postgres -c "psql -v ON_ERROR_STOP=1 -q -d $KALLA -f $SCHEMA" >/dev/null

echo "→ fyller den med ett ärende som bär evidens"
su postgres -c "psql -v ON_ERROR_STOP=1 -q -d $KALLA" >/dev/null <<'SQL'
insert into organisationer (id, namn) values ('11111111-1111-1111-1111-111111111111', 'Testverkstaden');
insert into anvandare (id, organisation_id, epost, losen_hash, namn, roll)
  values ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111',
          'a@b.se', crypt('x', gen_salt('bf')), 'Anna Tekniker', 'admin');
insert into felsokning_arenden (id, organisation_id, nummer, skapad, identifierare_index)
  values ('ar-1', '11111111-1111-1111-1111-111111111111', 1, now(), 'blindat-abc123');
insert into felsokning_handelser (id, arende_id, tidpunkt, anvandare, handelse, sekvens, kedjehash) values
  ('h-1', 'ar-1', now() - interval '2 hours', 'Anna Tekniker',
   '{"typ":"objekt_identifierat","objekt":{"identifierare":"ABC123"}}', 1, 'lank-1'),
  ('h-2', 'ar-1', now() - interval '1 hour', 'Anna Tekniker',
   '{"typ":"matvarde","beskrivning":"Lufttryck","varde":"2,4","matdonId":"m1"}', 2, 'lank-2');
update felsokning_arenden set kedjerot = 'lank-2', forsegling = 'abcd', forseglad = now() where id = 'ar-1';
insert into personnycklar (id, organisation_id, subjekt, nyckel)
  values ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111',
          'ar-1', decode('00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff','hex'));
insert into bilagor (id, arende_id, organisation_id, hash, mediatyp, storlek)
  values ('b-1', 'ar-1', '11111111-1111-1111-1111-111111111111',
          'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', 'image/jpeg', 0);
SQL

echo "→ tar dump och återställer i en tom databas"
su postgres -c "pg_dump -d $KALLA -f $DUMP"
su postgres -c "psql -v ON_ERROR_STOP=1 -q -d $MAL -f $DUMP" >/dev/null

fel=0
kontroll() {
  local vad="$1" vantat="$2" fick="$3"
  if [ "$fick" = "$vantat" ]; then
    echo "   ✓ $vad"
  else
    echo "   ✗ $vad — väntade '$vantat', fick '$fick'"
    fel=1
  fi
}

echo "→ kontrollerar den återställda databasen"
kontroll "händelserna finns kvar" "2" "$(kor $MAL 'select count(*) from felsokning_handelser')"
kontroll "härkomsten överlevde" "Anna Tekniker" \
  "$(kor $MAL "select anvandare from felsokning_handelser where id = 'h-1'")"
kontroll "ordningen är bevarad" "h-1" \
  "$(kor $MAL 'select id from felsokning_handelser order by tidpunkt limit 1')"
kontroll "personnyckeln följde med" "1" "$(kor $MAL 'select count(*) from personnycklar')"
kontroll "bilagans hash följde med" "1" \
  "$(kor $MAL "select count(*) from bilagor where hash like 'e3b0c442%'")"

# Det som faktiskt brukar tappas vid en återställning.
kontroll "append-only-triggarna följde med" "2" \
  "$(kor $MAL "select count(*) from pg_trigger where tgrelid in ('felsokning_handelser'::regclass,'felsokning_arenden'::regclass) and not tgisinternal")"

# Kedjan och förseglingen är bevisets ryggrad — en återställning som
# tappar dem ger en logg som aldrig mer verifierar (TÜV-2).
kontroll "kedjelänkarna följde med" "lank-2" \
  "$(kor $MAL "select kedjehash from felsokning_handelser where id='h-2'")"
kontroll "kedjeordningen följde med" "2" \
  "$(kor $MAL "select sekvens from felsokning_handelser where id='h-2'")"
kontroll "förseglingen följde med" "abcd" \
  "$(kor $MAL "select forsegling from felsokning_arenden where id='ar-1'")"

echo "→ verifierar att triggarna faktiskt biter i den återställda databasen"
if su postgres -c "psql -qtAX -d $MAL -c \"update felsokning_handelser set anvandare='Någon annan' where id='h-1'\"" >/dev/null 2>&1; then
  echo "   ✗ append-only bryts i den återställda databasen — historiken går att skriva om"
  fel=1
else
  echo "   ✓ ändringsförsök avvisas"
fi
if su postgres -c "psql -qtAX -d $MAL -c \"delete from felsokning_handelser where id='h-1'\"" >/dev/null 2>&1; then
  echo "   ✗ raderingsförsök lyckades i den återställda databasen"
  fel=1
else
  echo "   ✓ raderingsförsök avvisas"
fi
# Förseglingslåset ska också överleva dumpen — en försegling som kan
# skrivas om efter en återställning är ingen försegling.
if su postgres -c "psql -qtAX -d $MAL -c \"update felsokning_arenden set forsegling='ffff' where id='ar-1'\"" >/dev/null 2>&1; then
  echo "   ✗ förseglingen gick att skriva om i den återställda databasen"
  fel=1
else
  echo "   ✓ omförsegling avvisas"
fi

su postgres -c "dropdb --if-exists $KALLA; dropdb --if-exists $MAL"

if [ "$fel" -ne 0 ]; then
  echo
  echo "ÅTERSTÄLLNINGSTESTET MISSLYCKADES."
  echo "En säkerhetskopia som inte kan återställas med bevisvärdet intakt"
  echo "är ingen säkerhetskopia. Åtgärda innan driftsättning."
  exit 1
fi

echo
echo "Återställningen bevarade händelser, härkomst, ordning, bilagehashar,"
echo "personnycklar, kedjelänkar, förseglingar och append-only-skyddet."
