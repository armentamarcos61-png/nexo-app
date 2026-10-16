create or replace function public.nexo_admin_user_directory(
 p_query text default '', p_sort text default 'newest', p_limit integer default 40,
 p_offset integer default 0
) returns jsonb language sql stable security definer
 set search_path=pg_catalog,public
as $$
 with users_base as (
  select u.id, u.email, u.created_at,u.email_confirmed_at,
    coalesce(nullif(u.raw_user_meta_data->>'firstName',''),
      nullif(u.raw_user_meta_data->>'first_name',''),'') as first_name,
    coalesce(nullif(u.raw_user_meta_data->>'firstSurname',''),
      nullif(u.raw_user_meta_data->>'first_surname',''),'') as first_surname,
    coalesce(nullif(u.raw_user_meta_data->>'username',''),'') as username,
    p.role,p.education,p.specialty,p.experience,p.availability,
    p.work_mode,p.skills,p.bio,p.photo_data_url,p.updated_at as profile_updated
  from auth.users u
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
     case when p_sort in ('newest_az') then created_at::date end desc,
     case when p_sort in ('oldest_az') then created_at::date end asc,
     case when p_sort in ('newest_az','oldest_az') then sort_name end asc,
     case when p_sort='oldest' then created_at end asc,
     case when p_sort='newest' or p_sort not in ('az','za','oldest','newest_az','oldest_az') then created_at end desc,
     id asc
    ) as pos
  from filtered
 ), paged as (
  select * from ordered
  order by pos
  limit least(greatest(coalesce(p_limit,40),1),100)
  offset greatest(coalesce(p_offset,0),0)
 )
 select jsonb_build_object(
  'total',(select count(*) from filtered),
  'users',coalesce((select jsonb_agg(to_jsonb(paged)-'sort_name'-'pos' order by pos)
    from paged),'[]'::jsonb)
 )
$$;
revoke all on function public.nexo_admin_user_directory(text,text,integer,integer) from public,anon,authenticated;
grant execute on function public.nexo_admin_user_directory(text,text,integer,integer) to service_role;