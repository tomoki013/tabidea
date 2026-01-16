/**
 * 外務省海外安全情報API
 * Ministry of Foreign Affairs (MOFA) Safety Information API
 *
 * 外務省オープンデータを使用して海外安全情報を取得
 * https://www.ezairyu.mofa.go.jp/html/opendata/index.html
 *
 * データ形式: XML
 * 更新頻度: 5分毎
 * 利用条件: 無償、営利・非営利問わず自由利用可能
 */

import { XMLParser } from 'fast-xml-parser';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { z } from 'zod';

import {
  TravelInfoCategory,
  SourceType,
  SafetyInfo,
  TravelInfoSource,
  DangerLevel,
  EmergencyContact,
  Embassy,
  DANGER_LEVEL_DESCRIPTIONS,
} from '@/lib/types/travel-info';

import {
  ITravelInfoSource,
  SourceOptions,
  SourceResult,
  TravelInfoServiceError,
  ICacheManager,
} from '../interfaces';

// ============================================
// 設定・定数
// ============================================

/**
 * 外務省オープンデータのベースURL
 */
const MOFA_OPENDATA_BASE_URL = 'https://www.ezairyu.mofa.go.jp/opendata';

/**
 * 外務省海外安全ホームページのベースURL
 */
const MOFA_ANZEN_BASE_URL = 'https://www.anzen.mofa.go.jp';

/**
 * デフォルトタイムアウト（ミリ秒）
 */
const DEFAULT_TIMEOUT_MS = 20000;

/**
 * キャッシュのTTL（秒）- 5分（オープンデータの更新頻度に合わせる）
 */
const CACHE_TTL_SECONDS = 300;

/**
 * リトライ回数
 */
const MAX_RETRIES = 2;

/**
 * リトライ間隔（ミリ秒）
 */
const RETRY_DELAY_MS = 1000;

// ============================================
// 国コードマッピング
// ============================================

/**
 * 目的地名から外務省オープンデータの国コードへのマッピング
 * 国コードは国際電話の国番号に基づく
 */
const DESTINATION_TO_COUNTRY_CODE: Record<string, string> = {
  // アジア
  韓国: '0082',
  '韓国（ソウル）': '0082',
  ソウル: '0082',
  釜山: '0082',
  中国: '0086',
  北京: '0086',
  上海: '0086',
  香港: '0852',
  マカオ: '0853',
  台湾: '0886',
  台北: '0886',
  タイ: '0066',
  バンコク: '0066',
  チェンマイ: '0066',
  プーケット: '0066',
  ベトナム: '0084',
  ハノイ: '0084',
  ホーチミン: '0084',
  ダナン: '0084',
  シンガポール: '0065',
  マレーシア: '0060',
  クアラルンプール: '0060',
  インドネシア: '0062',
  バリ: '0062',
  ジャカルタ: '0062',
  フィリピン: '0063',
  マニラ: '0063',
  セブ: '0063',
  カンボジア: '0855',
  シェムリアップ: '0855',
  プノンペン: '0855',
  ミャンマー: '0095',
  ラオス: '0856',
  ブルネイ: '0673',
  インド: '0091',
  デリー: '0091',
  ムンバイ: '0091',
  ネパール: '0977',
  スリランカ: '0094',
  バングラデシュ: '0880',
  パキスタン: '0092',
  モンゴル: '0976',

  // オセアニア
  オーストラリア: '0061',
  シドニー: '0061',
  メルボルン: '0061',
  ケアンズ: '0061',
  ニュージーランド: '0064',
  オークランド: '0064',
  グアム: '1671',
  サイパン: '1670',
  フィジー: '0679',
  パラオ: '0680',
  タヒチ: '0689',
  ニューカレドニア: '0687',

  // ヨーロッパ
  ウクライナ: '0380',
  キーウ: '0380',
  イギリス: '0044',
  ロンドン: '0044',
  フランス: '0033',
  パリ: '0033',
  ドイツ: '0049',
  ベルリン: '0049',
  ミュンヘン: '0049',
  イタリア: '0039',
  ローマ: '0039',
  ミラノ: '0039',
  フィレンツェ: '0039',
  ベネチア: '0039',
  スペイン: '0034',
  マドリード: '0034',
  バルセロナ: '0034',
  ポルトガル: '0351',
  リスボン: '0351',
  オランダ: '0031',
  アムステルダム: '0031',
  ベルギー: '0032',
  ブリュッセル: '0032',
  スイス: '0041',
  チューリッヒ: '0041',
  ジュネーブ: '0041',
  オーストリア: '0043',
  ウィーン: '0043',
  チェコ: '0420',
  プラハ: '0420',
  ポーランド: '0048',
  ワルシャワ: '0048',
  クラクフ: '0048',
  ハンガリー: '0036',
  ブダペスト: '0036',
  ギリシャ: '0030',
  アテネ: '0030',
  トルコ: '0090',
  イスタンブール: '0090',
  クロアチア: '0385',
  ドブロブニク: '0385',
  フィンランド: '0358',
  ヘルシンキ: '0358',
  スウェーデン: '0046',
  ストックホルム: '0046',
  ノルウェー: '0047',
  オスロ: '0047',
  デンマーク: '0045',
  コペンハーゲン: '0045',
  アイルランド: '0353',
  ダブリン: '0353',
  アイスランド: '0354',
  ロシア: '0007',
  モスクワ: '0007',

  // 北米
  アメリカ: '1000',
  ニューヨーク: '1000',
  ロサンゼルス: '1000',
  サンフランシスコ: '1000',
  ラスベガス: '1000',
  ハワイ: '1808', // ハワイは別コードの可能性あり、一旦1808（ログ参照）
  ホノルル: '1808',
  カナダ: '9001', // ログ参照
  バンクーバー: '9001',
  トロント: '9001',

  // 中南米
  メキシコ: '0052',
  カンクン: '0052',
  ブラジル: '0055',
  リオデジャネイロ: '0055',
  サンパウロ: '0055',
  アルゼンチン: '0054',
  ブエノスアイレス: '0054',
  ペルー: '0051',
  リマ: '0051',
  マチュピチュ: '0051',
  チリ: '0056',
  キューバ: '0053',
  ハバナ: '0053',
  コスタリカ: '0506',

  // 中東
  UAE: '0971',
  ドバイ: '0971',
  アブダビ: '0971',
  カタール: '0974',
  ドーハ: '0974',
  イスラエル: '0972',
  ヨルダン: '0962',
  オマーン: '0968',
  バーレーン: '0973',
  クウェート: '0965',
  サウジアラビア: '0966',
  エジプト: '0020',
  カイロ: '0020',
  モロッコ: '0212',
  マラケシュ: '0212',

  // アフリカ
  南アフリカ: '0027',
  ケープタウン: '0027',
  ケニア: '0254',
  タンザニア: '0255',
  エチオピア: '0251',
  ガーナ: '0233',
  ナイジェリア: '0234',
  チュニジア: '0216',
  セネガル: '0221',
};

/**
 * 国コードから国名へのマッピング（逆引き用）
 */
const COUNTRY_CODE_TO_NAME: Record<string, string> = {
  '0082': '韓国',
  '0086': '中国',
  '0852': '香港',
  '0853': 'マカオ',
  '0886': '台湾',
  '0066': 'タイ',
  '0084': 'ベトナム',
  '0065': 'シンガポール',
  '0060': 'マレーシア',
  '0062': 'インドネシア',
  '0063': 'フィリピン',
  '0855': 'カンボジア',
  '0095': 'ミャンマー',
  '0856': 'ラオス',
  '0673': 'ブルネイ',
  '0091': 'インド',
  '0977': 'ネパール',
  '0094': 'スリランカ',
  '0880': 'バングラデシュ',
  '0092': 'パキスタン',
  '0976': 'モンゴル',
  '0061': 'オーストラリア',
  '0064': 'ニュージーランド',
  '1671': 'グアム',
  '1670': 'サイパン',
  '0679': 'フィジー',
  '0680': 'パラオ',
  '0689': 'タヒチ',
  '0687': 'ニューカレドニア',
  '0044': 'イギリス',
  '0033': 'フランス',
  '0049': 'ドイツ',
  '0039': 'イタリア',
  '0034': 'スペイン',
  '0351': 'ポルトガル',
  '0031': 'オランダ',
  '0032': 'ベルギー',
  '0041': 'スイス',
  '0043': 'オーストリア',
  '0420': 'チェコ',
  '0048': 'ポーランド',
  '0036': 'ハンガリー',
  '0030': 'ギリシャ',
  '0090': 'トルコ',
  '0385': 'クロアチア',
  '0358': 'フィンランド',
  '0046': 'スウェーデン',
  '0047': 'ノルウェー',
  '0045': 'デンマーク',
  '0353': 'アイルランド',
  '0354': 'アイスランド',
  '0007': 'ロシア',
  '0001': 'アメリカ',
  '0052': 'メキシコ',
  '0055': 'ブラジル',
  '0054': 'アルゼンチン',
  '0051': 'ペルー',
  '0056': 'チリ',
  '0053': 'キューバ',
  '0506': 'コスタリカ',
  '0971': 'UAE',
  '0974': 'カタール',
  '0972': 'イスラエル',
  '0962': 'ヨルダン',
  '0968': 'オマーン',
  '0973': 'バーレーン',
  '0965': 'クウェート',
  '0966': 'サウジアラビア',
  '0020': 'エジプト',
  '0212': 'モロッコ',
  '0027': '南アフリカ',
  '0254': 'ケニア',
  '0255': 'タンザニア',
  '0251': 'エチオピア',
  '0233': 'ガーナ',
  '0234': 'ナイジェリア',
  '0216': 'チュニジア',
  '0221': 'セネガル',
};

/**
 * 主要都市・国の緊急連絡先マッピング
 */
const EMERGENCY_CONTACTS_BY_COUNTRY: Record<string, EmergencyContact[]> = {
  '0066': [
    // タイ
    { name: '警察', number: '191' },
    { name: '救急車', number: '1669' },
    { name: 'ツーリストポリス', number: '1155' },
  ],
  '0063': [
    // フィリピン
    { name: '警察', number: '117' },
    { name: '救急・消防', number: '911' },
  ],
  '0084': [
    // ベトナム
    { name: '警察', number: '113' },
    { name: '救急', number: '115' },
    { name: '消防', number: '114' },
  ],
  '0065': [
    // シンガポール
    { name: '警察', number: '999' },
    { name: '救急・消防', number: '995' },
  ],
  '0082': [
    // 韓国
    { name: '警察', number: '112' },
    { name: '救急・消防', number: '119' },
    { name: '観光案内', number: '1330' },
  ],
  '0086': [
    // 中国
    { name: '警察', number: '110' },
    { name: '救急', number: '120' },
    { name: '消防', number: '119' },
  ],
  '0886': [
    // 台湾
    { name: '警察', number: '110' },
    { name: '救急・消防', number: '119' },
  ],
  '0001': [
    // アメリカ
    { name: '緊急通報（警察・消防・救急）', number: '911' },
  ],
  '0044': [
    // イギリス
    { name: '緊急通報（警察・消防・救急）', number: '999' },
    { name: 'EU緊急通報', number: '112' },
  ],
  '0033': [
    // フランス
    { name: '警察', number: '17' },
    { name: '救急', number: '15' },
    { name: '消防', number: '18' },
    { name: 'EU緊急通報', number: '112' },
  ],
  '0049': [
    // ドイツ
    { name: '警察', number: '110' },
    { name: '救急・消防', number: '112' },
  ],
  '0039': [
    // イタリア
    { name: '警察', number: '113' },
    { name: '救急', number: '118' },
    { name: '消防', number: '115' },
    { name: 'EU緊急通報', number: '112' },
  ],
  '0061': [
    // オーストラリア
    { name: '緊急通報（警察・消防・救急）', number: '000' },
  ],
};

/**
 * 主要国の日本大使館情報
 */
const EMBASSIES_BY_COUNTRY: Record<string, Embassy> = {
  '0066': {
    name: '在タイ日本国大使館',
    address: '177 Witthayu Road, Lumphini, Pathum Wan, Bangkok 10330',
    phone: '+66-2-207-8500',
  },
  '0063': {
    name: '在フィリピン日本国大使館',
    address: '2627 Roxas Boulevard, Pasay City, Metro Manila',
    phone: '+63-2-8551-5710',
  },
  '0084': {
    name: '在ベトナム日本国大使館',
    address: '27 Lieu Giai, Ba Dinh, Hanoi',
    phone: '+84-24-3846-3000',
  },
  '0065': {
    name: '在シンガポール日本国大使館',
    address: '16 Nassim Road, Singapore 258390',
    phone: '+65-6235-8855',
  },
  '0082': {
    name: '在大韓民国日本国大使館',
    address: '22-gil 6, Yulgok-ro, Jongno-gu, Seoul',
    phone: '+82-2-2170-5200',
  },
  '0086': {
    name: '在中華人民共和国日本国大使館',
    address: '1 Liangmaqiao Dongjie, Chaoyang District, Beijing 100600',
    phone: '+86-10-8531-9800',
  },
  '0001': {
    name: '在アメリカ合衆国日本国大使館',
    address: '2520 Massachusetts Avenue, N.W., Washington, D.C. 20008',
    phone: '+1-202-238-6700',
  },
  '0044': {
    name: '在英国日本国大使館',
    address: '101-104 Piccadilly, London W1J 7JT',
    phone: '+44-20-7465-6500',
  },
  '0033': {
    name: '在フランス日本国大使館',
    address: '7 Avenue Hoche, 75008 Paris',
    phone: '+33-1-48-88-62-00',
  },
};

// ============================================
// XML パーサー型定義
// ============================================

/**
 * 外務省オープンデータのXMLレスポンス構造（国別情報）
 * データフォーマット仕様に基づく
 * @see https://www.ezairyu.mofa.go.jp/html/opendata/index.html
 */
export interface MofaXmlResponse {
  /** 国・地域コード */
  countryCode?: string;
  /** 国・地域名 */
  countryName?: string;
  /** 危険レベル（1=該当あり、0=該当なし） */
  riskLevel1?: number; // 十分注意
  riskLevel2?: number; // 不要不急の渡航中止
  riskLevel3?: number; // 渡航中止勧告
  riskLevel4?: number; // 退避勧告
  /** 感染症危険レベル（1=該当あり、0=該当なし） */
  infectionLevel1?: number;
  infectionLevel2?: number;
  infectionLevel3?: number;
  infectionLevel4?: number;
  /** 危険情報日時 */
  riskLeaveDate?: string;
  /** 危険情報タイトル */
  riskTitle?: string;
  /** 危険情報リード */
  riskLead?: string;
  /** 危険情報概要 */
  riskSubText?: string;
  /** メール情報（配列または単一オブジェクト） */
  mail?: MofaMailEntry | MofaMailEntry[];
  /** 広域・スポット情報（配列または単一オブジェクト） */
  wideareaSpot?: MofaSpotEntry | MofaSpotEntry[];
}

interface MofaMailEntry {
  title?: string;
  lead?: string;
  mainText?: string;
  leaveDate?: string;
}

interface MofaSpotEntry {
  title?: string;
  lead?: string;
  mainText?: string;
  leaveDate?: {
    '#text'?: string;
  };
}

interface MofaOpendataResult {
  opendata: MofaXmlResponse;
}

// ============================================
// 設定インターフェース
// ============================================

/**
 * 外務省API設定
 */
export interface MofaApiConfig {
  /** APIエンドポイント（カスタム用、通常は不要） */
  endpoint?: string;
  /** タイムアウト（ミリ秒） */
  timeout?: number;
  /** キャッシュマネージャー */
  cacheManager?: ICacheManager;
  /** キャッシュTTL（秒） */
  cacheTtlSeconds?: number;
}

// ============================================
// MofaApiSource クラス
// ============================================

/**
 * 外務省海外安全情報ソース
 * 外務省オープンデータAPIを使用して安全情報を取得
 */
export class MofaApiSource implements ITravelInfoSource<SafetyInfo> {
  readonly sourceName = '外務省海外安全情報';
  readonly sourceType: SourceType = 'official_api';
  readonly reliabilityScore = 95; // 公式情報のため高信頼性
  readonly supportedCategories: TravelInfoCategory[] = ['safety'];

  private readonly config: Required<
    Pick<MofaApiConfig, 'timeout' | 'cacheTtlSeconds'>
  > &
    Pick<MofaApiConfig, 'endpoint' | 'cacheManager'>;

  private readonly parser: XMLParser;

  constructor(config: MofaApiConfig = {}) {
    this.config = {
      endpoint: config.endpoint,
      timeout: config.timeout ?? DEFAULT_TIMEOUT_MS,
      cacheManager: config.cacheManager,
      cacheTtlSeconds: config.cacheTtlSeconds ?? CACHE_TTL_SECONDS,
    };

    // XMLパーサーの初期化
    this.parser = new XMLParser({
      ignoreAttributes: true, // 属性は基本的に不要（areaCdなど）
      parseTagValue: true,    // 数値の自動変換（0/1など）を有効化
      isArray: (name) => ['mail', 'wideareaSpot'].includes(name), // 配列として扱う要素
    });
  }

  /**
   * 安全情報を取得
   */
  async fetch(
    destination: string,
    options?: SourceOptions
  ): Promise<SourceResult<SafetyInfo>> {
    console.log(`[mofa-api] Fetching safety info for: ${destination}`);

    try {
      // 1. 目的地から国コードを取得
      let countryCode = this.resolveCountryCode(destination);

      // フォールバック: 指定された国名からコードを取得
      if (!countryCode && options?.country) {
        console.log(`[mofa-api] Destination code not found, trying country: ${options.country}`);
        countryCode = this.resolveCountryCode(options.country);
      }

      if (!countryCode) {
        console.warn(
          `[mofa-api] Unknown destination: ${destination}, will use default safety info`
        );
        return this.getDefaultSafetyInfo(destination);
      }

      // 2. キャッシュをチェック
      const cacheKey = this.getCacheKey(countryCode);
      if (this.config.cacheManager) {
        const cached = await this.config.cacheManager.get<SafetyInfo>(cacheKey);
        if (cached) {
          console.log(`[mofa-api] Cache hit for: ${countryCode}`);
          return {
            success: true,
            data: cached.data,
            source: this.createSource(countryCode),
          };
        }
      }

      // 3. 外務省オープンデータからXMLを取得
      const safetyInfo = await this.fetchFromOpenData(
        countryCode,
        options?.timeout ?? this.config.timeout,
        destination
      );

      // 4. キャッシュに保存
      if (this.config.cacheManager && safetyInfo) {
        await this.config.cacheManager.set(cacheKey, safetyInfo, {
          ttlSeconds: this.config.cacheTtlSeconds,
        });
      }

      if (!safetyInfo) {
        return this.getDefaultSafetyInfo(destination);
      }

      const result: SourceResult<SafetyInfo> = {
        success: true,
        data: safetyInfo,
        source: this.createSource(countryCode),
      };
      // ログ出力は過剰なため省略（または要約のみ出力）
      console.log(`[mofa-api] Successfully fetched safety info for ${destination} (Level: ${safetyInfo.dangerLevel})`);
      return result;
    } catch (error) {
      console.error('[mofa-api] Error:', error);

      // エラー時はデフォルトの安全情報を返す（フォールバック）
      return this.getDefaultSafetyInfo(destination);
    }
  }

  /**
   * ソースが利用可能かチェック
   */
  async isAvailable(): Promise<boolean> {
    try {
      // ヘルスチェックとしてタイ（0066）の情報を取得してみる
      const testUrl = `${MOFA_OPENDATA_BASE_URL}/country/0066A.xml`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(testUrl, {
        method: 'HEAD',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch {
      console.warn('[mofa-api] Health check failed');
      return false;
    }
  }

  // ============================================
  // プライベートメソッド
  // ============================================

  /**
   * 目的地名から国コードを解決
   */
  private resolveCountryCode(destination: string): string | null {
    // 1. 完全一致（日本語）
    if (DESTINATION_TO_COUNTRY_CODE[destination]) {
      return DESTINATION_TO_COUNTRY_CODE[destination];
    }

    // 2. 英語名からの解決（COUNTRY_CODE_TO_NAMEの逆引き）
    // Gemini等から英語の国名が渡される場合に対応（例: "United States" -> "0001"）
    // 注: COUNTRY_CODE_TO_NAME は "0001": "アメリカ" のようなマップ
    // 英語名を解決するには別途英語名マップが必要だが、簡易的に英語名対応を追加
    const englishToCode: Record<string, string> = {
      'United States': '1000',
      'USA': '1000',
      'Korea': '0082',
      'South Korea': '0082',
      'China': '0086',
      'Taiwan': '0886',
      'Thailand': '0066',
      'Vietnam': '0084',
      'Singapore': '0065',
      'Malaysia': '0060',
      'Indonesia': '0062',
      'Philippines': '0063',
      'Cambodia': '0855',
      'India': '0091',
      'Australia': '0061',
      'New Zealand': '0064',
      'UK': '0044',
      'United Kingdom': '0044',
      'France': '0033',
      'Germany': '0049',
      'Italy': '0039',
      'Spain': '0034',
      'Canada': '9001',
      'Hawaii': '1808',
      'Guam': '1671',
    };

    if (englishToCode[destination]) {
       return englishToCode[destination];
    }

    // 3. 部分一致（都市名から国を推測）
    const normalizedDest = destination
      .replace(/[（）()]/g, '')
      .replace(/\s+/g, '');

    for (const [key, code] of Object.entries(DESTINATION_TO_COUNTRY_CODE)) {
      if (
        normalizedDest.includes(key) ||
        key.includes(normalizedDest)
      ) {
        return code;
      }
    }

    return null;
  }

  /**
   * キャッシュキーを生成
   */
  private getCacheKey(countryCode: string): string {
    return `mofa:safety:${countryCode}`;
  }

  /**
   * ソース情報を作成
   */
  private createSource(countryCode: string): TravelInfoSource {
    return {
      sourceType: this.sourceType,
      sourceName: this.sourceName,
      sourceUrl: `${MOFA_ANZEN_BASE_URL}/info/pcinfectionspothazardinfo_${countryCode.replace(/^0+/, '')}.html`,
      retrievedAt: new Date(),
      reliabilityScore: this.reliabilityScore,
    };
  }

  /**
   * 外務省オープンデータからXMLを取得してパース
   */
  private async fetchFromOpenData(
    countryCode: string,
    timeout: number,
    destination: string
  ): Promise<SafetyInfo | null> {
    const url = `${MOFA_OPENDATA_BASE_URL}/country/${countryCode}A.xml`;
    console.log(`[mofa-api] Fetching: ${url}`);

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(url, {
          signal: controller.signal,
          headers: {
            Accept: 'application/xml, text/xml',
            'User-Agent': 'AI-Travel-Planner/1.0',
          },
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          if (response.status === 404) {
            console.warn(`[mofa-api] Country not found: ${countryCode}`);
            return null;
          }
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const xmlText = await response.text();

        // ログ出力を削除 (パフォーマンス改善)
        // console.log(`[mofa-api] Response for ${countryCode}:`, xmlText);

        // XMLかどうかチェック（HTMLエラーページの場合は弾く）
        if (!xmlText.trim().startsWith('<') || !xmlText.includes('<opendata')) {
          throw new Error(`Invalid XML response for ${countryCode}`);
        }

        return await this.parseXmlResponse(xmlText, countryCode, destination);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.warn(
          `[mofa-api] Attempt ${attempt + 1}/${MAX_RETRIES + 1} failed:`,
          lastError.message
        );

        if (attempt < MAX_RETRIES) {
          await this.delay(RETRY_DELAY_MS * (attempt + 1));
        }
      }
    }

    throw new TravelInfoServiceError(
      'NETWORK_ERROR',
      `Failed to fetch MOFA data after ${MAX_RETRIES + 1} attempts`,
      this.sourceName,
      lastError ?? undefined
    );
  }

  /**
   * XMLレスポンスをパースしてSafetyInfoに変換
   */
  private async parseXmlResponse(
    xmlText: string,
    countryCode: string,
    destination: string
  ): Promise<SafetyInfo> {
    try {
      const result = this.parser.parse(xmlText) as MofaOpendataResult;
      const opendata = result.opendata;

      if (!opendata) {
        throw new Error('Invalid XML structure: missing opendata');
      }

      const dangerLevel = this.extractDangerLevel(opendata);
      const warnings = this.extractWarnings(opendata);

      // 追加情報の抽出
      const lead = opendata.riskLead?.trim();
      const subText = opendata.riskSubText?.trim();

      // 目的地の特定危険レベルを判定
      let specificDangerLevel = dangerLevel;
      let maxCountryLevel = dangerLevel;
      let isPartialCountryRisk = false;

      const countryName = COUNTRY_CODE_TO_NAME[countryCode];

      // 目的地が国名そのものでない場合（都市名などの場合）、かつ危険レベルが1以上の場合
      if (dangerLevel > 0 && countryName && destination !== countryName && !destination.includes(countryName)) {
        // AIを使用して特定レベルを判定
        try {
          const aiResult = await this.determineRiskWithAI(
            (lead || '') + '\n' + (subText || ''),
            destination,
            countryName,
            dangerLevel
          );

          if (aiResult) {
            specificDangerLevel = aiResult.specificLevel as DangerLevel;
            maxCountryLevel = aiResult.maxCountryLevel as DangerLevel;
            console.log(`[mofa-api] AI Determined Risk for ${destination}: ${specificDangerLevel} (Country Max: ${maxCountryLevel})`);
          } else {
            // AI判定失敗時のフォールバック（ヒューリスティック）
             const combinedText = (lead || '') + (subText || '');
             const wholeCountryKeywords = ['全土', '全域', '国全土', '国内全域'];
             const hasWholeCountryKeyword = wholeCountryKeywords.some(keyword => combinedText.includes(keyword));

             if (!hasWholeCountryKeyword) {
               // 「全土」キーワードがない場合
               if (combinedText.includes(destination)) {
                  // テキストに目的地が含まれている場合 -> 念のため最大レベルを適用（安全サイド）
                  specificDangerLevel = maxCountryLevel;
               } else {
                  // テキストに目的地が含まれておらず、全土指定でもない -> レベル0（安全）とみなす
                  specificDangerLevel = 0;
               }
             }
             console.log(`[mofa-api] Heuristic Risk for ${destination}: ${specificDangerLevel} (Country Max: ${maxCountryLevel})`);
          }
        } catch (e) {
          console.warn('[mofa-api] AI analysis failed, using fallback:', e);
           // AI判定失敗時のフォールバック（ヒューリスティック）- 同上
             const combinedText = (lead || '') + (subText || '');
             const wholeCountryKeywords = ['全土', '全域', '国全土', '国内全域'];
             const hasWholeCountryKeyword = wholeCountryKeywords.some(keyword => combinedText.includes(keyword));

             if (!hasWholeCountryKeyword) {
               if (combinedText.includes(destination)) {
                  specificDangerLevel = maxCountryLevel;
               } else {
                  specificDangerLevel = 0;
               }
             }
        }
      }

      // 部分的リスクフラグ（表示制御用）
      isPartialCountryRisk = specificDangerLevel < maxCountryLevel;

      return {
        dangerLevel: specificDangerLevel,
        maxCountryLevel,
        dangerLevelDescription: DANGER_LEVEL_DESCRIPTIONS[specificDangerLevel],
        lead,
        subText,
        isPartialCountryRisk,
        warnings,
        emergencyContacts:
          EMERGENCY_CONTACTS_BY_COUNTRY[countryCode] ||
          this.getDefaultEmergencyContacts(),
        nearestEmbassy: EMBASSIES_BY_COUNTRY[countryCode],
      };
    } catch (e) {
      console.error('[mofa-api] XML Parse Error:', e);
      // パースエラー時はデフォルト値を返す
      return {
        dangerLevel: 0,
        dangerLevelDescription: DANGER_LEVEL_DESCRIPTIONS[0],
        warnings: ['データの解析中にエラーが発生しました。最新の情報を外務省ホームページでご確認ください。'],
        emergencyContacts: this.getDefaultEmergencyContacts(),
        nearestEmbassy: EMBASSIES_BY_COUNTRY[countryCode],
      };
    }
  }

  /**
   * AIを使用してリスクレベルを判定
   */
  private async determineRiskWithAI(
    text: string,
    destination: string,
    country: string,
    xmlMaxLevel: number
  ): Promise<{ specificLevel: number; maxCountryLevel: number } | null> {
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) return null;

    try {
      const google = createGoogleGenerativeAI({ apiKey });
      const modelName = process.env.GOOGLE_MODEL_NAME || 'gemini-2.5-flash';

      const schema = z.object({
        specificLevel: z.number().min(0).max(4).describe(`The danger level (0-4) specifically for ${destination}.`),
        maxCountryLevel: z.number().min(0).max(4).describe(`The maximum danger level mentioned for ${country}.`),
        reason: z.string().describe("The reasoning for the decision."),
      });

      const prompt = `
        You are a travel safety analyst. Analyze the following safety information text from the Ministry of Foreign Affairs of Japan (MOFA).

        Information Source: MOFA Open Data
        Country: ${country}
        Target Destination: ${destination}
        MOFA XML Reported Max Level: ${xmlMaxLevel}

        Text (Lead & SubText):
        """
        ${text}
        """

        Task:
        1. Determine the specific danger level (0-4) for the 'Target Destination' based on the text.
           - If the text explicitly mentions the destination with a level, use that.
           - If the text says the "Whole Country" or "All areas" has a certain level, apply that.
           - If the text specifies high risks for *other* regions but does NOT mention the destination or "Whole Country", assume the destination is safe (likely Level 0 or 1, refer to context).
           - Major tourist cities often have lower risks than border regions.
        2. Determine the maximum danger level mentioned for the entire country in the text.

        Constraint:
        - The 'maxCountryLevel' should generally match or exceed the 'specificLevel'.
        - If the text is ambiguous, prefer the safer side (higher level), but do not incorrectly flag safe cities as dangerous if the text clearly targets specific other zones.
      `;

      const { object } = await generateObject({
        model: google(modelName),
        schema,
        prompt,
      });

      return object;
    } catch (error) {
      console.error('[mofa-api] AI determination error:', error);
      return null;
    }
  }

  /**
   * XMLオブジェクトから危険度レベルを抽出
   */
  private extractDangerLevel(opendata: MofaXmlResponse): DangerLevel {
    // 1(該当あり)か0(該当なし)かチェック
    // XMLParserの設定(parseTagValue: true)により数値として取得される想定

    // 退避勧告が最優先
    if (opendata.riskLevel4 === 1) return 4;
    if (opendata.riskLevel3 === 1) return 3;
    if (opendata.riskLevel2 === 1) return 2;
    if (opendata.riskLevel1 === 1) return 1;

    // 全て0または未定義の場合はレベル0（危険情報なし）
    return 0;
  }

  /**
   * XMLオブジェクトから感染症危険度レベルを抽出
   */
  private extractInfectionLevel(opendata: MofaXmlResponse): DangerLevel {
    if (opendata.infectionLevel4 === 1) return 4;
    if (opendata.infectionLevel3 === 1) return 3;
    if (opendata.infectionLevel2 === 1) return 2;
    if (opendata.infectionLevel1 === 1) return 1;

    return 0;
  }

  /**
   * XMLオブジェクトから警告情報を抽出
   */
  private extractWarnings(opendata: MofaXmlResponse): string[] {
    const warnings: string[] = [];

    // 1. 危険情報のリード（riskLead）
    if (opendata.riskLead && typeof opendata.riskLead === 'string') {
      const lead = opendata.riskLead.trim();
      if (lead.length > 0) {
        warnings.push(lead);
      }
    }

    // 2. 広域・スポット情報のタイトルとリード
    // isArray設定により、wideareaSpotは常に配列として扱われる
    if (Array.isArray(opendata.wideareaSpot)) {
      for (const spot of opendata.wideareaSpot) {
        if (warnings.length >= 5) break;

        if (spot.title) {
          const title = spot.title.trim();
          if (title && !warnings.includes(title)) {
            warnings.push(title);
          }
        }
      }
    }

    // 3. メール情報のタイトル
    // isArray設定により、mailは常に配列として扱われる
    if (Array.isArray(opendata.mail)) {
      for (const mail of opendata.mail) {
        if (warnings.length >= 5) break;

        if (mail.title) {
          const title = mail.title.trim();
          if (title && !warnings.includes(title)) {
            warnings.push(title);
          }
        }
      }
    }

    // 警告がない場合は一般的な注意事項を追加
    if (warnings.length === 0) {
      warnings.push('最新の渡航情報を確認してください');
      warnings.push('海外旅行保険への加入を推奨します');
    }

    return warnings.slice(0, 5); // 最大5件
  }

  /**
   * デフォルトの緊急連絡先を取得
   */
  private getDefaultEmergencyContacts(): EmergencyContact[] {
    return [
      { name: '外務省領事サービスセンター', number: '+81-3-5501-8162' },
      {
        name: '在外公館連絡先検索',
        number: 'https://www.mofa.go.jp/mofaj/annai/zaigai/',
      },
    ];
  }

  /**
   * デフォルトの安全情報を返す
   * APIからデータを取得できない場合のフォールバック
   * 危険レベルは0（危険情報なし）として扱う
   */
  private getDefaultSafetyInfo(
    destination: string
  ): SourceResult<SafetyInfo> {
    console.log(`[mofa-api] Using default safety info for: ${destination}`);

    const defaultInfo: SafetyInfo = {
      dangerLevel: 0,
      dangerLevelDescription: DANGER_LEVEL_DESCRIPTIONS[0],
      warnings: [
        '最新の渡航情報は外務省海外安全ホームページでご確認ください',
        '海外旅行保険への加入を強くお勧めします',
        '「たびレジ」への登録をお勧めします',
      ],
      emergencyContacts: this.getDefaultEmergencyContacts(),
    };

    return {
      success: true,
      data: defaultInfo,
      source: {
        sourceType: 'ai_generated', // フォールバックのため
        sourceName: `${this.sourceName}（デフォルト）`,
        sourceUrl: MOFA_ANZEN_BASE_URL,
        retrievedAt: new Date(),
        reliabilityScore: 50, // デフォルトデータは信頼性低め
      },
    };
  }

  /**
   * 遅延処理
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// ============================================
// ファクトリ関数
// ============================================

/**
 * 外務省APIソースのファクトリ関数
 */
export function createMofaApiSource(config?: MofaApiConfig): MofaApiSource {
  return new MofaApiSource(config);
}

// ============================================
// ユーティリティ関数（エクスポート）
// ============================================

/**
 * 目的地から国コードを取得
 */
export function getCountryCodeByDestination(destination: string): string | null {
  if (DESTINATION_TO_COUNTRY_CODE[destination]) {
    return DESTINATION_TO_COUNTRY_CODE[destination];
  }

  const normalizedDest = destination
    .replace(/[（）()]/g, '')
    .replace(/\s+/g, '');

  for (const [key, code] of Object.entries(DESTINATION_TO_COUNTRY_CODE)) {
    if (normalizedDest.includes(key) || key.includes(normalizedDest)) {
      return code;
    }
  }

  return null;
}

/**
 * 国コードから国名を取得
 */
export function getCountryNameByCode(countryCode: string): string | null {
  return COUNTRY_CODE_TO_NAME[countryCode] || null;
}

/**
 * 対応している目的地一覧を取得
 */
export function getSupportedDestinations(): string[] {
  return Object.keys(DESTINATION_TO_COUNTRY_CODE);
}

/**
 * 国コードの緊急連絡先を取得
 */
export function getEmergencyContactsByCode(
  countryCode: string
): EmergencyContact[] | null {
  return EMERGENCY_CONTACTS_BY_COUNTRY[countryCode] || null;
}

/**
 * 国コードの大使館情報を取得
 */
export function getEmbassyByCode(countryCode: string): Embassy | null {
  return EMBASSIES_BY_COUNTRY[countryCode] || null;
}
