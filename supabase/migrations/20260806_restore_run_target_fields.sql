alter table public.attendance_runs
  add column if not exists target_year integer,
  add column if not exists target_date date;
