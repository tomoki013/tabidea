alter table public.plan_runs
  add column if not exists failure_context jsonb;

update public.plan_runs
set state = 'paused'
where pause_context is not null
  and state not in ('paused', 'completed', 'failed');
