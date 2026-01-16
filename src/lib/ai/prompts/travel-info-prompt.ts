/**
 * 渡航情報生成用プロンプトテンプレート
 * Gemini Web検索を活用した構造化情報生成
 */

import type {
  TravelInfoCategory,
  BasicCountryInfo,
  SafetyInfo,
  ClimateInfo,
  VisaInfo,
  MannerInfo,
  TransportInfo,
  LocalFoodInfo,
  SouvenirInfo,
  EventsInfo,
  CategoryDataMap,
  DangerLevel,
} from '@/lib/types/travel-info';

// ============================================
// 型定義
// ============================================

/**
 * プロンプト生成結果の型（Geminiからの応答をパースした結果）
 */
export interface TravelInfoPromptResult<T extends TravelInfoCategory = TravelInfoCategory> {
  category: T;
  content: CategoryDataMap[T];
  sources: ParsedSource[];
  confidence: number;
  lastVerified: string;
}

/**
 * パースされた情報ソース
 */
export interface ParsedSource {
  name: string;
  url: string;
  type: 'official' | 'news' | 'commercial' | 'personal';
}

/**
 * パースエラー
 */
export interface ParseError {
  category: TravelInfoCategory;
  error: string;
  rawResponse?: string;
}

/**
 * パース結果（成功または失敗）
 */
export type ParseResult<T extends TravelInfoCategory = TravelInfoCategory> =
  | { success: true; data: TravelInfoPromptResult<T> }
  | { success: false; error: ParseError };

// ============================================
// 情報収集の優先順位（システム共通）
// ============================================

const SOURCE_PRIORITY_INSTRUCTION = `
【情報収集の優先順位】
1. 公的機関の公式情報（外務省、大使館、政府観光局）
2. 信頼性の高いニュースソース（主要報道機関）
3. 旅行会社・航空会社の公式情報
4. 個人ブログ・口コミ（参考程度、確認が必要）

【注意事項】
- 推測や古い情報は避け、確認できる最新情報のみ記載してください
- 情報源のURLを必ず含めてください
- 確信度が低い場合はその旨を明記してください
- 情報が見つからない場合は無理に生成せず、「情報なし」と記載してください
`;

// ============================================
// カテゴリ別JSONスキーマ
// ============================================

const JSON_SCHEMAS: Record<TravelInfoCategory, string> = {
  basic: `{
  "currency": {
    "code": "string (通貨コード、例: THB)",
    "name": "string (通貨名、例: タイバーツ)",
    "symbol": "string (通貨記号、例: ฿)"
  },
  "exchangeRate": {
    "rate": "number (1円あたりのレート)",
    "baseCurrency": "JPY",
    "updatedAt": "string (ISO 8601形式)"
  },
  "languages": ["string (公用語リスト)"],
  "timezone": "string (タイムゾーン、例: Asia/Bangkok)",
  "timeDifference": "string (日本との時差、例: -2時間)"
}`,

  safety: `{
  "dangerLevel": "number (0-4の整数、外務省危険度レベル。0=危険情報なし、1=十分注意、2=不要不急の渡航中止、3=渡航中止勧告、4=退避勧告)",
  "dangerLevelDescription": "string (危険度の説明)",
  "warnings": ["string (注意事項・警告)"],
  "emergencyContacts": [
    {
      "name": "string (連絡先名、例: 警察)",
      "number": "string (電話番号)"
    }
  ],
  "nearestEmbassy": {
    "name": "string (大使館・領事館名)",
    "address": "string (住所)",
    "phone": "string (電話番号)"
  }
}`,

  climate: `{
  "currentWeather": {
    "temp": "number (現在気温、摂氏)",
    "condition": "string (天気状態)",
    "humidity": "number (湿度%)"
  },
  "forecast": [
    {
      "date": "string (YYYY-MM-DD)",
      "high": "number (最高気温)",
      "low": "number (最低気温)",
      "condition": "string (天気状態)"
    }
  ],
  "recommendedClothing": ["string (おすすめの服装)"],
  "seasonDescription": "string (季節の説明)"
}`,

  visa: `{
  "required": "boolean (ビザが必要かどうか)",
  "visaFreeStayDays": "number | null (ビザなし滞在可能日数)",
  "requirements": ["string (入国要件)"],
  "notes": ["string (補足事項)"]
}`,

  manner: `{
  "tipping": {
    "required": "boolean (チップが必須か)",
    "customary": "boolean (チップが慣習的か)",
    "guideline": "string (チップの目安)"
  },
  "customs": ["string (現地の習慣・マナー)"],
  "taboos": ["string (タブー・避けるべきこと)"]
}`,

  transport: `{
  "publicTransport": ["string (公共交通機関の情報)"],
  "rideshare": {
    "available": "boolean (ライドシェア利用可能か)",
    "services": ["string (利用可能なサービス名)"]
  },
  "drivingNotes": ["string (運転に関する注意事項)"]
}`,

  local_food: `{
  "popularDishes": [
    {
      "name": "string (料理名)",
      "description": "string (説明)",
      "approximatePrice": "string (価格帯)"
    }
  ],
  "diningEtiquette": ["string (食事のマナー・習慣)"]
}`,

  souvenir: `{
  "popularItems": [
    {
      "name": "string (商品名)",
      "description": "string (説明)",
      "approximatePrice": "string (価格帯)"
    }
  ],
  "shoppingAreas": ["string (おすすめの買い物エリア)"],
  "taxFreeInfo": "string (免税情報)"
}`,

  events: `{
  "majorEvents": [
    {
      "name": "string (イベント名)",
      "date": "string (開催時期)",
      "description": "string (内容)"
    }
  ],
  "seasonalFestivals": [
    {
      "name": "string (祭り名)",
      "date": "string (開催時期)",
      "description": "string (内容)"
    }
  ]
}`,
};

// ============================================
// カテゴリ別プロンプトテンプレート
// ============================================

/**
 * 安全情報用プロンプト
 */
function generateSafetyPrompt(destination: string, country: string): string {
  return `あなたは渡航安全情報の専門家です。
${destination}（${country}）への渡航に関する安全情報を提供してください。

【必須情報】
- 外務省の危険度レベル（レベル1〜4、該当なしの場合は1）
- 現在の治安状況
- 注意すべきエリア・犯罪傾向
- 緊急連絡先（警察、救急、日本大使館）

【出力形式】
以下のJSON形式で回答してください：
${JSON_SCHEMAS.safety}

【情報収集の優先ソース】
1. 外務省海外安全ホームページ
2. 在外日本大使館・領事館
3. 現地政府公式発表
4. 信頼性の高い報道機関

【Few-shot Example】
入力: バンコク（タイ）
出力:
{
  "dangerLevel": 1,
  "dangerLevelDescription": "十分注意してください。スリや置き引きに注意が必要です。",
  "warnings": [
    "観光地でのスリ・置き引きに注意",
    "タクシーのぼったくりに注意",
    "夜間の一人歩きは避ける"
  ],
  "emergencyContacts": [
    { "name": "警察", "number": "191" },
    { "name": "救急", "number": "1669" },
    { "name": "ツーリストポリス", "number": "1155" }
  ],
  "nearestEmbassy": {
    "name": "在タイ日本国大使館",
    "address": "177 Witthayu Road, Lumphini, Pathum Wan, Bangkok 10330",
    "phone": "+66-2-207-8500"
  }
}
${SOURCE_PRIORITY_INSTRUCTION}`;
}

/**
 * 基本情報用プロンプト
 */
function generateBasicPrompt(destination: string, country: string): string {
  return `あなたは海外渡航の基本情報に詳しい専門家です。
${destination}（${country}）の基本的な渡航情報を提供してください。

【必須情報】
- 現地通貨（コード、名称、記号）
- 為替レート（日本円との換算レート）
- 公用語
- タイムゾーンと日本との時差

【出力形式】
以下のJSON形式で回答してください：
${JSON_SCHEMAS.basic}

【情報収集の優先ソース】
1. 政府観光局
2. 外務省
3. 為替情報サイト（最新レート）

【Few-shot Example】
入力: パリ（フランス）
出力:
{
  "currency": {
    "code": "EUR",
    "name": "ユーロ",
    "symbol": "€"
  },
  "exchangeRate": {
    "rate": 0.0061,
    "baseCurrency": "JPY",
    "updatedAt": "2024-01-15T00:00:00Z"
  },
  "languages": ["フランス語"],
  "timezone": "Europe/Paris",
  "timeDifference": "-8時間（サマータイム時は-7時間）"
}
${SOURCE_PRIORITY_INSTRUCTION}`;
}

/**
 * 気候情報用プロンプト
 */
function generateClimatePrompt(
  destination: string,
  country: string,
  travelDates?: { start: Date; end: Date }
): string {
  const dateInfo = travelDates
    ? `渡航予定期間: ${travelDates.start.toISOString().split('T')[0]} 〜 ${travelDates.end.toISOString().split('T')[0]}`
    : '渡航予定期間: 未定';

  return `あなたは気象情報と旅行の服装アドバイスの専門家です。
${destination}（${country}）の気候情報を提供してください。
${dateInfo}

【必須情報】
- 現在の天気（気温、湿度、天気状態）
- 渡航期間中の天気予報（わかる範囲で）
- おすすめの服装
- 季節の特徴

【出力形式】
以下のJSON形式で回答してください：
${JSON_SCHEMAS.climate}

【情報収集の優先ソース】
1. 気象庁・現地気象機関
2. 天気予報サービス
3. 政府観光局の季節情報

【Few-shot Example】
入力: 台北（台湾）、渡航期間: 2024年8月
出力:
{
  "currentWeather": {
    "temp": 32,
    "condition": "晴れ時々曇り",
    "humidity": 75
  },
  "forecast": [
    { "date": "2024-08-01", "high": 34, "low": 27, "condition": "晴れ" },
    { "date": "2024-08-02", "high": 33, "low": 26, "condition": "曇り" }
  ],
  "recommendedClothing": [
    "薄手の半袖・半ズボン",
    "日焼け止め必須",
    "折りたたみ傘（突然のスコール対策）",
    "室内は冷房が強いため薄手の上着"
  ],
  "seasonDescription": "8月は夏本番。高温多湿で、午後にスコールが発生することがあります。"
}
${SOURCE_PRIORITY_INSTRUCTION}`;
}

/**
 * ビザ情報用プロンプト
 */
function generateVisaPrompt(destination: string, country: string): string {
  return `あなたは日本人旅行者向けのビザ・入国手続き情報の専門家です。
${destination}（${country}）への日本人の入国に関する情報を提供してください。

【必須情報】
- ビザの要否（日本国籍の場合）
- ビザなし滞在の場合の滞在可能日数
- 入国に必要な書類・条件
- 特記事項（電子渡航認証等）

【出力形式】
以下のJSON形式で回答してください：
${JSON_SCHEMAS.visa}

【情報収集の優先ソース】
1. 外務省ビザ情報
2. 相手国大使館・領事館
3. 入国管理局

【Few-shot Example】
入力: ホノルル（アメリカ）
出力:
{
  "required": false,
  "visaFreeStayDays": 90,
  "requirements": [
    "ESTA（電子渡航認証）の事前申請が必要",
    "有効なパスポート（帰国日まで有効）",
    "往復または第三国への航空券"
  ],
  "notes": [
    "ESTAは渡航72時間前までに申請推奨",
    "ESTA申請料は21ドル",
    "2年間有効（パスポート更新まで）"
  ]
}
${SOURCE_PRIORITY_INSTRUCTION}`;
}

/**
 * マナー情報用プロンプト
 */
function generateMannerPrompt(destination: string, country: string): string {
  return `あなたは海外の文化・マナーに詳しい専門家です。
${destination}（${country}）での現地マナーやチップ文化について情報を提供してください。

【必須情報】
- チップの習慣（必要か、相場）
- 現地で守るべきマナー・習慣
- 避けるべき行動・タブー

【出力形式】
以下のJSON形式で回答してください：
${JSON_SCHEMAS.manner}

【情報収集の優先ソース】
1. 政府観光局
2. 在外公館の渡航情報
3. 旅行ガイドブック

【Few-shot Example】
入力: ドバイ（UAE）
出力:
{
  "tipping": {
    "required": false,
    "customary": true,
    "guideline": "レストランでは10-15%程度。タクシーは端数切り上げ程度で十分。"
  },
  "customs": [
    "ラマダン期間中は日中の飲食を控える",
    "挨拶は握手が一般的（同性間）",
    "右手で食事をする"
  ],
  "taboos": [
    "公共の場での過度な肌の露出",
    "公共の場での飲酒（許可された場所以外）",
    "異性への不必要な接触",
    "イスラム教や王室への批判"
  ]
}
${SOURCE_PRIORITY_INSTRUCTION}`;
}

/**
 * 交通情報用プロンプト
 */
function generateTransportPrompt(destination: string, country: string): string {
  return `あなたは海外の交通事情に詳しい専門家です。
${destination}（${country}）での移動手段について情報を提供してください。

【必須情報】
- 主な公共交通機関
- ライドシェア・タクシー事情
- レンタカー・運転に関する注意（該当する場合）

【出力形式】
以下のJSON形式で回答してください：
${JSON_SCHEMAS.transport}

【情報収集の優先ソース】
1. 政府観光局
2. 現地交通機関公式サイト
3. 旅行ガイド

【Few-shot Example】
入力: シンガポール
出力:
{
  "publicTransport": [
    "MRT（地下鉄）が市内全域をカバー、安くて便利",
    "バスも充実、EZ-Linkカードで共通利用可能",
    "観光客向けのツーリストパスあり"
  ],
  "rideshare": {
    "available": true,
    "services": ["Grab", "Gojek", "ComfortDelGro"]
  },
  "drivingNotes": [
    "左側通行（日本と同じ）",
    "国際運転免許証で運転可能",
    "市内中心部はERP（電子道路課金）あり",
    "駐車場代が高額"
  ]
}
${SOURCE_PRIORITY_INSTRUCTION}`;
}

/**
 * グルメ情報用プロンプト
 */
function generateLocalFoodPrompt(destination: string, country: string): string {
  return `あなたは現地のグルメ情報に詳しい専門家です。
${destination}（${country}）の代表的な料理や食事のマナーについて情報を提供してください。

【必須情報】
- 代表的な料理（名前、説明、価格帯）
- 食事のマナー・習慣

【出力形式】
以下のJSON形式で回答してください：
${JSON_SCHEMAS.local_food}

【情報収集の優先ソース】
1. 政府観光局
2. グルメガイド
3. 旅行ガイドブック

【Few-shot Example】
入力: バンコク（タイ）
出力:
{
  "popularDishes": [
    {
      "name": "パッタイ",
      "description": "タイ風焼きそば。米粉の麺を甘酸っぱいタレで炒めたもの。",
      "approximatePrice": "50-100バーツ"
    },
    {
      "name": "トムヤムクン",
      "description": "世界三大スープの一つ。エビ入りの酸味と辛味が特徴のスープ。",
      "approximatePrice": "150-300バーツ"
    }
  ],
  "diningEtiquette": [
    "フォークとスプーンを使って食べるのが一般的",
    "麺類は箸を使うこともある",
    "音を立てて食べるのはマナー違反"
  ]
}
${SOURCE_PRIORITY_INSTRUCTION}`;
}

/**
 * お土産・買い物情報用プロンプト
 */
function generateSouvenirPrompt(destination: string, country: string): string {
  return `あなたは現地のショッピング情報に詳しい専門家です。
${destination}（${country}）のお土産や買い物について情報を提供してください。

【必須情報】
- 人気のお土産（名前、説明、価格帯）
- おすすめの買い物エリア
- 免税情報

【出力形式】
以下のJSON形式で回答してください：
${JSON_SCHEMAS.souvenir}

【情報収集の優先ソース】
1. 政府観光局
2. ショッピングモール公式サイト
3. 旅行ガイドブック

【Few-shot Example】
入力: 台北（台湾）
出力:
{
  "popularItems": [
    {
      "name": "パイナップルケーキ",
      "description": "台湾を代表する銘菓。サクサクの生地の中にパイナップル餡が入っている。",
      "approximatePrice": "300-500台湾ドル"
    },
    {
      "name": "台湾茶",
      "description": "高山茶や東方美人茶など、香り高いお茶が有名。",
      "approximatePrice": "500台湾ドル〜"
    }
  ],
  "shoppingAreas": [
    "西門町（若者の流行発信地）",
    "信義区（高級デパートが集まるエリア）",
    "迪化街（乾物や雑貨の問屋街）"
  ],
  "taxFreeInfo": "同一店舗で1日2,000台湾ドル以上の購入で消費税（5%）の還付申請が可能"
}
${SOURCE_PRIORITY_INSTRUCTION}`;
}

/**
 * イベント情報用プロンプト
 */
function generateEventsPrompt(
  destination: string,
  country: string,
  travelDates?: { start: Date; end: Date }
): string {
  const dateInfo = travelDates
    ? `渡航予定期間: ${travelDates.start.toISOString().split('T')[0]} 〜 ${travelDates.end.toISOString().split('T')[0]}`
    : '渡航予定期間: 未定';

  return `あなたは現地のイベント情報に詳しい専門家です。
${destination}（${country}）のイベントや祭りについて情報を提供してください。
${dateInfo}

【必須情報】
- 主要なイベント（名前、開催時期、内容）
- 季節の祭り

【出力形式】
以下のJSON形式で回答してください：
${JSON_SCHEMAS.events}

【情報収集の優先ソース】
1. 政府観光局
2. イベント公式サイト
3. ニュースサイト

【Few-shot Example】
入力: 京都（日本）、渡航期間: 7月
出力:
{
  "majorEvents": [
    {
      "name": "祇園祭",
      "date": "7月1日〜31日",
      "description": "日本三大祭りの一つ。1ヶ月間にわたり様々な神事が行われる。"
    }
  ],
  "seasonalFestivals": [
    {
      "name": "七夕のライトアップ",
      "date": "7月上旬〜8月上旬",
      "description": "鴨川や堀川などでライトアップイベントが開催される。"
    }
  ]
}
${SOURCE_PRIORITY_INSTRUCTION}`;
}

// ============================================
// メイン関数
// ============================================

/**
 * カテゴリ別の専用プロンプトを生成
 */
export function generateCategorySpecificPrompt(
  category: TravelInfoCategory,
  destination: string,
  country: string,
  travelDates?: { start: Date; end: Date }
): string {
  switch (category) {
    case 'basic':
      return generateBasicPrompt(destination, country);
    case 'safety':
      return generateSafetyPrompt(destination, country);
    case 'climate':
      return generateClimatePrompt(destination, country, travelDates);
    case 'visa':
      return generateVisaPrompt(destination, country);
    case 'manner':
      return generateMannerPrompt(destination, country);
    case 'transport':
      return generateTransportPrompt(destination, country);
    case 'local_food':
      return generateLocalFoodPrompt(destination, country);
    case 'souvenir':
      return generateSouvenirPrompt(destination, country);
    case 'events':
      return generateEventsPrompt(destination, country, travelDates);
    default:
      throw new Error(`Unknown category: ${category}`);
  }
}

/**
 * 渡航情報取得用の統合プロンプトを生成
 * 複数カテゴリをまとめて問い合わせる場合に使用
 */
export function generateTravelInfoPrompt(
  destination: string,
  country: string,
  categories: TravelInfoCategory[],
  travelDates?: { start: Date; end: Date }
): string {
  const dateInfo = travelDates
    ? `渡航予定期間: ${travelDates.start.toISOString().split('T')[0]} 〜 ${travelDates.end.toISOString().split('T')[0]}`
    : '';

  const categorySchemas = categories
    .map((cat) => `"${cat}": ${JSON_SCHEMAS[cat]}`)
    .join(',\n');

  const categoryInstructions = categories
    .map((cat) => {
      switch (cat) {
        case 'basic':
          return '- basic: 通貨、言語、時差などの基本情報';
        case 'safety':
          return '- safety: 外務省危険度、治安、緊急連絡先';
        case 'climate':
          return '- climate: 気候、天気予報、服装アドバイス';
        case 'visa':
          return '- visa: ビザ要否、入国条件';
        case 'manner':
          return '- manner: チップ、現地マナー、タブー';
        case 'transport':
          return '- transport: 公共交通、ライドシェア、運転情報';
        case 'local_food':
          return '- local_food: 代表的な料理、食事マナー';
        case 'souvenir':
          return '- souvenir: 人気のお土産、免税情報';
        case 'events':
          return '- events: 主要イベント、季節の祭り';
        default:
          return '';
      }
    })
    .join('\n');

  return `あなたは海外渡航情報の専門家です。
${destination}（${country}）への渡航に関する情報を提供してください。
${dateInfo}

【取得するカテゴリ】
${categoryInstructions}

【出力形式】
以下のJSON形式で、各カテゴリの情報と情報源を回答してください：
{
  "categories": {
    ${categorySchemas}
  },
  "sources": [
    {
      "name": "string (ソース名)",
      "url": "string (URL)",
      "type": "official | news | commercial | personal"
    }
  ],
  "confidence": "number (0-100の確信度)",
  "lastVerified": "string (情報確認日時、ISO 8601形式)"
}

${SOURCE_PRIORITY_INSTRUCTION}`;
}

/**
 * 検索クエリを生成（Web検索用）
 */
export function generateSearchQueries(
  destination: string,
  country: string,
  category: TravelInfoCategory
): string[] {
  const baseQueries: Record<TravelInfoCategory, string[]> = {
    basic: [
      `${country} 通貨 為替レート`,
      `${country} 公用語`,
      `${destination} タイムゾーン 時差`,
    ],
    safety: [
      `${country} 外務省 海外安全情報`,
      `${destination} 治安 注意点`,
      `${country} 日本大使館 連絡先`,
      `${country} 緊急連絡先 警察 救急`,
    ],
    climate: [
      `${destination} 天気予報`,
      `${destination} 気候 服装`,
      `${country} 季節 ベストシーズン`,
    ],
    visa: [
      `${country} 日本人 ビザ 入国`,
      `${country} 入国条件 パスポート`,
      `${country} 電子渡航認証 ESTA ETAS`,
    ],
    manner: [
      `${country} チップ 習慣`,
      `${country} マナー タブー 文化`,
      `${destination} 観光客 注意点`,
    ],
    transport: [
      `${destination} 公共交通機関 電車 バス`,
      `${country} ライドシェア Grab Uber`,
      `${country} レンタカー 国際免許`,
    ],
    local_food: [
      `${destination} グルメ おすすめ`,
      `${country} 料理 名物`,
      `${country} 食事マナー`,
    ],
    souvenir: [
      `${destination} お土産 おすすめ`,
      `${destination} ショッピング エリア`,
      `${country} 免税 手続き`,
    ],
    events: [
      `${destination} イベント`,
      `${destination} 祭り`,
      `${country} 祝日`,
    ],
  };

  return baseQueries[category] || [];
}

// ============================================
// レスポンスパーサー
// ============================================

/**
 * Geminiの応答をパースして型安全なオブジェクトに変換
 */
export function parseStructuredResponse<T extends TravelInfoCategory>(
  category: T,
  rawResponse: string
): ParseResult<T> {
  try {
    // マークダウンフェンスを除去
    const cleanedResponse = rawResponse
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim();

    const parsed = JSON.parse(cleanedResponse);

    // カテゴリ別のバリデーションとデフォルト値設定
    const content = validateAndNormalizeContent(category, parsed);

    // ソース情報のパース
    const sources = parseSources(parsed.sources);

    // 確信度のパース（デフォルト: 70）
    const confidence =
      typeof parsed.confidence === 'number'
        ? Math.min(100, Math.max(0, parsed.confidence))
        : 70;

    // 確認日時のパース
    const lastVerified = parsed.lastVerified || new Date().toISOString();

    return {
      success: true,
      data: {
        category,
        content: content as CategoryDataMap[T],
        sources,
        confidence,
        lastVerified,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: {
        category,
        error: error instanceof Error ? error.message : 'Unknown parse error',
        rawResponse,
      },
    };
  }
}

/**
 * 複数カテゴリの統合レスポンスをパース
 */
export function parseMultiCategoryResponse(
  rawResponse: string,
  requestedCategories: TravelInfoCategory[]
): Map<TravelInfoCategory, ParseResult> {
  const results = new Map<TravelInfoCategory, ParseResult>();

  try {
    const cleanedResponse = rawResponse
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim();

    const parsed = JSON.parse(cleanedResponse);
    const categories = parsed.categories || {};
    const sources = parseSources(parsed.sources);
    const confidence =
      typeof parsed.confidence === 'number' ? parsed.confidence : 70;
    const lastVerified = parsed.lastVerified || new Date().toISOString();

    for (const category of requestedCategories) {
      if (categories[category]) {
        try {
          const content = validateAndNormalizeContent(
            category,
            categories[category]
          );
          results.set(category, {
            success: true,
            data: {
              category,
              content,
              sources,
              confidence,
              lastVerified,
            },
          });
        } catch (error) {
          results.set(category, {
            success: false,
            error: {
              category,
              error:
                error instanceof Error
                  ? error.message
                  : 'Validation error',
            },
          });
        }
      } else {
        results.set(category, {
          success: false,
          error: {
            category,
            error: `Category "${category}" not found in response`,
          },
        });
      }
    }
  } catch (error) {
    // 全カテゴリに対してエラーを設定
    for (const category of requestedCategories) {
      results.set(category, {
        success: false,
        error: {
          category,
          error: error instanceof Error ? error.message : 'Parse error',
          rawResponse,
        },
      });
    }
  }

  return results;
}

/**
 * ソース情報をパース
 */
function parseSources(rawSources: unknown): ParsedSource[] {
  if (!Array.isArray(rawSources)) {
    return [];
  }

  return rawSources
    .filter((s): s is Record<string, unknown> => typeof s === 'object' && s !== null)
    .map((s) => ({
      name: typeof s.name === 'string' ? s.name : '不明',
      url: typeof s.url === 'string' ? s.url : '',
      type: validateSourceType(s.type),
    }));
}

/**
 * ソースタイプをバリデート
 */
function validateSourceType(
  type: unknown
): 'official' | 'news' | 'commercial' | 'personal' {
  const validTypes = ['official', 'news', 'commercial', 'personal'] as const;
  if (typeof type === 'string' && validTypes.includes(type as typeof validTypes[number])) {
    return type as typeof validTypes[number];
  }
  return 'personal';
}

/**
 * カテゴリ別コンテンツのバリデーションと正規化
 */
function validateAndNormalizeContent<T extends TravelInfoCategory>(
  category: T,
  data: unknown
): CategoryDataMap[T] {
  if (typeof data !== 'object' || data === null) {
    throw new Error(`Invalid data for category ${category}`);
  }

  const rawData = data as Record<string, unknown>;

  switch (category) {
    case 'basic':
      return normalizeBasicInfo(rawData) as CategoryDataMap[T];
    case 'safety':
      return normalizeSafetyInfo(rawData) as CategoryDataMap[T];
    case 'climate':
      return normalizeClimateInfo(rawData) as CategoryDataMap[T];
    case 'visa':
      return normalizeVisaInfo(rawData) as CategoryDataMap[T];
    case 'manner':
      return normalizeMannerInfo(rawData) as CategoryDataMap[T];
    case 'transport':
      return normalizeTransportInfo(rawData) as CategoryDataMap[T];
    case 'local_food':
      return normalizeLocalFoodInfo(rawData) as CategoryDataMap[T];
    case 'souvenir':
      return normalizeSouvenirInfo(rawData) as CategoryDataMap[T];
    case 'events':
      return normalizeEventsInfo(rawData) as CategoryDataMap[T];
    default:
      throw new Error(`Unknown category: ${category}`);
  }
}

// ============================================
// カテゴリ別正規化関数
// ============================================

function normalizeBasicInfo(data: Record<string, unknown>): BasicCountryInfo {
  const currency = data.currency as Record<string, unknown> | undefined;
  const exchangeRate = data.exchangeRate as Record<string, unknown> | undefined;

  return {
    currency: {
      code: typeof currency?.code === 'string' ? currency.code : 'USD',
      name: typeof currency?.name === 'string' ? currency.name : '不明',
      symbol: typeof currency?.symbol === 'string' ? currency.symbol : '$',
    },
    exchangeRate: exchangeRate
      ? {
          rate: typeof exchangeRate.rate === 'number' ? exchangeRate.rate : 0,
          baseCurrency:
            typeof exchangeRate.baseCurrency === 'string'
              ? exchangeRate.baseCurrency
              : 'JPY',
          updatedAt: new Date(
            typeof exchangeRate.updatedAt === 'string'
              ? exchangeRate.updatedAt
              : Date.now()
          ),
        }
      : undefined,
    languages: Array.isArray(data.languages)
      ? data.languages.filter((l): l is string => typeof l === 'string')
      : ['不明'],
    timezone:
      typeof data.timezone === 'string' ? data.timezone : 'UTC',
    timeDifference:
      typeof data.timeDifference === 'string' ? data.timeDifference : '不明',
  };
}

function normalizeSafetyInfo(data: Record<string, unknown>): SafetyInfo {
  const nearestEmbassy = data.nearestEmbassy as Record<string, unknown> | undefined;
  const emergencyContacts = data.emergencyContacts as Array<Record<string, unknown>> | undefined;

  // 危険度レベルのバリデーション（0=危険情報なし、1-4=危険レベル）
  const rawLevel = data.dangerLevel;
  let dangerLevel: DangerLevel = 0; // デフォルトは「危険情報なし」
  if (typeof rawLevel === 'number' && rawLevel >= 0 && rawLevel <= 4) {
    dangerLevel = rawLevel as DangerLevel;
  }

  return {
    dangerLevel,
    dangerLevelDescription:
      typeof data.dangerLevelDescription === 'string'
        ? data.dangerLevelDescription
        : '情報なし',
    warnings: Array.isArray(data.warnings)
      ? data.warnings.filter((w): w is string => typeof w === 'string')
      : [],
    emergencyContacts: Array.isArray(emergencyContacts)
      ? emergencyContacts.map((c) => ({
          name: typeof c.name === 'string' ? c.name : '不明',
          number: typeof c.number === 'string' ? c.number : '不明',
        }))
      : [],
    nearestEmbassy: nearestEmbassy
      ? {
          name:
            typeof nearestEmbassy.name === 'string'
              ? nearestEmbassy.name
              : '不明',
          address:
            typeof nearestEmbassy.address === 'string'
              ? nearestEmbassy.address
              : '不明',
          phone:
            typeof nearestEmbassy.phone === 'string'
              ? nearestEmbassy.phone
              : '不明',
        }
      : undefined,
  };
}

function normalizeClimateInfo(data: Record<string, unknown>): ClimateInfo {
  const currentWeather = data.currentWeather as Record<string, unknown> | undefined;
  const forecast = data.forecast as Array<Record<string, unknown>> | undefined;

  return {
    currentWeather: currentWeather
      ? {
          temp:
            typeof currentWeather.temp === 'number' ? currentWeather.temp : 0,
          condition:
            typeof currentWeather.condition === 'string'
              ? currentWeather.condition
              : '不明',
          humidity:
            typeof currentWeather.humidity === 'number'
              ? currentWeather.humidity
              : 0,
        }
      : undefined,
    forecast: Array.isArray(forecast)
      ? forecast.map((f) => ({
          date: typeof f.date === 'string' ? f.date : '',
          high: typeof f.high === 'number' ? f.high : 0,
          low: typeof f.low === 'number' ? f.low : 0,
          condition: typeof f.condition === 'string' ? f.condition : '不明',
        }))
      : undefined,
    recommendedClothing: Array.isArray(data.recommendedClothing)
      ? data.recommendedClothing.filter((c): c is string => typeof c === 'string')
      : [],
    seasonDescription:
      typeof data.seasonDescription === 'string'
        ? data.seasonDescription
        : '情報なし',
  };
}

function normalizeVisaInfo(data: Record<string, unknown>): VisaInfo {
  return {
    required: typeof data.required === 'boolean' ? data.required : true,
    visaFreeStayDays:
      typeof data.visaFreeStayDays === 'number'
        ? data.visaFreeStayDays
        : undefined,
    requirements: Array.isArray(data.requirements)
      ? data.requirements.filter((r): r is string => typeof r === 'string')
      : [],
    notes: Array.isArray(data.notes)
      ? data.notes.filter((n): n is string => typeof n === 'string')
      : [],
  };
}

function normalizeMannerInfo(data: Record<string, unknown>): MannerInfo {
  const tipping = data.tipping as Record<string, unknown> | undefined;

  return {
    tipping: {
      required:
        typeof tipping?.required === 'boolean' ? tipping.required : false,
      customary:
        typeof tipping?.customary === 'boolean' ? tipping.customary : false,
      guideline:
        typeof tipping?.guideline === 'string' ? tipping.guideline : '情報なし',
    },
    customs: Array.isArray(data.customs)
      ? data.customs.filter((c): c is string => typeof c === 'string')
      : [],
    taboos: Array.isArray(data.taboos)
      ? data.taboos.filter((t): t is string => typeof t === 'string')
      : [],
  };
}

function normalizeTransportInfo(data: Record<string, unknown>): TransportInfo {
  const rideshare = data.rideshare as Record<string, unknown> | undefined;

  return {
    publicTransport: Array.isArray(data.publicTransport)
      ? data.publicTransport.filter((p): p is string => typeof p === 'string')
      : [],
    rideshare: {
      available:
        typeof rideshare?.available === 'boolean' ? rideshare.available : false,
      services: Array.isArray(rideshare?.services)
        ? (rideshare.services as unknown[]).filter(
            (s): s is string => typeof s === 'string'
          )
        : [],
    },
    drivingNotes: Array.isArray(data.drivingNotes)
      ? data.drivingNotes.filter((d): d is string => typeof d === 'string')
      : undefined,
  };
}

function normalizeLocalFoodInfo(data: Record<string, unknown>): LocalFoodInfo {
  const popularDishes = Array.isArray(data.popularDishes)
    ? data.popularDishes.filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null).map(item => ({
        name: typeof item.name === 'string' ? item.name : '不明',
        description: typeof item.description === 'string' ? item.description : '',
        approximatePrice: typeof item.approximatePrice === 'string' ? item.approximatePrice : undefined
      }))
    : [];

  return {
    popularDishes,
    diningEtiquette: Array.isArray(data.diningEtiquette)
      ? data.diningEtiquette.filter((e): e is string => typeof e === 'string')
      : []
  };
}

function normalizeSouvenirInfo(data: Record<string, unknown>): SouvenirInfo {
  const popularItems = Array.isArray(data.popularItems)
    ? data.popularItems.filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null).map(item => ({
        name: typeof item.name === 'string' ? item.name : '不明',
        description: typeof item.description === 'string' ? item.description : '',
        approximatePrice: typeof item.approximatePrice === 'string' ? item.approximatePrice : undefined
      }))
    : [];

  return {
    popularItems,
    shoppingAreas: Array.isArray(data.shoppingAreas)
      ? data.shoppingAreas.filter((a): a is string => typeof a === 'string')
      : [],
    taxFreeInfo: typeof data.taxFreeInfo === 'string' ? data.taxFreeInfo : undefined
  };
}

function normalizeEventsInfo(data: Record<string, unknown>): EventsInfo {
  const majorEvents = Array.isArray(data.majorEvents)
    ? data.majorEvents.filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null).map(item => ({
        name: typeof item.name === 'string' ? item.name : '不明',
        date: typeof item.date === 'string' ? item.date : '',
        description: typeof item.description === 'string' ? item.description : ''
      }))
    : [];

  const seasonalFestivals = Array.isArray(data.seasonalFestivals)
    ? data.seasonalFestivals.filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null).map(item => ({
        name: typeof item.name === 'string' ? item.name : '不明',
        date: typeof item.date === 'string' ? item.date : '',
        description: typeof item.description === 'string' ? item.description : ''
      }))
    : [];

  return {
    majorEvents,
    seasonalFestivals
  };
}

// ============================================
// エクスポート
// ============================================

export {
  JSON_SCHEMAS,
  SOURCE_PRIORITY_INSTRUCTION,
};
