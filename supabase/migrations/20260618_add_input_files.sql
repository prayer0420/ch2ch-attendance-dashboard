alter table public.attendance_runs
  add column if not exists source_file_path text,
  add column if not exists source_file_name text,
  add column if not exists source_file_type text;

insert into storage.buckets (id, name, public, file_size_limit)
values ('attendance-inputs', 'attendance-inputs', false, 20971520)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit;
