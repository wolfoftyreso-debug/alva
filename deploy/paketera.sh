#!/usr/bin/env bash
# Paketerar plattformen i numrerade zip-paket för agentdriven
# driftsättning på AWS. Se README.md i samma katalog.
#
# Paketen byggs i en arbetskatalog och flyttas färdiga till målet —
# ett avbrutet skript lämnar aldrig ett halvt paket där någon kan
# hitta det. Summorna i 00-plan beräknas över de färdiga paketen,
# därför byggs 00 sist trots att det läses först.
set -euo pipefail

ROT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"   # repo-roten
UT="${1:?ange målkatalog för paketen}"
mkdir -p "$UT"

VERSION="$(node -e 'import(process.argv[1]).then(m => console.log(m.PLATTFORMSVERSION))' \
  "$ROT/services/gemensam/version.mjs" 2>/dev/null || echo "okänd")"
SHA="$(git -C "$ROT" rev-parse --short HEAD 2>/dev/null || echo "utan-git")"
STAMPEL="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

# Största tillåtna innehåll per resursdel. Mottagarsidans kanal sätter
# gränsen: högst 2 MB per paket, så standarden ligger med marginal
# under den. Ändras per körning: DELBUDGET=1000000 bash paketera.sh …
# Bilderna är redan komprimerade, så zip-storleken följer innehållet.
# En enskild fil större än budgeten styckas i bitar (.alva-del-NN) som
# mottagaren sätter ihop igen mot summorna i DELAT.sha256.
DELBUDGET="${DELBUDGET:-1900000}"

# paketera <namn> <anvisningsfil> <väg>...  — vägarna är relativa
# KALLROT (standard ROT). EXKLUDERA (miljövariabel) läggs till
# tar-exkluderingarna för anropet.
paketera() {
  local namn="$1" anvisning="$2"; shift 2
  local arbets; arbets="$(mktemp -d)"

  # node_modules återskapas ur package-lock; dist byggs i webbilden.
  tar -C "${KALLROT:-$ROT}" -cf - --exclude=node_modules --exclude=app/dist \
    ${EXKLUDERA:+--exclude="$EXKLUDERA"} "$@" |
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
paketera 02-tjanster    02-tjanster.md    services server Dockerfile AGENTS.md

# Webbklienten delas: koden för sig och bildresurserna i delar om högst
# DELBUDGET byte — helheten var större än mottagarkanalen tålde. Delarna
# fylls i namnordning, så samma träd ger samma delar.
EXKLUDERA="app/src/assets" paketera 03-webb-kalla 03-webb.md app

# Mellansteg: resurserna läggs i ett eget källträd där varje fil som
# ensam överstiger budgeten styckas i bitar. DELAT.sha256 bär de
# ursprungliga filernas summor — mottagarens kvitto på ihopsättningen.
# Finns ingen resurskatalog blir det inga resursdelar — källpaketet är
# då hela leveranssteget.
RESURSROT="$(mktemp -d)"
if [ -d "$ROT/app/src/assets" ]; then
  while IFS= read -r fil; do
    mkdir -p "$RESURSROT/$(dirname "$fil")"
    if (($(stat -c%s "$ROT/$fil") > DELBUDGET)); then
      split -b "$DELBUDGET" -d -a 2 "$ROT/$fil" "$RESURSROT/$fil.alva-del-"
      (cd "$ROT" && sha256sum "$fil") >> "$RESURSROT/app/src/assets/DELAT.sha256"
    else
      cp "$ROT/$fil" "$RESURSROT/$fil"
    fi
  done < <(cd "$ROT" && find app/src/assets -type f | sort)
fi

del=0 ack=0 resurser=()
slut_resursdel() {
  ((${#resurser[@]})) || return 0
  del=$((del + 1))
  KALLROT="$RESURSROT" paketera "03-webb-resurser-$del" 03-webb.md "${resurser[@]}"
  ack=0 resurser=()
}
while IFS= read -r fil; do
  storlek=$(stat -c%s "$RESURSROT/$fil")
  ((ack > 0 && ack + storlek > DELBUDGET)) && slut_resursdel
  resurser+=("$fil"); ack=$((ack + storlek))
done < <(cd "$RESURSROT" && find app/src/assets -type f 2>/dev/null | sort)
slut_resursdel
rm -rf "$RESURSROT"

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
