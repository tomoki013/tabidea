/**
 * Plan Run Store
 * PlanRun を plan_runs テーブルへ永続化する
 */

import { createHash, randomBytes } from 'crypto';
import { createServiceRoleClient } from '@/lib/supabase/admin';
import type {
  PlanRun,
  PlanRunFailureContext,
  PlanRunPassId,
  PlanRunPauseContext,
  PlanRunResumeHint,
  PlanRunSliceRecord,
  PlanRunState,
} from '@/types/plan-run';
import type { UserInput } from '@/types/user-input';
import { PlanRunNotFoundError, PlanRunStoreOperationError } from './errors';
import { assertTransition, buildResumeHint } from './state-machine';

type SupabaseClient = ReturnType<typeof createServiceRoleClient>;

function getClient(): SupabaseClient {
  return createServiceRoleClient();
}

type RowRecord = Record<string, unknown>;

type PlanRunPatch = Partial<Pick<PlanRun,
  | 'inputSnapshot'
  | 'inputHash'
  | 'modelName'
  | 'normalizedInput'
  | 'planFrame'
  | 'draftTrip'
  | 'validationResult'
  | 'repairHistory'
  | 'timeline'
  | 'gatePassedAt'
  | 'completedTripId'
  | 'completedTripVersion'
  | 'pauseContext'
  | 'currentPassId'
  | 'lastCompletedPassId'
  | 'failureContext'
  | 'warnings'
  | 'stateVersion'
  | 'resumeHint'
>> & {
  executionLeaseToken?: string | null;
  executionLeaseExpiresAt?: string | null;
  activeSliceId?: string | null;
};

function mapLegacyState(state: string | undefined): PlanRunState {
  switch (state) {
    case 'completed':
    case 'failed':
    case 'paused':
    case 'running':
    case 'created':
      return state;
    case 'request_normalized':
    case 'frame_built':
    case 'draft_generated':
    case 'draft_validated':
    case 'draft_repaired':
    case 'timeline_finalized':
    case 'gate_passed':
    default:
      return 'paused';
  }
}

function legacyStateToResumePass(state: string | undefined): PlanRunPassId | undefined {
  switch (state) {
    case 'created':
      return 'normalize_request';
    case 'request_normalized':
      return 'plan_frame_build';
    case 'frame_built':
      return 'draft_generate';
    case 'draft_generated':
      return 'draft_validate';
    case 'draft_validated':
      return 'timeline_finalize';
    case 'draft_repaired':
      return 'draft_validate';
    case 'timeline_finalized':
      return 'completion_gate';
    case 'gate_passed':
      return 'persist_completed_trip';
    default:
      return undefined;
  }
}

function derivePauseContext(row: RowRecord): PlanRunPauseContext | undefined {
  const existing = row.pause_context as PlanRunPauseContext | undefined;
  if (existing?.resumePassId) {
    return existing;
  }

  const resumePassId = legacyStateToResumePass(row.state as string | undefined);
  if (!resumePassId) {
    return undefined;
  }

  return {
    pauseReason: 'infrastructure_interrupted',
    resumePassId,
    pausedAt: (row.updated_at as string) ?? new Date().toISOString(),
  };
}

function deriveExecution(row: RowRecord, state: PlanRunState): PlanRun['execution'] {
  const leaseToken = (row.execution_lease_token as string) ?? (row.lease_token as string) ?? undefined;
  const leaseExpiresAt = (row.execution_lease_expires_at as string) ?? (row.lease_expires_at as string) ?? undefined;
  const sliceId = (row.active_slice_id as string) ?? undefined;
  const isActive = Boolean(leaseToken && leaseExpiresAt && new Date(leaseExpiresAt).getTime() > Date.now());
  return {
    status: state === 'running' || isActive ? 'running' : 'idle',
    leaseExpiresAt,
    sliceId,
  };
}

function deriveResumeHint(row: RowRecord, state: PlanRunState, pauseContext: PlanRunPauseContext | undefined): PlanRunResumeHint {
  const stored = row.resume_hint as PlanRunResumeHint | undefined;
  if (stored) {
    return stored;
  }
  return buildResumeHint({ state, pauseContext });
}

function rowToRun(row: RowRecord): PlanRun {
  const state = mapLegacyState(row.state as string | undefined);
  const pauseContext = derivePauseContext(row);
  const execution = deriveExecution(row, state);

  return {
    id: row.id as string,
    userId: (row.user_id as string) ?? undefined,
    accessToken: (row.access_token as string) ?? undefined,
    state,
    stateVersion: Number((row.state_version as number | string | undefined) ?? 0),
    idempotencyKey: (row.idempotency_key as string) ?? undefined,
    inputHash: (row.input_hash as string) ?? undefined,
    inputSnapshot: row.input_snapshot as PlanRun['inputSnapshot'],
    modelName: (row.model_name as string) ?? undefined,
    normalizedInput: row.normalized_input as PlanRun['normalizedInput'],
    planFrame: row.plan_frame as PlanRun['planFrame'],
    draftTrip: row.draft_trip as PlanRun['draftTrip'],
    validationResult: row.validation_result as PlanRun['validationResult'],
    repairHistory: (row.repair_history as PlanRun['repairHistory']) ?? [],
    timeline: row.timeline as PlanRun['timeline'],
    gatePassedAt: (row.gate_passed_at as string) ?? undefined,
    completedTripId: (row.completed_trip_id as string) ?? undefined,
    completedTripVersion: (row.completed_trip_version as number) ?? undefined,
    pauseContext,
    currentPassId: ((row.current_pass_id as PlanRunPassId | undefined) ?? (row.active_pass_id as PlanRunPassId | undefined)),
    lastCompletedPassId: (row.last_completed_pass_id as PlanRunPassId) ?? undefined,
    failureContext: row.failure_context as PlanRunFailureContext | undefined,
    runtimeProfile: (row.runtime_profile as string) ?? undefined,
    warnings: (row.warnings as string[]) ?? [],
    execution,
    resumeHint: deriveResumeHint(row, state, pauseContext),
    createdAt: (row.created_at as string) ?? new Date().toISOString(),
    updatedAt: (row.updated_at as string) ?? new Date().toISOString(),
  };
}

function setNullable(dbPatch: Record<string, unknown>, key: string, value: unknown): void {
  dbPatch[key] = value ?? null;
}

function patchToDb(patch: PlanRunPatch): Record<string, unknown> {
  const dbPatch: Record<string, unknown> = {};

  if ('inputSnapshot' in patch) setNullable(dbPatch, 'input_snapshot', patch.inputSnapshot);
  if ('inputHash' in patch) setNullable(dbPatch, 'input_hash', patch.inputHash);
  if ('modelName' in patch) setNullable(dbPatch, 'model_name', patch.modelName);
  if ('normalizedInput' in patch) setNullable(dbPatch, 'normalized_input', patch.normalizedInput);
  if ('planFrame' in patch) setNullable(dbPatch, 'plan_frame', patch.planFrame);
  if ('draftTrip' in patch) setNullable(dbPatch, 'draft_trip', patch.draftTrip);
  if ('validationResult' in patch) setNullable(dbPatch, 'validation_result', patch.validationResult);
  if ('repairHistory' in patch) setNullable(dbPatch, 'repair_history', patch.repairHistory);
  if ('timeline' in patch) setNullable(dbPatch, 'timeline', patch.timeline);
  if ('gatePassedAt' in patch) setNullable(dbPatch, 'gate_passed_at', patch.gatePassedAt);
  if ('completedTripId' in patch) setNullable(dbPatch, 'completed_trip_id', patch.completedTripId);
  if ('completedTripVersion' in patch) setNullable(dbPatch, 'completed_trip_version', patch.completedTripVersion);
  if ('pauseContext' in patch) setNullable(dbPatch, 'pause_context', patch.pauseContext);
  if ('currentPassId' in patch) {
    setNullable(dbPatch, 'current_pass_id', patch.currentPassId);
    setNullable(dbPatch, 'active_pass_id', patch.currentPassId);
  }
  if ('lastCompletedPassId' in patch) setNullable(dbPatch, 'last_completed_pass_id', patch.lastCompletedPassId);
  if ('failureContext' in patch) setNullable(dbPatch, 'failure_context', patch.failureContext);
  if ('warnings' in patch) setNullable(dbPatch, 'warnings', patch.warnings);
  if ('stateVersion' in patch) setNullable(dbPatch, 'state_version', patch.stateVersion);
  if ('resumeHint' in patch) setNullable(dbPatch, 'resume_hint', patch.resumeHint);
  if ('executionLeaseToken' in patch) {
    setNullable(dbPatch, 'execution_lease_token', patch.executionLeaseToken);
    setNullable(dbPatch, 'lease_token', patch.executionLeaseToken);
  }
  if ('executionLeaseExpiresAt' in patch) {
    setNullable(dbPatch, 'execution_lease_expires_at', patch.executionLeaseExpiresAt);
    setNullable(dbPatch, 'lease_expires_at', patch.executionLeaseExpiresAt);
  }
  if ('activeSliceId' in patch) setNullable(dbPatch, 'active_slice_id', patch.activeSliceId);

  return dbPatch;
}

export async function createPlanRun(
  userId?: string,
  options?: {
    idempotencyKey?: string;
    runtimeProfile?: string;
    modelName?: string;
  },
): Promise<PlanRun> {
  const client = getClient();
  const accessToken = userId ? undefined : randomBytes(32).toString('hex');

  const { data, error } = await client
    .from('plan_runs')
    .insert({
      user_id: userId ?? null,
      access_token: accessToken ?? null,
      state: 'created' satisfies PlanRunState,
      state_version: 0,
      idempotency_key: options?.idempotencyKey ?? null,
      runtime_profile: options?.runtimeProfile ?? 'netlify_free_30s',
      model_name: options?.modelName ?? null,
      repair_history: [],
      warnings: [],
      resume_hint: { mode: 'none' },
    })
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(`Failed to create plan run: ${error?.message}`);
  }

  return rowToRun(data as RowRecord);
}

export async function loadPlanRun(runId: string): Promise<PlanRun> {
  const client = getClient();
  const { data, error } = await client
    .from('plan_runs')
    .select('*')
    .eq('id', runId)
    .single();

  if (error || !data) {
    throw new PlanRunNotFoundError(runId);
  }

  return rowToRun(data as RowRecord);
}

export async function updatePlanRun(runId: string, patch: PlanRunPatch): Promise<PlanRun> {
  const client = getClient();
  const dbPatch = patchToDb(patch);

  const { data, error } = await client
    .from('plan_runs')
    .update(dbPatch)
    .eq('id', runId)
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(`Failed to update plan run ${runId}: ${error?.message}`);
  }

  return rowToRun(data as RowRecord);
}

export async function transitionPlanRun(
  runId: string,
  from: PlanRunState,
  to: PlanRunState,
  patch?: PlanRunPatch,
): Promise<PlanRun> {
  assertTransition(from, to);
  const client = getClient();
  const dbPatch: Record<string, unknown> = {
    state: to,
    ...patchToDb(patch ?? {}),
  };

  const { data, error } = await client
    .from('plan_runs')
    .update(dbPatch)
    .eq('id', runId)
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(`Failed to transition plan run ${runId}: ${error?.message}`);
  }

  return rowToRun(data as RowRecord);
}

export function computeInputHash(input: UserInput): string {
  function stableSerialize(value: unknown): string {
    if (value === null || typeof value !== 'object') return JSON.stringify(value);
    if (Array.isArray(value)) return `[${value.map((v) => stableSerialize(v)).join(',')}]`;
    const rec = value as Record<string, unknown>;
    const keys = Object.keys(rec).sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${stableSerialize(rec[k])}`).join(',')}}`;
  }
  return createHash('sha256').update(stableSerialize(input)).digest('hex');
}

export async function findRecentDuplicateRun(
  userId: string,
  inputHash: string,
  idempotencyKey?: string,
): Promise<PlanRun | null> {
  const client = getClient();

  if (idempotencyKey) {
    return findPlanRunByIdempotencyKey(userId, idempotencyKey);
  }

  const fiveMinutesAgo = new Date(Date.now() - 5 * 60_000).toISOString();
  const { data } = await client
    .from('plan_runs')
    .select('*')
    .eq('user_id', userId)
    .eq('input_hash', inputHash)
    .in('state', ['created', 'running', 'paused'])
    .gte('created_at', fiveMinutesAgo)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (data) return rowToRun(data as RowRecord);
  return null;
}

export async function findPlanRunByIdempotencyKey(
  userId: string,
  idempotencyKey: string,
): Promise<PlanRun | null> {
  const client = getClient();
  const { data } = await client
    .from('plan_runs')
    .select('*')
    .eq('user_id', userId)
    .eq('idempotency_key', idempotencyKey)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return null;
  return rowToRun(data as RowRecord);
}

interface ClaimExecutionRpcResponse {
  acquired: boolean;
  run: RowRecord;
  lease_token?: string;
}

function buildClaimExecutionDbPatch(
  currentPassId: PlanRunPassId,
  expectedStateVersion: number,
  leaseToken: string,
  leaseExpiresAt: string,
  sliceId: string,
): Record<string, unknown> {
  return {
    state: 'running',
    state_version: expectedStateVersion + 1,
    current_pass_id: currentPassId,
    active_pass_id: currentPassId,
    pause_context: null,
    failure_context: null,
    resume_hint: { mode: 'none' },
    execution_lease_token: leaseToken,
    execution_lease_expires_at: leaseExpiresAt,
    active_slice_id: sliceId,
    lease_token: leaseToken,
    lease_expires_at: leaseExpiresAt,
  };
}

async function claimPlanRunExecutionFallback(
  client: SupabaseClient,
  runId: string,
  currentPassId: PlanRunPassId,
  expectedStateVersion: number,
  leaseMs: number,
  sliceId: string,
): Promise<{ acquired: true; run: PlanRun; leaseToken: string } | { acquired: false; run: PlanRun }> {
  const now = new Date();
  const nowIso = now.toISOString();
  const leaseToken = randomBytes(16).toString('hex');
  const leaseExpiresAt = new Date(now.getTime() + leaseMs).toISOString();

  const { data, error } = await client
    .from('plan_runs')
    .update(buildClaimExecutionDbPatch(currentPassId, expectedStateVersion, leaseToken, leaseExpiresAt, sliceId))
    .eq('id', runId)
    .eq('state_version', expectedStateVersion)
    .in('state', ['created', 'paused'])
    .or(`execution_lease_expires_at.is.null,execution_lease_expires_at.lt.${nowIso},lease_expires_at.is.null,lease_expires_at.lt.${nowIso}`)
    .select('*')
    .maybeSingle();

  if (error) {
    throw new PlanRunStoreOperationError(
      `Fallback claim failed for ${runId}: ${error.message}`,
      'claim_execution',
      { code: error.code, details: error.details, hint: error.hint, mode: 'fallback' },
    );
  }

  if (!data) {
    return {
      acquired: false,
      run: await loadPlanRun(runId),
    };
  }

  return {
    acquired: true,
    run: rowToRun(data as RowRecord),
    leaseToken,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseClaimExecutionRpcResponse(data: unknown, runId: string): ClaimExecutionRpcResponse {
  if (!isRecord(data) || typeof data.acquired !== 'boolean' || !isRecord(data.run)) {
    throw new PlanRunStoreOperationError(
      `Invalid claim_plan_run_execution response for ${runId}`,
      'claim_execution',
      { data },
    );
  }

  return {
    acquired: data.acquired,
    run: data.run,
    lease_token: typeof data.lease_token === 'string' ? data.lease_token : undefined,
  };
}

export async function claimPlanRunExecution(
  runId: string,
  currentPassId: PlanRunPassId,
  expectedStateVersion: number,
  leaseMs = 30_000,
): Promise<{ acquired: true; run: PlanRun; leaseToken: string } | { acquired: false; run: PlanRun }> {
  const client = getClient();
  const sliceId = randomBytes(16).toString('hex');

  try {
    const { data, error } = await client.rpc('claim_plan_run_execution', {
      p_run_id: runId,
      p_current_pass_id: currentPassId,
      p_expected_state_version: expectedStateVersion,
      p_lease_ms: leaseMs,
      p_slice_id: sliceId,
    });

    if (error) {
      throw new PlanRunStoreOperationError(
        `Failed to claim plan run execution ${runId}: ${error.message}`,
        'claim_execution',
        { code: error.code, details: error.details, hint: error.hint, mode: 'rpc' },
      );
    }

    if (!data) {
      throw new PlanRunStoreOperationError(
        `claim_plan_run_execution returned empty payload for ${runId}`,
        'claim_execution',
        { mode: 'rpc' },
      );
    }

    const payload = parseClaimExecutionRpcResponse(data, runId);
    if (!payload.acquired) {
      return {
        acquired: false,
        run: rowToRun(payload.run),
      };
    }

    return {
      acquired: true,
      run: rowToRun(payload.run),
      leaseToken: payload.lease_token ?? '',
    };
  } catch (error) {
    if (!(error instanceof PlanRunStoreOperationError)) {
      throw error;
    }
    return claimPlanRunExecutionFallback(client, runId, currentPassId, expectedStateVersion, leaseMs, sliceId);
  }
}

interface CommitSliceOptions {
  stateVersion: number;
  leaseToken: string;
  stopReason: 'completed' | 'paused' | 'failed';
  currentPassId?: PlanRunPassId;
  lastCompletedPassId?: PlanRunPassId;
  pauseContext?: PlanRunPauseContext;
  failureContext?: PlanRunFailureContext;
  warnings?: string[];
  patch?: PlanRunPatch;
  budgetMs: number;
  metadata?: Record<string, unknown>;
}

interface CommitExecutionRpcResponse {
  run: RowRecord;
}

function buildResumeHintForStopReason(
  stopReason: CommitSliceOptions['stopReason'],
  pauseContext?: PlanRunPauseContext,
): PlanRunResumeHint {
  if (stopReason === 'completed' || stopReason === 'failed') {
    return { mode: 'none' };
  }

  if (pauseContext?.pauseReason === 'runtime_budget_exhausted' || pauseContext?.pauseReason === 'day_unit_boundary') {
    return {
      mode: 'auto',
      reason: pauseContext.pauseReason,
      retryAfterMs: 750,
    };
  }

  return {
    mode: 'manual',
    reason: pauseContext?.pauseReason ?? 'infrastructure_interrupted',
  };
}

function parseCommitExecutionRpcResponse(data: unknown, runId: string): CommitExecutionRpcResponse {
  if (!isRecord(data) || !isRecord(data.run)) {
    throw new PlanRunStoreOperationError(
      `Invalid commit_plan_run_slice response for ${runId}`,
      'commit_slice',
      { data },
    );
  }

  return {
    run: data.run,
  };
}

async function commitPlanRunSliceFallback(
  client: SupabaseClient,
  runId: string,
  options: CommitSliceOptions,
  patch: Record<string, unknown>,
): Promise<PlanRun> {
  const before = await loadPlanRun(runId);
  const nextState: PlanRunState =
    options.stopReason === 'completed'
      ? 'completed'
      : options.stopReason === 'failed'
        ? 'failed'
        : 'paused';
  const dbPatch: Record<string, unknown> = {
    ...patch,
    state: nextState,
    state_version: options.stateVersion + 1,
    pause_context: nextState === 'paused' ? (options.pauseContext ?? null) : null,
    current_pass_id: nextState === 'paused' ? (options.currentPassId ?? null) : null,
    active_pass_id: nextState === 'paused' ? (options.currentPassId ?? null) : null,
    last_completed_pass_id: options.lastCompletedPassId ?? before.lastCompletedPassId ?? null,
    failure_context: nextState === 'failed' ? (options.failureContext ?? null) : null,
    warnings: options.warnings ?? before.warnings,
    resume_hint: buildResumeHintForStopReason(options.stopReason, options.pauseContext),
    execution_lease_token: null,
    execution_lease_expires_at: null,
    active_slice_id: null,
    lease_token: null,
    lease_expires_at: null,
  };

  const { data, error } = await client
    .from('plan_runs')
    .update(dbPatch)
    .eq('id', runId)
    .eq('state_version', options.stateVersion)
    .eq('execution_lease_token', options.leaseToken)
    .select('*')
    .single();

  if (error || !data) {
    throw new PlanRunStoreOperationError(
      `Fallback commit failed for ${runId}: ${error?.message}`,
      'commit_slice',
      { code: error?.code, details: error?.details, hint: error?.hint, mode: 'fallback' },
    );
  }

  const afterRow = data as RowRecord;
  const insertError = await client
    .from('plan_run_slices')
    .insert({
      run_id: runId,
      slice_id: before.execution.sliceId ?? randomBytes(8).toString('hex'),
      from_state: before.state,
      to_state: afterRow.state,
      current_pass_id: options.currentPassId ?? null,
      stop_reason: options.stopReason,
      error_code: options.failureContext?.errorCode ?? options.metadata?.errorCode ?? null,
      root_cause: options.failureContext?.rootCause ?? options.metadata?.rootCause ?? null,
      started_at: before.updatedAt,
      finished_at: new Date().toISOString(),
      lease_token: options.leaseToken,
      budget_ms: options.budgetMs,
      metadata: options.metadata ?? {},
    });

  if (insertError.error) {
    throw new PlanRunStoreOperationError(
      `Fallback slice insert failed for ${runId}: ${insertError.error.message}`,
      'commit_slice',
      { code: insertError.error.code, details: insertError.error.details, hint: insertError.error.hint, mode: 'fallback' },
    );
  }

  return rowToRun(afterRow);
}

export async function commitPlanRunSlice(runId: string, options: CommitSliceOptions): Promise<PlanRun> {
  const client = getClient();
  const patch = patchToDb({
    ...options.patch,
    currentPassId: options.currentPassId,
    lastCompletedPassId: options.lastCompletedPassId,
    pauseContext: options.pauseContext,
    failureContext: options.failureContext,
    warnings: options.warnings,
  });

  try {
    const { data, error } = await client.rpc('commit_plan_run_slice', {
      p_run_id: runId,
      p_expected_state_version: options.stateVersion,
      p_lease_token: options.leaseToken,
      p_stop_reason: options.stopReason,
      p_current_pass_id: options.currentPassId ?? null,
      p_last_completed_pass_id: options.lastCompletedPassId ?? null,
      p_pause_context: options.pauseContext ?? null,
      p_failure_context: options.failureContext ?? null,
      p_warnings: options.warnings ?? null,
      p_patch: patch,
      p_budget_ms: options.budgetMs,
      p_metadata: options.metadata ?? {},
    });

    if (error) {
      throw new PlanRunStoreOperationError(
        `Failed to commit plan run slice ${runId}: ${error.message}`,
        'commit_slice',
        { code: error.code, details: error.details, hint: error.hint, mode: 'rpc' },
      );
    }

    if (!data) {
      throw new PlanRunStoreOperationError(
        `commit_plan_run_slice returned empty payload for ${runId}`,
        'commit_slice',
        { mode: 'rpc' },
      );
    }

    return rowToRun(parseCommitExecutionRpcResponse(data, runId).run);
  } catch (error) {
    if (!(error instanceof PlanRunStoreOperationError)) {
      throw error;
    }
    return commitPlanRunSliceFallback(client, runId, options, patch);
  }
}

export async function loadPlanRunSlices(runId: string, limit = 20): Promise<PlanRunSliceRecord[]> {
  const client = getClient();
  const { data, error } = await client
    .from('plan_run_slices')
    .select('*')
    .eq('run_id', runId)
    .order('started_at', { ascending: false })
    .limit(limit);

  if (error || !data) {
    return [];
  }

  return data.map((row) => ({
    runId: row.run_id as string,
    sliceId: row.slice_id as string,
    fromState: row.from_state as PlanRunState,
    toState: row.to_state as PlanRunState,
    currentPassId: row.current_pass_id as PlanRunPassId | undefined,
    stopReason: row.stop_reason as PlanRunSliceRecord['stopReason'],
    errorCode: row.error_code as string | undefined,
    rootCause: row.root_cause as string | undefined,
    startedAt: row.started_at as string,
    finishedAt: row.finished_at as string,
    leaseToken: row.lease_token as string,
    budgetMs: row.budget_ms as number,
    metadata: row.metadata as Record<string, unknown> | undefined,
  }));
}
