-- Saved postings: a bookmark per user per listing. Owner-only, like
-- applications. Saving is idempotent (the primary key), unsaving is a delete.
create table saved_listings (
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  listing_id bigint not null references listings (id) on delete cascade,
  saved_at   timestamptz not null default now(),
  primary key (user_id, listing_id)
);

alter table saved_listings enable row level security;

create policy "users manage their own saved listings" on saved_listings
  for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Explicit grants, as in 20261031000001: anon gets nothing.
grant select, insert, delete on saved_listings to authenticated;
grant all on saved_listings to service_role;
