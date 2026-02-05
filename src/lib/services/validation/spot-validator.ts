/**
 * スポット検証サービス
 * Phase 3: Google Places API 連携による検証
 */

import { GooglePlacesService } from '@/lib/services/google/places';
import type { PlaceValidationResult, PlacePhoto } from '@/types/places';

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
  /** 写真（詳細情報付き） */
  photoDetails?: PlacePhoto[];
  /** 電話番号 */
  phoneNumber?: string;
  /** ウェブサイト */
  website?: string;
  /** 価格帯（1-4） */
  priceLevel?: number;
  /** 口コミ数 */
  reviewCount?: number;
  /** 緯度 */
  latitude?: number;
  /** 経度 */
  longitude?: number;
  /** Google Maps URL */
  googleMapsUrl?: string;
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
  /** Places API を使用するか（falseの場合スタブモード） */
  usePlacesApi?: boolean;
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
 * Google Places API を使用してスポットを検証
 */
export class SpotValidator {
  private cache: Map<string, ValidationResult>;
  private options: Required<ValidationOptions>;
  private placesService: GooglePlacesService | null = null;

  constructor(options: ValidationOptions = {}) {
    this.cache = new Map();
    this.options = {
      skipValidation: options.skipValidation ?? false,
      minConfidence: options.minConfidence ?? 'unverified',
      useCache: options.useCache ?? true,
      timeout: options.timeout ?? 10000,
      usePlacesApi: options.usePlacesApi ?? this.isPlacesApiAvailable(),
    };

    // Places API が利用可能な場合、サービスを初期化
    if (this.options.usePlacesApi) {
      try {
        this.placesService = new GooglePlacesService(undefined, {
          timeout: this.options.timeout,
        });
      } catch {
        console.warn('Google Places API not available, falling back to stub mode');
        this.options.usePlacesApi = false;
      }
    }
  }

  /**
   * Places API が利用可能かチェック
   */
  private isPlacesApiAvailable(): boolean {
    return !!process.env.GOOGLE_MAPS_API_KEY;
  }

  /**
   * 単一スポットを検証
   */
  async validateSpot(
    spotName: string,
    location?: string
  ): Promise<ValidationResult> {
    // キャッシュチェック
    const cacheKey = this.getCacheKey(spotName, location);
    if (this.options.useCache && this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    // 検証スキップの場合
    if (this.options.skipValidation) {
      const result = this.createUnverifiedResult(spotName);
      if (this.options.useCache) {
        this.cache.set(cacheKey, result);
      }
      return result;
    }

    // Places API を使用する場合
    if (this.options.usePlacesApi && this.placesService) {
      try {
        const placeValidation = await this.placesService.validateSpot(
          spotName,
          location
        );
        const result = this.mapPlaceValidationToResult(placeValidation);

        // キャッシュに保存
        if (this.options.useCache) {
          this.cache.set(cacheKey, result);
        }

        return result;
      } catch (error) {
        console.error('Places API validation error:', error);
        // エラー時はスタブモードにフォールバック
        const result = this.createUnverifiedResult(spotName);
        if (this.options.useCache) {
          this.cache.set(cacheKey, result);
        }
        return result;
      }
    }

    // スタブモード（API未設定時）
    const result = this.createUnverifiedResult(spotName);
    if (this.options.useCache) {
      this.cache.set(cacheKey, result);
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
        // 処理が成功したらsuccessCount（検証済みかどうかは関係なく）
        successCount++;
      } catch {
        failureCount++;
        const fallbackResult = this.createUnverifiedResult(spot.name);
        results.set(spot.name, fallbackResult);
        if (this.options.useCache) {
          const cacheKey = this.getCacheKey(spot.name, spot.location);
          this.cache.set(cacheKey, fallbackResult);
        }
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

  // ============================================
  // Private Methods
  // ============================================

  private getCacheKey(spotName: string, location?: string): string {
    const normalized = spotName.toLowerCase().trim();
    return location
      ? `${normalized}__${location.toLowerCase().trim()}`
      : normalized;
  }

  private createUnverifiedResult(spotName: string): ValidationResult {
    return {
      spotName,
      isVerified: false,
      confidence: 'unverified',
      source: 'ai_generated',
    };
  }

  private mapPlaceValidationToResult(
    placeValidation: PlaceValidationResult
  ): ValidationResult {
    return {
      spotName: placeValidation.spotName,
      isVerified: placeValidation.isVerified,
      confidence: placeValidation.confidence,
      source: placeValidation.source,
      placeId: placeValidation.placeId,
      details: placeValidation.details
        ? {
            address: placeValidation.details.address,
            rating: placeValidation.details.rating,
            openingHours: placeValidation.details.openingHours,
            photos: placeValidation.details.photos?.map((p) => p.url || '').filter(Boolean),
            photoDetails: placeValidation.details.photos,
            reviewCount: placeValidation.details.reviewCount,
            latitude: placeValidation.details.latitude,
            longitude: placeValidation.details.longitude,
            googleMapsUrl: placeValidation.details.googleMapsUrl,
          }
        : undefined,
    };
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
