/**
 * 渡航情報機能の型定義
 * Travel Information Types for AI Travel Planner
 */

// ============================================
// 基本列挙型・リテラル型
// ============================================

/**
 * 渡航情報のカテゴリ
 */
export type TravelInfoCategory =
  | "basic" // 基本情報（通貨、言語、時差）
  | "safety" // 安全・医療（危険度、緊急連絡先）
  | "climate" // 気候・服装
  | "visa" // ビザ・入国手続き
  | "manner" // 現地マナー・チップ
  | "transport" // 交通事情
  | "local_food" // グルメ（代表的な料理、マナー）
  | "souvenir" // お土産・買い物（人気のお土産、免税）
  | "events"; // イベント・祭り

/**
 * 情報ソースの種類
 */
export type SourceType =
  | "official_api" // 公式API（外務省等）
  | "web_search" // Web検索
  | "ai_generated" // AI生成
  | "blog"; // ブログ記事

/**
 * 外務省の危険度レベル（0-4）
 * 0: 危険情報なし
 * 1: 十分注意してください
 * 2: 不要不急の渡航は止めてください
 * 3: 渡航は止めてください（渡航中止勧告）
 * 4: 退避してください（退避勧告）
 */
export type DangerLevel = 0 | 1 | 2 | 3 | 4;

// ============================================
// 情報ソース
// ============================================

/**
 * 情報ソースのメタデータ
 */
export interface TravelInfoSource {
  /** ソースの種類 */
  sourceType: SourceType;
  /** ソース名（例: "外務省海外安全情報"） */
  sourceName: string;
  /** ソースURL（オプション） */
  sourceUrl?: string;
  /** 情報取得日時 */
  retrievedAt: Date;
  /** 信頼性スコア（1-100） */
  reliabilityScore: number;
}

// ============================================
// カテゴリ別情報型
// ============================================

/**
 * 安全情報
 */
export interface SafetyInfo {
  /** 外務省の危険度レベル（1-4） */
  dangerLevel: DangerLevel;
  /** 国全体の最大危険度レベル（一部地域のみ危険な場合など、dangerLevelと異なる場合がある） */
  maxCountryLevel?: DangerLevel;
  /** 危険度レベルの説明 */
  dangerLevelDescription: string;
  /** 危険情報のリード文（概要） */
  lead?: string;
  /** 危険情報の詳細テキスト（地域別情報など） */
  subText?: string;
  /** 国全体ではなく一部地域のみのリスクかどうかのフラグ */
  isPartialCountryRisk?: boolean;
  /** 注意事項・警告一覧 */
  warnings: string[];
  /** 緊急連絡先リスト */
  emergencyContacts: EmergencyContact[];
  /** 最寄りの日本大使館・領事館（オプション） */
  nearestEmbassy?: Embassy;
}

/**
 * 緊急連絡先
 */
export interface EmergencyContact {
  /** 連絡先名（例: "警察"） */
  name: string;
  /** 電話番号 */
  number: string;
}

/**
 * 大使館・領事館情報
 */
export interface Embassy {
  /** 大使館・領事館名 */
  name: string;
  /** 住所 */
  address: string;
  /** 電話番号 */
  phone: string;
}

/**
 * 気候情報
 */
export interface ClimateInfo {
  /** 現在の天気（オプション） */
  currentWeather?: CurrentWeather;
  /** 天気予報（オプション） */
  forecast?: WeatherForecast[];
  /** おすすめの服装 */
  recommendedClothing: string[];
  /** 季節の説明 */
  seasonDescription: string;
}

/**
 * 現在の天気
 */
export interface CurrentWeather {
  /** 気温（摂氏） */
  temp: number;
  /** 天気状態（例: "晴れ"） */
  condition: string;
  /** 湿度（%） */
  humidity: number;
}

/**
 * 天気予報
 */
export interface WeatherForecast {
  /** 日付（YYYY-MM-DD形式） */
  date: string;
  /** 最高気温（摂氏） */
  high: number;
  /** 最低気温（摂氏） */
  low: number;
  /** 天気状態 */
  condition: string;
}

/**
 * 基本国情報
 */
export interface BasicCountryInfo {
  /** 通貨情報 */
  currency: Currency;
  /** 為替レート（オプション） */
  exchangeRate?: ExchangeRate;
  /** 公用語リスト */
  languages: string[];
  /** タイムゾーン（例: "Asia/Bangkok"） */
  timezone: string;
  /** 日本との時差（例: "-2時間"） */
  timeDifference: string;
}

/**
 * 通貨情報
 */
export interface Currency {
  /** 通貨コード（例: "THB"） */
  code: string;
  /** 通貨名（例: "タイバーツ"） */
  name: string;
  /** 通貨記号（例: "฿"） */
  symbol: string;
}

/**
 * 為替レート
 */
export interface ExchangeRate {
  /** 為替レート（1基準通貨あたり） */
  rate: number;
  /** 基準通貨（例: "JPY"） */
  baseCurrency: string;
  /** 更新日時 */
  updatedAt: Date;
}

/**
 * ビザ情報
 */
export interface VisaInfo {
  /** ビザ必要の有無 */
  required: boolean;
  /** ビザなし滞在可能日数（オプション） */
  visaFreeStayDays?: number;
  /** 入国要件リスト */
  requirements: string[];
  /** 補足事項 */
  notes: string[];
}

/**
 * マナー情報
 */
export interface MannerInfo {
  /** チップ情報 */
  tipping: TippingInfo;
  /** 現地の習慣・マナー */
  customs: string[];
  /** タブー・避けるべきこと */
  taboos: string[];
}

/**
 * チップ情報
 */
export interface TippingInfo {
  /** チップが必須か */
  required: boolean;
  /** チップが慣習的か */
  customary: boolean;
  /** チップの目安（例: "飲食店では10-15%程度"） */
  guideline: string;
}

/**
 * 交通情報
 */
export interface TransportInfo {
  /** 公共交通機関の情報 */
  publicTransport: string[];
  /** ライドシェア情報 */
  rideshare: RideshareInfo;
  /** 運転に関する注意事項（オプション） */
  drivingNotes?: string[];
}

/**
 * ライドシェア情報
 */
export interface RideshareInfo {
  /** 利用可能かどうか */
  available: boolean;
  /** 利用可能なサービス名 */
  services: string[];
}

/**
 * グルメ情報
 */
export interface LocalFoodInfo {
  /** 代表的な料理 */
  popularDishes: FoodItem[];
  /** 食事のマナー・習慣 */
  diningEtiquette: string[];
}

/**
 * 料理アイテム
 */
export interface FoodItem {
  name: string;
  description: string;
  approximatePrice?: string;
}

/**
 * お土産・買い物情報
 */
export interface SouvenirInfo {
  /** 人気のお土産 */
  popularItems: SouvenirItem[];
  /** おすすめの買い物エリア */
  shoppingAreas: string[];
  /** 免税情報 */
  taxFreeInfo?: string;
}

/**
 * お土産アイテム
 */
export interface SouvenirItem {
  name: string;
  description: string;
  approximatePrice?: string;
}

/**
 * イベント情報
 */
export interface EventsInfo {
  /** 主要なイベント */
  majorEvents: EventItem[];
  /** 季節の祭り */
  seasonalFestivals: EventItem[];
}

/**
 * イベントアイテム
 */
export interface EventItem {
  name: string;
  date: string;
  description: string;
}

// ============================================
// カテゴリ別データマッピング
// ============================================

/**
 * カテゴリと対応するデータ型のマッピング
 */
export interface CategoryDataMap {
  basic: BasicCountryInfo;
  safety: SafetyInfo;
  climate: ClimateInfo;
  visa: VisaInfo;
  manner: MannerInfo;
  transport: TransportInfo;
  local_food: LocalFoodInfo;
  souvenir: SouvenirInfo;
  events: EventsInfo;
}

/**
 * カテゴリデータのエントリ
 */
export type CategoryDataEntry<
  T extends TravelInfoCategory = TravelInfoCategory
> = {
  category: T;
  data: CategoryDataMap[T];
  source: TravelInfoSource;
};

// ============================================
// リクエスト・レスポンス型
// ============================================

/**
 * 渡航情報リクエスト
 */
export interface TravelInfoRequest {
  /** 目的地（都市名または国名） */
  destination: string;
  /** 取得するカテゴリ一覧 */
  categories: TravelInfoCategory[];
  /** 渡航予定日（オプション） */
  travelDate?: Date;
  /** キャッシュを使用するか（デフォルト: true） */
  useCache?: boolean;
  /** 言語（デフォルト: "ja"） */
  language?: string;
}

/**
 * 渡航情報オプション
 */
export interface TravelInfoOptions {
  /** 渡航予定日 */
  travelDate?: Date;
  /** キャッシュを使用するか */
  useCache?: boolean;
  /** タイムアウト（ミリ秒） */
  timeout?: number;
  /** 言語 */
  language?: string;
  /** 国名（コンテキスト用） */
  country?: string;
}

/**
 * 取得に失敗したカテゴリの情報
 */
export interface FailedCategory {
  /** 失敗したカテゴリ */
  category: TravelInfoCategory;
  /** エラーメッセージ */
  error: string;
}

/**
 * 渡航情報統合レスポンス
 */
export interface TravelInfoResponse {
  /** 目的地（都市名） */
  destination: string;
  /** 国名 */
  country: string;
  /** カテゴリ別データ */
  categories: Map<TravelInfoCategory, CategoryDataEntry>;
  /** 使用した情報ソース一覧 */
  sources: TravelInfoSource[];
  /** 生成日時 */
  generatedAt: Date;
  /** 免責事項 */
  disclaimer: string;
  /** 取得に失敗したカテゴリ（オプション） */
  failedCategories?: FailedCategory[];
}

// ============================================
// ユーティリティ型
// ============================================

/**
 * 部分的な渡航情報（一部カテゴリのみ取得時）
 */
export type PartialTravelInfo = Partial<{
  [K in TravelInfoCategory]: CategoryDataMap[K];
}>;

/**
 * カテゴリデータのユニオン型
 */
export type AnyCategoryData =
  | BasicCountryInfo
  | SafetyInfo
  | ClimateInfo
  | VisaInfo
  | MannerInfo
  | TransportInfo
  | LocalFoodInfo
  | SouvenirInfo
  | EventsInfo;

/**
 * 全カテゴリ配列（定数として使用可能）
 */
export const ALL_TRAVEL_INFO_CATEGORIES: TravelInfoCategory[] = [
  "basic",
  "safety",
  "climate",
  "visa",
  "manner",
  "transport",
  "local_food",
  "souvenir",
  "events",
];

/**
 * カテゴリの日本語ラベル
 */
export const CATEGORY_LABELS: Record<TravelInfoCategory, string> = {
  basic: "基本情報",
  safety: "安全・医療",
  climate: "気候・服装",
  visa: "ビザ・入国",
  manner: "マナー・チップ",
  transport: "交通事情",
  local_food: "グルメ",
  souvenir: "お土産・買い物",
  events: "イベント・祭り",
};

/**
 * 危険度レベルの日本語説明
 */
export const DANGER_LEVEL_DESCRIPTIONS: Record<DangerLevel, string> = {
  0: "危険情報なし",
  1: "十分注意してください",
  2: "不要不急の渡航は止めてください",
  3: "渡航は止めてください（渡航中止勧告）",
  4: "退避してください（退避勧告）",
};
