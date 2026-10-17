-- Catálogo compartido: lectura pública, altas exclusivas del backend después de verificar una fuente externa.
create table if not exists public.nexo_service_categories (
  slug text primary key check (length(slug) between 3 and 100),
  name text not null check (length(name) between 3 and 100),
  parent text not null default 'Servicios profesionales',
  family text not null default 'general'
    check (family in ('nutrition','legal','psychology','health','education','accounting','technology','physical','general')),
  source_url text,
  source_label text,
  created_at timestamptz not null default now(),
  verified_at timestamptz not null default now()
);
alter table public.nexo_service_categories enable row level security;
grant select on public.nexo_service_categories to anon, authenticated;
revoke insert, update, delete on public.nexo_service_categories from anon, authenticated;
drop policy if exists nexo_service_categories_read on public.nexo_service_categories;
create policy nexo_service_categories_read on public.nexo_service_categories
  for select to anon, authenticated using (true);
insert into public.nexo_service_categories (slug,name,parent,family,source_label) values
 ('nutricion','Nutrición','Salud y bienestar','nutrition','Catálogo Nexo'),
 ('servicios-juridicos','Servicios jurídicos','Servicios profesionales','legal','Catálogo Nexo'),
 ('psicologia','Psicología','Salud y bienestar','psychology','Catálogo Nexo'),
 ('salud-y-bienestar','Salud y bienestar','Salud','health','Catálogo Nexo'),
 ('contabilidad','Contabilidad','Servicios profesionales','accounting','Catálogo Nexo'),
 ('educacion-y-tutorias','Educación y tutorías','Educación','education','Catálogo Nexo'),
 ('desarrollo-de-software','Desarrollo de software','Tecnología','technology','Catálogo Nexo')
on conflict (slug) do nothing;
