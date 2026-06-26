create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.attendance_runs (
  id uuid primary key default gen_random_uuid(),
  requested_by uuid,
  requested_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz,
  status text not null default 'queued',
  data_source text not null default 'google_sheet',
  google_sheet_url text,
  google_sheet_tab text,
  csv_file_name text,
  source_file_path text,
  source_file_name text,
  source_file_type text,
  target_dept text,
  target_term text,
  target_group text,
  target_week integer,
  target_week_text text,
  dry_run boolean not null default true,
  enable_second_pass boolean not null default true,
  enable_new_family_groups boolean not null default true,
  enable_long_absence_search boolean not null default true,
  total_count integer not null default 0,
  processed_count integer not null default 0,
  primary_success_count integer not null default 0,
  primary_fail_count integer not null default 0,
  second_pass_success_count integer not null default 0,
  final_fail_count integer not null default 0,
  save_success_count integer not null default 0,
  save_fail_count integer not null default 0,
  current_family text,
  current_name text,
  current_step text,
  runner_id text,
  runner_hostname text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.attendance_results (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.attendance_runs(id) on delete cascade,
  name text not null,
  normalized_name text not null,
  original_family text,
  found_location text,
  target_week integer,
  target_week_text text,
  service_1_3_present boolean not null default false,
  service_4_present boolean not null default false,
  memo text,
  status text not null,
  attempt_stage text,
  save_result text,
  failure_reason text,
  checked_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.attendance_members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  normalized_name text not null unique,
  current_family text,
  last_found_location text,
  last_seen_week integer,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.attendance_weekly_records (
  id uuid primary key default gen_random_uuid(),
  member_name text not null,
  normalized_name text not null,
  family text,
  found_location text,
  target_year integer,
  target_term text,
  target_week integer not null,
  target_week_text text,
  service_1_3_present boolean not null default false,
  service_4_present boolean not null default false,
  source_run_id uuid references public.attendance_runs(id) on delete set null,
  source_result_id uuid references public.attendance_results(id) on delete set null,
  status text,
  failure_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(normalized_name, target_term, target_week)
);

create table if not exists public.run_events (
  id bigint generated always as identity primary key,
  run_id uuid references public.attendance_runs(id) on delete cascade,
  level text not null default 'info',
  event_type text,
  message text not null,
  context jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.app_settings (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  value jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.runner_heartbeats (
  id uuid primary key default gen_random_uuid(),
  runner_id text not null unique,
  hostname text,
  status text not null default 'online',
  last_seen_at timestamptz not null default now(),
  current_run_id uuid,
  current_step text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_attendance_runs_updated_at on public.attendance_runs;
create trigger set_attendance_runs_updated_at
before update on public.attendance_runs
for each row execute function public.set_updated_at();

drop trigger if exists set_attendance_members_updated_at on public.attendance_members;
create trigger set_attendance_members_updated_at
before update on public.attendance_members
for each row execute function public.set_updated_at();

drop trigger if exists set_weekly_records_updated_at on public.attendance_weekly_records;
create trigger set_weekly_records_updated_at
before update on public.attendance_weekly_records
for each row execute function public.set_updated_at();

drop trigger if exists set_app_settings_updated_at on public.app_settings;
create trigger set_app_settings_updated_at
before update on public.app_settings
for each row execute function public.set_updated_at();

drop trigger if exists set_runner_heartbeats_updated_at on public.runner_heartbeats;
create trigger set_runner_heartbeats_updated_at
before update on public.runner_heartbeats
for each row execute function public.set_updated_at();

create index if not exists idx_attendance_runs_status on public.attendance_runs(status);
create index if not exists idx_attendance_runs_requested_at on public.attendance_runs(requested_at desc);
create index if not exists idx_attendance_results_run_id on public.attendance_results(run_id);
create index if not exists idx_attendance_results_status on public.attendance_results(status);
create index if not exists idx_weekly_records_week on public.attendance_weekly_records(target_week);
create index if not exists idx_weekly_records_family on public.attendance_weekly_records(family);
create index if not exists idx_weekly_records_name on public.attendance_weekly_records(normalized_name);
create index if not exists idx_run_events_run_id on public.run_events(run_id);
create index if not exists idx_run_events_created_at on public.run_events(created_at desc);

insert into public.app_settings (key, value)
values (
  'default_run_settings',
  '{
    "googleSheetUrl": "https://docs.google.com/spreadsheets/d/1DXEeV2h5lk3c8clfNBZPDw3biuqkIP1-5ENvapcVvk8/edit?usp=drivesdk",
    "googleSheetTab": "가장체크",
    "targetDeptText": "2청년회",
    "targetTermText": "2026 전반",
    "targetGroupText": "26상",
    "defaultWeek": 24
  }'::jsonb
)
on conflict (key) do nothing;

insert into storage.buckets (id, name, public, file_size_limit)
values ('attendance-inputs', 'attendance-inputs', false, 20971520)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit;

alter table public.attendance_runs enable row level security;
alter table public.attendance_results enable row level security;
alter table public.attendance_members enable row level security;
alter table public.attendance_weekly_records enable row level security;
alter table public.run_events enable row level security;
alter table public.app_settings enable row level security;
alter table public.runner_heartbeats enable row level security;
