/**
 * 信頼性スコア計算ユーティリティ
 * 情報ソースの信頼性を評価
 */

import {
  SourceType,
  TravelInfoSource,
} from '@/lib/types/travel-info';

import {
  IReliabilityScorer,
  ReliabilityFactors,
} from '../interfaces';

/**
 * ソースタイプごとの基本信頼性スコア
 */
const BASE_RELIABILITY_SCORES: Record<SourceType, number> = {
  official_api: 95, // 公式API（外務省等）
  web_search: 70, // Web検索結果
  ai_generated: 50, // AI生成
  blog: 60, // ブログ記事
};

/**
 * 情報の鮮度による減衰率
 * 時間が経つほど信頼性が下がる
 */
const FRESHNESS_DECAY_RATE = 0.01; // 1時間あたり1%減少

/**
 * 最低信頼性スコア
 */
const MIN_RELIABILITY_SCORE = 10;

/**
 * 最高信頼性スコア
 */
const MAX_RELIABILITY_SCORE = 100;

/**
 * 信頼性スコア計算クラス
 */
export class ReliabilityScorer implements IReliabilityScorer {
  /**
   * ソースの信頼性スコアを計算
   */
  calculateScore(
    source: Pick<TravelInfoSource, 'sourceType' | 'retrievedAt'>,
    factors?: ReliabilityFactors
  ): number {
    // 基本スコアを取得
    let score = BASE_RELIABILITY_SCORES[source.sourceType];

    // 情報の鮮度による調整
    if (factors?.ageInHours !== undefined) {
      score = this.applyFreshnessDecay(score, factors.ageInHours);
    } else {
      // retrievedAtから鮮度を計算
      const ageInHours = this.calculateAgeInHours(source.retrievedAt);
      score = this.applyFreshnessDecay(score, ageInHours);
    }

    // 過去の精度による調整
    if (factors?.historicalAccuracy !== undefined) {
      score = this.applyHistoricalAccuracy(score, factors.historicalAccuracy);
    }

    // 複数ソースとの一致度による調整
    if (factors?.corroborationScore !== undefined) {
      score = this.applyCorroboration(score, factors.corroborationScore);
    }

    // スコアを範囲内に収める
    return this.clampScore(score);
  }

  /**
   * 鮮度による減衰を適用
   */
  private applyFreshnessDecay(score: number, ageInHours: number): number {
    // カテゴリによって減衰率を調整することも可能
    // 例: 天気情報は早く古くなる、ビザ情報は比較的長く有効

    const decay = ageInHours * FRESHNESS_DECAY_RATE * 100;
    return score - decay;
  }

  /**
   * 過去の精度による調整を適用
   */
  private applyHistoricalAccuracy(
    score: number,
    historicalAccuracy: number
  ): number {
    // 過去の精度（0-1）をスコアに反映
    // 精度が高いほどボーナス、低いほどペナルティ
    const adjustment = (historicalAccuracy - 0.5) * 20; // -10 to +10
    return score + adjustment;
  }

  /**
   * 複数ソースとの一致度による調整を適用
   */
  private applyCorroboration(
    score: number,
    corroborationScore: number
  ): number {
    // 他のソースとの一致度（0-1）をスコアに反映
    // 一致度が高いほど信頼性が上がる
    const bonus = corroborationScore * 15; // 最大+15
    return score + bonus;
  }

  /**
   * 取得時刻からの経過時間を計算
   */
  private calculateAgeInHours(retrievedAt: Date): number {
    const now = new Date();
    const diffMs = now.getTime() - retrievedAt.getTime();
    return diffMs / (1000 * 60 * 60); // ミリ秒を時間に変換
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

  /**
   * 複数ソースの平均信頼性スコアを計算
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
   */
  sortByReliability(sources: TravelInfoSource[]): TravelInfoSource[] {
    return [...sources].sort((a, b) => {
      const scoreA = this.calculateScore(a);
      const scoreB = this.calculateScore(b);
      return scoreB - scoreA; // 降順
    });
  }
}

/**
 * 信頼性スコア計算のファクトリ関数
 */
export function createReliabilityScorer(): IReliabilityScorer {
  return new ReliabilityScorer();
}

/**
 * シングルトンインスタンス
 */
let sharedScorer: IReliabilityScorer | null = null;

export function getSharedReliabilityScorer(): IReliabilityScorer {
  if (!sharedScorer) {
    sharedScorer = createReliabilityScorer();
  }
  return sharedScorer;
}

/**
 * 信頼性スコアの解釈
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
