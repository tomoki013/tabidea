/**
 * Routes Client — Google Routes API interface stub
 * Phase 1: Interface のみ定義 (未実装)
 * Phase 2: Google Routes API v2 を使用した実装予定
 */

import type { RouteMatrixEntry, TransportMode } from '@/types/itinerary-pipeline';

// ============================================
// Public interface
// ============================================

export interface RoutesClient {
  /**
   * 2 地点間のルートを計算
   * Phase 2 で Google Routes API computeRoutes を使用予定
   */
  computeRoute(
    origin: { placeId: string } | { lat: number; lng: number },
    destination: { placeId: string } | { lat: number; lng: number },
    mode: TransportMode
  ): Promise<RouteMatrixEntry | null>;

  /**
   * 複数の origin × destination のルートマトリクスを計算
   * Phase 2 で Google Routes API computeRouteMatrix を使用予定
   */
  computeRouteMatrix(
    origins: Array<{ placeId: string } | { lat: number; lng: number }>,
    destinations: Array<{ placeId: string } | { lat: number; lng: number }>,
    mode: TransportMode
  ): Promise<RouteMatrixEntry[]>;
}

// ============================================
// Stub implementation (Phase 1)
// ============================================

/**
 * Phase 1 stub — 常に null / 空配列を返す
 * Phase 2 で Google Routes API 実装に置き換え予定
 */
export class RoutesClientStub implements RoutesClient {
  async computeRoute(): Promise<RouteMatrixEntry | null> {
    // Phase 2: Google Routes API computeRoutes 実装予定
    return null;
  }

  async computeRouteMatrix(): Promise<RouteMatrixEntry[]> {
    // Phase 2: Google Routes API computeRouteMatrix 実装予定
    return [];
  }
}

/**
 * RoutesClient のファクトリ
 * Phase 2 で環境変数に応じて実装を切り替え予定
 */
export function getRoutesClient(): RoutesClient {
  // Phase 2: GOOGLE_ROUTES_API_KEY が設定されていれば実クライアントを返す
  return new RoutesClientStub();
}
