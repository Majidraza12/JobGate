-- "No degree / not in school" (Majid, 2026-10-31). Such a user has no
-- graduation month; everyone else must have one. Mirrors EligibilityProfile
-- in src/core/profile.ts.
alter table profiles drop constraint profiles_degree_check;
alter table profiles add constraint profiles_degree_check check (degree in ('bs', 'ms', 'phd', 'none'));

alter table profiles alter column grad_month drop not null;
alter table profiles add constraint profiles_grad_month_matches_degree
  check ((degree = 'none') = (grad_month is null));
