create table if not exists public.qr_sync_jobs (
  id uuid primary key default gen_random_uuid(),
  action text not null check (action in ('preview', 'apply')),
  status text not null default 'queued' check (status in ('queued', 'picked_up', 'running', 'completed', 'failed')),
  week integer not null,
  sheet_url text not null,
  sheet_tab text not null default '가장체크',
  department text not null default '2청년회',
  preview jsonb,
  result jsonb,
  error_message text,
  runner_id text,
  runner_hostname text,
  requested_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_qr_sync_jobs_updated_at on public.qr_sync_jobs;
create trigger set_qr_sync_jobs_updated_at
before update on public.qr_sync_jobs
for each row execute function public.set_updated_at();

create index if not exists idx_qr_sync_jobs_status on public.qr_sync_jobs(status, requested_at);

alter table public.qr_sync_jobs enable row level security;
