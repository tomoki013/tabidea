alter table public.runs
  add column if not exists planner_day_outline jsonb,
  add column if not exists planner_day_chunks jsonb;
