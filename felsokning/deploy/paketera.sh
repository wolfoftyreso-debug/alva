#!/usr/bin/env bash
# Paketerar plattformen i numrerade zip-paket för agentdriven
# driftsättning på AWS. Se README.md i samma katalog.
#
# Paketen byggs i en arbetskatalog och flyttas färdiga till målet —
# ett avbrutet skript lämnar aldrig ett halvt paket där någon kan
# hitta det. Summorna i 00-plan beräknas över de färdiga paketen,
# därför byggs 00 sist trots att det läses först.
set -euo pipefail

ROT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"   # felsokning/
UT="${1:?ange målkatalog för paketen}"
mkdir -p "$UT"

VERSION="$(node -e 'import(process.argv[1]).then(m => console.log(m.PLATTFORMSVERSION))' \
  "$ROT/services/gemensam/version.mjs" 2>/dev/null || echo "okänd")"
SHA="$(git -C "$ROT" rev-parse --short HEAD 2>/dev/null || echo "utan-git")"
STAMPEL="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

# paketera <namn> <anvisningsfil> <väg>...  — vägarna är relativa ROT.
paketera() {
  local namn="$1" anvisning="$2"; shift 2
  local arbets; arbets="$(mktemp -d)"

  # node_modules återskapas ur package-lock; dist byggs i webbilden.
  tar -C "$ROT" -cf - --exclude=node_modules --exclude=app/dist "$@" |
    tar -C "$arbets" -xf -

  # Metafilerna ligger under paket/<namn>/ så att alla paket kan packas
  # upp i SAMMA arbetskatalog utan att skriva över varandras.
  mkdir -p "$arbets/paket/$namn"
  cp "$ROT/deploy/anvisningar/$anvisning" "$arbets/paket/$namn/ANVISNING-AGENT.md"
  printf '%s · %s · paketerad %s · paket %s\n' \
    "$VERSION" "$SHA" "$STAMPEL" "$namn" > "$arbets/paket/$namn/PAKET.txt"
  (cd "$arbets" && find . -type f | sort | sed 's|^\./||') > "$arbets/paket/$namn/INNEHALL.txt"

  (cd "$arbets" && zip -qrX "$namn.zip" .)
  mv "$arbets/$namn.zip" "$UT/"
  rm -rf "$arbets"
  du -h "$UT/$namn.zip" | awk '{print "  " $2 "  " $1}'
}

echo "paketerar $VERSION ($SHA) → $UT"
rm -f "$UT"/0[0-5]-*.zip

paketera 01-aws-bas     01-aws-bas.md     infra/aws infra/postgres-init.sql
paketera 02-tjanster    02-tjanster.md    services
paketera 03-webb        03-webb.md        app supabase
paketera 04-arbetslast  04-arbetslast.md  infra/terraform
paketera 05-verifiering 05-verifiering.md docs

# 00-plan: planen + summorna över de fem färdiga paketen.
arbets="$(mktemp -d)"
cp "$ROT/deploy/anvisningar/00-plan.md" "$arbets/DRIFTSATTNING.md"
printf '%s · %s · paketerad %s · paket 00-plan\n' \
  "$VERSION" "$SHA" "$STAMPEL" > "$arbets/PAKET.txt"
(cd "$UT" && sha256sum 0[1-5]-*.zip) > "$arbets/SHA256SUMS.txt"
(cd "$arbets" && zip -qrX 00-plan.zip .)
mv "$arbets/00-plan.zip" "$UT/"
rm -rf "$arbets"
du -h "$UT/00-plan.zip" | awk '{print "  " $2 "  " $1}'

echo "klart — läs 00-plan.zip först"
