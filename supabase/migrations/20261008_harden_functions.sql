-- Supabase security advisor: pin the trigger function search_path.
alter function public.set_updated_at() set search_path = '';
