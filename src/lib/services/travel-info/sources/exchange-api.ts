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
  readonly sourceId = 'exchange-rate-api';
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
    options?: SourceOptions
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

      const currencyCode = options?.additionalParams?.currencyCode as string;

      if (!currencyCode) {
        return {
          success: false,
          error: `通貨コードが提供されませんでした: ${destination}`,
        };
      }

      // 為替レートを取得
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
   * 為替レートを取得
   */
  private async fetchExchangeRate(
    currencyCode: string,
    apiKey: string
  ): Promise<ExchangeRateData | null> {
    const baseCurrency = this.config.baseCurrency || 'JPY';
    const url = `https://v6.exchangerate-api.com/v6/${apiKey}/pair/${currencyCode}/${baseCurrency}`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }
      const data = await response.json();

      if (data.result === 'error') {
        throw new Error(`Exchange rate API error: ${data['error-type']}`);
      }

      return {
        currency: {
          code: currencyCode,
          name: '', // このAPIは通貨名を提供しない
          symbol: '', // このAPIは通貨記号を提供しない
        },
        exchangeRate: {
          rate: data.conversion_rate,
          lastUpdatedAt: new Date(data.time_last_update_unix * 1000),
          targetCurrency: baseCurrency,
        },
      };
    } catch (error) {
      console.error(`[exchange-api] Failed to fetch exchange rate for ${currencyCode}:`, error);
      return null;
    }
  }
}

/**
 * 為替APIソースのファクトリ関数
 */
export function createExchangeApiSource(config?: ExchangeApiConfig): ExchangeApiSource {
  return new ExchangeApiSource(config);
}
