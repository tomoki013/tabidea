/**
 * Google Places API 関連の型定義
 * Phase 3: 外部API連携
 */

// ============================================
// Google Places API Response Types
// ============================================

/**
 * 写真情報
 */
export interface PlacePhoto {
  /** 写真参照ID */
  photoReference: string;
  /** 幅 */
  width: number;
  /** 高さ */
  height: number;
  /** 帰属表示（必須） */
  attributions: string[];
  /** 写真URL（解決済み） */
  url?: string;
}

/**
 * 営業時間の詳細
 */
export interface PlaceOpeningHours {
  /** 現在営業中か */
  openNow?: boolean;
  /** 曜日ごとの営業時間テキスト */
  weekdayText?: string[];
  /** 各曜日の営業期間 */
  periods?: Array<{
    open: { day: number; time: string };
    close?: { day: number; time: string };
  }>;
}

/**
 * 場所の詳細情報
 */
export interface PlaceDetails {
  /** Google Place ID */
  placeId: string;
  /** 正式名称 */
  name: string;
  /** フォーマット済み住所 */
  formattedAddress: string;
  /** 緯度 */
  latitude: number;
  /** 経度 */
  longitude: number;
  /** 評価（1-5） */
  rating?: number;
  /** レビュー数 */
  userRatingsTotal?: number;
  /** 営業時間 */
  openingHours?: PlaceOpeningHours;
  /** 写真（最大3枚） */
  photos?: PlacePhoto[];
  /** 電話番号 */
  phoneNumber?: string;
  /** ウェブサイト */
  website?: string;
  /** 価格帯（1-4） */
  priceLevel?: number;
  /** Google Maps URL */
  googleMapsUrl: string;
  /** ビジネスステータス */
  businessStatus?: 'OPERATIONAL' | 'CLOSED_TEMPORARILY' | 'CLOSED_PERMANENTLY';
  /** 場所のタイプ */
  types?: string[];
}

// ============================================
// Search & Validation Types
// ============================================

/**
 * 検索クエリ
 */
export interface PlaceSearchQuery {
  /** スポット名 */
  query: string;
  /** 検索対象の近辺地域（目的地） */
  near?: string;
  /** 英語の場所名（国際スポット検索のフォールバック用、例: "Marrakech, Morocco"） */
  locationEn?: string;
  /** AI生成の検索用クエリ（優先使用） */
  searchQuery?: string;
  /** 検索タイプ */
  type?: PlaceSearchType;
  /** 言語 */
  language?: string;
}

/**
 * 検索タイプ
 */
export type PlaceSearchType =
  | 'tourist_attraction'
  | 'restaurant'
  | 'lodging'
  | 'point_of_interest'
  | 'establishment';

/**
 * 検索結果
 */
export interface PlaceSearchResult {
  /** 検索成功かどうか */
  found: boolean;
  /** マッチした場所の詳細 */
  place?: PlaceDetails;
  /** マッチ度（0-1） */
  matchScore?: number;
  /** 検索にかかった時間（ms） */
  searchTime: number;
  /** エラーメッセージ */
  error?: string;
}

/**
 * 検証結果（SpotValidatorと統合用）
 */
export interface PlaceValidationResult {
  /** スポット名（検索クエリ） */
  spotName: string;
  /** 検証済みかどうか */
  isVerified: boolean;
  /** 信頼度 */
  confidence: 'high' | 'medium' | 'low' | 'unverified';
  /** 情報源 */
  source: 'google_places';
  /** Google Place ID */
  placeId?: string;
  /** 詳細情報 */
  details?: {
    name: string;
    address: string;
    latitude: number;
    longitude: number;
    rating?: number;
    reviewCount?: number;
    openingHours?: string[];
    photos?: PlacePhoto[];
    googleMapsUrl: string;
  };
}

// ============================================
// Cache Types
// ============================================

/**
 * キャッシュエントリ
 */
export interface PlacesCacheEntry {
  /** キャッシュID */
  id: string;
  /** 検索クエリ（正規化済み） */
  queryKey: string;
  /** Place ID */
  placeId: string;
  /** キャッシュデータ */
  data: PlaceDetails;
  /** キャッシュ作成日時 */
  createdAt: Date;
  /** キャッシュ有効期限 */
  expiresAt: Date;
}

/**
 * キャッシュ設定
 */
export interface PlacesCacheConfig {
  /** キャッシュTTL（ミリ秒） - デフォルト7日 */
  ttlMs: number;
  /** 最大キャッシュエントリ数 */
  maxEntries?: number;
}

// ============================================
// API Request/Response Types
// ============================================

/**
 * Places Search API リクエスト
 */
export interface PlacesSearchRequest {
  /** 検索クエリ */
  q: string;
  /** 近辺地域 */
  near?: string;
  /** 検索タイプ */
  type?: PlaceSearchType;
}

/**
 * Places Search API レスポンス
 */
export interface PlacesSearchResponse {
  /** 成功かどうか */
  success: boolean;
  /** 検証結果 */
  validation?: PlaceValidationResult;
  /** エラーメッセージ */
  error?: string;
  /** キャッシュからの取得か */
  fromCache?: boolean;
}

// ============================================
// Error Types
// ============================================

/**
 * Places API エラーコード
 */
export type PlacesApiErrorCode =
  | 'INVALID_REQUEST'
  | 'ZERO_RESULTS'
  | 'OVER_QUERY_LIMIT'
  | 'REQUEST_DENIED'
  | 'INVALID_API_KEY'
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
  | 'UNKNOWN_ERROR';

/**
 * Places API エラー
 */
export class PlacesApiError extends Error {
  constructor(
    message: string,
    public readonly code: PlacesApiErrorCode,
    public readonly originalError?: unknown
  ) {
    super(message);
    this.name = 'PlacesApiError';
  }
}
