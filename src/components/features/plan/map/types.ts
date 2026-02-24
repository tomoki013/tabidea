/**
 * マップコンポーネント共通型定義
 */

import type { Activity } from "@/types/itinerary";
import type { MapProviderType } from "@/lib/limits/config";

// ============================================================================
// Marker
// ============================================================================

export interface MapMarker {
  /** 座標 */
  position: { lat: number; lng: number };
  /** ラベル (番号) */
  label: string;
  /** スポット名 */
  name: string;
  /** インデックス */
  index: number;
  /** Google Place ID */
  placeId?: string;
}

// ============================================================================
// Map Props (全プロバイダー共通)
// ============================================================================

export interface MapViewProps {
  /** アクティビティ一覧 */
  activities: Activity[];
  /** 日番号 */
  dayNumber: number;
  /** 追加CSS */
  className?: string;
}

// ============================================================================
// MapRenderer Props
// ============================================================================

export interface MapRendererProps extends MapViewProps {
  /** マッププロバイダー */
  mapProvider: MapProviderType;
}
