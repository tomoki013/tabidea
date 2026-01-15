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
const DEFAULT_TIMEOUT_MS = 10000;

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
  アメリカ: '0001',
  ニューヨーク: '0001',
  ロサンゼルス: '0001',
  サンフランシスコ: '0001',
  ラスベガス: '0001',
  ハワイ: '0001',
  ホノルル: '0001',
  カナダ: '0001', // カナダも+1
  バンクーバー: '0001',
  トロント: '0001',

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
 * 外務省オープンデータのXMLレスポンス構造
 */
interface MofaXmlResponse {
  /** 国・地域コード */
  code?: string;
  /** 国・地域名 */
  name?: string;
  /** 危険情報 */
  dangerInfo?: {
    /** 危険レベル（複数地域の場合配列） */
    level?: string | string[];
    /** 危険情報の詳細テキスト */
    description?: string;
    /** 更新日 */
    updatedAt?: string;
  };
  /** スポット情報 */
  spotInfo?: {
    title?: string;
    description?: string;
    publishedAt?: string;
  }[];
  /** 感染症危険情報 */
  infectiousInfo?: {
    level?: string;
    description?: string;
    updatedAt?: string;
  };
  /** 広域情報 */
  wideAreaInfo?: {
    title?: string;
    description?: string;
  }[];
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

  constructor(config: MofaApiConfig = {}) {
    this.config = {
      endpoint: config.endpoint,
      timeout: config.timeout ?? DEFAULT_TIMEOUT_MS,
      cacheManager: config.cacheManager,
      cacheTtlSeconds: config.cacheTtlSeconds ?? CACHE_TTL_SECONDS,
    };
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
      const countryCode = this.resolveCountryCode(destination);
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
        destination,
        options?.timeout ?? this.config.timeout
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

      return {
        success: true,
        data: safetyInfo,
        source: this.createSource(countryCode),
      };
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
      // ヘルスチェックとして日本（0081）の情報を取得してみる
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
    // 完全一致
    if (DESTINATION_TO_COUNTRY_CODE[destination]) {
      return DESTINATION_TO_COUNTRY_CODE[destination];
    }

    // 部分一致（都市名から国を推測）
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
    const countryName = COUNTRY_CODE_TO_NAME[countryCode] || '不明';
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
    destination: string,
    timeout: number
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
        return this.parseXmlResponse(xmlText, countryCode, destination);
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
  private parseXmlResponse(
    xmlText: string,
    countryCode: string,
    destination: string
  ): SafetyInfo {
    // シンプルなXMLパース（外部ライブラリなし）
    const dangerLevel = this.extractDangerLevel(xmlText);
    const warnings = this.extractWarnings(xmlText);

    return {
      dangerLevel,
      dangerLevelDescription: DANGER_LEVEL_DESCRIPTIONS[dangerLevel],
      warnings,
      emergencyContacts:
        EMERGENCY_CONTACTS_BY_COUNTRY[countryCode] ||
        this.getDefaultEmergencyContacts(),
      nearestEmbassy: EMBASSIES_BY_COUNTRY[countryCode],
    };
  }

  /**
   * XMLから危険度レベルを抽出
   */
  private extractDangerLevel(xmlText: string): DangerLevel {
    // 危険度レベルのパターンマッチング
    // 外務省XMLには「レベル1」「レベル2」などの形式で記載
    const levelPatterns = [
      /レベル(\d)/g,
      /level[:\s]*(\d)/gi,
      /危険度[:\s]*(\d)/g,
      /<level>(\d)<\/level>/gi,
      /<dangerLevel>(\d)<\/dangerLevel>/gi,
    ];

    let maxLevel = 0;

    for (const pattern of levelPatterns) {
      let match;
      while ((match = pattern.exec(xmlText)) !== null) {
        const level = parseInt(match[1], 10);
        if (level >= 1 && level <= 4 && level > maxLevel) {
          maxLevel = level;
        }
      }
    }

    // 特定のキーワードによる推測
    if (maxLevel === 0) {
      if (
        xmlText.includes('退避してください') ||
        xmlText.includes('退避勧告')
      ) {
        return 4;
      }
      if (
        xmlText.includes('渡航は止めてください') ||
        xmlText.includes('渡航中止勧告')
      ) {
        return 3;
      }
      if (xmlText.includes('不要不急の渡航は止めてください')) {
        return 2;
      }
      if (xmlText.includes('十分注意してください')) {
        return 1;
      }
    }

    // デフォルトはレベル1（最も低い警戒レベル）
    return (maxLevel || 1) as DangerLevel;
  }

  /**
   * XMLから警告情報を抽出
   */
  private extractWarnings(xmlText: string): string[] {
    const warnings: string[] = [];

    // スポット情報のタイトルを抽出
    const spotTitlePattern =
      /<spotTitle>([^<]+)<\/spotTitle>|<title>([^<]+)<\/title>/gi;
    let match;
    while ((match = spotTitlePattern.exec(xmlText)) !== null) {
      const title = match[1] || match[2];
      if (title && title.trim().length > 0) {
        warnings.push(title.trim());
      }
    }

    // 特定の警告キーワードを含む文を抽出
    const warningKeywords = [
      '注意',
      '警戒',
      '危険',
      'テロ',
      '犯罪',
      '感染症',
      '自然災害',
      'デモ',
      '暴動',
    ];

    const sentences = xmlText
      .replace(/<[^>]+>/g, ' ')
      .split(/[。.！!？?]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 10 && s.length < 200);

    for (const sentence of sentences) {
      for (const keyword of warningKeywords) {
        if (
          sentence.includes(keyword) &&
          !warnings.some((w) => w.includes(sentence))
        ) {
          warnings.push(sentence);
          break;
        }
      }
      if (warnings.length >= 5) break; // 最大5件
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
   */
  private getDefaultSafetyInfo(
    destination: string
  ): SourceResult<SafetyInfo> {
    console.log(`[mofa-api] Using default safety info for: ${destination}`);

    const defaultInfo: SafetyInfo = {
      dangerLevel: 1,
      dangerLevelDescription: DANGER_LEVEL_DESCRIPTIONS[1],
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
