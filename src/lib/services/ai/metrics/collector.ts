/**
 * Metrics Collector
 * AI生成品質のKPIを収集し、Supabaseに非同期保存
 */

import type { GenerationMetrics, StepTimingRecord } from './types';
import { PROMPT_VERSION } from '../prompt-builder';
import type { PerformanceReport } from '@/lib/utils/performance-timer';

export class MetricsCollector {
  private metrics: Partial<GenerationMetrics> = {};
  private startTime: number = 0;

  /**
   * 生成開始時に呼び出し
   */
  startGeneration(destination: string, durationDays: number, modelName?: string): void {
    this.startTime = Date.now();
    this.metrics = {
      generationId: this.generateId(),
      timestamp: new Date(),
      destination,
      durationDays,
      modelName: modelName || 'unknown',
      promptVersion: PROMPT_VERSION,
    };
  }

  /**
   * アウトライン生成時間を記録
   */
  recordOutlineTime(ms: number): void {
    this.metrics.outlineGenerationTime = ms;
  }

  /**
   * 詳細生成時間を記録
   */
  recordDetailTime(ms: number): void {
    this.metrics.detailGenerationTime = ms;
  }

  /**
   * 検証結果を記録
   */
  recordValidation(passRate: number, correctionCount: number): void {
    this.metrics.validationPassRate = passRate;
    this.metrics.selfCorrectionCount = correctionCount;
  }

  /**
   * Citation率を記録
   */
  recordCitations(totalActivities: number, citedActivities: number): void {
    this.metrics.citationRate = totalActivities > 0 ? citedActivities / totalActivities : 0;
  }

  /**
   * RAG使用記事数を記録
   */
  recordRagArticles(count: number): void {
    this.metrics.ragArticlesUsed = count;
  }

  /**
   * PerformanceTimerのレポートからステップタイミングを記録
   */
  recordStepTimings(report: PerformanceReport): void {
    this.metrics.stepTimings = report.steps.map((s) => ({
      name: s.name,
      duration: s.duration,
    }));
  }

  /**
   * 合計時間を計算して最終化
   */
  finalize(): GenerationMetrics | null {
    if (!this.metrics.generationId) return null;

    this.metrics.totalGenerationTime = Date.now() - this.startTime;

    return this.metrics as GenerationMetrics;
  }

  /**
   * Supabaseに保存（非同期・ベストエフォート）
   * 生成フローをブロックしない
   */
  async flush(): Promise<void> {
    const finalMetrics = this.finalize();
    if (!finalMetrics) return;

    try {
      // Dynamic import to avoid issues in non-Supabase environments
      const { createClient } = await import('@/lib/supabase/server');
      const supabase = await createClient();

      const { error } = await supabase.from('generation_metrics').insert({
        generation_id: finalMetrics.generationId,
        outline_time_ms: finalMetrics.outlineGenerationTime,
        detail_time_ms: finalMetrics.detailGenerationTime,
        total_time_ms: finalMetrics.totalGenerationTime,
        step_timings: finalMetrics.stepTimings ?? null,
        validation_pass_rate: finalMetrics.validationPassRate,
        self_correction_count: finalMetrics.selfCorrectionCount,
        citation_rate: finalMetrics.citationRate,
        rag_articles_used: finalMetrics.ragArticlesUsed,
        model_name: finalMetrics.modelName,
        destination: finalMetrics.destination,
        duration_days: finalMetrics.durationDays,
        prompt_version: finalMetrics.promptVersion,
      });

      if (error) {
        // Non-blocking: just log
        console.warn('[metrics] Failed to save metrics:', error.message);
      } else {
        console.log(`[metrics] Saved generation metrics: ${finalMetrics.generationId}`);
      }
    } catch (error) {
      // Non-blocking: table may not exist yet
      console.warn('[metrics] Metrics flush failed (non-blocking):', error);
    }
  }

  /**
   * 現在のメトリクスを取得（テスト用）
   */
  getMetrics(): Partial<GenerationMetrics> {
    return { ...this.metrics };
  }

  private generateId(): string {
    return `gen_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }
}
