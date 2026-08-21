-- Guidad Felsökning: schema för den självhostade plattformen.
-- Multi-tenant: varje organisation är en egen tenant — all ärendedata är
-- organisationsknuten och API:t släpper aldrig data över organisationsgränsen.
-- Append-only garanteras med triggers: historik kan inte ändras eller
-- raderas oavsett vilken roll som ansluter.

create extension if not exists pgcrypto;

create table if not exists organisationer (
  id uuid primary key default gen_random_uuid(),
  namn text not null,
  -- Vad som visas när ett ärende startas (objekttyper,
  -- identifieringsmetoder) — sätts av systemadministratören.
  installningar jsonb not null default '{}'::jsonb,
  skapad timestamptz not null default now()
);
alter table organisationer add column if not exists installningar jsonb not null default '{}'::jsonb;

-- Märkesspecifika kopplingar per organisation. Uppgifterna lagras
-- krypterade (AES-256-GCM, nyckel ur INTEGRATION_NYCKEL) och lämnar
-- aldrig servern i klartext — klienten ser bara maskerade värden.
create table if not exists integrationer (
  organisation_id uuid not null references organisationer(id),
  leverantor text not null,
  uppgifter_krypt text not null,
  aktiv boolean not null default true,
  skapad timestamptz not null default now(),
  uppdaterad timestamptz not null default now(),
  senast_testad timestamptz,
  senaste_status text,
  primary key (organisation_id, leverantor)
);

create table if not exists anvandare (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisationer(id),
  epost text unique not null,
  losen_hash text not null,
  namn text not null,
  roll text not null default 'tekniker'
    check (roll in ('tekniker', 'arbetsledare', 'admin')),
  -- En avaktiverad användare kan varken logga in eller använda en token
  -- som redan är utfärdad.
  aktiv boolean not null default true,
  -- Räknare för återkallelse. Utfärdade tokens bär sitt värde; höjs det
  -- slutar alla tidigare utfärdade att gälla omedelbart. Loggen rörs
  -- inte — historiken är fortfarande knuten till personen.
  token_version integer not null default 0,
  skapad timestamptz not null default now()
);
alter table anvandare add column if not exists aktiv boolean not null default true;
alter table anvandare add column if not exists token_version integer not null default 0;

-- Inloggningsförsök: underlag för takt-begränsning som fungerar bakom
-- flera repliker (den i minnet gör det inte). Inget lösenord lagras —
-- bara att ett försök skedde och om det lyckades.
create table if not exists inloggningsforsok (
  id bigserial primary key,
  epost text not null,
  kalla text not null default '',
  lyckades boolean not null,
  tidpunkt timestamptz not null default now()
);
create index if not exists inloggningsforsok_epost_idx
  on inloggningsforsok (epost, tidpunkt desc);
create index if not exists inloggningsforsok_kalla_idx
  on inloggningsforsok (kalla, tidpunkt desc);

create table if not exists felsokning_arenden (
  id text primary key,
  organisation_id uuid not null references organisationer(id),
  nummer integer not null,
  skapad timestamptz not null,
  delningskod text unique,
  metodik_id text,
  skapad_av uuid references anvandare(id),
  insatt timestamptz not null default now()
);
create index if not exists felsokning_arenden_org_idx
  on felsokning_arenden (organisation_id, skapad desc);

-- Bilagor: foton, video och instrumentbilder. Innehållet ligger utanför
-- händelsen; loggen bär en referens och innehållets SHA-256. Hashen står
-- i den append-only-skyddade loggen, så en utbytt bild går att upptäcka —
-- starkare bevisvärde än när bilden låg inbäddad och måste tros på.
create table if not exists bilagor (
  id text primary key,
  organisation_id uuid not null references organisationer(id),
  arende_id text not null,
  hash text not null,
  mediatyp text not null,
  storlek integer not null,
  laddad_av uuid references anvandare(id),
  skapad timestamptz not null default now()
);
create index if not exists bilagor_arende_idx on bilagor (arende_id);
create index if not exists bilagor_hash_idx on bilagor (hash);

-- Själva bytesen när BILAGE_LAGE=databas. Innehållsadresserat: samma
-- foto som dokumenteras två gånger lagras en gång. I s3-läget är den
-- här tabellen tom och innehållet ligger i objektlagringen.
create table if not exists bilage_innehall (
  hash text primary key,
  data bytea not null,
  skapad timestamptz not null default now()
);

-- ---- Händelseloggen -----------------------------------------------------
--
-- Nyckeln är (arende_id, id) och INTE id ensamt. Skillnaden är hela
-- TÜV-revisionens T-1.
--
-- Klienten sätter id, och gjorde det som Date.now() + en räknare — alltså
-- förutsägbart. Med en global primärnyckel och `on conflict do nothing`
-- kunde en organisation skriva de id:n en ANNAN organisation snart skulle
-- använda, till sitt eget ärende, och den andras händelse föll tyst bort.
-- Servern svarade 200. Teknikern såg händelsen på skärmen, ärendet
-- stängdes, och felorsaken fanns inte i loggen.
--
-- Append-only skyddade det som skrevs. Ingenting skyddade det som
-- hindrades från att skrivas. Med nyckeln skopad till ärendet finns det
-- inget delat namnrum kvar att ockupera.
create table if not exists felsokning_handelser (
  id text not null,
  arende_id text not null references felsokning_arenden(id),
  tidpunkt timestamptz not null,
  anvandare text not null,
  handelse jsonb not null,
  insatt timestamptz not null default now(),
  primary key (arende_id, id)
);
create index if not exists felsokning_handelser_arende_idx
  on felsokning_handelser (arende_id, tidpunkt);

-- Migrering av en befintlig installation: den gamla nyckeln på enbart id
-- byts mot den skopade. Kollisioner mellan ärenden kan inte uppstå vid
-- bytet — den gamla nyckeln var strängare — så bytet är alltid möjligt.
do $$
begin
  if exists (
    select 1 from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    where t.relname = 'felsokning_handelser' and c.contype = 'p'
      and (select count(*) from unnest(c.conkey)) = 1
  ) then
    alter table felsokning_handelser drop constraint felsokning_handelser_pkey;
    alter table felsokning_handelser add primary key (arende_id, id);
  end if;
end $$;

create or replace function forbjud_andring() returns trigger
language plpgsql as $$
begin
  raise exception 'Loggen är append-only — historik kan inte ändras eller raderas';
end $$;

drop trigger if exists handelser_append_only on felsokning_handelser;
create trigger handelser_append_only
  before update or delete on felsokning_handelser
  for each row execute function forbjud_andring();

-- Ärenderaden är inte en logg utan ett omslag, och två av dess kolumner
-- är HÄRLEDDA av systemet efteråt: gallringsdatumet sätts vid avslut
-- utifrån ärendetypen, och det blindade fordonsindexet skrivs när
-- objektet identifieras.
--
-- Den tidigare triggern förbjöd all update och gjorde därmed avslut
-- omöjligt: servern försökte sätta gallras_efter, databasen sa nej, och
-- hela synken föll med 500. Kvalitetsgrinden hade redan godkänt ärendet
-- — det var lagringen som vägrade, efteråt, av ett skäl som inte hade
-- med ärendet att göra.
--
-- Skyddet är därför kolumnvis i stället för totalt: identitet, tillhörighet
-- och ursprung kan inte ändras, radering är fortfarande omöjlig, men de
-- fält systemet självt härleder får skrivas.
create or replace function skydda_arende() returns trigger
language plpgsql as $$
begin
  if TG_OP = 'DELETE' then
    raise exception 'Ärenden kan inte raderas';
  end if;
  if (new.id, new.organisation_id, new.nummer, new.skapad, new.delningskod,
      new.metodik_id, new.skapad_av, new.insatt)
     is distinct from
     (old.id, old.organisation_id, old.nummer, old.skapad, old.delningskod,
      old.metodik_id, old.skapad_av, old.insatt) then
    raise exception 'Ärendets historik kan inte ändras — endast härledda fält får sättas';
  end if;
  -- Förseglingen är härledd men inte omskrivbar: satt en gång, sedan
  -- låst. Kolumnprövningen ovan räcker inte, eftersom den släpper
  -- igenom alla härledda fält.
  if old.forsegling is not null and
     (new.forsegling, new.kedjerot, new.forseglad)
     is distinct from (old.forsegling, old.kedjerot, old.forseglad) then
    raise exception 'Förseglingen är satt och kan inte ändras';
  end if;
  return new;
end $$;

drop trigger if exists arenden_append_only on felsokning_arenden;
create trigger arenden_append_only
  before update or delete on felsokning_arenden
  for each row execute function skydda_arende();

-- Live Share-delningar: återkallbara länkar med behörighetsnivå.
-- (Åtkomststyrning, inte journal — därför ingen append-only-trigger:
-- återkallelse sätter aterkallad-tidpunkten.)
create table if not exists delningar (
  kod text primary key,
  arende_id text not null references felsokning_arenden(id),
  niva text not null check (niva in ('kund', 'partner', 'intern')),
  skapad_av uuid references anvandare(id),
  skapad timestamptz not null default now(),
  aterkallad timestamptz
);
create index if not exists delningar_arende_idx on delningar (arende_id);

-- ---- Personuppgifter och gallring -------------------------------------
--
-- Append-only och rätten till radering (dataskyddsförordningen art. 17)
-- är inte oförenliga, men de måste förenas medvetet. Krypto-shredding:
-- identifierande fält i loggen krypteras med en nyckel per registrerad,
-- och radering sker genom att nyckeln förstörs.
--
-- Loggen förblir intakt och hashverifierbar. Det som blir oåtkomligt är
-- identifieringen, inte protokollet över vad som kontrollerades — ett
-- raderat ärende kan fortfarande visa att lufttrycket mättes till
-- 2,4 bar klockan 08:42, bara inte längre vems bil det gällde.
--
-- Tabellen är det enda stället i schemat där en rad FÅR försvinna, och
-- det är hela poängen med den.
create table if not exists personnycklar (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisationer(id),
  -- Vad nyckeln skyddar: normalt ett fordon (regnr/VIN) eller en kund.
  subjekt text not null,
  nyckel bytea not null,
  skapad timestamptz not null default now(),
  -- Sätts när radering begärts men nyckeln ännu inte förstörts, så att
  -- begäran syns i systemet även innan den verkställts.
  radering_begard timestamptz,
  unique (organisation_id, subjekt)
);

-- Radering loggas. Att en begäran verkställts måste gå att visa i
-- efterhand, och den loggen får själv inte innehålla personuppgiften.
create table if not exists raderingar (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisationer(id),
  subjekt_hash text not null,
  begard timestamptz not null,
  verkstalld timestamptz not null default now(),
  begard_av text not null,
  antal_arenden integer not null default 0
);

-- Gallringsdatum per ärende, satt vid avslut utifrån ärendetypen.
-- Ett ärende utan datum gallras aldrig automatiskt — det försiktiga
-- utfallet, eftersom för tidig gallring inte går att ångra.
alter table felsokning_arenden add column if not exists gallras_efter timestamptz;

-- Läslogg. Varje skrivning loggades redan; ingen läsning gjorde det.
-- Utan den går det inte att svara på vem som sett en kunds uppgifter,
-- vilket både artikel 32 och en verkstadschef vill kunna få svar på.
create table if not exists atkomstlogg (
  id bigserial primary key,
  tidpunkt timestamptz not null default now(),
  organisation_id uuid,
  anvandare_id uuid,
  arende_id text,
  vag text not null,
  kalla text,
  -- Delningskod när åtkomsten skedde via en publik länk.
  delningskod text
);
create index if not exists atkomstlogg_arende on atkomstlogg (arende_id, tidpunkt desc);
create index if not exists atkomstlogg_org on atkomstlogg (organisation_id, tidpunkt desc);

-- Mätdon. Ett mätvärde rankas som hög evidens (E4); utan kalibrerat
-- instrument är det inte lägre evidens utan ingen evidens alls.
create table if not exists matdon (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisationer(id),
  beteckning text not null,
  serienummer text not null,
  kalibrerad_till date,
  aktiv boolean not null default true,
  skapad timestamptz not null default now(),
  unique (organisation_id, serienummer)
);

-- Blindat index över fordonsidentifieraren.
--
-- En raderingsbegäran gäller ett fordon eller en person, inte ett enskilt
-- ärende — men identifieraren är krypterad, så den går inte att söka på.
-- Indexet är en HMAC av den normaliserade identifieraren med en
-- servernyckel: samma fordon ger alltid samma värde, och värdet går inte
-- att vända tillbaka till ett registreringsnummer utan nyckeln.
--
-- Det gör radering över hela fordonets historik möjlig utan att lagra
-- identifieraren i klartext någonstans.
alter table felsokning_arenden add column if not exists identifierare_index text;

-- Ärendenumret är den mänskliga referensen i en tvist och sattes av
-- klienten utan någon unikhetskontroll — två flikar offline tog båda
-- max+1 och fick samma nummer. Fakturor och supportärenden har haft
-- unikhet hela tiden; ärendena förbisågs. Partiellt index så att äldre
-- rader utan nummer inte blockerar migreringen.
create unique index if not exists felsokning_arenden_nummer_unikt
  on felsokning_arenden (organisation_id, nummer)
  where nummer is not null;
create index if not exists felsokning_arenden_ident_idx
  on felsokning_arenden (organisation_id, identifierare_index);

-- Utgående integrationer. En prenumeration per mottagare och
-- händelsetyp — ett videooffertsystem bryr sig inte om varje mätvärde.
create table if not exists prenumerationer (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisationer(id),
  namn text not null,
  url text not null,
  hemlighet_krypt text not null,
  handelser text[] not null default '{}',
  aktiv boolean not null default true,
  skapad timestamptz not null default now(),
  senast_levererad timestamptz,
  senaste_status text
);
create index if not exists prenumerationer_org on prenumerationer (organisation_id) where aktiv;

-- ---- Fakturering (ALVA-PROC-0001) --------------------------------------
--
-- En utfärdad faktura ändras aldrig. Det är inte en ambition utan en
-- egenskap i schemat: samma append-only-trigger som skyddar
-- händelseloggen skyddar fakturaraden.
--
-- Det får en följd som är lätt att missa. "Betald" kan då inte vara en
-- kolumn som uppdateras — en betalning är en HÄNDELSE som inträffar
-- efter utfärdandet, och statusen är en projektion av de händelserna.
-- Precis som ärendets tillstånd inte lagras utan härleds ur loggen.
--
-- Beloppet lagras som det räknades fram, i öre, tillsammans med hela
-- underlaget. Skulle prislistan ändras nästa år står den gamla fakturan
-- kvar oförändrad, med de rader och de priser som faktiskt gällde.
create table if not exists fakturor (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisationer(id),
  -- Löpnumret är gemensamt för hela installationen och utan luckor:
  -- ALVA är utfärdaren, organisationerna är mottagare. Se
  -- nästaFakturanummer() i server.mjs för hur luckor undviks.
  nummer bigint not null unique,
  beteckning text not null unique,
  utfardad date not null,
  forfaller date not null,
  valuta text not null,
  totalt bigint not null,
  -- Krediterar en tidigare faktura. Null för en vanlig faktura.
  krediterar uuid references fakturor(id),
  -- Hela det härledda dokumentet, fruset vid utfärdandet: rader,
  -- underlag, à-priser, moms. Den som läser den om två år ska inte
  -- behöva systemet för att förstå den.
  dokument jsonb not null,
  skapad timestamptz not null default now()
);

-- Månadsjobbets idempotens ligger i transaktionen (manadsfakturering.mjs:
-- ett villkorat avancemang av senast_fakturerad), inte i ett unikt
-- periodindex. Ett sådant index kunde inte skilja en dubblettkörning från
-- en LEGITIM omutfärdning efter en kreditering, och blockerade därför den
-- rättelse modulen utfäster (kreditnota + ny faktura för samma period).
-- Den manuella utfärdarvägen kontrollerar i stället i applikationslagret
-- att ingen ICKE-krediterad faktura redan täcker perioden.
drop index if exists fakturor_org_period_unikt;
create index if not exists fakturor_org_idx on fakturor (organisation_id, nummer desc);

drop trigger if exists fakturor_append_only on fakturor;
create trigger fakturor_append_only
  before update or delete on fakturor
  for each row execute function forbjud_andring();

-- Vad som hänt med en utfärdad faktura. Append-only av samma skäl som
-- allt annat som utgör underlag: en registrerad betalning som kan
-- backas bort tyst är inte ett underlag, den är en anteckning.
create table if not exists fakturahandelser (
  id uuid primary key default gen_random_uuid(),
  faktura_id uuid not null references fakturor(id),
  typ text not null check (typ in ('betald', 'krediterad')),
  intraffade date not null,
  -- Betalningsreferens, kreditorsak. Fritext, men aldrig tom.
  uppgift text not null,
  registrerad_av text not null,
  insatt timestamptz not null default now()
);
create index if not exists fakturahandelser_faktura_idx
  on fakturahandelser (faktura_id, insatt);

drop trigger if exists fakturahandelser_append_only on fakturahandelser;
create trigger fakturahandelser_append_only
  before update or delete on fakturahandelser
  for each row execute function forbjud_andring();

-- ---- Underlagen om åtkomst och radering (TÜV T-7) ----------------------
--
-- Fyra tabeller bar append-only-skydd: loggen, ärendet, fakturorna och
-- fakturahändelserna. Utelämnandena var påfallande — det var just de
-- tabeller som UTGÖR bevisningen om dataskydd som gick att skriva om.
--
-- Åtkomstloggen är beviset för att åtkomststyrningen fungerade. Den är
-- det första en granskare ber om efter en incident, och den enda handling
-- som kunde ändras av den som hade motiv att göra det.
drop trigger if exists atkomstlogg_append_only on atkomstlogg;
create trigger atkomstlogg_append_only
  before update or delete on atkomstlogg
  for each row execute function forbjud_andring();

-- Beviset för att en radering verkställdes fick inte självt kunna raderas.
drop trigger if exists raderingar_append_only on raderingar;
create trigger raderingar_append_only
  before update or delete on raderingar
  for each row execute function forbjud_andring();

-- Personnycklarna behöver radering — det är vad radering ÄR — så här går
-- det inte att förbjuda. Regeln är i stället smalare: nyckeln och
-- raderingsbegäran får ändras, identiteten och tillhörigheten inte.
-- Annars kunde en nyckel flyttas till ett annat subjekt och en radering
-- träffa fel person.
create or replace function skydda_personnyckel() returns trigger
language plpgsql as $$
begin
  if TG_OP = 'DELETE' then
    return old;
  end if;
  if (new.id, new.organisation_id, new.subjekt, new.skapad)
     is distinct from
     (old.id, old.organisation_id, old.subjekt, old.skapad) then
    raise exception 'En personnyckels identitet och tillhörighet kan inte ändras';
  end if;
  return new;
end $$;

drop trigger if exists personnycklar_skydd on personnycklar;
create trigger personnycklar_skydd
  before update or delete on personnycklar
  for each row execute function skydda_personnyckel();

-- Avtryck av det klienten faktiskt skickade, före serverns egna fält och
-- före krypteringen (TÜV T-1). Utan det går en kollision inte att bedöma:
-- serverns tidsstämpel skiljer sig alltid vid en omsändning, och
-- krypteringen ger ny chiffertext för samma klartext, så varken raden
-- eller nyttolasten kan jämföras. Avtrycket kan.
alter table felsokning_handelser add column if not exists klientdigest text;

-- ---- Hashkedjan (ALVA-SPEC-070) -----------------------------------------
--
-- Triggern ovan skyddar loggen mot applikationen. Kedjan skyddar den mot
-- den som äger databasen: varje händelse bär en hash av sitt innehåll och
-- föregående händelses hash, beräknad av servern vid insättningen. Den
-- som ändrar en rad i efterhand bryter varje efterföljande länk, och den
-- som räknar om hela kedjan stoppas av förseglingen vid avslut — en HMAC
-- med en nyckel som aldrig finns i databasen (FORSEGLING_NYCKEL).
--
-- `sekvens` är kedjeordningen. Tidsstämpeln duger inte: två händelser i
-- samma batch kan få samma klockslag, och en kedja utan entydig ordning
-- går inte att verifiera.
alter table felsokning_handelser add column if not exists sekvens bigint;
alter table felsokning_handelser add column if not exists kedjehash text;
create index if not exists felsokning_handelser_sekvens_idx
  on felsokning_handelser (arende_id, sekvens);

-- Förseglingen vid avslut: kedjans rot och en HMAC över den, beräknad med
-- FORSEGLING_NYCKEL som aldrig finns i databasen. Kolumnerna är härledda
-- och skrivs EN gång — se skydda_arende, som vägrar ändra en satt
-- försegling. En försegling som kan skrivas om är ingen försegling.
alter table felsokning_arenden add column if not exists kedjerot text;
alter table felsokning_arenden add column if not exists forsegling text;
alter table felsokning_arenden add column if not exists forseglad timestamptz;

-- ---- Support och felanmälan (ALVA-PROC-0050) ---------------------------
--
-- Anmälan är oföränderlig, och det som händer med den är egna poster.
-- Samma skäl som för fakturan: en anmälan vars historia kan skrivas om är
-- inte ett underlag när någon senare frågar hur länge felet var känt.
create table if not exists supportarenden (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisationer(id),
  -- Ärendet anmälan gäller. Null för en anmälan utan ärende — plattformen
  -- kan gå sönder även när ingen står i ett ärende.
  arende_id text,
  nummer bigint not null unique,
  beteckning text not null unique,
  typ text not null check (typ in ('felanmalan', 'fraga', 'forbattring')),
  rubrik text not null,
  beskrivning text not null,
  -- Härlett sammanhang: metodik, plattformsversion, spår-id. Aldrig något
  -- identifierande om fordon eller kund — en supportanmälan är inte ett
  -- skäl att flytta personuppgifter till ett annat system.
  sammanhang jsonb not null default '{}'::jsonb,
  skapad_av uuid references anvandare(id),
  skapad timestamptz not null default now()
);
create index if not exists supportarenden_org_idx on supportarenden (organisation_id, nummer desc);
create index if not exists supportarenden_arende_idx on supportarenden (arende_id);

drop trigger if exists supportarenden_append_only on supportarenden;
create trigger supportarenden_append_only
  before update or delete on supportarenden
  for each row execute function forbjud_andring();

create table if not exists supportinlagg (
  id uuid primary key default gen_random_uuid(),
  support_id uuid not null references supportarenden(id),
  typ text not null check (typ in ('svar', 'status')),
  text text not null,
  status text check (status in ('mottagen', 'under_arbete', 'atgardad', 'stangd')),
  fran text not null,
  skapad_av uuid references anvandare(id),
  skapad timestamptz not null default now()
);
create index if not exists supportinlagg_idx on supportinlagg (support_id, skapad);

drop trigger if exists supportinlagg_append_only on supportinlagg;
create trigger supportinlagg_append_only
  before update or delete on supportinlagg
  for each row execute function forbjud_andring();

-- ---- Abonnemang (ALVA-PROC-0002) ---------------------------------------
--
-- Kontot startar på Free och stannar där tills någon väljer annat. En
-- provperiod som tyst börjar kosta är samma sorts fälla produkten finns
-- för att undvika.
--
-- Nivån och fakturamejlen är HÄNDELSER, inte kolumner: vilken nivå som
-- gällde när en faktura utfärdades måste gå att svara på i efterhand, och
-- en kolumn som skrivits över kan inte svara.
create table if not exists abonnemang (
  organisation_id uuid primary key references organisationer(id),
  registrerad timestamptz not null default now(),
  -- Härledd: sista period som fakturerats. Skrivs av månadsjobbet.
  senast_fakturerad date
);

create or replace function skydda_abonnemang() returns trigger
language plpgsql as $$
begin
  if TG_OP = 'DELETE' then
    raise exception 'Ett abonnemang kan inte raderas — historiken hör till fakturaunderlaget';
  end if;
  if (new.organisation_id, new.registrerad) is distinct from (old.organisation_id, old.registrerad) then
    raise exception 'Abonnemangets identitet och startdatum kan inte ändras';
  end if;
  return new;
end $$;

drop trigger if exists abonnemang_skydd on abonnemang;
create trigger abonnemang_skydd
  before update or delete on abonnemang
  for each row execute function skydda_abonnemang();

create table if not exists abonnemangshandelser (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisationer(id),
  typ text not null check (typ in ('niva', 'fakturaepost')),
  varde text not null,
  satt_av uuid references anvandare(id),
  skapad timestamptz not null default now()
);
create index if not exists abonnemangshandelser_idx
  on abonnemangshandelser (organisation_id, skapad);

drop trigger if exists abonnemangshandelser_append_only on abonnemangshandelser;
create trigger abonnemangshandelser_append_only
  before update or delete on abonnemangshandelser
  for each row execute function forbjud_andring();

-- Ljudreferensprofiler (ALVA-DOC-0012, lyft 5). Aggregat, inte bevis:
-- profilen är organisationens inlärda normalbild per fordonstyp och
-- mätsekvens, byggd av dokumenterade inspelningars särdrag. Underlaget
-- är ärendenas egna händelser i den append-only-skyddade loggen;
-- profilen är en härledning och får därför uppdateras.
create table if not exists ljudprofiler (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisationer(id),
  fordonsnyckel text not null,
  sekvens text not null,
  profil jsonb not null,
  uppdaterad timestamptz not null default now(),
  unique (organisation_id, fordonsnyckel, sekvens)
);
