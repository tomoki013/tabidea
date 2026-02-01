/**
 * スポット検証サービス
 * Phase 3 の Google Places API 連携に向けた基盤実装
 */

// ============================================
// Types
// ============================================

/**
 * 検証結果の信頼度
 */
export type ValidationConfidence = 'high' | 'medium' | 'low' | 'unverified';

/**
 * 検証情報のソース
 */
export type ValidationSource = 'google_places' | 'blog' | 'ai_generated';

/**
 * スポット検証結果
 */
export interface ValidationResult {
  /** スポット名 */
  spotName: string;
  /** 検証済みかどうか */
  isVerified: boolean;
  /** 信頼度 */
  confidence: ValidationConfidence;
  /** 情報源 */
  source?: ValidationSource;
  /** Google Place ID（Phase 3で設定） */
  placeId?: string;
  /** 詳細情報 */
  details?: SpotDetails;
}

/**
 * スポット詳細情報
 */
export interface SpotDetails {
  /** 住所 */
  address?: string;
  /** 評価（1-5） */
  rating?: number;
  /** 営業時間 */
  openingHours?: string[];
  /** 写真URL */
  photos?: string[];
  /** 電話番号 */
  phoneNumber?: string;
  /** ウェブサイト */
  website?: string;
  /** 価格帯（1-4） */
  priceLevel?: number;
  /** 口コミ数 */
  reviewCount?: number;
}

/**
 * 検証オプション
 */
export interface ValidationOptions {
  /** 検証をスキップするか */
  skipValidation?: boolean;
  /** 最低信頼度（これ未満は除外） */
  minConfidence?: ValidationConfidence;
  /** キャッシュを使用するか */
  useCache?: boolean;
  /** タイムアウト（ミリ秒） */
  timeout?: number;
}

/**
 * バッチ検証結果
 */
export interface BatchValidationResult {
  /** 検証結果マップ（スポット名 → 結果） */
  results: Map<string, ValidationResult>;
  /** 成功数 */
  successCount: number;
  /** 失敗数 */
  failureCount: number;
  /** 処理時間（ミリ秒） */
  processingTime: number;
}

// ============================================
// SpotValidator Class
// ============================================

/**
 * スポット検証サービス
 *
 * Phase 3 までのスタブ実装:
 * - すべてのスポットを confidence='unverified' として返す
 * - Phase 3 で Google Places API に差し替え予定
 */
export class SpotValidator {
  private cache: Map<string, ValidationResult>;
  private options: ValidationOptions;

  constructor(options: ValidationOptions = {}) {
    this.cache = new Map();
    this.options = {
      skipValidation: false,
      minConfidence: 'unverified',
      useCache: true,
      timeout: 5000,
      ...options,
    };
  }

  /**
   * 単一スポットを検証
   *
   * Phase 3 までのスタブ: unverified を返す
   */
  async validateSpot(
    spotName: string,
    _location?: string
  ): Promise<ValidationResult> {
    // キャッシュチェック
    if (this.options.useCache && this.cache.has(spotName)) {
      return this.cache.get(spotName)!;
    }

    // Phase 3 までのスタブ実装
    // すべてのスポットを unverified として返す
    const result: ValidationResult = {
      spotName,
      isVerified: false,
      confidence: 'unverified',
      source: 'ai_generated',
    };

    // キャッシュに保存
    if (this.options.useCache) {
      this.cache.set(spotName, result);
    }

    return result;
  }

  /**
   * 複数スポットを一括検証
   */
  async validateSpots(
    spots: Array<{ name: string; location?: string }>
  ): Promise<BatchValidationResult> {
    const startTime = Date.now();
    const results = new Map<string, ValidationResult>();
    let successCount = 0;
    let failureCount = 0;

    for (const spot of spots) {
      try {
        const result = await this.validateSpot(spot.name, spot.location);
        results.set(spot.name, result);
        successCount++;
      } catch {
        failureCount++;
        results.set(spot.name, {
          spotName: spot.name,
          isVerified: false,
          confidence: 'unverified',
          source: 'ai_generated',
        });
      }
    }

    return {
      results,
      successCount,
      failureCount,
      processingTime: Date.now() - startTime,
    };
  }

  /**
   * 旅程内のすべてのアクティビティを検証
   */
  async validateItinerarySpots(
    days: Array<{
      activities: Array<{ activity: string }>;
    }>,
    destination?: string
  ): Promise<Map<string, ValidationResult>> {
    const spots: Array<{ name: string; location?: string }> = [];

    for (const day of days) {
      for (const activity of day.activities) {
        spots.push({
          name: activity.activity,
          location: destination,
        });
      }
    }

    const batchResult = await this.validateSpots(spots);
    return batchResult.results;
  }

  /**
   * キャッシュをクリア
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * キャッシュサイズを取得
   */
  getCacheSize(): number {
    return this.cache.size;
  }
}

// ============================================
// Singleton Instance
// ============================================

let validatorInstance: SpotValidator | null = null;

/**
 * SpotValidator のシングルトンインスタンスを取得
 */
export function getSpotValidator(options?: ValidationOptions): SpotValidator {
  if (!validatorInstance) {
    validatorInstance = new SpotValidator(options);
  }
  return validatorInstance;
}

/**
 * テスト用: インスタンスをリセット
 */
export function resetSpotValidator(): void {
  validatorInstance = null;
}

// ============================================
// Utility Functions
// ============================================

/**
 * 信頼度を数値に変換（比較用）
 */
export function confidenceToNumber(confidence: ValidationConfidence): number {
  const map: Record<ValidationConfidence, number> = {
    high: 3,
    medium: 2,
    low: 1,
    unverified: 0,
  };
  return map[confidence];
}

/**
 * 信頼度が閾値以上かチェック
 */
export function meetsConfidenceThreshold(
  confidence: ValidationConfidence,
  threshold: ValidationConfidence
): boolean {
  return confidenceToNumber(confidence) >= confidenceToNumber(threshold);
}

/**
 * 検証結果から詳細を抽出（UI表示用）
 */
export function formatValidationSummary(result: ValidationResult): string {
  if (!result.isVerified) {
    return 'AI生成（未検証）';
  }

  const parts: string[] = [];

  if (result.details?.rating) {
    parts.push(`${result.details.rating.toFixed(1)}★`);
  }

  if (result.details?.reviewCount) {
    parts.push(`${result.details.reviewCount}件の口コミ`);
  }

  if (result.source === 'google_places') {
    parts.push('Google認証済み');
  }

  return parts.length > 0 ? parts.join(' | ') : '検証済み';
}
