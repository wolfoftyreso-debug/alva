# Paket 02 · Backendtjänsterna

**Genväg:** paketet innehåller också `server/` och repo-rotens
`Dockerfile` — hela produkten som EN container (webb på `/`, API under
`/api`, AI under `/ai`). Är målet en enkel driftsättning: bygg den
(`docker build -t alva .` från trädets rot, kräver även paket 03
uppackat), kör, verifiera enligt `AGENTS.md`, och hoppa över resten av
detta paket och paket 04. Stegen nedan gäller Kubernetes-formen.

Detta paket innehåller `services/`: plattformstjänsten (auth,
händelse-API, delning, fakturering), AI-orkestern och den delade koden
i `gemensam/`. Här byggs och publiceras de två backendbilderna.

Kräver att paket 01 är klart och verifierat: registret och databasen
finns, och du har registeradressen ur dess rapport. Paket 03 är
oberoende av detta paket och får köras parallellt av en annan agent —
men med SAMMA bildtagg.

## Steg 1 — testa före bygge

Grönt lokalt är villkoret för att bygga över huvud taget:

```sh
cd services/plattform
npm ci
bash integrationstest.sh        # hela ärendeflödet mot en lokal server
bash aterstallningstest.sh      # säkerhetskopian går att läsa tillbaka
```

## Steg 2 — bygg bilderna

Byggkontexten är `services/` — Dockerfilerna hämtar den delade
observationsmodulen därifrån. Taggen är git-SHA:t ur `PAKET.txt`;
registret har oföränderliga taggar, så en tagg som redan finns kan
inte återanvändas.

```sh
cd services
REG=<registeradress ur paket 01>          # t.ex. …dkr.ecr.eu-north-1.amazonaws.com
TAGG=<git-SHA ur PAKET.txt>

docker build -f plattform/Dockerfile   -t "$REG/felsokning-plattform:$TAGG"   .
docker build -f ai-orkester/Dockerfile -t "$REG/felsokning-ai-orkester:$TAGG" .
```

Exakta reponamn: `aws ecr describe-repositories` — avviker de från
raderna ovan gäller registrets namn, inte anvisningens.

## Steg 3 — publicera

```sh
aws ecr get-login-password | docker login --username AWS --password-stdin "$REG"
docker push "$REG/felsokning-plattform:$TAGG"
docker push "$REG/felsokning-ai-orkester:$TAGG"
```

## Verifiering

```sh
aws ecr describe-images --repository-name felsokning-plattform \
  --query 'imageDetails[].imageTags' | grep "$TAGG"
aws ecr describe-images --repository-name felsokning-ai-orkester \
  --query 'imageDetails[].imageTags' | grep "$TAGG"
docker run --rm "$REG/felsokning-plattform:$TAGG" node --version   # bilden startar
```

Rapportera taggen och båda bildernas digest — paket 04 sätter taggen i
`bildtagg` och digesten är svaret på "vilken kod kör i produktion".

## Stoppvillkor

Rött integrationstest eller återställningstest: bygg ingenting.
Misslyckad push mot befintlig tagg betyder att taggen redan är använd —
välj en ny tagg (nytt SHA), skriv aldrig över.
