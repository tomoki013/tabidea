/**
 * GenerationRunLogger
 * パイプライン実行の観測ログを compose_runs / compose_run_steps に記録
 * Supabase admin client (service role) 使用
 */

import { createServiceRoleClient } from '@/lib/supabase/admin';

export type StepStatus = 'success' | 'failure' | 'skipped' | 'fallback';

export interface RunLogInput {
  userId?: string;
  pipelineVersion: string;
  modelName?: string;
  modelTier?: string;
}

export interface StepLogInput {
  stepName: string;
  status: StepStatus;
  durationMs: number;
  metadata?: Record<string, unknown>;
}

export interface RunEndInput {
  success: boolean;
  totalDurationMs: number;
  candidateCount?: number;
  resolvedCount?: number;
  filteredCount?: number;
  droppedCount?: number;
  warningCount?: number;
  fallbackUsed?: boolean;
  errorMessage?: string;
  failedStep?: string;
  inputSnapshot?: unknown;
  semanticPlanSnapshot?: unknown;
  selectedStopsSnapshot?: unknown;
  finalItinerarySnapshot?: unknown;
}

/**
 * パイプライン実行のログを記録するロガー
 */
export class GenerationRunLogger {
  private runId: string;
  private supabase: ReturnType<typeof createServiceRoleClient> | null = null;

  constructor(runId: string) {
    this.runId = runId;
  }

  /**
   * 実行を開始し、compose_runs に INSERT
   */
  async startRun(input: RunLogInput): Promise<void> {
    try {
      this.supabase = createServiceRoleClient();
      await this.supabase.from('compose_runs').upsert({
        run_id: this.runId,
        user_id: input.userId || null,
        pipeline_version: input.pipelineVersion,
        model_name: input.modelName,
        model_tier: input.modelTier,
        status: 'running',
        started_at: new Date().toISOString(),
        last_heartbeat_at: new Date().toISOString(),
      }, {
        onConflict: 'run_id',
      });
    } catch (err) {
      // ログ記録失敗はパイプラインを止めない
      console.warn('[GenerationRunLogger] startRun failed:', err);
    }
  }

  /**
   * ステップの結果を記録
   */
  async logStep(input: StepLogInput): Promise<void> {
    if (!this.supabase) return;

    try {
      await this.supabase.from('compose_run_steps').insert({
        run_id: this.runId,
        step_name: input.stepName,
        status: input.status,
        duration_ms: input.durationMs,
        metadata: input.metadata || null,
      });
    } catch (err) {
      console.warn(`[GenerationRunLogger] logStep(${input.stepName}) failed:`, err);
    }
  }

  /**
   * 実行を終了し、compose_runs を UPDATE
   */
  async endRun(input: RunEndInput): Promise<void> {
    if (!this.supabase) return;

    try {
      await this.supabase
        .from('compose_runs')
        .update({
          status: input.success ? 'completed' : 'failed',
          total_duration_ms: input.totalDurationMs,
          candidate_count: input.candidateCount,
          resolved_count: input.resolvedCount,
          filtered_count: input.filteredCount,
          dropped_count: input.droppedCount,
          warning_count: input.warningCount,
          fallback_used: input.fallbackUsed,
          error_message: input.errorMessage,
          failed_step: input.failedStep,
          input_snapshot: input.inputSnapshot,
          semantic_plan_snapshot: input.semanticPlanSnapshot,
          selected_stops_snapshot: input.selectedStopsSnapshot,
          final_itinerary_snapshot: input.finalItinerarySnapshot,
          completed_at: new Date().toISOString(),
        })
        .eq('run_id', this.runId);
    } catch (err) {
      console.warn('[GenerationRunLogger] endRun failed:', err);
    }
  }
}
