/**
 * 信頼性スコア計算ユーティリティ
 * 情報源の信頼性を評価
 */

import {
  SourceType,
  TravelInfoSource,
  TravelInfoCategory,
} from '@/types';

import {
  IReliabilityScorer,
  ReliabilityFactors,
} from '../interfaces';

import { CACHE_TTL_CONFIG } from '../cache/cache-config';

// ============================================
// 信頼性レベル定義
// ============================================

/**
 * 信頼性レベル
 */
export type ReliabilityLevel = 'high' | 'medium' | 'low' | 'uncertain';

/**
 * 信頼性レベルの表示情報
 */
export interface ReliabilityDisplay {
  label: string;
  color: 'green' | 'yellow' | 'orange' | 'red';
  icon: 'CheckCircle' | 'AlertCircle' | 'AlertTriangle' | 'HelpCircle';
  description: string;
}

/**
 * 信頼性レベル別の表示情報
 */
export const RELIABILITY_DISPLAY: Record<ReliabilityLevel, ReliabilityDisplay> = {
  high: {
    label: '信頼性: 高',
    color: 'green',
    icon: 'CheckCircle',
    description: '公式情報源から取得',
  },
  medium: {
    label: '信頼性: 中',
    color: 'yellow',
    icon: 'AlertCircle',
    description: '複数の情報源で確認済み',
  },
  low: {
    label: '信頼性: 低',
    color: 'orange',
    icon: 'AlertTriangle',
    description: '参考情報としてご利用ください',
  },
  uncertain: {
    label: '要確認',
    color: 'red',
    icon: 'HelpCircle',
    description: '公式情報での確認を推奨',
  },
};

// ============================================
// ソースタイプ別スコア設定
// ============================================

/**
 * ソースタイプごとの基本信頼性スコア
 */
export const BASE_RELIABILITY_SCORES: Record<SourceType, number> = {
  official_api: 95,  // 公的機関API（外務省等）
  web_search: 60,    // 一般Web検索結果
  ai_generated: 50,  // AI生成（検証なし）
  blog: 40,          // 個人ブログ
};

/**
 * 拡張ソースタイプ（将来の拡張用）
 */
export type ExtendedSourceType =
  | SourceType
  | 'official_web'    // 公的機関Webサイト
  | 'commercial'      // 商用サービス（航空会社等）
  | 'news'            // ニュースメディア
  | 'unknown';        // ソース不明

/**
 * 拡張ソースタイプの基本スコア
 */
export const EXTENDED_BASE_SCORES: Record<ExtendedSourceType, number> = {
  official_api: 95,
  official_web: 90,
  commercial: 75,
  news: 70,
  web_search: 60,
  ai_generated: 50,
  blog: 40,
  unknown: 30,
};

// ============================================
// スコア調整定数
// ============================================

/**
 * 最低信頼性スコア
 */
const MIN_RELIABILITY_SCORE = 10;

/**
 * 最高信頼性スコア
 */
const MAX_RELIABILITY_SCORE = 100;

/**
 * 信頼性レベルの閾値
 */
export const RELIABILITY_THRESHOLDS = {
  high: 80,       // 80以上: 高信頼性
  medium: 60,     // 60以上: 中信頼性
  low: 40,        // 40以上: 低信頼性
  uncertain: 0,   // 40未満: 要確認
};

// ============================================
// 拡張信頼性要因
// ============================================

/**
 * 拡張信頼性要因
 */
export interface ExtendedReliabilityFactors extends ReliabilityFactors {
  /** 情報の新しさ（0-1） */
  freshness?: number;
  /** ソースの評判（0-1） */
  sourceReputation?: number;
  /** 他ソースとの一致度（0-1） */
  crossValidation?: number;
  /** 情報の完全性（0-1） */
  completeness?: number;
}

// ============================================
// ReliabilityScorer クラス
// ============================================

/**
 * 信頼性スコア計算クラス
 */
export class ReliabilityScorer implements IReliabilityScorer {
  /**
   * ソースの信頼性スコアを計算
   */
  calculateScore(
    source: Pick<TravelInfoSource, 'sourceType' | 'retrievedAt'>,
    factors?: ExtendedReliabilityFactors
  ): number {
    // 基本スコアを取得
    let score = BASE_RELIABILITY_SCORES[source.sourceType];

    // 鮮度による調整
    if (factors?.freshness !== undefined) {
      score = this.applyFreshness(score, factors.freshness);
    } else if (factors?.ageInHours !== undefined) {
      score = this.applyAgeDecay(score, factors.ageInHours);
    } else {
      // retrievedAtから鮮度を計算
      const ageInHours = this.calculateAgeInHours(source.retrievedAt);
      score = this.applyAgeDecay(score, ageInHours);
    }

    // ソース評判による調整
    if (factors?.sourceReputation !== undefined) {
      score = this.applySourceReputation(score, factors.sourceReputation);
    }

    // クロスバリデーションによる調整
    if (factors?.crossValidation !== undefined) {
      score = this.applyCrossValidation(score, factors.crossValidation);
    }

    // 完全性による調整
    if (factors?.completeness !== undefined) {
      score = this.applyCompleteness(score, factors.completeness);
    }

    // 過去の精度による調整（後方互換）
    if (factors?.historicalAccuracy !== undefined) {
      score = this.applyHistoricalAccuracy(score, factors.historicalAccuracy);
    }

    // 一致度による調整（後方互換）
    if (factors?.corroborationScore !== undefined) {
      score = this.applyCorroboration(score, factors.corroborationScore);
    }

    return this.clampScore(score);
  }

  /**
   * 複数ソースの集約信頼性スコアを計算
   */
  calculateAggregateScore(sources: TravelInfoSource[]): number {
    if (sources.length === 0) {
      return 0;
    }

    // 重み付き平均を計算（信頼性が高いソースの重みを大きく）
    let totalWeight = 0;
    let weightedSum = 0;

    for (const source of sources) {
      const score = this.calculateScore(source);
      const weight = score / 50; // スコアに応じた重み
      weightedSum += score * weight;
      totalWeight += weight;
    }

    return Math.round(weightedSum / totalWeight);
  }

  /**
   * ソースを信頼性スコア順にランク付け
   */
  rankSources(sources: TravelInfoSource[]): TravelInfoSource[] {
    return [...sources].sort((a, b) => {
      const scoreA = this.calculateScore(a);
      const scoreB = this.calculateScore(b);
      return scoreB - scoreA; // 降順
    });
  }

  /**
   * 信頼性レベルを取得
   */
  getReliabilityLevel(score: number): ReliabilityLevel {
    if (score >= RELIABILITY_THRESHOLDS.high) {
      return 'high';
    } else if (score >= RELIABILITY_THRESHOLDS.medium) {
      return 'medium';
    } else if (score >= RELIABILITY_THRESHOLDS.low) {
      return 'low';
    }
    return 'uncertain';
  }

  /**
   * 信頼性の表示情報を取得
   */
  getReliabilityDisplay(score: number): ReliabilityDisplay {
    const level = this.getReliabilityLevel(score);
    return RELIABILITY_DISPLAY[level];
  }

  // ============================================
  // カテゴリ別の鮮度計算
  // ============================================

  /**
   * カテゴリに応じた鮮度を計算
   * @param retrievedAt 取得日時
   * @param category カテゴリ
   * @returns 鮮度スコア（0-1）
   */
  calculateFreshness(retrievedAt: Date, category: TravelInfoCategory): number {
    const age = Date.now() - retrievedAt.getTime();
    const maxAge = CACHE_TTL_CONFIG[category];

    // 新しいほど高スコア
    return Math.max(0, 1 - age / maxAge);
  }

  // ============================================
  // プライベートメソッド
  // ============================================

  /**
   * 鮮度による調整を適用（0-1スケール）
   */
  private applyFreshness(score: number, freshness: number): number {
    // 鮮度が低いほどペナルティ
    const penalty = (1 - freshness) * 20; // 最大-20
    return score - penalty;
  }

  /**
   * 経過時間による減衰を適用
   */
  private applyAgeDecay(score: number, ageInHours: number): number {
    // 1時間あたり1%減少
    const decay = ageInHours * 1;
    return score - decay;
  }

  /**
   * ソース評判による調整を適用
   */
  private applySourceReputation(score: number, reputation: number): number {
    // 評判（0-1）をスコアに反映
    // 0.5が基準、それより高いとボーナス、低いとペナルティ
    const adjustment = (reputation - 0.5) * 20; // -10 to +10
    return score + adjustment;
  }

  /**
   * クロスバリデーションによる調整を適用
   */
  private applyCrossValidation(score: number, crossValidation: number): number {
    // 他ソースとの一致度（0-1）をスコアに反映
    const bonus = crossValidation * 15; // 最大+15
    return score + bonus;
  }

  /**
   * 完全性による調整を適用
   */
  private applyCompleteness(score: number, completeness: number): number {
    // 情報の完全性（0-1）をスコアに反映
    const adjustment = (completeness - 0.5) * 10; // -5 to +5
    return score + adjustment;
  }

  /**
   * 過去の精度による調整を適用
   */
  private applyHistoricalAccuracy(
    score: number,
    historicalAccuracy: number
  ): number {
    const adjustment = (historicalAccuracy - 0.5) * 20;
    return score + adjustment;
  }

  /**
   * 一致度による調整を適用
   */
  private applyCorroboration(
    score: number,
    corroborationScore: number
  ): number {
    const bonus = corroborationScore * 15;
    return score + bonus;
  }

  /**
   * 取得時刻からの経過時間を計算
   */
  private calculateAgeInHours(retrievedAt: Date): number {
    const now = new Date();
    const diffMs = now.getTime() - retrievedAt.getTime();
    return diffMs / (1000 * 60 * 60);
  }

  /**
   * スコアを有効範囲内に収める
   */
  private clampScore(score: number): number {
    return Math.max(
      MIN_RELIABILITY_SCORE,
      Math.min(MAX_RELIABILITY_SCORE, Math.round(score))
    );
  }

  // ============================================
  // 後方互換メソッド
  // ============================================

  /**
   * 複数ソースの平均信頼性スコアを計算
   * @deprecated calculateAggregateScore を使用してください
   */
  calculateAverageScore(sources: TravelInfoSource[]): number {
    if (sources.length === 0) {
      return 0;
    }

    const total = sources.reduce((sum, source) => {
      return sum + this.calculateScore(source);
    }, 0);

    return Math.round(total / sources.length);
  }

  /**
   * ソースを信頼性スコア順にソート
   * @deprecated rankSources を使用してください
   */
  sortByReliability(sources: TravelInfoSource[]): TravelInfoSource[] {
    return this.rankSources(sources);
  }
}

// ============================================
// クロスバリデーション計算
// ============================================

/**
 * クロスバリデーションスコアを計算
 * 複数ソースから取得した値の一致度を計算
 *
 * @param values 各ソースから取得した値の配列
 * @returns 一致度（0-1）
 */
export function calculateCrossValidation<T>(
  values: T[],
  equalityFn?: (a: T, b: T) => boolean
): number {
  if (values.length <= 1) {
    return 0;
  }

  const equals = equalityFn ?? ((a, b) => JSON.stringify(a) === JSON.stringify(b));

  // 一致するペアの数をカウント
  let matchingPairs = 0;
  let totalPairs = 0;

  for (let i = 0; i < values.length; i++) {
    for (let j = i + 1; j < values.length; j++) {
      totalPairs++;
      if (equals(values[i], values[j])) {
        matchingPairs++;
      }
    }
  }

  return totalPairs > 0 ? matchingPairs / totalPairs : 0;
}

/**
 * 特定フィールドでのクロスバリデーションを計算
 *
 * @param data オブジェクトの配列
 * @param fieldPath フィールドパス（例: "currency.code"）
 * @returns 一致度（0-1）
 */
export function calculateFieldCrossValidation<T extends object>(
  data: T[],
  fieldPath: string
): number {
  const values = data.map((item) => getNestedValue(item, fieldPath));
  return calculateCrossValidation(values);
}

/**
 * ネストされた値を取得
 */
function getNestedValue(obj: object, path: string): unknown {
  return path.split('.').reduce<unknown>((current, key) => {
    return current && typeof current === 'object' ? (current as Record<string, unknown>)[key] : undefined;
  }, obj);
}

// ============================================
// ファクトリ関数
// ============================================

/**
 * 信頼性スコア計算のファクトリ関数
 */
export function createReliabilityScorer(): ReliabilityScorer {
  return new ReliabilityScorer();
}

// ============================================
// シングルトン
// ============================================

let sharedScorer: ReliabilityScorer | null = null;

export function getSharedReliabilityScorer(): ReliabilityScorer {
  if (!sharedScorer) {
    sharedScorer = createReliabilityScorer();
  }
  return sharedScorer;
}

// ============================================
// 後方互換用関数
// ============================================

/**
 * 信頼性スコアの解釈
 * @deprecated getReliabilityDisplay を使用してください
 */
export function interpretReliabilityScore(score: number): {
  level: 'high' | 'medium' | 'low';
  label: string;
  description: string;
} {
  if (score >= 80) {
    return {
      level: 'high',
      label: '高信頼性',
      description: '公式情報源または十分に検証された情報です',
    };
  } else if (score >= 60) {
    return {
      level: 'medium',
      label: '中信頼性',
      description: '参考情報として利用できますが、公式情報の確認を推奨します',
    };
  } else {
    return {
      level: 'low',
      label: '低信頼性',
      description: 'AI生成または未検証の情報です。必ず公式情報を確認してください',
    };
  }
}
