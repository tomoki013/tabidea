/**
 * Performance Timer Utility
 *
 * 各処理ステップの実行時間を計測し、構造化されたログとして出力する。
 * サーバーアクション・AIサービス層で統一的に使用する。
 *
 * @example
 * ```ts
 * const timer = createPerformanceTimer('generatePlanOutline');
 * timer.start('rag_search');
 * const articles = await scraper.search(query);
 * timer.end('rag_search');
 *
 * timer.start('ai_generation');
 * const outline = await ai.generateOutline(prompt, context);
 * timer.end('ai_generation');
 *
 * const report = timer.getReport();
 * timer.log(); // コンソールに構造化ログを出力
 * ```
 */

// ============================================
// Types
// ============================================

export interface StepTiming {
  /** ステップ名 */
  name: string;
  /** 開始時刻 (ms) */
  startedAt: number;
  /** 終了時刻 (ms) */
  endedAt: number;
  /** 所要時間 (ms) */
  duration: number;
}

export interface PerformanceReport {
  /** 操作名 */
  operation: string;
  /** 全体の所要時間 (ms) */
  totalDuration: number;
  /** 各ステップの所要時間 */
  steps: StepTiming[];
  /** 目標時間との比較 */
  targets: TargetComparison[];
  /** タイムスタンプ (ISO) */
  timestamp: string;
}

export interface TargetComparison {
  /** ステップ名 */
  step: string;
  /** 実測値 (ms) */
  actual: number;
  /** 目標値 (ms) */
  target: number;
  /** 目標達成 */
  met: boolean;
  /** 超過率 (%) — 正なら超過、負なら余裕 */
  overagePercent: number;
}

export interface PerformanceTargets {
  [stepName: string]: number;
}

// ============================================
// Default Targets (ms)
// ============================================

/**
 * プラン概要生成の目標時間 (Flash モデル)
 */
export const OUTLINE_TARGETS_FLASH: PerformanceTargets = {
  usage_check: 500,
  cache_check: 300,
  rag_search: 2_000,
  prompt_build: 100,
  ai_generation: 15_000,
  hero_image: 2_000,
  cache_save: 500,
  total: 20_000,
};

/**
 * プラン概要生成の目標時間 (Pro モデル)
 */
export const OUTLINE_TARGETS_PRO: PerformanceTargets = {
  usage_check: 500,
  cache_check: 300,
  rag_search: 2_000,
  prompt_build: 100,
  ai_generation: 30_000,
  hero_image: 2_000,
  cache_save: 500,
  total: 35_000,
};

/** @deprecated Use OUTLINE_TARGETS_FLASH instead */
export const OUTLINE_TARGETS: PerformanceTargets = OUTLINE_TARGETS_FLASH;

/**
 * プラン詳細チャンク生成の目標時間 (Flash モデル)
 */
export const CHUNK_TARGETS_FLASH: PerformanceTargets = {
  prompt_build: 100,
  ai_generation: 20_000,
  total: 22_000,
};

/**
 * プラン詳細チャンク生成の目標時間 (Pro モデル)
 */
export const CHUNK_TARGETS_PRO: PerformanceTargets = {
  prompt_build: 100,
  ai_generation: 35_000,
  total: 37_000,
};

/** @deprecated Use CHUNK_TARGETS_FLASH instead */
export const CHUNK_TARGETS: PerformanceTargets = CHUNK_TARGETS_FLASH;

/**
 * リプラン処理の目標時間 (3秒以内完了必須)
 */
export const REPLAN_TARGETS: PerformanceTargets = {
  find_slots: 100,
  ai_generation: 2_000,
  scoring: 500,
  total: 3_000,
};

// ============================================
// PerformanceTimer class
// ============================================

export class PerformanceTimer {
  private operation: string;
  private globalStart: number;
  private steps: Map<string, { startedAt: number; endedAt?: number }> = new Map();
  private completedSteps: StepTiming[] = [];
  private targets: PerformanceTargets;

  constructor(operation: string, targets: PerformanceTargets = {}) {
    this.operation = operation;
    this.globalStart = Date.now();
    this.targets = targets;
  }

  /**
   * 目標時間を差し替える（モデル確定後に呼び出す）
   */
  setTargets(targets: PerformanceTargets): void {
    this.targets = targets;
  }

  /**
   * ステップの計測を開始
   */
  start(stepName: string): void {
    this.steps.set(stepName, { startedAt: Date.now() });
  }

  /**
   * ステップの計測を終了
   */
  end(stepName: string): number {
    const step = this.steps.get(stepName);
    if (!step) {
      console.warn(`[perf] Step "${stepName}" was not started`);
      return 0;
    }

    const endedAt = Date.now();
    const duration = endedAt - step.startedAt;

    this.completedSteps.push({
      name: stepName,
      startedAt: step.startedAt,
      endedAt,
      duration,
    });

    this.steps.delete(stepName);
    return duration;
  }

  /**
   * ステップを計測しつつ非同期処理を実行
   */
  async measure<T>(stepName: string, fn: () => Promise<T>): Promise<T> {
    this.start(stepName);
    try {
      const result = await fn();
      this.end(stepName);
      return result;
    } catch (error) {
      this.end(stepName);
      throw error;
    }
  }

  /**
   * 全体の所要時間を取得
   */
  getTotalDuration(): number {
    return Date.now() - this.globalStart;
  }

  /**
   * 目標時間との比較を生成
   */
  private getTargetComparisons(): TargetComparison[] {
    const comparisons: TargetComparison[] = [];

    for (const step of this.completedSteps) {
      const target = this.targets[step.name];
      if (target !== undefined) {
        comparisons.push({
          step: step.name,
          actual: step.duration,
          target,
          met: step.duration <= target,
          overagePercent: Math.round(((step.duration - target) / target) * 100),
        });
      }
    }

    // Total target
    if (this.targets.total !== undefined) {
      const totalDuration = this.getTotalDuration();
      comparisons.push({
        step: 'total',
        actual: totalDuration,
        target: this.targets.total,
        met: totalDuration <= this.targets.total,
        overagePercent: Math.round(((totalDuration - this.targets.total) / this.targets.total) * 100),
      });
    }

    return comparisons;
  }

  /**
   * パフォーマンスレポートを生成
   */
  getReport(): PerformanceReport {
    return {
      operation: this.operation,
      totalDuration: this.getTotalDuration(),
      steps: [...this.completedSteps],
      targets: this.getTargetComparisons(),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 構造化ログをコンソールに出力
   */
  log(): void {
    const report = this.getReport();
    const lines: string[] = [
      `[perf] ━━━ ${report.operation} ━━━`,
      `[perf] Total: ${report.totalDuration}ms`,
    ];

    for (const step of report.steps) {
      const target = this.targets[step.name];
      const marker = target
        ? step.duration <= target
          ? '✓'
          : '✗'
        : '•';
      const targetStr = target ? ` (target: ${target}ms)` : '';
      lines.push(`[perf]   ${marker} ${step.name}: ${step.duration}ms${targetStr}`);
    }

    // Summary
    const failed = report.targets.filter((t) => !t.met);
    if (failed.length > 0) {
      lines.push(`[perf] ⚠ ${failed.length} target(s) exceeded:`);
      for (const f of failed) {
        lines.push(`[perf]     ${f.step}: ${f.actual}ms > ${f.target}ms (+${f.overagePercent}%)`);
      }
    } else if (report.targets.length > 0) {
      lines.push(`[perf] ✓ All targets met`);
    }

    lines.push(`[perf] ━━━━━━━━━━━━━━━━━━━━━━━━`);

    console.log(lines.join('\n'));
  }
}

// ============================================
// Factory functions
// ============================================

export type ModelTier = 'flash' | 'pro';

/**
 * アウトライン生成用タイマーを作成
 */
export function createOutlineTimer(modelTier?: ModelTier): PerformanceTimer {
  const targets = modelTier === 'pro' ? OUTLINE_TARGETS_PRO : OUTLINE_TARGETS_FLASH;
  return new PerformanceTimer('generatePlanOutline', targets);
}

/**
 * チャンク生成用タイマーを作成
 */
export function createChunkTimer(startDay: number, endDay: number, modelTier?: ModelTier): PerformanceTimer {
  const targets = modelTier === 'pro' ? CHUNK_TARGETS_PRO : CHUNK_TARGETS_FLASH;
  return new PerformanceTimer(`generatePlanChunk(${startDay}-${endDay})`, targets);
}

/**
 * リプラン用タイマーを作成
 */
export function createReplanTimer(): PerformanceTimer {
  return new PerformanceTimer('replan', REPLAN_TARGETS);
}

/**
 * 汎用タイマーを作成
 */
export function createPerformanceTimer(
  operation: string,
  targets: PerformanceTargets = {}
): PerformanceTimer {
  return new PerformanceTimer(operation, targets);
}
