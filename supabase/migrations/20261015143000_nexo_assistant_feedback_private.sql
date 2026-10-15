-- Private feedback inbox. Admin access is enforced by the nexo-control
-- Edge Function and its verified Supabase auth + nexo_admin_members allowlist.
-- The browser has NO table privileges, even if its publishable key is exposed.
create table if not exists public.nexo_assistant_feedback (
  response_id uuid primary key,
  assistant_id text not null check (assistant_id in ('nexo','nexa')),
  intent_key text not null check (char_length(intent_key) between 1 and 64),
  rating text not null check (rating in ('up','down','comment')),
  comment text not null default '' check (char_length(comment) <= 1200),
  question_text text check (question_text is null or char_length(question_text) <= 300),
  answer_text text check (answer_text is null or char_length(answer_text) <= 1200),
  context_shared boolean not null default false,
  client_hash text not null check (char_length(client_hash)=64),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((context_shared and question_text is not null and answer_text is not null)
    or (not context_shared and question_text is null and answer_text is null)),
  check (rating <> 'comment' or char_length(trim(comment)) > 0)
);
create index if not exists nexo_feedback_recent
  on public.nexo_assistant_feedback (created_at desc);
create index if not exists nexo_feedback_rating
  on public.nexo_assistant_feedback (rating,created_at desc);
create index if not exists nexo_feedback_limit
  on public.nexo_assistant_feedback (client_hash,created_at desc);
alter table public.nexo_assistant_feedback enable row level security;
revoke all on public.nexo_assistant_feedback from anon, authenticated;
-- No SELECT/INSERT/UPDATE/DELETE policies: service_role in protected Edge only.
