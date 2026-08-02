-- Guidad Felsökning: ärenden och append-only händelselogg.
-- Loggen är enda sanningskällan; alla vyer är projektioner.
-- Append-only garanteras även i databasen: inga update/delete-policyer.

create table public.felsokning_arenden (
  id text primary key,
  nummer integer not null,
  skapad timestamptz not null,
  skapad_av uuid not null default auth.uid(),
  delningskod text unique,
  insatt timestamptz not null default now()
);

create table public.felsokning_handelser (
  id text primary key,
  arende_id text not null references public.felsokning_arenden(id),
  tidpunkt timestamptz not null,
  anvandare text not null,
  handelse jsonb not null,
  insatt timestamptz not null default now()
);

create index felsokning_handelser_arende_idx
  on public.felsokning_handelser (arende_id, tidpunkt);

alter table public.felsokning_arenden enable row level security;
alter table public.felsokning_handelser enable row level security;

-- Beta: alla inloggade användare delar arbetsyta (samarbete i ärenden).
-- Multi-tenant-uppdelning per organisation införs i nästa fas.
create policy "Inloggade läser ärenden"
  on public.felsokning_arenden for select to authenticated using (true);
create policy "Inloggade skapar ärenden"
  on public.felsokning_arenden for insert to authenticated with check (true);
create policy "Inloggade läser händelser"
  on public.felsokning_handelser for select to authenticated using (true);
create policy "Inloggade lägger till händelser"
  on public.felsokning_handelser for insert to authenticated with check (true);

-- Inga update/delete-policyer, och rättigheterna återkallas dessutom explicit:
-- historiken kan aldrig ändras eller raderas från klienten.
revoke update, delete on public.felsokning_arenden from authenticated, anon;
revoke update, delete on public.felsokning_handelser from authenticated, anon;

-- Live Share: anonym läsning sker ENDAST via delningskod genom en
-- security definer-funktion — tabellerna exponeras aldrig direkt för anon.
-- Interna poster (kategoribyten, hypoteser) filtreras bort ur den delade
-- vyn: hypoteser är arbetsmaterial och får aldrig läsas som konstaterade fel.
create or replace function public.hamta_delat_arende(kod text)
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select jsonb_build_object(
    'arende', to_jsonb(a) - 'skapad_av',
    'handelser', coalesce((
      select jsonb_agg(to_jsonb(h) order by h.tidpunkt, h.id)
      from felsokning_handelser h
      where h.arende_id = a.id
        and h.handelse->>'typ' not in ('kategori_byte', 'hypotes')
    ), '[]'::jsonb)
  )
  from felsokning_arenden a
  where a.delningskod = kod and a.delningskod is not null;
$$;

grant execute on function public.hamta_delat_arende(text) to anon, authenticated;

-- Realtime-uppdateringar för framtida prenumerationer i klienten.
alter publication supabase_realtime add table public.felsokning_handelser;
