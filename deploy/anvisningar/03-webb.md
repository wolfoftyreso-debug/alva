# Paket 03 · Webbklienten

Detta paket innehåller `app/` (källkod, utan `node_modules` och `dist`)
och `supabase/` (värdapplikationens migrationsunderlag). Här byggs och
publiceras webbilden — en statisk SPA bakom oprivilegierad nginx.

Kräver att paket 01 är klart. Oberoende av paket 02 — får köras
parallellt, men med SAMMA bildtagg.

## Delarna — packa upp allihop innan något byggs

Paket 03 levereras i flera zip-filer: `03-webb-kalla` (källkoden) och
`03-webb-resurser-1…N` (bildresurserna i `app/src/assets`, delade i
storleksbegränsade delar för överföringens skull). Delningen är
teknisk, inte logisk — de är ETT steg:

1. Packa upp samtliga `03-webb-*`-filer i samma arbetsträd som övriga
   paket. Vilka delar som finns framgår av `SHA256SUMS.txt` i paket 00.
2. Kontrollera fullständigheten mot delarnas fillistor:
   ```sh
   cat paket/03-webb-*/INNEHALL.txt | grep '^app/src/assets/' | sort | while read -r f; do
     [ -f "$f" ] || echo "SAKNAS: $f"
   done   # ingen utskrift = komplett
   ```
3. Sätt ihop styckade filer. En fil som ensam var större än delbudgeten
   ligger som bitar (`<fil>.alva-del-00`, `-01`, …) och de ursprungliga
   summorna i `app/src/assets/DELAT.sha256`:
   ```sh
   for f in app/src/assets/*.alva-del-00; do
     bas="${f%.alva-del-00}"
     cat "$bas".alva-del-* > "$bas" && rm "$bas".alva-del-*
   done
   sha256sum -c app/src/assets/DELAT.sha256 && rm app/src/assets/DELAT.sha256
   ```
   Stämmer inte en summa: en bit saknas eller är skadad — hämta om den
   delen, gissa aldrig ihop en bild.

Saknas en resursfil faller för övrigt bygget på importfel — men
kontrollera FÖRE, så att felmeddelandet är "del saknas", inte en
kryptisk byggutskrift.

## Steg 1 — testa före bygge

```sh
cd app
npm ci
npx vitest run            # hela sviten ska vara grön
npm run typkontroll
npm run lint              # jämför mot baslinjen i rapporten från leverantören
```

## Steg 2 — bygg bilden

Vite-variablerna bakas in vid byggtillfället och skickas som
byggargument — en färdig bild är alltså knuten till sin miljö.
Plattforms- och orkesteradresserna är miljöns publika adresser (ur
paket 01:s `karta`); Supabase-värdena är värdapplikationens och hämtas
ur organisationens Supabase-projekt.

```sh
cd app
REG=<registeradress ur paket 01>
TAGG=<git-SHA ur PAKET.txt>       # samma tagg som paket 02

docker build \
  --build-arg VITE_PLATTFORM_URL="https://<plattformens adress>" \
  --build-arg VITE_AI_ORKESTER_URL="https://<orkesterns adress>" \
  --build-arg VITE_SUPABASE_URL="<supabase-url>" \
  --build-arg VITE_SUPABASE_PUBLISHABLE_KEY="<publicerbar nyckel>" \
  --build-arg VITE_SUPABASE_PROJECT_ID="<projekt-id>" \
  -t "$REG/felsokning-web:$TAGG" .
```

Den publicerbara Supabase-nyckeln är publik per definition — men den
är det ENDA nyckelvärde som får förekomma i ett byggargument. Allt
hemligt bor i Secrets Manager och når bara backendtjänsterna.

## Steg 3 — publicera

```sh
aws ecr get-login-password | docker login --username AWS --password-stdin "$REG"
docker push "$REG/felsokning-web:$TAGG"
```

## Verifiering

```sh
aws ecr describe-images --repository-name felsokning-web \
  --query 'imageDetails[].imageTags' | grep "$TAGG"

# Bilden serverar och svarar:
docker run --rm -d -p 8080:8080 --name webbprov "$REG/felsokning-web:$TAGG"
curl -fsS http://127.0.0.1:8080/ | grep -q "<div id=\"root\"" && echo "serverar"
docker rm -f webbprov
```

Rapportera taggen och bildens digest.

## Stoppvillkor

Röda tester, typfel eller lintfel utöver den kända baslinjen: bygg
ingenting. Saknade byggargument ger en bild som kraschar vid start
("supabaseUrl is required") — en sådan bild publiceras inte.
