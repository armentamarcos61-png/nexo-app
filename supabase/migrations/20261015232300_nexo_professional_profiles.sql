-- The historical v1 accounts are local to each device. This new secure
-- table tracks professional profiles only after an authenticated user opts in.
create table if not exists public.nexo_professional_profiles (
 user_id uuid primary key references auth.users(id) on delete cascade,
 role text not null default '' check (char_length(role) <= 100),
 education text not null default '' check (char_length(education) <= 100),
 specialty text not null default '' check (char_length(specialty) <= 140),
 experience text not null default '' check (char_length(experience) <= 100),
 availability text not null default '' check (char_length(availability) <= 100),
 work_mode text not null default '' check (char_length(work_mode) <= 100),
 skills text not null default '' check (char_length(skills) <= 1000),
 bio text not null default '' check (char_length(bio) <= 1600),
 photo_data_url text not null default '' check (char_length(photo_data_url) <= 140000),
 share_with_developers boolean not null default false,
 updated_at timestamptz not null default now()
);
alter table public.nexo_professional_profiles enable row level security;
revoke all on public.nexo_professional_profiles from anon;
grant select,insert,update,delete on public.nexo_professional_profiles to authenticated;
drop policy if exists nexo_profiles_owner_read on public.nexo_professional_profiles;
create policy nexo_profiles_owner_read on public.nexo_professional_profiles
 for select to authenticated using (user_id=auth.uid());
drop policy if exists nexo_profiles_owner_insert on public.nexo_professional_profiles;
create policy nexo_profiles_owner_insert on public.nexo_professional_profiles
 for insert to authenticated with check (user_id=auth.uid() and share_with_developers=true);
drop policy if exists nexo_profiles_owner_update on public.nexo_professional_profiles;
create policy nexo_profiles_owner_update on public.nexo_professional_profiles
 for update to authenticated using (user_id=auth.uid())
 with check (user_id=auth.uid());
drop policy if exists nexo_profiles_owner_delete on public.nexo_professional_profiles;
create policy nexo_profiles_owner_delete on public.nexo_professional_profiles
 for delete to authenticated using (user_id=auth.uid());
