-- Historical Nexo v1 accounts lived only in the original browser's localStorage.
-- The account OWNER can voluntarily re-authenticate and import the original
-- registration timestamp after linking their email to Supabase Auth.
-- A timestamp from a device cannot be independently certified by the server:
-- the directory labels it as imported/device-reported, not as an audited fact.
create table if not exists public.nexo_legacy_account_links(
  user_id uuid primary key references auth.users(id) on delete cascade,
  original_registered_at timestamptz not null
    check (original_registered_at >= '2018-01-01'::timestamptz
      and original_registered_at <= now()),
  imported_at timestamptz not null default now(),
  source text not null default 'local_v1'
    check (source = 'local_v1')
);
alter table public.nexo_legacy_account_links enable row level security;
revoke all on public.nexo_legacy_account_links from anon, authenticated;
grant insert,select on public.nexo_legacy_account_links to authenticated;
drop policy if exists nexo_legacy_owner_insert on public.nexo_legacy_account_links;
create policy nexo_legacy_owner_insert on public.nexo_legacy_account_links
 for insert to authenticated
 with check (auth.uid()=user_id);
drop policy if exists nexo_legacy_owner_read on public.nexo_legacy_account_links;
create policy nexo_legacy_owner_read on public.nexo_legacy_account_links
 for select to authenticated
 using (auth.uid()=user_id);
-- No UPDATE or DELETE from the client. Subsequent attempted imports cannot
-- rewrite the recovered historical date. Service-role may maintain records.
create index if not exists nexo_legacy_registration_date
 on public.nexo_legacy_account_links(original_registered_at);

create or replace function public.nexo_admin_user_directory(
 p_query text default '', p_sort text default 'newest', p_limit integer default 40,
 p_offset integer default 0
) returns jsonb language sql stable security definer
 set search_path=pg_catalog,public
as $$
 with users_base as (
  select u.id, u.email,
    coalesce(l.original_registered_at,u.created_at) as created_at,
    u.created_at as centralized_at,
    l.imported_at as historical_imported_at,
    (l.user_id is not null) as recovered_from_device,
    u.email_confirmed_at,
    coalesce(nullif(u.raw_user_meta_data->>'firstName',''),
      nullif(u.raw_user_meta_data->>'first_name',''),'') as first_name,
    coalesce(nullif(u.raw_user_meta_data->>'firstSurname',''),
      nullif(u.raw_user_meta_data->>'first_surname',''),'') as first_surname,
    coalesce(nullif(u.raw_user_meta_data->>'username',''),'') as username,
    p.role,p.education,p.specialty,p.experience,p.availability,
    p.work_mode,p.skills,p.bio,p.photo_data_url,p.updated_at as profile_updated
  from auth.users u
  left join public.nexo_legacy_account_links l on l.user_id=u.id
  left join public.nexo_professional_profiles p
    on p.user_id=u.id and p.share_with_developers=true
 ), filtered as (
  select *, trim(concat_ws(' ',nullif(first_name,''),nullif(first_surname,''))) as full_name,
    lower(coalesce(nullif(trim(concat_ws(' ',nullif(first_name,''),nullif(first_surname,''))),''),
     nullif(username,''),email,'~')) as sort_name
  from users_base
  where coalesce(p_query,'')='' or
   lower(coalesce(email,'')) like '%'||lower(left(p_query,100))||'%' or
   lower(username) like '%'||lower(left(p_query,100))||'%' or
   lower(concat(first_name,' ',first_surname)) like '%'||lower(left(p_query,100))||'%' or
   lower(coalesce(role,'')) like '%'||lower(left(p_query,100))||'%'
 ), ordered as (
  select *,
    row_number() over (order by
     case when p_sort='az' then sort_name end asc nulls last,
     case when p_sort='za' then sort_name end desc nulls last,
     case when p_sort='newest_az' then created_at::date end desc,
     case when p_sort='oldest_az' then created_at::date end asc,
     case when p_sort in ('newest_az','oldest_az') then sort_name end asc,
     case when p_sort='oldest' then created_at end asc,
     case when p_sort='newest' or p_sort not in ('az','za','oldest','newest_az','oldest_az')
       then created_at end desc,
     id asc
    ) as pos
  from filtered
 ), paged as (
  select * from ordered order by pos
  limit least(greatest(coalesce(p_limit,40),1),100)
  offset greatest(coalesce(p_offset,0),0)
 )
 select jsonb_build_object(
  'total',(select count(*) from filtered),
  'recovered',(select count(*) from filtered where recovered_from_device),
  'users',coalesce((select jsonb_agg(to_jsonb(paged)-'sort_name'-'pos' order by pos)
    from paged),'[]'::jsonb)
 )
$$;
revoke all on function public.nexo_admin_user_directory(text,text,integer,integer)
 from public,anon,authenticated;
grant execute on function public.nexo_admin_user_directory(text,text,integer,integer)
 to service_role;
