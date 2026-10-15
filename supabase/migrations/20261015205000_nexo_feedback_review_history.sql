-- Privately track developer review of user-submitted assistant feedback.
-- Keep original responses and comments unmodified; preserve the existing RLS boundary.
alter table public.nexo_assistant_feedback
  add column if not exists review_status text not null default 'pending'
    check (review_status in ('pending','review','implemented','rejected')),
  add column if not exists review_note text not null default ''
    check (char_length(review_note) <= 800);

create index if not exists nexo_feedback_review_recent
  on public.nexo_assistant_feedback (review_status, updated_at desc);

-- Do not expose feedback to anonymous or authenticated users directly.
alter table public.nexo_assistant_feedback enable row level security;
revoke all on public.nexo_assistant_feedback from anon, authenticated;
