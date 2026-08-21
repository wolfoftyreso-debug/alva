# Drift på en EC2-maskin — enservern bakom nginx

**ALVA-DOC-0013 · ur flätningen (ALVA-DOC-0012), lyft ur produktions-
kopians fungerande deploy på alva.landvex.com, städad och rättad.**

Detta är den enkla driftformen från AGENTS.md i verklig miljö: EN
process (`server/server.mjs`) som bär landningssida, `/api` och `/ai`,
bakom nginx med TLS, styrd av systemd. Kubernetes-formen i `infra/`
är den skalade vägen; den här sidan räcker för en maskin.

## ⚠ Före allt annat: nycklarna i den gamla kopian är röjda

Produktionskopians systemd-fil bar nycklarna i klartext och har
lämnat maskinen (bl.a. i arkivexporter). Dessutom återanvändes samma
värde för `FORSEGLING_NYCKEL` och `ECM_REGLER_NYCKEL`, och samma för
`JWT_SECRET` och `SUPABASE_JWT_SECRET`, och databaslösenordet stod i
dokumentationen. Vid nästa driftsättning:

1. **Generera NYA, SEPARATA värden för varje nyckel** (`openssl rand
   -hex 32`) och nytt databaslösenord.
2. **Nycklar bor i en miljöfil med läge 600, aldrig i enheten,
   aldrig i git:** `/etc/alva/miljo` ägd av tjänstens användare.
3. Rotera bort de gamla: personuppgiftsnyckeln styr kryptoradering
   och förseglingsnyckeln styr avslutens bevisvärde — en röjd nyckel
   är ett revisionsfynd, inte en detalj.

## 1. Databas

Lokal PostgreSQL (eller RDS). Skapa databas och användare med minsta
rättigheter, initiera schemat:

```sh
sudo -u postgres psql -c "CREATE DATABASE alva ENCODING 'UTF8'"
sudo -u postgres psql -c "CREATE USER alva_app WITH PASSWORD '<nytt starkt lösenord>'"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE alva TO alva_app"
sudo -u postgres psql -d alva -f infra/postgres-init.sql   # append-only-triggrar m.m.
```

## 2. Bygg

```sh
cd app && npm ci && VITE_PLATTFORM_URL=/api VITE_AI_ORKESTER_URL=/ai npm run build
cd ../services/plattform  && npm ci --omit=dev
cd ../ai-orkester         && npm ci --omit=dev
```

## 3. Miljöfil — `/etc/alva/miljo` (läge 600)

```sh
NODE_ENV=production
PORT=8082
APP_DIST=/opt/alva/app/dist
DATABASE_URL=postgresql://alva_app:<lösenord>@localhost:5432/alva
JWT_SECRET=<eget 32-byte-hex>
ANTHROPIC_API_KEY=<Claude-nyckel>
PERSONNYCKEL_HUVUD=<eget 32-byte-hex>
FORSEGLING_NYCKEL=<eget 32-byte-hex>
# Blindar fordonsindexet. Utan den skrivs inget index, och en
# raderingsbegäran måste ange ärende-id i stället för registreringsnummer.
BLINDNINGSNYCKEL=<eget 32-byte-hex>
ECM_REGLER_NYCKEL=<eget 32-byte-hex>
REGISTRERING_OPPEN=true
TILLATNA_URSPRUNG=https://<din domän>
```

Fullständig variabellista: filhuvudena i
`services/plattform/server.mjs` och `services/ai-orkester/server.mjs`.

## 4. systemd — `/etc/systemd/system/alva.service`

```ini
[Unit]
Description=ALVA
After=network.target postgresql.service
Wants=postgresql.service

[Service]
Type=simple
User=alva
WorkingDirectory=/opt/alva
EnvironmentFile=/etc/alva/miljo
ExecStart=/usr/bin/node server/server.mjs
Restart=on-failure
RestartSec=5
StandardOutput=journal
StandardError=journal
SyslogIdentifier=alva

[Install]
WantedBy=multi-user.target
```

```sh
systemctl daemon-reload && systemctl enable --now alva && systemctl status alva
```

**En driftmekanism.** systemd äger processen — ingen PM2, ingen
parallell mekanism. Två ägare av samma ansvar är receptet för att en
lagning bryter något annat.

## 5. nginx — proxy med TLS

Kopians konfiguration fungerar och behålls i sin helhet, med TVÅ
rättelser:

- **CSP:n får inte tillåta `fonts.googleapis.com`/`fonts.gstatic.com`.**
  ALVA självhostar typsnitten och testsviten förbjuder externa
  typsnittstjänster; raden var ett främmande inslag. Rätt CSP:
  `default-src 'self'; script-src 'self'; style-src 'self'
  'unsafe-inline'; font-src 'self'; img-src 'self' data: blob:;
  connect-src 'self'; frame-ancestors 'none'; base-uri 'self';
  form-action 'self'`
- **Proxya `/sw.js` och `/manifest.json` utan cache** (appservern
  sätter redan `no-cache`; lägg ingen `expires`-regel ovanpå) — annars
  når inga service worker-uppdateringar ut.

Kärnan i övrigt: uppström `127.0.0.1:8082` med keepalive, HTTP→HTTPS-
omdirigering, TLS 1.2/1.3, säkerhetshuvuden, gzip.

## 6. TLS-certifikat

Kopians kända problem: certbot:s HTTP-utmaning föll, trolig orsak att
något framför servern (lastbalanserare/annan proxy) fångar port 80.
Rätt lösning i den situationen är **DNS-utmaningen**, som inte kräver
någon port alls:

```sh
certbot certonly --dns-route53 -d <din domän>   # zonen ligger i Route 53
```

Självsignerat certifikat är acceptabelt enbart som byggnadsställning —
aldrig mot riktiga användare.

## 7. Verifiera — samma krav som AGENTS.md

```sh
curl -fsS https://<din domän>/          | grep -q ALVA
curl -fsS https://<din domän>/api/halsa
curl -fsS https://<din domän>/ai/halsa
journalctl -u alva -n 20     # demonstrationsläge? saknade nycklar syns här, vid start
```

## 8. Schemalagda jobb — fakturering och gallring

Två jobb körs utanför webbtjänstens process, båda idempotenta och båda
med utfallet i journalen. Enheterna ligger färdiga i `infra/systemd/`:

```sh
cp infra/systemd/alva-*.service infra/systemd/alva-*.timer /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now alva-fakturering.timer alva-gallring.timer
systemctl list-timers 'alva-*'          # båda ska stå med nästa körtid
```

Prova faktureringen för hand FÖRST, utan att fakturera:

```sh
cd /opt/alva/services/plattform && node manadsfakturering.mjs --torrkor
```

Gallringen är inte valfri drift: utan den är lagringsbegränsningen en
nedskriven avsikt, inte en verkställd kontroll (TÜV T-4).

## 9. Uppdatera

```sh
cd /opt/alva && git fetch origin main && git checkout --detach origin/main
cd app && npm ci && VITE_PLATTFORM_URL=/api VITE_AI_ORKESTER_URL=/ai npm run build
cd ../services/plattform && npm ci --omit=dev && cd ../ai-orkester && npm ci --omit=dev
systemctl restart alva
```

Regeln ur AGENTS.md gäller maskinen också: inget eget arbete direkt i
produktionsklonen. Ändringar görs mot GitHub `main` genom testsviten
och dras hit — kopian är en KONSUMENT av `main`, aldrig en källa.
