/**
 * API関連の型定義
 * API Types for AI Travel Planner
 */

import type { Itinerary } from './itinerary';

/**
 * 記事情報
 */
export interface Article {
  /** タイトル */
  title: string;
  /** URL */
  url: string;
  /** コンテンツ */
  content: string;
  /** スニペット */
  snippet: string;
  /** 画像URL */
  imageUrl?: string;
  /** 関連度スコア */
  relevanceScore?: number;
}

/**
 * 検索オプション
 */
export interface SearchOptions {
  /** 取得件数（デフォルト: 5） */
  topK?: number;
  /** 最小スコア（デフォルト: 0.7） */
  minScore?: number;
}

/**
 * AIサービスインターフェース
 */
export interface AIService {
  /**
   * 旅程を生成する
   * @param prompt プロンプト
   * @param context コンテキスト記事
   * @param startDay 開始日
   * @param endDay 終了日
   */
  generateItinerary(
    prompt: string,
    context: Article[],
    startDay?: number,
    endDay?: number
  ): Promise<Itinerary>;
}

/**
 * コンテンツ検索インターフェース
 */
export interface ContentRetriever {
  /**
   * コンテンツを検索する
   * @param query 検索クエリ
   * @param options 検索オプション
   */
  search(query: string, options?: SearchOptions): Promise<Article[]>;
}
