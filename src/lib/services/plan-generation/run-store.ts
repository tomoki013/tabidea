/**
 * Run Store
 * PlanGenerationSession を runs / run_pass_runs / run_checkpoints へ永続化する
 */

import { createServiceRoleClient } from '@/lib/supabase/admin';
import type {
  PassId,
  PassRunRecord,
  PlanGenerationSession,
  SessionState,
} from '@/types/plan-generation';
import { assertTransition } from './state-machine';
import { SessionNotFoundError } from './errors';

type SupabaseClient = ReturnType<typeof createServiceRoleClient>;
type RunPatch = Partial<Pick<
  PlanGenerationSession,
  | 'inputSnapshot'
  | 'pipelineContext'
  | 'normalizedInput'
  | 'generationProfile'
  | 'plannerSeed'
  | 'plannerDayOutline'
  | 'plannerDayChunks'
  | 'plannerDraft'
  | 'draftPlan'
  | 'evaluationReport'
  | 'repairHistory'
  | 'verifiedEntities'
  | 'timelineState'
  | 'narrativeState'
  | 'uiProjection'
  | 'checkpointCursor'
  | 'warnings'
  | 'inputHash'
  | 'rubricVersion'
>>;

function getClient(): SupabaseClient {
  return createServiceRoleClient();
}

function rowToRun(row: Record<string, unknown>): PlanGenerationSession {
  return {
    id: row.id as string,
    userId: (row.user_id as string) ?? undefined,
    state: row.state as SessionState,
    createdAt: (row.created_at as string) ?? new Date().toISOString(),
    updatedAt: (row.updated_at as string) ?? new Date().toISOString(),
    inputSnapshot: row.input_snapshot as PlanGenerationSession['inputSnapshot'],
    pipelineContext: row.pipeline_context as PlanGenerationSession['pipelineContext'],
    normalizedInput: row.normalized_input as PlanGenerationSession['normalizedInput'],
    generationProfile: row.generation_profile as PlanGenerationSession['generationProfile'],
    plannerSeed: row.planner_seed as PlanGenerationSession['plannerSeed'],
    plannerDayOutline: row.planner_day_outline as PlanGenerationSession['plannerDayOutline'],
    plannerDayChunks: row.planner_day_chunks as PlanGenerationSession['plannerDayChunks'],
    plannerDraft: row.planner_draft as PlanGenerationSession['plannerDraft'],
    draftPlan: row.draft_plan as PlanGenerationSession['draftPlan'],
    evaluationReport: row.evaluation_report as PlanGenerationSession['evaluationReport'],
    repairHistory: (row.repair_history as PlanGenerationSession['repairHistory']) ?? [],
    verifiedEntities: (row.verified_entities as PlanGenerationSession['verifiedEntities']) ?? [],
    timelineState: row.timeline_state as PlanGenerationSession['timelineState'],
    narrativeState: row.narrative_state as PlanGenerationSession['narrativeState'],
    uiProjection: row.ui_projection as PlanGenerationSession['uiProjection'],
    checkpointCursor: (row.checkpoint_cursor as string) ?? undefined,
    passRuns: [],
    warnings: (row.warnings as string[]) ?? [],
    inputHash: (row.input_hash as string) ?? undefined,
    rubricVersion: (row.rubric_version as string) ?? undefined,
  };
}

export async function createRun(userId?: string): Promise<PlanGenerationSession> {
  const client = getClient();
  const { data, error } = await client
    .from('runs')
    .insert({
      user_id: userId ?? null,
      state: 'created' satisfies SessionState,
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Failed to create run: ${error?.message ?? 'no data'}`);
  }

  return rowToRun(data);
}

export async function loadRun(id: string): Promise<PlanGenerationSession> {
  const client = getClient();
  const { data, error } = await client
    .from('runs')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    throw new SessionNotFoundError(id);
  }

  return rowToRun(data);
}

function buildRunDbPatch(patch: RunPatch): Record<string, unknown> {
  const dbPatch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (patch.inputSnapshot !== undefined) dbPatch.input_snapshot = patch.inputSnapshot;
  if (patch.pipelineContext !== undefined) dbPatch.pipeline_context = patch.pipelineContext;
  if (patch.normalizedInput !== undefined) dbPatch.normalized_input = patch.normalizedInput;
  if (patch.generationProfile !== undefined) dbPatch.generation_profile = patch.generationProfile;
  if (patch.plannerSeed !== undefined) dbPatch.planner_seed = patch.plannerSeed;
  if (patch.plannerDayOutline !== undefined) dbPatch.planner_day_outline = patch.plannerDayOutline;
  if (patch.plannerDayChunks !== undefined) dbPatch.planner_day_chunks = patch.plannerDayChunks;
  if (patch.plannerDraft !== undefined) dbPatch.planner_draft = patch.plannerDraft;
  if (patch.draftPlan !== undefined) dbPatch.draft_plan = patch.draftPlan;
  if (patch.evaluationReport !== undefined) dbPatch.evaluation_report = patch.evaluationReport;
  if (patch.repairHistory !== undefined) dbPatch.repair_history = patch.repairHistory;
  if (patch.verifiedEntities !== undefined) dbPatch.verified_entities = patch.verifiedEntities;
  if (patch.timelineState !== undefined) dbPatch.timeline_state = patch.timelineState;
  if (patch.narrativeState !== undefined) dbPatch.narrative_state = patch.narrativeState;
  if (patch.uiProjection !== undefined) dbPatch.ui_projection = patch.uiProjection;
  if (patch.checkpointCursor !== undefined) dbPatch.checkpoint_cursor = patch.checkpointCursor;
  if (patch.warnings !== undefined) dbPatch.warnings = patch.warnings;
  if (patch.inputHash !== undefined) dbPatch.input_hash = patch.inputHash;
  if (patch.rubricVersion !== undefined) dbPatch.rubric_version = patch.rubricVersion;

  return dbPatch;
}

export async function updateRun(
  id: string,
  patch: RunPatch,
): Promise<void> {
  const client = getClient();
  const dbPatch = buildRunDbPatch(patch);

  const { error } = await client
    .from('runs')
    .update(dbPatch)
    .eq('id', id);

  if (error) {
    throw new Error(`Failed to update run ${id}: ${error.message}`);
  }
}

export async function persistRunSession(
  id: string,
  currentState: SessionState,
  newState: SessionState,
  patch: RunPatch = {},
): Promise<PlanGenerationSession> {
  if (currentState !== newState) {
    assertTransition(currentState, newState);
  }

  const client = getClient();
  const dbPatch = buildRunDbPatch(patch);

  if (currentState !== newState) {
    dbPatch.state = newState;
  }

  const { data, error } = await client
    .from('runs')
    .update(dbPatch)
    .eq('id', id)
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(`Failed to persist run ${id}: ${error?.message ?? 'no data'}`);
  }

  return rowToRun(data);
}

export async function transitionRunState(
  id: string,
  currentState: SessionState,
  newState: SessionState,
): Promise<void> {
  assertTransition(currentState, newState);

  const client = getClient();
  const { error } = await client
    .from('runs')
    .update({
      state: newState,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    throw new Error(`Failed to transition run ${id} to ${newState}: ${error.message}`);
  }
}

export async function appendRunPass(
  runId: string,
  run: PassRunRecord,
): Promise<void> {
  const client = getClient();
  const { error } = await client
    .from('run_pass_runs')
    .insert({
      run_id: runId,
      pass_id: run.passId,
      attempt: run.attempt,
      outcome: run.outcome,
      duration_ms: run.durationMs,
      checkpoint_cursor: run.checkpointCursor ?? null,
      metadata: run.metadata ?? null,
      started_at: run.startedAt,
      completed_at: run.completedAt,
    });

  if (error) {
    throw new Error(`Failed to log pass run for run ${runId}: ${error.message}`);
  }
}

export async function countRunPasses(
  runId: string,
  passId: string,
): Promise<number> {
  const client = getClient();
  const { count, error } = await client
    .from('run_pass_runs')
    .select('*', { count: 'exact', head: true })
    .eq('run_id', runId)
    .eq('pass_id', passId);

  if (error) {
    console.error(`[run-store] countRunPasses failed: ${error.message}`);
    return 0;
  }

  return count ?? 0;
}

const RUN_TTL_DAYS = 7;

export async function cleanupExpiredRuns(
  ttlDays: number = RUN_TTL_DAYS,
): Promise<number> {
  const client = getClient();
  const cutoff = new Date(Date.now() - ttlDays * 24 * 60 * 60 * 1000).toISOString();

  const { data: runs, error: selectError } = await client
    .from('runs')
    .select('id')
    .in('state', ['completed', 'failed', 'cancelled'] satisfies SessionState[])
    .lt('updated_at', cutoff);

  if (selectError || !runs) {
    console.error('[run-store] cleanup select failed:', selectError?.message);
    return 0;
  }

  if (runs.length === 0) return 0;

  const ids = runs.map((row) => row.id as string);
  await client.from('run_checkpoints').delete().in('run_id', ids);
  await client.from('run_pass_runs').delete().in('run_id', ids);

  const { error: deleteError, count } = await client
    .from('runs')
    .delete({ count: 'exact' })
    .in('id', ids);

  if (deleteError) {
    console.error('[run-store] cleanup delete failed:', deleteError.message);
    return 0;
  }

  return count ?? 0;
}

export async function saveRunCheckpoint(
  runId: string,
  passId: PassId,
  cursor: string,
  snapshot: unknown,
): Promise<void> {
  const client = getClient();
  const { error } = await client
    .from('run_checkpoints')
    .insert({
      run_id: runId,
      pass_id: passId,
      cursor,
      snapshot,
    });

  if (error) {
    throw new Error(`Failed to save checkpoint for run ${runId}: ${error.message}`);
  }
}
