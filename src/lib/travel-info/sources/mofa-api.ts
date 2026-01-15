/**
 * 外務省海外安全情報API
 * Ministry of Foreign Affairs (MOFA) Safety Information API
 *
 * TODO: 外務省の海外安全ホームページからデータを取得
 * https://www.anzen.mofa.go.jp/
 */

import {
  TravelInfoCategory,
  SourceType,
  SafetyInfo,
  TravelInfoSource,
} from '@/lib/types/travel-info';

import {
  ITravelInfoSource,
  SourceOptions,
  SourceResult,
} from '../interfaces';

/**
 * 外務省API設定
 */
export interface MofaApiConfig {
  /** APIエンドポイント（将来的にAPI提供時） */
  endpoint?: string;
  /** タイムアウト（ミリ秒） */
  timeout?: number;
}

/**
 * 外務省海外安全情報ソース
 */
export class MofaApiSource implements ITravelInfoSource<SafetyInfo> {
  readonly sourceName = '外務省海外安全情報';
  readonly sourceType: SourceType = 'official_api';
  readonly reliabilityScore = 95; // 公式情報のため高信頼性
  readonly supportedCategories: TravelInfoCategory[] = ['safety'];

  private readonly config: MofaApiConfig;

  constructor(config: MofaApiConfig = {}) {
    this.config = {
      timeout: 10000,
      ...config,
    };
  }

  /**
   * 安全情報を取得
   */
  async fetch(
    destination: string,
    _options?: SourceOptions
  ): Promise<SourceResult<SafetyInfo>> {
    console.log(`[mofa-api] Fetching safety info for: ${destination}`);

    try {
      // TODO: 実際のAPI呼び出しを実装
      // 現在は外務省がAPIを公開していないため、
      // Webスクレイピングまたはデータベースからの取得が必要

      // プレースホルダー実装
      const safetyInfo = await this.scrapeOrFetchSafetyInfo(destination);

      if (!safetyInfo) {
        return {
          success: false,
          error: `安全情報が見つかりませんでした: ${destination}`,
        };
      }

      const source: TravelInfoSource = {
        sourceType: this.sourceType,
        sourceName: this.sourceName,
        sourceUrl: `https://www.anzen.mofa.go.jp/`,
        retrievedAt: new Date(),
        reliabilityScore: this.reliabilityScore,
      };

      return {
        success: true,
        data: safetyInfo,
        source,
      };
    } catch (error) {
      console.error('[mofa-api] Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * ソースが利用可能かチェック
   */
  async isAvailable(): Promise<boolean> {
    // TODO: ヘルスチェックを実装
    return true;
  }

  /**
   * 安全情報をスクレイピングまたはフェッチ
   * TODO: 実際の実装
   */
  private async scrapeOrFetchSafetyInfo(
    _destination: string
  ): Promise<SafetyInfo | null> {
    // TODO: 以下のいずれかを実装
    // 1. 外務省サイトのスクレイピング
    // 2. 事前にクロールしたデータベースからの取得
    // 3. 外務省がAPI提供した場合はAPI呼び出し

    // プレースホルダーデータ
    console.warn('[mofa-api] Using placeholder data - implement actual fetch');

    return null; // 未実装のためnullを返す
  }
}

/**
 * 外務省APIソースのファクトリ関数
 */
export function createMofaApiSource(config?: MofaApiConfig): MofaApiSource {
  return new MofaApiSource(config);
}
