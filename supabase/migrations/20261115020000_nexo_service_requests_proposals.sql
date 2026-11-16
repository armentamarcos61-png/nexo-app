-- Solicitudes reales de servicios y propuestas privadas relacionadas con portafolios.
create table if not exists public.nexo_service_requests (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id) on delete cascade,
 title text not null check (length(btrim(title)) between 3 and 100),
 description text not null check (length(btrim(description)) between 10 and 3000),
 category text not null default '' check (length(category) <= 100),
 location text not null check (length(btrim(location)) between 2 and 150),
 budget_mxn numeric(12,2) check(budget_mxn is null or budget_mxn>0),
 status text not null default 'active' check(status in ('active','closed')),
 created_at timestamptz not null default now()
);
create index if not exists nexo_service_requests_active_recent
 on public.nexo_service_requests(created_at desc) where status='active';
create index if not exists nexo_service_requests_owner
 on public.nexo_service_requests(owner_id,created_at desc);
alter table public.nexo_service_requests enable row level security;
revoke all on public.nexo_service_requests from public,anon,authenticated;
grant select on public.nexo_service_requests to anon, authenticated;
grant insert(owner_id,title,description,category,location,budget_mxn,status)
 on public.nexo_service_requests to authenticated;
grant update(status) on public.nexo_service_requests to authenticated;
drop policy if exists nexo_service_request_public_read on public.nexo_service_requests;
create policy nexo_service_request_public_read on public.nexo_service_requests
 for select to anon,authenticated using (status='active' or owner_id=(select auth.uid()));
drop policy if exists nexo_service_request_insert_owner on public.nexo_service_requests;
create policy nexo_service_request_insert_owner on public.nexo_service_requests
 for insert to authenticated with check(owner_id=(select auth.uid()) and status='active');
drop policy if exists nexo_service_request_owner_update on public.nexo_service_requests;
create policy nexo_service_request_owner_update on public.nexo_service_requests
 for update to authenticated using(owner_id=(select auth.uid()))
 with check(owner_id=(select auth.uid()));

create table if not exists public.nexo_service_proposals (
 id uuid primary key default gen_random_uuid(),
 request_id uuid not null references public.nexo_service_requests(id) on delete cascade,
 sender_id uuid not null references auth.users(id) on delete cascade,
 sender_name text not null check(length(btrim(sender_name)) between 1 and 80),
 portfolio_title text not null check(length(btrim(portfolio_title)) between 1 and 80),
 message text not null check(length(btrim(message)) between 10 and 1200),
 response text not null default '' check(length(response)<=1200),
 responded_at timestamptz,
 created_at timestamptz not null default now(),
 unique(request_id,sender_id)
);
create index if not exists nexo_service_proposals_request
 on public.nexo_service_proposals(request_id,created_at desc);
create index if not exists nexo_service_proposals_sender
 on public.nexo_service_proposals(sender_id,created_at desc);
alter table public.nexo_service_proposals enable row level security;
revoke all on public.nexo_service_proposals from public,anon,authenticated;
grant select on public.nexo_service_proposals to authenticated;
grant insert(request_id,sender_id,sender_name,portfolio_title,message)
 on public.nexo_service_proposals to authenticated;
grant update(response,responded_at) on public.nexo_service_proposals to authenticated;
drop policy if exists nexo_service_proposals_read on public.nexo_service_proposals;
create policy nexo_service_proposals_read on public.nexo_service_proposals
 for select to authenticated using(
 sender_id=(select auth.uid())
 or exists (select 1 from public.nexo_service_requests r
  where r.id=request_id and r.owner_id=(select auth.uid()))
);
drop policy if exists nexo_service_proposals_insert on public.nexo_service_proposals;
create policy nexo_service_proposals_insert on public.nexo_service_proposals
 for insert to authenticated with check(
 sender_id=(select auth.uid())
 and exists(select 1 from public.nexo_service_requests r
  where r.id=request_id and r.status='active' and r.owner_id<>(select auth.uid()))
);
drop policy if exists nexo_service_proposals_reply on public.nexo_service_proposals;
create policy nexo_service_proposals_reply on public.nexo_service_proposals
 for update to authenticated using (
 exists(select 1 from public.nexo_service_requests r
  where r.id=request_id and r.owner_id=(select auth.uid()))
 ) with check (
 exists(select 1 from public.nexo_service_requests r
  where r.id=request_id and r.owner_id=(select auth.uid()))
 );
