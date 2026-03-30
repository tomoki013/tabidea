alter table public.runs
  add column if not exists planner_seed jsonb;
