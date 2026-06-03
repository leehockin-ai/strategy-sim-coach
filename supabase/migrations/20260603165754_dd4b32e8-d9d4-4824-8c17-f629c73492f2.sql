alter table public.sessions
  add column if not exists submission_requested_at timestamptz;

create index if not exists idx_sessions_submission_pending
  on public.sessions (submission_requested_at)
  where submission_requested_at is not null;

comment on column public.sessions.submission_requested_at is
  'Timestamp when the candidate explicitly requested Strategyzer reviewer assessment. NULL = practice / AI-only. Non-null = in the reviewer queue.';