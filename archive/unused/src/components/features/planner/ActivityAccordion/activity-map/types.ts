/**
 * ActivityMap 共通型定義
 */

import type { MapProviderType } from "@/lib/limits/config";

export interface ActivityMapBaseProps {
  /** スポット名 */
  name: string;
  /** 緯度 */
  latitude: number;
  /** 経度 */
  longitude: number;
  /** Place ID (Google Maps リンク用) */
  placeId?: string;
  /** Google Maps URL */
  googleMapsUrl?: string;
  /** 目的地（検索コンテキスト用） */
  destination?: string;
  /** クラス名 */
  className?: string;
}

export interface ActivityMapRendererProps extends ActivityMapBaseProps {
  /** マッププロバイダー */
  mapProvider: MapProviderType;
}
