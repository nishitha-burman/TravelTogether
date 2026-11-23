begin;

alter table public.profiles
  add column display_name text check (display_name is null or char_length(display_name) between 1 and 80),
  add column home_city text check (home_city is null or char_length(home_city) between 1 and 120),
  add column bio text check (bio is null or char_length(bio) <= 500);

-- Existing self-only profile RLS remains in force. Account email and join date
-- continue to come from Auth; no public profile or cross-account access is added.
commit;
