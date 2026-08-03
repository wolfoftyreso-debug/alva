-- Delningsgränsen görs om från nekalista till tillåtelselista.
--
-- Tidigare filtrerade hamta_delat_arende bort en uppräknad mängd interna
-- händelsetyper. Varje ny händelsetyp blev därmed automatiskt synlig för
-- kunden tills någon kom ihåg att neka den — fel håll att fela åt på en
-- integritetsgräns. Nu räknas i stället upp vad som FÅR delas; allt annat
-- är internt tills det aktivt släpps fram.
--
-- Listan speglar DELBART_KUND i services/plattform/server.mjs, som låses
-- av testet src/felsokning/__tests__/delning.test.ts.

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
        and h.handelse->>'typ' in (
          'objekt_identifierat', 'arendetyp_satt', 'felbeskrivning', 'fraga_besvarad',
          'kontroll_utford', 'observation', 'matvarde', 'foto', 'video', 'kommentar',
          'inaktivitet_forklarad', 'overlamning', 'historik_kontrollerad', 'matarstallning',
          'reproducering', 'felorsak', 'atgardsforslag', 'kundbeslut', 'atgard_utford',
          'kvalitetskontroll', 'export_skapad', 'arende_avslutat'
        )
    ), '[]'::jsonb)
  )
  from felsokning_arenden a
  where a.delningskod = kod and a.delningskod is not null;
$$;

grant execute on function public.hamta_delat_arende(text) to anon, authenticated;
