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

create table if not exists anvandare (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisationer(id),
  epost text unique not null,
  losen_hash text not null,
  namn text not null,
  roll text not null default 'tekniker'
    check (roll in ('tekniker', 'arbetsledare', 'admin')),
  skapad timestamptz not null default now()
);

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

create table if not exists felsokning_handelser (
  id text primary key,
  arende_id text not null references felsokning_arenden(id),
  tidpunkt timestamptz not null,
  anvandare text not null,
  handelse jsonb not null,
  insatt timestamptz not null default now()
);
create index if not exists felsokning_handelser_arende_idx
  on felsokning_handelser (arende_id, tidpunkt);

create or replace function forbjud_andring() returns trigger
language plpgsql as $$
begin
  raise exception 'Loggen är append-only — historik kan inte ändras eller raderas';
end $$;

drop trigger if exists handelser_append_only on felsokning_handelser;
create trigger handelser_append_only
  before update or delete on felsokning_handelser
  for each row execute function forbjud_andring();

drop trigger if exists arenden_append_only on felsokning_arenden;
create trigger arenden_append_only
  before update or delete on felsokning_arenden
  for each row execute function forbjud_andring();

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
