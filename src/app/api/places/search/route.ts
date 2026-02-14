/**
 * Google Places 検索 API エンドポイント
 * GET /api/places/search
 *
 * Lazy Loading方式: スポットカードの「詳細を見る」クリック時のみ呼び出し
 */

import { NextRequest, NextResponse } from 'next/server';
import { GooglePlacesService } from '@/lib/services/google/places';
import { createServiceRoleClient } from '@/lib/supabase/admin';
import { PLACES_CACHE_CONFIG } from '@/lib/constants/config';
import type { PlacesSearchResponse, PlaceValidationResult } from '@/types/places';

// ============================================
// Types
// ============================================

interface CachedPlace {
  id: string;
  query_key: string;
  place_id: string;
  data: PlaceValidationResult;
  created_at: string;
  expires_at: string;
}

// ============================================
// Cache Functions
// ============================================

/**
 * キャッシュからデータを取得
 */
async function getCachedPlace(
  queryKey: string
): Promise<PlaceValidationResult | null> {
  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from('places_cache')
      .select('*')
      .eq('query_key', queryKey)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error || !data) return null;

    return (data as CachedPlace).data;
  } catch {
    // テーブルが存在しない場合など
    return null;
  }
}

/**
 * キャッシュにデータを保存
 */
async function setCachedPlace(
  queryKey: string,
  result: PlaceValidationResult
): Promise<void> {
  try {
    const supabase = createServiceRoleClient();
    const expiresAt = new Date(Date.now() + PLACES_CACHE_CONFIG.TTL_MS);

    await supabase.from('places_cache').upsert(
      {
        query_key: queryKey,
        place_id: result.placeId || '',
        data: result,
        expires_at: expiresAt.toISOString(),
      },
      {
        onConflict: 'query_key',
      }
    );
  } catch {
    // キャッシュ保存失敗は無視
    console.warn('Failed to cache place data');
  }
}

/**
 * クエリキーを正規化
 */
function normalizeQueryKey(query: string, near?: string, locationEn?: string, searchQuery?: string): string {
  // searchQuery がある場合はそれをキーの先頭に使用
  const primary = (searchQuery || query).toLowerCase().trim().replace(/\s+/g, '_');
  const nearNormalized = near
    ? near.toLowerCase().trim().replace(/\s+/g, '_')
    : '';
  const locationEnNormalized = locationEn
    ? locationEn.toLowerCase().trim().replace(/\s+/g, '_')
    : '';
  const parts = [primary];
  if (nearNormalized) parts.push(nearNormalized);
  if (locationEnNormalized) parts.push(locationEnNormalized);
  return parts.join('__');
}

// ============================================
// API Handler
// ============================================

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');
    const near = searchParams.get('near') || undefined;
    const locationEn = searchParams.get('locationEn') || undefined;
    const searchQuery = searchParams.get('searchQuery') || undefined;

    // バリデーション
    if (!query) {
      return NextResponse.json<PlacesSearchResponse>(
        {
          success: false,
          error: 'クエリパラメータ "q" が必要です',
        },
        { status: 400 }
      );
    }

    // API キーの確認
    if (!process.env.GOOGLE_MAPS_API_KEY) {
      return NextResponse.json<PlacesSearchResponse>(
        {
          success: false,
          error: 'Google Maps API が設定されていません',
        },
        { status: 500 }
      );
    }

    // キャッシュをチェック
    const queryKey = normalizeQueryKey(query, near, locationEn, searchQuery);
    const cached = await getCachedPlace(queryKey);

    if (cached) {
      return NextResponse.json<PlacesSearchResponse>({
        success: true,
        validation: cached,
        fromCache: true,
      });
    }

    // Places API で検索
    const placesService = new GooglePlacesService();
    const validation = await placesService.validateSpot(query, near, locationEn, searchQuery);

    // キャッシュに保存
    if (validation.placeId) {
      await setCachedPlace(queryKey, validation);
    }

    return NextResponse.json<PlacesSearchResponse>({
      success: true,
      validation,
      fromCache: false,
    });
  } catch (error) {
    console.error('Places search error:', error);

    const errorMessage =
      error instanceof Error ? error.message : '検索中にエラーが発生しました';

    return NextResponse.json<PlacesSearchResponse>(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
