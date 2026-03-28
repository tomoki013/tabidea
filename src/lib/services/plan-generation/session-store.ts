/**
 * Session Store
 * PlanGenerationSession の Supabase 永続化
 */

import { createServiceRoleClient } from '@/lib/supabase/admin';
import type {
  PlanGenerationSession,
  SessionState,
  PassId,
  PassRunRecord,
} from '@/types/plan-generation';
import { assertTransition } from './state-machine';
import { SessionNotFoundError } from './errors';

type SupabaseClient = ReturnType<typeof createServiceRoleClient>;

function getClient(): SupabaseClient {
  return createServiceRoleClient();
}

/** DB 行 → Session 変換 */
function rowToSession(row: Record<string, unknown>): PlanGenerationSession {
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
    draftPlan: row.draft_plan as PlanGenerationSession['draftPlan'],
    evaluationReport: row.evaluation_report as PlanGenerationSession['evaluationReport'],
    repairHistory: (row.repair_history as PlanGenerationSession['repairHistory']) ?? [],
    verifiedEntities: (row.verified_entities as PlanGenerationSession['verifiedEntities']) ?? [],
    timelineState: row.timeline_state as PlanGenerationSession['timelineState'],
    narrativeState: row.narrative_state as PlanGenerationSession['narrativeState'],
    uiProjection: row.ui_projection as PlanGenerationSession['uiProjection'],
    checkpointCursor: (row.checkpoint_cursor as string) ?? undefined,
    passRuns: [],  // pass runs are loaded separately if needed
    warnings: (row.warnings as string[]) ?? [],
    inputHash: (row.input_hash as string) ?? undefined,
    rubricVersion: (row.rubric_version as string) ?? undefined,
  };
}

/** 新規セッション作成 */
export async function createSession(userId?: string): Promise<PlanGenerationSession> {
  const client = getClient();
  const { data, error } = await client
    .from('generation_sessions')
    .insert({
      user_id: userId ?? null,
      state: 'created' satisfies SessionState,
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Failed to create session: ${error?.message ?? 'no data'}`);
  }

  return rowToSession(data);
}

/** セッション取得 */
export async function loadSession(id: string): Promise<PlanGenerationSession> {
  const client = getClient();
  const { data, error } = await client
    .from('generation_sessions')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    throw new SessionNotFoundError(id);
  }

  return rowToSession(data);
}

/** セッション部分更新 */
export async function updateSession(
  id: string,
  patch: Partial<Pick<
    PlanGenerationSession,
    | 'inputSnapshot'
    | 'pipelineContext'
    | 'normalizedInput'
    | 'generationProfile'
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
  >>,
): Promise<void> {
  const client = getClient();

  // camelCase → snake_case mapping
  const dbPatch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (patch.inputSnapshot !== undefined) dbPatch.input_snapshot = patch.inputSnapshot;
  if (patch.pipelineContext !== undefined) dbPatch.pipeline_context = patch.pipelineContext;
  if (patch.normalizedInput !== undefined) dbPatch.normalized_input = patch.normalizedInput;
  if (patch.generationProfile !== undefined) dbPatch.generation_profile = patch.generationProfile;
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

  const { error } = await client
    .from('generation_sessions')
    .update(dbPatch)
    .eq('id', id);

  if (error) {
    throw new Error(`Failed to update session ${id}: ${error.message}`);
  }
}

/** 状態遷移 (バリデーション付き) */
export async function transitionState(
  id: string,
  currentState: SessionState,
  newState: SessionState,
): Promise<void> {
  assertTransition(currentState, newState);

  const client = getClient();
  const { error } = await client
    .from('generation_sessions')
    .update({
      state: newState,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    throw new Error(`Failed to transition session ${id} to ${newState}: ${error.message}`);
  }
}

/** パス実行ログ追加 */
export async function appendPassRun(
  sessionId: string,
  run: PassRunRecord,
): Promise<void> {
  const client = getClient();
  const { error } = await client
    .from('generation_pass_runs')
    .insert({
      session_id: sessionId,
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
    throw new Error(`Failed to log pass run for session ${sessionId}: ${error.message}`);
  }
}

// ============================================
// Cleanup
// ============================================

/** セッション TTL (デフォルト 7 日) */
const SESSION_TTL_DAYS = 7;

/**
 * TTL を超過した古いセッションを削除する。
 * completed / failed / cancelled のみ対象 (進行中は除外)。
 * @returns 削除件数
 */
export async function cleanupExpiredSessions(
  ttlDays: number = SESSION_TTL_DAYS,
): Promise<number> {
  const client = getClient();
  const cutoff = new Date(Date.now() - ttlDays * 24 * 60 * 60 * 1000).toISOString();

  // まず対象セッションの ID を取得
  const { data: sessions, error: selectError } = await client
    .from('generation_sessions')
    .select('id')
    .in('state', ['completed', 'failed', 'cancelled'] satisfies SessionState[])
    .lt('updated_at', cutoff);

  if (selectError || !sessions) {
    console.error('[session-store] cleanup select failed:', selectError?.message);
    return 0;
  }

  if (sessions.length === 0) return 0;

  const ids = sessions.map(s => s.id as string);

  // 関連テーブルを先に削除 (FK 制約)
  await client.from('generation_checkpoints').delete().in('session_id', ids);
  await client.from('generation_pass_runs').delete().in('session_id', ids);

  const { error: deleteError, count } = await client
    .from('generation_sessions')
    .delete({ count: 'exact' })
    .in('id', ids);

  if (deleteError) {
    console.error('[session-store] cleanup delete failed:', deleteError.message);
    return 0;
  }

  console.log(`[session-store] cleaned up ${count ?? 0} expired sessions (cutoff: ${cutoff})`);
  return count ?? 0;
}

/** チェックポイント保存 */
export async function saveCheckpoint(
  sessionId: string,
  passId: PassId,
  cursor: string,
  snapshot: unknown,
): Promise<void> {
  const client = getClient();
  const { error } = await client
    .from('generation_checkpoints')
    .insert({
      session_id: sessionId,
      pass_id: passId,
      cursor,
      snapshot,
    });

  if (error) {
    throw new Error(`Failed to save checkpoint for session ${sessionId}: ${error.message}`);
  }
}
