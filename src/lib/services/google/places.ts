/**
 * Google Places API クライアント
 * Phase 3: 外部API連携
 *
 * Google Places API (New) を使用してスポット情報を検証・取得
 */

import type {
  PlaceDetails,
  PlacePhoto,
  PlaceOpeningHours,
  PlaceSearchQuery,
  PlaceSearchResult,
  PlaceValidationResult,
  PlacesApiErrorCode,
} from '@/types/places';
import { PlacesApiError } from '@/types/places';

// ============================================
// Constants
// ============================================

const PLACES_API_BASE_URL = 'https://places.googleapis.com/v1';
const PHOTO_BASE_URL = 'https://places.googleapis.com/v1';

/** デフォルトリクエストタイムアウト（ミリ秒） */
const DEFAULT_TIMEOUT = 10000;

/** 取得する写真の最大数 */
const MAX_PHOTOS = 3;

/** 取得するフィールド */
const PLACE_FIELDS = [
  'id',
  'displayName',
  'formattedAddress',
  'location',
  'rating',
  'userRatingCount',
  'regularOpeningHours',
  'photos',
  'nationalPhoneNumber',
  'internationalPhoneNumber',
  'websiteUri',
  'priceLevel',
  'businessStatus',
  'types',
  'googleMapsUri',
];

// ============================================
// Types (Internal)
// ============================================

interface PlacesTextSearchResponse {
  places?: Array<{
    id: string;
    displayName?: { text: string; languageCode: string };
    formattedAddress?: string;
    location?: { latitude: number; longitude: number };
    rating?: number;
    userRatingCount?: number;
    regularOpeningHours?: {
      openNow?: boolean;
      weekdayDescriptions?: string[];
      periods?: Array<{
        open: { day: number; hour: number; minute: number };
        close?: { day: number; hour: number; minute: number };
      }>;
    };
    photos?: Array<{
      name: string;
      widthPx: number;
      heightPx: number;
      authorAttributions?: Array<{ displayName: string; uri: string }>;
    }>;
    nationalPhoneNumber?: string;
    internationalPhoneNumber?: string;
    websiteUri?: string;
    priceLevel?: string;
    businessStatus?: string;
    types?: string[];
    googleMapsUri?: string;
  }>;
  error?: { code: number; message: string; status: string };
}

// ============================================
// GooglePlacesService Class
// ============================================

export class GooglePlacesService {
  private apiKey: string;
  private timeout: number;

  constructor(apiKey?: string, options?: { timeout?: number }) {
    const key = apiKey || process.env.GOOGLE_MAPS_API_KEY;
    if (!key) {
      throw new PlacesApiError(
        'Google Maps API key is not configured',
        'INVALID_API_KEY'
      );
    }
    this.apiKey = key;
    this.timeout = options?.timeout || DEFAULT_TIMEOUT;
  }

  /**
   * テキスト検索でスポットを検索
   */
  async searchPlace(query: PlaceSearchQuery): Promise<PlaceSearchResult> {
    const startTime = Date.now();

    try {
      const originalQuery = query.query;
      const cleanedQuery = this.cleanSearchQuery(originalQuery);

      // 1. Initial Search: cleaned query with location context
      let searchQuery = query.near
        ? `${cleanedQuery} ${query.near}`
        : cleanedQuery;

      let searchResult = await this.performSearch(searchQuery, query);

      // 2. Fallback: cleaned query without location
      if (!searchResult.found && query.near) {
        searchResult = await this.performSearch(cleanedQuery, query);
      }

      // 3. Fallback: original query with location (in case cleaning removed important info)
      if (!searchResult.found && cleanedQuery !== originalQuery) {
        searchQuery = query.near
          ? `${originalQuery} ${query.near}`
          : originalQuery;
        searchResult = await this.performSearch(searchQuery, query);
      }

      // 4. Fallback: original query without location
      if (!searchResult.found && query.near && cleanedQuery !== originalQuery) {
        searchResult = await this.performSearch(originalQuery, query);
      }

      // 5. Fallback: cleaned query with English location name (for international spots)
      if (!searchResult.found && query.locationEn) {
        searchResult = await this.performSearch(
          `${cleanedQuery} ${query.locationEn}`,
          query
        );
      }

      // 6. Fallback: English location name alone (e.g., "Marrakech, Morocco")
      if (!searchResult.found && query.locationEn) {
        searchResult = await this.performSearch(query.locationEn, query);
      }

      if (!searchResult.found || !searchResult.place) {
        return {
          found: false,
          searchTime: Date.now() - startTime,
          error: 'スポットが見つかりませんでした',
        };
      }

      const placeDetails = await this.mapToPlaceDetails(searchResult.place);

      // マッチスコアの計算（名前の類似度）
      const matchScore = this.calculateMatchScore(
        originalQuery,
        placeDetails.name
      );

      return {
        found: true,
        place: placeDetails,
        matchScore,
        searchTime: Date.now() - startTime,
      };
    } catch (error) {
      if (error instanceof PlacesApiError) {
        return {
          found: false,
          searchTime: Date.now() - startTime,
          error: error.message,
        };
      }
      throw error;
    }
  }

  /**
   * 内部検索処理
   */
  private async performSearch(
    textQuery: string,
    options: PlaceSearchQuery
  ): Promise<{
    found: boolean;
    place?: NonNullable<PlacesTextSearchResponse['places']>[0];
  }> {
    const requestBody = {
      textQuery,
      languageCode: options.language || 'ja',
      maxResultCount: 1,
      ...(options.type && { includedType: options.type }),
    };

    console.log('Places API Request:', JSON.stringify(requestBody, null, 2));

    const response = await this.fetchWithTimeout(
      `${PLACES_API_BASE_URL}/places:searchText`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': this.apiKey,
          'X-Goog-FieldMask': PLACE_FIELDS.map((f) => `places.${f}`).join(','),
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Places API Error:', response.status, errorData);
      throw this.handleApiError(response.status, errorData);
    }

    const data: PlacesTextSearchResponse = await response.json();
    console.log('Places API Response:', JSON.stringify(data, null, 2));

    if (!data.places || data.places.length === 0) {
      return { found: false };
    }

    return { found: true, place: data.places[0] };
  }

  /**
   * 検索結果を検証結果に変換
   */
  async validateSpot(
    spotName: string,
    location?: string,
    locationEn?: string
  ): Promise<PlaceValidationResult> {
    const result = await this.searchPlace({
      query: spotName,
      near: location,
      locationEn,
    });

    if (!result.found || !result.place) {
      return {
        spotName,
        isVerified: false,
        confidence: 'unverified',
        source: 'google_places',
      };
    }

    // マッチスコアに基づいて信頼度を決定
    const confidence = this.determineConfidence(result.matchScore || 0);

    return {
      spotName,
      isVerified: confidence !== 'low',
      confidence,
      source: 'google_places',
      placeId: result.place.placeId,
      details: {
        name: result.place.name,
        address: result.place.formattedAddress,
        latitude: result.place.latitude,
        longitude: result.place.longitude,
        rating: result.place.rating,
        reviewCount: result.place.userRatingsTotal,
        openingHours: result.place.openingHours?.weekdayText,
        photos: result.place.photos,
        googleMapsUrl: result.place.googleMapsUrl,
      },
    };
  }

  /**
   * 写真URLを生成
   */
  getPhotoUrl(photoReference: string, maxWidth: number = 400): string {
    // Places API (New) の写真URLフォーマット
    return `${PHOTO_BASE_URL}/${photoReference}/media?maxWidthPx=${maxWidth}&key=${this.apiKey}`;
  }

  /**
   * 複数スポットを一括検証
   */
  async validateSpots(
    spots: Array<{ name: string; location?: string }>
  ): Promise<Map<string, PlaceValidationResult>> {
    const results = new Map<string, PlaceValidationResult>();

    // 順次処理（API制限を考慮）
    for (const spot of spots) {
      try {
        const result = await this.validateSpot(spot.name, spot.location);
        results.set(spot.name, result);
      } catch {
        results.set(spot.name, {
          spotName: spot.name,
          isVerified: false,
          confidence: 'unverified',
          source: 'google_places',
        });
      }

      // レート制限対策（100ms間隔）
      await this.delay(100);
    }

    return results;
  }

  // ============================================
  // Private Methods
  // ============================================

  /**
   * 検索クエリからアクティビティの説明的な部分を除去し、スポット名を抽出
   * 例: "金閣寺で抹茶体験" → "金閣寺"
   *     "錦市場で食べ歩き" → "錦市場"
   *     "嵐山竹林散策" → "嵐山竹林"
   */
  cleanSearchQuery(query: string): string {
    let cleaned = query;

    // 括弧内の補足情報を除去（例: "金閣寺 (Kinkaku-ji)" → "金閣寺"）
    cleaned = cleaned.replace(/\s*[（(][^）)]*[）)]\s*/g, '');

    // 「XのY」パターンで Y が一般的な場所記述子の場合、X を抽出
    // 例: "メディナのスーク" → "メディナ", "フナ広場の屋台" → "フナ広場"
    const genericDescriptors = '旧市街|市場|スーク|バザール|広場|寺院|宮殿|遺跡|城壁|モスク|ビーチ|港|空港|屋台|露店|商店街|通り|路地|庭園|公園|湖|滝|洞窟|渓谷|峡谷';
    const noGenericPattern = new RegExp(`^(.{2,})の(${genericDescriptors}).*$`);
    const noGenericMatch = cleaned.match(noGenericPattern);
    if (noGenericMatch) {
      cleaned = noGenericMatch[1];
    }

    // 「〜で〜する」パターン: 「で」以降のアクション部分を除去
    // 「で」の後にオプショナルな修飾語 + アクション動詞/名詞
    const actionWords = '散策|食べ歩き|体験|見学|観光|参拝|ショッピング|買い物|食事|昼食|夕食|朝食|ランチ|ディナー|休憩|鑑賞|堪能|満喫|探索|巡り|めぐり|探訪|訪問|立ち寄り|寄り道|楽しむ|過ごす|味わう|堪能する|楽しみ|ひと休み|迷宮探索';
    const dePattern = new RegExp(`^(.{2,})で.{0,10}(${actionWords}).*$`);
    const deMatch = cleaned.match(dePattern);
    if (deMatch) {
      cleaned = deMatch[1];
    }

    // 「〜を〜する」パターン
    const woPattern = /^(.{2,})を(散策|見学|観光|参拝|探索|巡る|訪れる|訪問|堪能|満喫|楽しむ|味わう|鑑賞).*$/;
    const woMatch = cleaned.match(woPattern);
    if (woMatch) {
      cleaned = woMatch[1];
    }

    // 「〜に〜する」パターン（例: "〜に立ち寄る"）
    const niPattern = /^(.{2,})に(立ち寄る|訪れる|向かう|行く|寄る).*$/;
    const niMatch = cleaned.match(niPattern);
    if (niMatch) {
      cleaned = niMatch[1];
    }

    // 末尾のアクション動詞・名詞を除去
    const suffixes = [
      '散策', '探索', '観光', '見学', '体験', '参拝', '巡り', 'めぐり',
      '探訪', '訪問', 'ショッピング', '買い物', '食べ歩き',
      'でランチ', 'でディナー', 'で昼食', 'で夕食', 'で朝食',
      'で食事', 'で休憩', 'でひと休み',
    ];
    for (const suffix of suffixes) {
      if (cleaned.endsWith(suffix) && cleaned.length > suffix.length) {
        cleaned = cleaned.slice(0, -suffix.length);
        break;
      }
    }

    // 先頭の絵文字を除去
    cleaned = cleaned.replace(/^[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1FA00}-\u{1FAFF}\s]+/u, '');

    // 前後の空白を除去
    cleaned = cleaned.trim();

    // クリーニングの結果が短すぎる場合は元のクエリを返す
    if (cleaned.length < 2) {
      return query.trim();
    }

    return cleaned;
  }

  private async fetchWithTimeout(
    url: string,
    options: RequestInit
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      return response;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new PlacesApiError('Request timed out', 'TIMEOUT', error);
      }
      throw new PlacesApiError(
        'Network error occurred',
        'NETWORK_ERROR',
        error
      );
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private async mapToPlaceDetails(
    place: NonNullable<PlacesTextSearchResponse['places']>[0]
  ): Promise<PlaceDetails> {
    const photos: PlacePhoto[] = (place.photos || [])
      .slice(0, MAX_PHOTOS)
      .map((photo) => ({
        photoReference: photo.name,
        width: photo.widthPx,
        height: photo.heightPx,
        attributions:
          photo.authorAttributions?.map((a) => a.displayName) || [],
        url: this.getPhotoUrl(photo.name),
      }));

    const openingHours: PlaceOpeningHours | undefined =
      place.regularOpeningHours
        ? {
            openNow: place.regularOpeningHours.openNow,
            weekdayText: place.regularOpeningHours.weekdayDescriptions,
            periods: place.regularOpeningHours.periods?.map((p) => ({
              open: {
                day: p.open.day,
                time: `${p.open.hour.toString().padStart(2, '0')}:${p.open.minute.toString().padStart(2, '0')}`,
              },
              close: p.close
                ? {
                    day: p.close.day,
                    time: `${p.close.hour.toString().padStart(2, '0')}:${p.close.minute.toString().padStart(2, '0')}`,
                  }
                : undefined,
            })),
          }
        : undefined;

    return {
      placeId: place.id,
      name: place.displayName?.text || '',
      formattedAddress: place.formattedAddress || '',
      latitude: place.location?.latitude || 0,
      longitude: place.location?.longitude || 0,
      rating: place.rating,
      userRatingsTotal: place.userRatingCount,
      openingHours,
      photos: photos.length > 0 ? photos : undefined,
      phoneNumber:
        place.nationalPhoneNumber || place.internationalPhoneNumber,
      website: place.websiteUri,
      priceLevel: place.priceLevel
        ? this.parsePriceLevel(place.priceLevel)
        : undefined,
      googleMapsUrl: place.googleMapsUri || '',
      businessStatus: place.businessStatus as PlaceDetails['businessStatus'],
      types: place.types,
    };
  }

  private parsePriceLevel(priceLevel: string): number | undefined {
    const mapping: Record<string, number> = {
      PRICE_LEVEL_FREE: 0,
      PRICE_LEVEL_INEXPENSIVE: 1,
      PRICE_LEVEL_MODERATE: 2,
      PRICE_LEVEL_EXPENSIVE: 3,
      PRICE_LEVEL_VERY_EXPENSIVE: 4,
    };
    return mapping[priceLevel];
  }

  private calculateMatchScore(query: string, foundName: string): number {
    const normalizedQuery = this.normalizeString(query);
    const normalizedFound = this.normalizeString(foundName);

    // 完全一致
    if (normalizedQuery === normalizedFound) return 1.0;

    // 部分一致
    if (
      normalizedFound.includes(normalizedQuery) ||
      normalizedQuery.includes(normalizedFound)
    ) {
      const longer = Math.max(normalizedQuery.length, normalizedFound.length);
      const shorter = Math.min(normalizedQuery.length, normalizedFound.length);
      return shorter / longer;
    }

    // レーベンシュタイン距離による類似度
    const distance = this.levenshteinDistance(normalizedQuery, normalizedFound);
    const maxLength = Math.max(normalizedQuery.length, normalizedFound.length);
    return Math.max(0, 1 - distance / maxLength);
  }

  private normalizeString(str: string): string {
    return str
      .toLowerCase()
      .replace(/[\s\-_・]/g, '')
      .replace(/[（）()]/g, '');
  }

  private levenshteinDistance(a: string, b: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[b.length][a.length];
  }

  private determineConfidence(
    matchScore: number
  ): 'high' | 'medium' | 'low' | 'unverified' {
    if (matchScore >= 0.8) return 'high';
    if (matchScore >= 0.5) return 'medium';
    if (matchScore > 0) return 'low';
    return 'unverified';
  }

  private handleApiError(
    status: number,
    errorData: Record<string, unknown>
  ): PlacesApiError {
    const errorMessage =
      (errorData.error as { message?: string })?.message ||
      'Unknown error occurred';

    const codeMap: Record<number, PlacesApiErrorCode> = {
      400: 'INVALID_REQUEST',
      401: 'INVALID_API_KEY',
      403: 'REQUEST_DENIED',
      429: 'OVER_QUERY_LIMIT',
    };

    const code = codeMap[status] || 'UNKNOWN_ERROR';

    return new PlacesApiError(errorMessage, code, errorData);
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// ============================================
// Singleton Instance
// ============================================

let serviceInstance: GooglePlacesService | null = null;

/**
 * GooglePlacesService のシングルトンインスタンスを取得
 */
export function getGooglePlacesService(): GooglePlacesService {
  if (!serviceInstance) {
    serviceInstance = new GooglePlacesService();
  }
  return serviceInstance;
}

/**
 * テスト用: インスタンスをリセット
 */
export function resetGooglePlacesService(): void {
  serviceInstance = null;
}
