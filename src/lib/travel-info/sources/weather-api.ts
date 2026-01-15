/**
 * 天気情報API
 * Weather Information API
 *
 * TODO: OpenWeatherMap または WeatherAPI を使用
 */

import {
  TravelInfoCategory,
  SourceType,
  ClimateInfo,
  TravelInfoSource,
  CurrentWeather,
  WeatherForecast,
} from '@/lib/types/travel-info';

import {
  ITravelInfoSource,
  SourceOptions,
  SourceResult,
} from '../interfaces';

/**
 * 天気API設定
 */
export interface WeatherApiConfig {
  /** APIキー */
  apiKey?: string;
  /** APIプロバイダー */
  provider?: 'openweathermap' | 'weatherapi';
  /** タイムアウト（ミリ秒） */
  timeout?: number;
}

/**
 * 天気情報ソース
 */
export class WeatherApiSource implements ITravelInfoSource<ClimateInfo> {
  readonly sourceName = '天気情報API';
  readonly sourceType: SourceType = 'official_api';
  readonly reliabilityScore = 85;
  readonly supportedCategories: TravelInfoCategory[] = ['climate'];

  private readonly config: WeatherApiConfig;

  constructor(config: WeatherApiConfig = {}) {
    this.config = {
      provider: 'openweathermap',
      timeout: 10000,
      ...config,
    };
  }

  /**
   * 気候情報を取得
   */
  async fetch(
    destination: string,
    _options?: SourceOptions
  ): Promise<SourceResult<ClimateInfo>> {
    console.log(`[weather-api] Fetching climate info for: ${destination}`);

    try {
      // TODO: 実際のAPI呼び出しを実装
      const apiKey = this.config.apiKey || process.env.WEATHER_API_KEY;

      if (!apiKey) {
        return {
          success: false,
          error: 'Weather API key not configured',
        };
      }

      // TODO: プロバイダーに応じたAPI呼び出し
      const weatherData = await this.fetchWeatherData(destination, apiKey);

      if (!weatherData) {
        return {
          success: false,
          error: `気象情報が見つかりませんでした: ${destination}`,
        };
      }

      const source: TravelInfoSource = {
        sourceType: this.sourceType,
        sourceName: this.sourceName,
        sourceUrl: this.getProviderUrl(),
        retrievedAt: new Date(),
        reliabilityScore: this.reliabilityScore,
      };

      return {
        success: true,
        data: weatherData,
        source,
      };
    } catch (error) {
      console.error('[weather-api] Error:', error);
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
    const apiKey = this.config.apiKey || process.env.WEATHER_API_KEY;
    return !!apiKey;
  }

  /**
   * 天気データを取得
   * TODO: 実際の実装
   */
  private async fetchWeatherData(
    _destination: string,
    _apiKey: string
  ): Promise<ClimateInfo | null> {
    // TODO: 以下を実装
    // 1. 目的地のジオコーディング（緯度経度取得）
    // 2. 天気APIへのリクエスト
    // 3. レスポンスのパース

    console.warn('[weather-api] Using placeholder - implement actual fetch');

    // プレースホルダー実装
    return null;
  }

  /**
   * プロバイダーURLを取得
   */
  private getProviderUrl(): string {
    switch (this.config.provider) {
      case 'openweathermap':
        return 'https://openweathermap.org/';
      case 'weatherapi':
        return 'https://www.weatherapi.com/';
      default:
        return '';
    }
  }

  /**
   * 服装のおすすめを生成
   * TODO: 気温・天気に基づいた推奨
   */
  private generateClothingRecommendations(
    weather: CurrentWeather,
    _forecast: WeatherForecast[]
  ): string[] {
    const recommendations: string[] = [];
    const { temp, condition, humidity } = weather;

    // Temperature-based recommendations
    if (temp < 5) {
      recommendations.push('ダウンジャケットや厚手のコート');
      recommendations.push('冬用の帽子、手袋、マフラー');
      recommendations.push('暖かいインナー');
    } else if (temp < 10) {
      recommendations.push('冬物のコートやジャケット');
      recommendations.push('セーターやフリース');
      recommendations.push('手袋やマフラーもあると安心');
    } else if (temp < 15) {
      recommendations.push('トレンチコートや軽めのジャケット');
      recommendations.push('長袖シャツや薄手のニット');
    } else if (temp < 20) {
      recommendations.push('カーディガンやパーカーなど羽織るもの');
      recommendations.push('長袖Tシャツ');
    } else if (temp < 25) {
      recommendations.push('半袖Tシャツ');
      recommendations.push('薄手の長袖シャツ');
    } else {
      recommendations.push('半袖やノースリーブなど涼しい服装');
      recommendations.push('ショートパンツ');
    }

    // Condition-based recommendations
    const lowerCaseCondition = condition.toLowerCase();
    if (lowerCaseCondition.includes('rain') || lowerCaseCondition.includes('雨')) {
      recommendations.push('傘やレインコート');
      recommendations.push('防水性のある靴');
    }
    if (lowerCaseCondition.includes('sun') || lowerCaseCondition.includes('晴')) {
      recommendations.push('日焼け止め');
      recommendations.push('帽子やサングラス');
    }
    if (lowerCaseCondition.includes('snow') || lowerCaseCondition.includes('雪')) {
      recommendations.push('スノーブーツ');
      recommendations.push('防水性の高いアウター');
    }
    if (lowerCaseCondition.includes('wind') || lowerCaseCondition.includes('風')) {
      recommendations.push('風を通しにくいウィンドブレーカー');
    }

    // Humidity-based recommendations
    if (humidity > 75) {
      recommendations.push('通気性の良い服装');
    }

    // Remove duplicates and return
    return [...new Set(recommendations)];
  }
}

/**
 * 天気APIソースのファクトリ関数
 */
export function createWeatherApiSource(config?: WeatherApiConfig): WeatherApiSource {
  return new WeatherApiSource(config);
}
