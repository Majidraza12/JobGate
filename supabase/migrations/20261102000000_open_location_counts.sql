-- Location strings of open listings with how many listings use each. The
-- profile page's city picker ranks cities by these counts; grouping in
-- Postgres returns about a thousand short rows in one request, instead of
-- every open listing's locations in several pages.
create or replace function public.open_location_counts()
returns table (location text, listings bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select loc, count(*)
  from public.listings l, unnest(l.locations) as loc
  where l.status = 'open'
  group by loc
$$;

revoke execute on function public.open_location_counts() from public, anon;
grant execute on function public.open_location_counts() to authenticated;
