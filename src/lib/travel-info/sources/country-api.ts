/**
 * 国情報API
 * Country Information API
 *
 * REST Countries API を使用
 * https://restcountries.com/
 */

import {
  TravelInfoCategory,
  SourceType,
  BasicCountryInfo,
  TravelInfoSource,
  Currency,
} from '@/types';

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
 * 日本語の国名から英語名へのマッピング
 * REST Countries APIは英語名を期待するため、日本語から変換する
 */
export const JAPANESE_TO_ENGLISH_COUNTRY: Record<string, string> = {
  // アジア
  日本: 'Japan',
  韓国: 'South Korea',
  中国: 'China',
  台湾: 'Taiwan',
  香港: 'Hong Kong',
  マカオ: 'Macau',
  タイ: 'Thailand',
  ベトナム: 'Vietnam',
  シンガポール: 'Singapore',
  マレーシア: 'Malaysia',
  インドネシア: 'Indonesia',
  フィリピン: 'Philippines',
  カンボジア: 'Cambodia',
  ミャンマー: 'Myanmar',
  ラオス: 'Laos',
  ブルネイ: 'Brunei',
  インド: 'India',
  ネパール: 'Nepal',
  スリランカ: 'Sri Lanka',
  バングラデシュ: 'Bangladesh',
  パキスタン: 'Pakistan',
  モンゴル: 'Mongolia',
  // オセアニア
  オーストラリア: 'Australia',
  ニュージーランド: 'New Zealand',
  フィジー: 'Fiji',
  パラオ: 'Palau',
  タヒチ: 'French Polynesia',
  'フランス領ポリネシア': 'French Polynesia',
  グアム: 'Guam',
  サイパン: 'Northern Mariana Islands',
  '北マリアナ諸島': 'Northern Mariana Islands',
  ニューカレドニア: 'New Caledonia',
  // ヨーロッパ
  イギリス: 'United Kingdom',
  フランス: 'France',
  ドイツ: 'Germany',
  イタリア: 'Italy',
  スペイン: 'Spain',
  ポルトガル: 'Portugal',
  オランダ: 'Netherlands',
  ベルギー: 'Belgium',
  スイス: 'Switzerland',
  オーストリア: 'Austria',
  チェコ: 'Czech Republic',
  ポーランド: 'Poland',
  ハンガリー: 'Hungary',
  ギリシャ: 'Greece',
  トルコ: 'Turkey',
  クロアチア: 'Croatia',
  フィンランド: 'Finland',
  スウェーデン: 'Sweden',
  ノルウェー: 'Norway',
  デンマーク: 'Denmark',
  アイルランド: 'Ireland',
  アイスランド: 'Iceland',
  ロシア: 'Russia',
  ウクライナ: 'Ukraine',
  // 北米
  アメリカ: 'United States',
  カナダ: 'Canada',
  メキシコ: 'Mexico',
  // 中南米
  ブラジル: 'Brazil',
  アルゼンチン: 'Argentina',
  ペルー: 'Peru',
  チリ: 'Chile',
  キューバ: 'Cuba',
  コスタリカ: 'Costa Rica',
  // 中東
  'アラブ首長国連邦': 'United Arab Emirates',
  カタール: 'Qatar',
  イスラエル: 'Israel',
  ヨルダン: 'Jordan',
  オマーン: 'Oman',
  バーレーン: 'Bahrain',
  クウェート: 'Kuwait',
  'サウジアラビア': 'Saudi Arabia',
  // 中東（追加）
  イラン: 'Iran',
  イラク: 'Iraq',
  シリア: 'Syria',
  レバノン: 'Lebanon',
  イエメン: 'Yemen',
  アフガニスタン: 'Afghanistan',
  パレスチナ: 'Palestine',
  // アフリカ - 北部
  エジプト: 'Egypt',
  モロッコ: 'Morocco',
  アルジェリア: 'Algeria',
  リビア: 'Libya',
  スーダン: 'Sudan',
  南スーダン: 'South Sudan',
  チュニジア: 'Tunisia',
  // アフリカ - 西部
  セネガル: 'Senegal',
  ガンビア: 'Gambia',
  マリ: 'Mali',
  ギニア: 'Guinea',
  コートジボワール: 'Ivory Coast',
  ブルキナファソ: 'Burkina Faso',
  ニジェール: 'Niger',
  トーゴ: 'Togo',
  ベナン: 'Benin',
  モーリタニア: 'Mauritania',
  リベリア: 'Liberia',
  シエラレオネ: 'Sierra Leone',
  ガーナ: 'Ghana',
  ナイジェリア: 'Nigeria',
  カーボベルデ: 'Cape Verde',
  ギニアビサウ: 'Guinea-Bissau',
  // アフリカ - 中部
  チャド: 'Chad',
  中央アフリカ: 'Central African Republic',
  カメルーン: 'Cameroon',
  赤道ギニア: 'Equatorial Guinea',
  ガボン: 'Gabon',
  コンゴ共和国: 'Republic of the Congo',
  コンゴ民主共和国: 'Democratic Republic of the Congo',
  アンゴラ: 'Angola',
  // アフリカ - 東部
  エチオピア: 'Ethiopia',
  ソマリア: 'Somalia',
  ジブチ: 'Djibouti',
  ケニア: 'Kenya',
  タンザニア: 'Tanzania',
  ウガンダ: 'Uganda',
  ブルンジ: 'Burundi',
  モザンビーク: 'Mozambique',
  ルワンダ: 'Rwanda',
  セーシェル: 'Seychelles',
  エリトリア: 'Eritrea',
  // アフリカ - 南部
  南アフリカ: 'South Africa',
  ザンビア: 'Zambia',
  マダガスカル: 'Madagascar',
  ジンバブエ: 'Zimbabwe',
  ナミビア: 'Namibia',
  マラウイ: 'Malawi',
  レソト: 'Lesotho',
  ボツワナ: 'Botswana',
  エスワティニ: 'Eswatini',
  コモロ: 'Comoros',
  モーリシャス: 'Mauritius',
};

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
    options?: SourceOptions
  ): Promise<SourceResult<BasicCountryInfo>> {
    console.log(`[country-api] Fetching country info for: ${destination}, context: ${options?.country || 'none'}`);

    try {
      // オプションの国名を優先、なければ目的地をそのまま使用
      // NOTE: 以前はハードコードされたマップを使用していましたが、
      // 上流(Gemini)で国名抽出が行われるため、options.countryの使用を優先します。
      let countryName = options?.country || destination;

      // 日本語の国名を英語に変換（REST Countries APIは英語名を期待）
      const englishName = this.convertToEnglishCountryName(countryName);
      if (englishName) {
        console.log(`[country-api] Converted Japanese "${countryName}" to English "${englishName}"`);
        countryName = englishName;
      }

      const shouldUseFullText = !!options?.country || !!englishName; // コンテキストがある場合は完全一致検索を試みる

      // REST Countries APIを呼び出し
      const countryData = await this.fetchCountryData(countryName, shouldUseFullText);

      if (!countryData) {
        return {
          success: false,
          error: `国情報が見つかりませんでした: ${countryName}`,
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
    return true;
  }

  /**
   * REST Countries APIからデータを取得
   */
  private async fetchCountryData(
    countryName: string,
    fullText: boolean
  ): Promise<RestCountryResponse | null> {
    let url = `${this.endpoint}/name/${encodeURIComponent(countryName)}`;

    // 完全一致検索パラメータ
    if (fullText) {
      url += '?fullText=true';
    }

    try {
      let response = await fetch(url);

      // 完全一致で失敗した場合、部分一致で再試行（オプション）
      // しかし、fullText=trueを指定している場合、通常は正確な国名を持っているはず
      if (!response.ok && fullText && response.status === 404) {
         // フォールバック: 部分一致検索
         const fallbackUrl = `${this.endpoint}/name/${encodeURIComponent(countryName)}`;
         console.log(`[country-api] Full text search failed, retrying partial: ${fallbackUrl}`);
         response = await fetch(fallbackUrl);
      }

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data[0]; // 最も可能性の高い結果（最初の要素）を返す
    } catch (e) {
      console.error(`[country-api] Fetch error for ${countryName}:`, e);
      throw e;
    }
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
    let timezone = 'UTC';
    let timeDifference = '時差情報なし';

    if (data.timezones && data.timezones.length > 0) {
      if (data.timezones.length === 1) {
        timezone = data.timezones[0];
        timeDifference = this.calculateTimeDifference(timezone);
      } else {
        // 複数のタイムゾーンがある場合
        // 例: UTC-05:00, UTC-06:00 ... -> UTC-05:00 〜 UTC-10:00
        const first = data.timezones[0];
        const last = data.timezones[data.timezones.length - 1];
        // APIが返す文字列が長すぎる場合があるため、簡易的に表示
        timezone = `${first} 〜 ${last}`;
        timeDifference = '地域により異なる';
      }
    }

    return {
      currency,
      languages,
      timezone,
      timeDifference,
    };
  }

  /**
   * 日本との時差を計算
   */
  private calculateTimeDifference(timezoneStr: string): string {
    // 日本標準時 (JST) = UTC+9
    const JST_OFFSET = 9;

    try {
      let offsetHours = 0;
      let offsetMinutes = 0;

      if (timezoneStr === 'UTC') {
        offsetHours = 0;
      } else if (timezoneStr.startsWith('UTC')) {
        // UTC+09:00 形式をパース
        // regex: UTC([+-])(\d{1,2}):(\d{2})
        const match = timezoneStr.match(/^UTC([+-])(\d{1,2}):(\d{2})$/);
        if (match) {
          const sign = match[1] === '+' ? 1 : -1;
          const hours = parseInt(match[2], 10);
          const minutes = parseInt(match[3], 10);

          offsetHours = sign * hours;

          // 分単位の時差がある場合（例: UTC+05:45, UTC-03:30）は小数で表現して計算
          if (minutes > 0) {
             offsetHours += (sign * minutes) / 60;
          }
        } else {
            // パース失敗時はそのまま
            console.warn(`[country-api] Unknown timezone format: ${timezoneStr}`);
            return '時差情報なし';
        }
      } else {
          // その他の形式（APIは基本的にUTCオフセットを返すはずだが念のため）
          return '時差情報なし';
      }

      // 日本との時差 = 現地時間 - 日本時間
      // 例: 日本(UTC+9) vs NY(UTC-5) -> -5 - 9 = -14時間
      const diff = offsetHours - JST_OFFSET;

      if (diff === 0) {
        return '時差なし';
      }

      // 整数なら整数表示、小数なら小数表示（最大1桁）
      const formattedDiff = Number.isInteger(diff) ? diff.toString() : diff.toFixed(1);

      return diff > 0 ? `+${formattedDiff}時間` : `${formattedDiff}時間`;

    } catch (e) {
      console.error(`[country-api] Time diff calculation error: ${e}`);
      return '時差情報なし';
    }
  }

  /**
   * 日本語の国名を英語名に変換
   * @param japaneseName - 日本語の国名
   * @returns 英語名（変換できない場合はnull）
   */
  private convertToEnglishCountryName(japaneseName: string): string | null {
    return JAPANESE_TO_ENGLISH_COUNTRY[japaneseName] || null;
  }
}

/**
 * 国情報APIソースのファクトリ関数
 */
export function createCountryApiSource(config?: CountryApiConfig): CountryApiSource {
  return new CountryApiSource(config);
}
