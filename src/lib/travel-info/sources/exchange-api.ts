/**
 * 為替レートAPI
 * Exchange Rate API
 *
 * TODO: ExchangeRate-API または Open Exchange Rates を使用
 */

import {
  TravelInfoCategory,
  SourceType,
  TravelInfoSource,
  BasicCountryInfo,
  Currency,
  ExchangeRate,
} from '@/types';

import {
  ITravelInfoSource,
  SourceOptions,
  SourceResult,
} from '../interfaces';

/**
 * 為替API設定
 */
export interface ExchangeApiConfig {
  /** APIキー */
  apiKey?: string;
  /** 基準通貨（デフォルト: JPY） */
  baseCurrency?: string;
  /** タイムアウト（ミリ秒） */
  timeout?: number;
}

/**
 * 為替レート取得用のデータ型（内部使用）
 */
export interface ExchangeRateData {
  currency: Currency;
  exchangeRate: ExchangeRate;
}

/**
 * 為替レートソース
 * BasicCountryInfoの為替関連フィールドを提供
 */
export class ExchangeApiSource implements ITravelInfoSource<BasicCountryInfo> {
  readonly sourceName = '為替レートAPI';
  readonly sourceType: SourceType = 'official_api';
  readonly reliabilityScore = 90;
  readonly supportedCategories: TravelInfoCategory[] = ['basic'];

  private readonly config: ExchangeApiConfig;

  constructor(config: ExchangeApiConfig = {}) {
    this.config = {
      baseCurrency: 'JPY',
      timeout: 10000,
      ...config,
    };
  }

  /**
   * 為替レート情報を取得
   * BasicCountryInfoとして返す（為替関連フィールドのみ有効）
   */
  async fetch(
    destination: string,
    _options?: SourceOptions
  ): Promise<SourceResult<BasicCountryInfo>> {
    console.log(`[exchange-api] Fetching exchange rate for: ${destination}`);

    try {
      const apiKey = this.config.apiKey || process.env.EXCHANGE_API_KEY;

      if (!apiKey) {
        return {
          success: false,
          error: 'Exchange API key not configured',
        };
      }

      // TODO: 目的地から通貨コードを取得
      const currencyCode = await this.getCurrencyCodeForDestination(destination);

      if (!currencyCode) {
        return {
          success: false,
          error: `通貨情報が見つかりませんでした: ${destination}`,
        };
      }

      // TODO: 為替レートを取得
      const exchangeData = await this.fetchExchangeRate(
        currencyCode,
        apiKey
      );

      if (!exchangeData) {
        return {
          success: false,
          error: `為替レートが取得できませんでした: ${currencyCode}`,
        };
      }

      // BasicCountryInfoとして返す
      const basicCountryInfo: BasicCountryInfo = {
        currency: exchangeData.currency,
        exchangeRate: exchangeData.exchangeRate,
        languages: [], // 為替APIでは言語情報は取得しない
        timezone: '', // 為替APIではタイムゾーン情報は取得しない
        timeDifference: '', // 為替APIでは時差情報は取得しない
      };

      const source: TravelInfoSource = {
        sourceType: this.sourceType,
        sourceName: this.sourceName,
        sourceUrl: 'https://www.exchangerate-api.com/',
        retrievedAt: new Date(),
        reliabilityScore: this.reliabilityScore,
      };

      return {
        success: true,
        data: basicCountryInfo,
        source,
      };
    } catch (error) {
      console.error('[exchange-api] Error:', error);
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
    const apiKey = this.config.apiKey || process.env.EXCHANGE_API_KEY;
    return !!apiKey;
  }

  /**
   * 目的地から通貨コードを取得
   * TODO: 国・都市と通貨のマッピングデータベースを使用
   */
  private async getCurrencyCodeForDestination(
    destination: string
  ): Promise<string | null> {
    // TODO: 実装
    // 1. ジオコーディングで国を特定
    // 2. 国と通貨のマッピングテーブルから通貨コードを取得

    // 仮のマッピング（実際は外部データ/APIを使用）
    const currencyMap: Record<string, string> = {
      'アメリカ': 'USD',
      'イギリス': 'GBP',
      'タイ': 'THB',
      'バンコク': 'THB',
      '韓国': 'KRW',
      'ソウル': 'KRW',
      '台湾': 'TWD',
      '台北': 'TWD',
      'フランス': 'EUR',
      'パリ': 'EUR',
      'ドイツ': 'EUR',
      'イタリア': 'EUR',
      'ローマ': 'EUR',
      'オーストラリア': 'AUD',
      'シドニー': 'AUD',
    };

    // 部分一致で検索
    for (const [key, code] of Object.entries(currencyMap)) {
      if (destination.includes(key)) {
        return code;
      }
    }

    console.warn(`[exchange-api] Currency not found for: ${destination}`);
    return null;
  }

  /**
   * 為替レートを取得
   * TODO: 実際のAPI呼び出し
   */
  private async fetchExchangeRate(
    _currencyCode: string,
    _apiKey: string
  ): Promise<ExchangeRateData | null> {
    // TODO: 実際のAPI呼び出しを実装
    // 例: https://api.exchangerate-api.com/v4/latest/JPY

    console.warn('[exchange-api] Using placeholder - implement actual fetch');

    return null;
  }
}

/**
 * 為替APIソースのファクトリ関数
 */
export function createExchangeApiSource(config?: ExchangeApiConfig): ExchangeApiSource {
  return new ExchangeApiSource(config);
}
