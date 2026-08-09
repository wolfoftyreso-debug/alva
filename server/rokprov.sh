#!/usr/bin/env bash
# Rökprovet för den sammansatta servern: startar den mot ett riktigt
# klientbygge och bevisar utifrån att landningssidan, SPA-vägarna,
# båda API:na och cachereglerna svarar rätt. Grönt utan träffkrav är
# inte grönt — varje kontroll är en exakt förväntan.
set -euo pipefail

ROT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PORT="${ROKPROV_PORT:-4310}"
BAS="http://127.0.0.1:$PORT"

if [ ! -f "$ROT/app/dist/index.html" ]; then
  echo "bygger klienten (dist saknas) …"
  (cd "$ROT/app" && VITE_PLATTFORM_URL=/api VITE_AI_ORKESTER_URL=/ai \
    VITE_SUPABASE_URL="https://rokprov.invalid" VITE_SUPABASE_PUBLISHABLE_KEY="rokprov" \
    npm run build >/dev/null)
fi

PORT="$PORT" node "$ROT/server/server.mjs" &
SERVER=$!
stada() { kill "$SERVER" 2>/dev/null || true; }
trap stada EXIT

for _ in $(seq 1 50); do
  curl -fsS "$BAS/halsa" >/dev/null 2>&1 && break
  sleep 0.1
done

fel=0
krav() {
  local namn="$1"; shift
  if "$@" >/dev/null 2>&1; then echo "ok   $namn"; else echo "FEL  $namn"; fel=$((fel + 1)); fi
}

krav "roten är ALVA:s startsida"        bash -c "curl -fsS '$BAS/' | grep -q '<title>ALVA'"
krav "SPA-väg utan fil ger sidan"       bash -c "curl -fsS '$BAS/alva/portal' | grep -q '<title>ALVA'"
krav "saknad fil MED ändelse ger 404"   bash -c "[ \"\$(curl -s -o /dev/null -w '%{http_code}' '$BAS/finns-inte.js')\" = 404 ]"
krav "serverns hälsa svarar"            bash -c "curl -fsS '$BAS/halsa' | grep -q uppe"
krav "plattformens API under /api"      bash -c "curl -fsS '$BAS/api/halsa'"
krav "orkesterns API under /ai"         bash -c "curl -fsS '$BAS/ai/halsa'"
krav "hashade assets cachas för alltid" bash -c "curl -fsSI \"$BAS\$(grep -o '/assets/[^\"]*\.js' '$ROT/app/dist/index.html' | head -1)\" | grep -qi immutable"
krav "index.html cachas aldrig"         bash -c "curl -fsSI '$BAS/' | grep -qi 'no-cache'"
krav "vägar utanför roten stängs"       bash -c "[ \"\$(curl -s -o /dev/null -w '%{http_code}' --path-as-is '$BAS/../etc/passwd')\" != 200 ]"

if ((fel > 0)); then
  echo "rökprovet föll: $fel kontroller"
  exit 1
fi
echo "rökprovet rent — en server, hela produkten"
