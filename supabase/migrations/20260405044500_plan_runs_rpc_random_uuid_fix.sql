create or replace function public.claim_plan_run_execution(
  p_run_id uuid,
  p_current_pass_id text,
  p_expected_state_version bigint,
  p_lease_ms integer,
  p_slice_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_lease_token text := replace(gen_random_uuid()::text, '-', '');
  v_run public.plan_runs%rowtype;
begin
  update public.plan_runs
  set
    state = 'running',
    state_version = state_version + 1,
    current_pass_id = p_current_pass_id,
    active_pass_id = p_current_pass_id,
    pause_context = null,
    failure_context = null,
    resume_hint = '{"mode":"none"}'::jsonb,
    execution_lease_token = v_lease_token,
    execution_lease_expires_at = v_now + ((greatest(p_lease_ms, 1000)::text || ' milliseconds')::interval),
    active_slice_id = p_slice_id,
    lease_token = v_lease_token,
    lease_expires_at = v_now + ((greatest(p_lease_ms, 1000)::text || ' milliseconds')::interval)
  where id = p_run_id
    and state in ('created', 'paused')
    and state_version = p_expected_state_version
    and (
      execution_lease_expires_at is null
      or execution_lease_expires_at < v_now
    )
  returning * into v_run;

  if found then
    return jsonb_build_object(
      'acquired', true,
      'lease_token', v_lease_token,
      'run', to_jsonb(v_run)
    );
  end if;

  select * into v_run
  from public.plan_runs
  where id = p_run_id;

  return jsonb_build_object(
    'acquired', false,
    'run', to_jsonb(v_run)
  );
end;
$$;

create or replace function public.commit_plan_run_slice(
  p_run_id uuid,
  p_expected_state_version bigint,
  p_lease_token text,
  p_stop_reason text,
  p_current_pass_id text,
  p_last_completed_pass_id text,
  p_pause_context jsonb,
  p_failure_context jsonb,
  p_warnings jsonb,
  p_patch jsonb,
  p_budget_ms integer,
  p_metadata jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_before public.plan_runs%rowtype;
  v_after public.plan_runs%rowtype;
  v_next_state text;
  v_resume_hint jsonb;
  v_finished_at timestamptz := clock_timestamp();
begin
  select * into v_before
  from public.plan_runs
  where id = p_run_id;

  if not found then
    raise exception 'plan run not found: %', p_run_id;
  end if;

  if p_stop_reason = 'completed' then
    v_next_state := 'completed';
    v_resume_hint := '{"mode":"none"}'::jsonb;
  elsif p_stop_reason = 'failed' then
    v_next_state := 'failed';
    v_resume_hint := '{"mode":"none"}'::jsonb;
  else
    v_next_state := 'paused';
    if coalesce(p_pause_context->>'pauseReason', '') in ('runtime_budget_exhausted', 'day_unit_boundary') then
      v_resume_hint := jsonb_build_object(
        'mode', 'auto',
        'reason', p_pause_context->>'pauseReason',
        'retryAfterMs', 750
      );
    else
      v_resume_hint := jsonb_build_object(
        'mode', 'manual',
        'reason', coalesce(p_pause_context->>'pauseReason', 'infrastructure_interrupted')
      );
    end if;
  end if;

  update public.plan_runs
  set
    state = v_next_state,
    state_version = state_version + 1,
    input_snapshot = case when p_patch ? 'input_snapshot' then p_patch->'input_snapshot' else input_snapshot end,
    input_hash = case when p_patch ? 'input_hash' then p_patch->>'input_hash' else input_hash end,
    model_name = case when p_patch ? 'model_name' then p_patch->>'model_name' else model_name end,
    normalized_input = case when p_patch ? 'normalized_input' then p_patch->'normalized_input' else normalized_input end,
    plan_frame = case when p_patch ? 'plan_frame' then p_patch->'plan_frame' else plan_frame end,
    draft_trip = case when p_patch ? 'draft_trip' then p_patch->'draft_trip' else draft_trip end,
    validation_result = case when p_patch ? 'validation_result' then p_patch->'validation_result' else validation_result end,
    repair_history = case when p_patch ? 'repair_history' then p_patch->'repair_history' else repair_history end,
    timeline = case when p_patch ? 'timeline' then p_patch->'timeline' else timeline end,
    gate_passed_at = case when p_patch ? 'gate_passed_at' then nullif(p_patch->>'gate_passed_at', '')::timestamptz else gate_passed_at end,
    completed_trip_id = case when p_patch ? 'completed_trip_id' then nullif(p_patch->>'completed_trip_id', '')::uuid else completed_trip_id end,
    completed_trip_version = case when p_patch ? 'completed_trip_version' then nullif(p_patch->>'completed_trip_version', '')::integer else completed_trip_version end,
    pause_context = case when v_next_state = 'paused' then p_pause_context else null end,
    active_pass_id = case when v_next_state = 'paused' then p_current_pass_id when v_next_state = 'running' then p_current_pass_id else null end,
    current_pass_id = case when v_next_state = 'paused' then p_current_pass_id when v_next_state = 'running' then p_current_pass_id else null end,
    last_completed_pass_id = coalesce(p_last_completed_pass_id, last_completed_pass_id),
    failure_context = case when v_next_state = 'failed' then p_failure_context else null end,
    warnings = coalesce(p_warnings, warnings),
    resume_hint = v_resume_hint,
    execution_lease_token = null,
    execution_lease_expires_at = null,
    active_slice_id = null,
    lease_token = null,
    lease_expires_at = null
  where id = p_run_id
    and state_version = p_expected_state_version
    and execution_lease_token = p_lease_token
  returning * into v_after;

  if not found then
    raise exception 'plan run commit rejected: %, version %, lease %', p_run_id, p_expected_state_version, p_lease_token;
  end if;

  insert into public.plan_run_slices (
    run_id,
    slice_id,
    from_state,
    to_state,
    current_pass_id,
    stop_reason,
    error_code,
    root_cause,
    started_at,
    finished_at,
    lease_token,
    budget_ms,
    metadata
  ) values (
    p_run_id,
    coalesce(v_before.active_slice_id, replace(gen_random_uuid()::text, '-', '')),
    v_before.state,
    v_after.state,
    p_current_pass_id,
    p_stop_reason,
    coalesce(p_failure_context->>'errorCode', p_metadata->>'errorCode'),
    coalesce(p_failure_context->>'rootCause', p_metadata->>'rootCause'),
    coalesce(v_before.updated_at, now()),
    v_finished_at,
    p_lease_token,
    p_budget_ms,
    coalesce(p_metadata, '{}'::jsonb)
  );

  return jsonb_build_object('run', to_jsonb(v_after));
end;
$$;
