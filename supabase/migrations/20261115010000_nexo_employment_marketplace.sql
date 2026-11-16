-- Bolsa de trabajo de Nexo: resultados compartidos, sin publicar perfiles privados.
create table if not exists public.nexo_employment_posts (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id) on delete cascade,
 kind text not null check (kind in ('seeking_job','vacancy')),
 title text not null check (char_length(btrim(title)) between 3 and 100),
 description text not null check (char_length(btrim(description)) between 10 and 1400),
 category text not null default '' check (char_length(category) <= 100),
 location text not null default '' check (char_length(location) <= 120),
 author_name text not null default 'Usuario Nexo' check (char_length(author_name) between 1 and 80),
 experience text not null default '' check (char_length(experience) <= 100),
 availability text not null default '' check (char_length(availability) <= 100),
 hours text not null default '' check (char_length(hours) <= 100),
 payment_unit text not null default '' check (char_length(payment_unit) <= 80),
 payment_min numeric(12,2) check (payment_min is null or payment_min >= 0),
 payment_max numeric(12,2) check (payment_max is null or payment_max >= 0),
 status text not null default 'active' check (status in ('active','closed')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint nexo_posts_payment_range check (payment_min is null or payment_max is null or payment_min <= payment_max)
);
create index if not exists nexo_employment_active_recent on public.nexo_employment_posts (created_at desc) where status='active';
create index if not exists nexo_employment_own_recent on public.nexo_employment_posts (owner_id, created_at desc);
alter table public.nexo_employment_posts enable row level security;
revoke all on public.nexo_employment_posts from public, anon, authenticated;
grant select on public.nexo_employment_posts to anon, authenticated;
grant insert (owner_id,kind,title,description,category,location,author_name,experience,availability,hours,payment_unit,payment_min,payment_max,status)
 on public.nexo_employment_posts to authenticated;
grant update (status) on public.nexo_employment_posts to authenticated;
grant delete on public.nexo_employment_posts to authenticated;
drop policy if exists nexo_employment_posts_read on public.nexo_employment_posts;
create policy nexo_employment_posts_read on public.nexo_employment_posts
 for select to anon,authenticated using (status='active' or owner_id=auth.uid());
drop policy if exists nexo_employment_posts_insert on public.nexo_employment_posts;
create policy nexo_employment_posts_insert on public.nexo_employment_posts
 for insert to authenticated with check (owner_id=auth.uid() and status='active');
drop policy if exists nexo_employment_posts_update on public.nexo_employment_posts;
create policy nexo_employment_posts_update on public.nexo_employment_posts
 for update to authenticated using (owner_id=auth.uid()) with check (owner_id=auth.uid());
drop policy if exists nexo_employment_posts_delete on public.nexo_employment_posts;
create policy nexo_employment_posts_delete on public.nexo_employment_posts
 for delete to authenticated using (owner_id=auth.uid());

-- Los interesados solo pueden expresar interés una vez por propuesta;
-- el propietario puede leerlo y responder de forma privada.
create table if not exists public.nexo_employment_interests (
 id uuid primary key default gen_random_uuid(),
 post_id uuid not null references public.nexo_employment_posts(id) on delete cascade,
 sender_id uuid not null references auth.users(id) on delete cascade,
 sender_name text not null check (char_length(sender_name) between 1 and 80),
 message text not null check (char_length(btrim(message)) between 10 and 1200),
 response text not null default '' check (char_length(response) <= 1200),
 responded_at timestamptz,
 created_at timestamptz not null default now(),
 unique(post_id, sender_id)
);
create index if not exists nexo_employment_interests_post on public.nexo_employment_interests (post_id, created_at desc);
create index if not exists nexo_employment_interests_sender on public.nexo_employment_interests (sender_id, created_at desc);
alter table public.nexo_employment_interests enable row level security;
revoke all on public.nexo_employment_interests from public, anon, authenticated;
grant select on public.nexo_employment_interests to authenticated;
grant insert(post_id,sender_id,sender_name,message) on public.nexo_employment_interests to authenticated;
grant update(response,responded_at) on public.nexo_employment_interests to authenticated;
drop policy if exists nexo_employment_interests_read on public.nexo_employment_interests;
create policy nexo_employment_interests_read on public.nexo_employment_interests for select to authenticated
 using (sender_id=auth.uid() or exists(select 1 from public.nexo_employment_posts p
 where p.id=post_id and p.owner_id=auth.uid()));
drop policy if exists nexo_employment_interests_insert on public.nexo_employment_interests;
create policy nexo_employment_interests_insert on public.nexo_employment_interests for insert to authenticated
 with check(sender_id=auth.uid() and exists(select 1 from public.nexo_employment_posts p
 where p.id=post_id and p.status='active' and p.owner_id<>auth.uid()));
drop policy if exists nexo_employment_interests_respond on public.nexo_employment_interests;
create policy nexo_employment_interests_respond on public.nexo_employment_interests for update to authenticated
 using (exists(select 1 from public.nexo_employment_posts p where p.id=post_id and p.owner_id=auth.uid()))
 with check (exists(select 1 from public.nexo_employment_posts p where p.id=post_id and p.owner_id=auth.uid()));
