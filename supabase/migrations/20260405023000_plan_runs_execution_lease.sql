alter table public.plan_runs
  add column if not exists lease_token text,
  add column if not exists lease_expires_at timestamptz;

create index if not exists plan_runs_lease_expires_at_idx
  on public.plan_runs(lease_expires_at);
