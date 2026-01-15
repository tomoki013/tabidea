/**
 * 国情報API
 * Country Information API
 *
 * TODO: REST Countries API を使用
 * https://restcountries.com/
 */

import {
  TravelInfoCategory,
  SourceType,
  BasicCountryInfo,
  TravelInfoSource,
  Currency,
} from '@/lib/types/travel-info';

import {
  ITravelInfoSource,
  SourceOptions,
  SourceResult,
} from '../interfaces';

/**
 * 国情報API設定
 */
export interface CountryApiConfig {
  /** APIエンドポイント */
  endpoint?: string;
  /** タイムアウト（ミリ秒） */
  timeout?: number;
}

/**
 * REST Countries APIレスポンス型（部分）
 */
interface RestCountryResponse {
  name: {
    common: string;
    official: string;
    nativeName?: Record<string, { official: string; common: string }>;
  };
  currencies?: Record<string, { name: string; symbol: string }>;
  languages?: Record<string, string>;
  timezones: string[];
  region: string;
  subregion?: string;
}

/**
 * 国情報ソース
 */
export class CountryApiSource implements ITravelInfoSource<BasicCountryInfo> {
  readonly sourceName = 'REST Countries API';
  readonly sourceType: SourceType = 'official_api';
  readonly reliabilityScore = 80;
  readonly supportedCategories: TravelInfoCategory[] = ['basic'];

  private readonly config: CountryApiConfig;
  private readonly endpoint: string;

  constructor(config: CountryApiConfig = {}) {
    this.config = {
      timeout: 10000,
      ...config,
    };
    this.endpoint = config.endpoint || 'https://restcountries.com/v3.1';
  }

  /**
   * 国の基本情報を取得
   */
  async fetch(
    destination: string,
    _options?: SourceOptions
  ): Promise<SourceResult<BasicCountryInfo>> {
    console.log(`[country-api] Fetching country info for: ${destination}`);

    try {
      // TODO: 目的地から国名を推測
      const countryName = this.extractCountryName(destination);

      // TODO: REST Countries APIを呼び出し
      const countryData = await this.fetchCountryData(countryName);

      if (!countryData) {
        return {
          success: false,
          error: `国情報が見つかりませんでした: ${destination}`,
        };
      }

      const basicInfo = this.transformToBasicCountryInfo(countryData);

      const source: TravelInfoSource = {
        sourceType: this.sourceType,
        sourceName: this.sourceName,
        sourceUrl: 'https://restcountries.com/',
        retrievedAt: new Date(),
        reliabilityScore: this.reliabilityScore,
      };

      return {
        success: true,
        data: basicInfo,
        source,
      };
    } catch (error) {
      console.error('[country-api] Error:', error);
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
    // REST Countries APIは公開APIのため常に利用可能
    // TODO: ヘルスチェック実装
    return true;
  }

  /**
   * 目的地から国名を抽出
   * TODO: より高度なジオコーディング
   */
  private extractCountryName(destination: string): string {
    // 都市名と国名のマッピング
    const cityToCountry: Record<string, string> = {
      '東京': 'Japan',
      '京都': 'Japan',
      '大阪': 'Japan',
      'バンコク': 'Thailand',
      'プーケット': 'Thailand',
      'ソウル': 'South Korea',
      '釜山': 'South Korea',
      '台北': 'Taiwan',
      '高雄': 'Taiwan',
      'パリ': 'France',
      'ニース': 'France',
      'ロンドン': 'United Kingdom',
      'ニューヨーク': 'United States',
      'ロサンゼルス': 'United States',
      'シドニー': 'Australia',
      'メルボルン': 'Australia',
      'ローマ': 'Italy',
      'ミラノ': 'Italy',
      'ベルリン': 'Germany',
      'ミュンヘン': 'Germany',
    };

    // 日本語の国名を英語に変換
    const countryNameMap: Record<string, string> = {
      'アメリカ': 'United States',
      '韓国': 'South Korea',
      '台湾': 'Taiwan',
      'タイ': 'Thailand',
      'フランス': 'France',
      'イギリス': 'United Kingdom',
      'ドイツ': 'Germany',
      'イタリア': 'Italy',
      'オーストラリア': 'Australia',
      '日本': 'Japan',
    };

    // 都市名から国を取得
    for (const [city, country] of Object.entries(cityToCountry)) {
      if (destination.includes(city)) {
        return country;
      }
    }

    // 国名から変換
    for (const [ja, en] of Object.entries(countryNameMap)) {
      if (destination.includes(ja)) {
        return en;
      }
    }

    // そのまま返す（英語の国名の場合）
    return destination;
  }

  /**
   * REST Countries APIからデータを取得
   * TODO: 実際のAPI呼び出し
   */
  private async fetchCountryData(
    _countryName: string
  ): Promise<RestCountryResponse | null> {
    // TODO: 実際のAPI呼び出しを実装
    // const url = `${this.endpoint}/name/${encodeURIComponent(countryName)}`;
    // const response = await fetch(url);
    // const data = await response.json();
    // return data[0];

    console.warn('[country-api] Using placeholder - implement actual fetch');
    return null;
  }

  /**
   * APIレスポンスをBasicCountryInfoに変換
   */
  private transformToBasicCountryInfo(
    data: RestCountryResponse
  ): BasicCountryInfo {
    // 通貨情報を抽出
    const currencyEntries = Object.entries(data.currencies || {});
    const [currencyCode, currencyData] = currencyEntries[0] || ['', { name: '', symbol: '' }];

    const currency: Currency = {
      code: currencyCode,
      name: currencyData.name,
      symbol: currencyData.symbol,
    };

    // 言語を抽出
    const languages = Object.values(data.languages || {});

    // タイムゾーンと時差を計算
    const timezone = data.timezones[0] || 'UTC';
    const timeDifference = this.calculateTimeDifference(timezone);

    return {
      currency,
      languages,
      timezone,
      timeDifference,
    };
  }

  /**
   * 日本との時差を計算
   * TODO: より正確な計算
   */
  private calculateTimeDifference(timezone: string): string {
    // 簡易実装（実際はタイムゾーンライブラリを使用）
    const offsetMap: Record<string, number> = {
      'Asia/Tokyo': 0,
      'Asia/Bangkok': -2,
      'Asia/Seoul': 0,
      'Asia/Taipei': -1,
      'Europe/Paris': -8,
      'Europe/London': -9,
      'America/New_York': -14,
      'America/Los_Angeles': -17,
      'Australia/Sydney': 1,
    };

    const offset = offsetMap[timezone];
    if (offset === undefined) {
      return '時差情報なし';
    }

    if (offset === 0) {
      return '時差なし';
    }

    return offset > 0 ? `+${offset}時間` : `${offset}時間`;
  }
}

/**
 * 国情報APIソースのファクトリ関数
 */
export function createCountryApiSource(config?: CountryApiConfig): CountryApiSource {
  return new CountryApiSource(config);
}
