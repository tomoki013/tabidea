/**
 * travel-info用のZodスキーマ定義
 * generateObjectでJSON形式のレスポンスを確実に取得するために使用
 */

import { z } from 'zod';
import type { TravelInfoCategory } from '@/lib/types/travel-info';

// ============================================
// 基本情報 (basic) スキーマ
// ============================================

export const CurrencySchema = z.object({
  code: z.string().describe('通貨コード（例: USD, EUR, JPY）'),
  name: z.string().describe('通貨名（例: 米ドル, ユーロ）'),
  symbol: z.string().describe('通貨記号（例: $, €, ¥）'),
});

export const ExchangeRateSchema = z.object({
  rate: z.number().describe('1円あたりのレート'),
  baseCurrency: z.string().default('JPY'),
  updatedAt: z.coerce.date().describe('更新日時（ISO 8601形式）'),
});

export const BasicInfoSchema = z.object({
  currency: CurrencySchema,
  exchangeRate: ExchangeRateSchema.optional(),
  languages: z.array(z.string()).describe('公用語リスト'),
  timezone: z.string().describe('タイムゾーン（例: Asia/Tokyo）'),
  timeDifference: z.string().describe('日本との時差（例: -8時間）'),
});

// ============================================
// 安全情報 (safety) スキーマ
// ============================================

export const EmergencyContactSchema = z.object({
  name: z.string().describe('連絡先名（例: 警察, 救急）'),
  number: z.string().describe('電話番号'),
});

export const EmbassySchema = z.object({
  name: z.string().describe('大使館・領事館名'),
  address: z.string().describe('住所'),
  phone: z.string().describe('電話番号'),
});

export const SafetyInfoSchema = z.object({
  dangerLevel: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3), z.literal(4)]).describe('外務省危険度レベル（0-4、0は危険情報なし）'),
  dangerLevelDescription: z.string().describe('危険度の説明'),
  warnings: z.array(z.string()).describe('注意事項・警告リスト'),
  emergencyContacts: z.array(EmergencyContactSchema).describe('緊急連絡先'),
  nearestEmbassy: EmbassySchema.optional().describe('最寄りの日本大使館・領事館'),
});

// ============================================
// 気候情報 (climate) スキーマ
// ============================================

export const CurrentWeatherSchema = z.object({
  temp: z.number().describe('現在気温（摂氏）'),
  condition: z.string().describe('天気状態'),
  humidity: z.number().describe('湿度（%）'),
});

export const ForecastDaySchema = z.object({
  date: z.string().describe('日付（YYYY-MM-DD）'),
  high: z.number().describe('最高気温'),
  low: z.number().describe('最低気温'),
  condition: z.string().describe('天気状態'),
});

export const ClimateInfoSchema = z.object({
  currentWeather: CurrentWeatherSchema.optional(),
  forecast: z.array(ForecastDaySchema).optional(),
  recommendedClothing: z.array(z.string()).describe('おすすめの服装'),
  seasonDescription: z.string().describe('季節の説明'),
});

// ============================================
// ビザ情報 (visa) スキーマ
// ============================================

export const VisaInfoSchema = z.object({
  required: z.boolean().describe('ビザが必要かどうか'),
  visaFreeStayDays: z.number().nullable().describe('ビザなし滞在可能日数'),
  requirements: z.array(z.string()).describe('入国要件'),
  notes: z.array(z.string()).describe('補足事項'),
});

// ============================================
// マナー情報 (manner) スキーマ
// ============================================

export const TippingSchema = z.object({
  required: z.boolean().describe('チップが必須か'),
  customary: z.boolean().describe('チップが慣習的か'),
  guideline: z.string().describe('チップの目安'),
});

export const MannerInfoSchema = z.object({
  tipping: TippingSchema,
  customs: z.array(z.string()).describe('現地の習慣・マナー'),
  taboos: z.array(z.string()).describe('タブー・避けるべきこと'),
});

// ============================================
// 交通情報 (transport) スキーマ
// ============================================

export const RideshareSchema = z.object({
  available: z.boolean().describe('ライドシェア利用可能か'),
  services: z.array(z.string()).describe('利用可能なサービス名'),
});

export const TransportInfoSchema = z.object({
  publicTransport: z.array(z.string()).describe('公共交通機関の情報'),
  rideshare: RideshareSchema,
  drivingNotes: z.array(z.string()).optional().describe('運転に関する注意事項'),
});

// ============================================
// グルメ情報 (local_food) スキーマ
// ============================================

export const FoodItemSchema = z.object({
  name: z.string().describe('料理名'),
  description: z.string().describe('説明'),
  approximatePrice: z.string().optional().describe('価格帯'),
});

export const LocalFoodInfoSchema = z.object({
  popularDishes: z.array(FoodItemSchema).describe('代表的な料理'),
  diningEtiquette: z.array(z.string()).describe('食事のマナー・習慣'),
});

// ============================================
// お土産・買い物情報 (souvenir) スキーマ
// ============================================

export const SouvenirItemSchema = z.object({
  name: z.string().describe('商品名'),
  description: z.string().describe('説明'),
  approximatePrice: z.string().optional().describe('価格帯'),
});

export const SouvenirInfoSchema = z.object({
  popularItems: z.array(SouvenirItemSchema).describe('人気のお土産'),
  shoppingAreas: z.array(z.string()).describe('おすすめの買い物エリア'),
  taxFreeInfo: z.string().optional().describe('免税情報'),
});

// ============================================
// イベント情報 (events) スキーマ
// ============================================

export const EventItemSchema = z.object({
  name: z.string().describe('イベント名'),
  date: z.string().describe('開催時期'),
  description: z.string().describe('内容'),
});

export const EventsInfoSchema = z.object({
  majorEvents: z.array(EventItemSchema).describe('主要なイベント'),
  seasonalFestivals: z.array(EventItemSchema).describe('季節の祭り'),
});

// ============================================
// 新規カテゴリ用スキーマ
// ============================================

// technology
export const TechnologyInfoSchema = z.object({
  plugs: z.array(z.string()).describe('コンセント形状（例: ["A", "BF"]）'),
  voltage: z.string().describe('電圧（例: "220V"）'),
  internet: z.array(z.string()).describe('インターネット・Wi-Fi事情'),
});

// healthcare
export const HealthcareInfoSchema = z.object({
  water: z.string().describe('水道水が飲めるか'),
  vaccines: z.array(z.string()).describe('推奨される予防接種'),
  medicalLevel: z.string().describe('医療水準・病院事情'),
});

// restrooms
export const RestroomsInfoSchema = z.object({
  availability: z.string().describe('トイレの清潔度・普及状況'),
  notes: z.array(z.string()).describe('利用上の注意（有料、紙がない等）'),
});

// smoking
export const SmokingInfoSchema = z.object({
  rules: z.string().describe('喫煙ルール（屋内禁煙、罰金等）'),
  areas: z.string().describe('喫煙場所の状況'),
});

// alcohol
export const AlcoholInfoSchema = z.object({
  rules: z.string().describe('飲酒ルール（販売時間制限等）'),
  ageLimit: z.string().describe('年齢制限（例: "20歳以上"）'),
  notes: z.array(z.string()).describe('補足事項'),
});

// ============================================
// ソース情報スキーマ
// ============================================

export const SourceTypeEnum = z.enum(['official', 'news', 'commercial', 'personal']);

export const ParsedSourceSchema = z.object({
  name: z.string().describe('ソース名'),
  url: z.string().describe('URL'),
  type: SourceTypeEnum.describe('ソースタイプ'),
});

// ============================================
// カテゴリ別レスポンススキーマ
// ============================================

export const BasicInfoResponseSchema = z.object({
  content: BasicInfoSchema,
  sources: z.array(ParsedSourceSchema),
  confidence: z.number().min(0).max(100).describe('確信度（0-100）'),
  lastVerified: z.string().describe('情報確認日時（ISO 8601形式）'),
});

export const SafetyInfoResponseSchema = z.object({
  content: SafetyInfoSchema,
  sources: z.array(ParsedSourceSchema),
  confidence: z.number().min(0).max(100),
  lastVerified: z.string(),
});

export const ClimateInfoResponseSchema = z.object({
  content: ClimateInfoSchema,
  sources: z.array(ParsedSourceSchema),
  confidence: z.number().min(0).max(100),
  lastVerified: z.string(),
});

export const VisaInfoResponseSchema = z.object({
  content: VisaInfoSchema,
  sources: z.array(ParsedSourceSchema),
  confidence: z.number().min(0).max(100),
  lastVerified: z.string(),
});

export const MannerInfoResponseSchema = z.object({
  content: MannerInfoSchema,
  sources: z.array(ParsedSourceSchema),
  confidence: z.number().min(0).max(100),
  lastVerified: z.string(),
});

export const TransportInfoResponseSchema = z.object({
  content: TransportInfoSchema,
  sources: z.array(ParsedSourceSchema),
  confidence: z.number().min(0).max(100),
  lastVerified: z.string(),
});

export const LocalFoodInfoResponseSchema = z.object({
  content: LocalFoodInfoSchema,
  sources: z.array(ParsedSourceSchema),
  confidence: z.number().min(0).max(100),
  lastVerified: z.string(),
});

export const SouvenirInfoResponseSchema = z.object({
  content: SouvenirInfoSchema,
  sources: z.array(ParsedSourceSchema),
  confidence: z.number().min(0).max(100),
  lastVerified: z.string(),
});

export const EventsInfoResponseSchema = z.object({
  content: EventsInfoSchema,
  sources: z.array(ParsedSourceSchema),
  confidence: z.number().min(0).max(100),
  lastVerified: z.string(),
});

// 新規カテゴリのレスポンススキーマ
export const TechnologyInfoResponseSchema = z.object({
  content: TechnologyInfoSchema,
  sources: z.array(ParsedSourceSchema),
  confidence: z.number().min(0).max(100),
  lastVerified: z.string(),
});

export const HealthcareInfoResponseSchema = z.object({
  content: HealthcareInfoSchema,
  sources: z.array(ParsedSourceSchema),
  confidence: z.number().min(0).max(100),
  lastVerified: z.string(),
});

export const RestroomsInfoResponseSchema = z.object({
  content: RestroomsInfoSchema,
  sources: z.array(ParsedSourceSchema),
  confidence: z.number().min(0).max(100),
  lastVerified: z.string(),
});

export const SmokingInfoResponseSchema = z.object({
  content: SmokingInfoSchema,
  sources: z.array(ParsedSourceSchema),
  confidence: z.number().min(0).max(100),
  lastVerified: z.string(),
});

export const AlcoholInfoResponseSchema = z.object({
  content: AlcoholInfoSchema,
  sources: z.array(ParsedSourceSchema),
  confidence: z.number().min(0).max(100),
  lastVerified: z.string(),
});

// ============================================
// カテゴリ別スキーママッピング
// ============================================

export const CATEGORY_SCHEMAS: Record<TravelInfoCategory, z.ZodType> = {
  basic: BasicInfoResponseSchema,
  safety: SafetyInfoResponseSchema,
  climate: ClimateInfoResponseSchema,
  visa: VisaInfoResponseSchema,
  manner: MannerInfoResponseSchema,
  transport: TransportInfoResponseSchema,
  local_food: LocalFoodInfoResponseSchema,
  souvenir: SouvenirInfoResponseSchema,
  events: EventsInfoResponseSchema,
  technology: TechnologyInfoResponseSchema,
  healthcare: HealthcareInfoResponseSchema,
  restrooms: RestroomsInfoResponseSchema,
  smoking: SmokingInfoResponseSchema,
  alcohol: AlcoholInfoResponseSchema,
};

/**
 * カテゴリに対応するスキーマを取得
 */
export function getCategorySchema(category: TravelInfoCategory): z.ZodType {
  return CATEGORY_SCHEMAS[category];
}

// ============================================
// 国名抽出用スキーマ
// ============================================

export const CountryExtractionSchema = z.object({
  country: z.string().describe('国名（日本語）'),
});

// ============================================
// 型エクスポート
// ============================================

export type BasicInfo = z.infer<typeof BasicInfoSchema>;
export type SafetyInfo = z.infer<typeof SafetyInfoSchema>;
export type ClimateInfo = z.infer<typeof ClimateInfoSchema>;
export type VisaInfo = z.infer<typeof VisaInfoSchema>;
export type MannerInfo = z.infer<typeof MannerInfoSchema>;
export type TransportInfo = z.infer<typeof TransportInfoSchema>;
export type LocalFoodInfo = z.infer<typeof LocalFoodInfoSchema>;
export type SouvenirInfo = z.infer<typeof SouvenirInfoSchema>;
export type EventsInfo = z.infer<typeof EventsInfoSchema>;
export type TechnologyInfo = z.infer<typeof TechnologyInfoSchema>;
export type HealthcareInfo = z.infer<typeof HealthcareInfoSchema>;
export type RestroomsInfo = z.infer<typeof RestroomsInfoSchema>;
export type SmokingInfo = z.infer<typeof SmokingInfoSchema>;
export type AlcoholInfo = z.infer<typeof AlcoholInfoSchema>;

export type ParsedSource = z.infer<typeof ParsedSourceSchema>;

export type BasicInfoResponse = z.infer<typeof BasicInfoResponseSchema>;
export type SafetyInfoResponse = z.infer<typeof SafetyInfoResponseSchema>;
export type ClimateInfoResponse = z.infer<typeof ClimateInfoResponseSchema>;
export type VisaInfoResponse = z.infer<typeof VisaInfoResponseSchema>;
export type MannerInfoResponse = z.infer<typeof MannerInfoResponseSchema>;
export type TransportInfoResponse = z.infer<typeof TransportInfoResponseSchema>;
export type LocalFoodInfoResponse = z.infer<typeof LocalFoodInfoResponseSchema>;
export type SouvenirInfoResponse = z.infer<typeof SouvenirInfoResponseSchema>;
export type EventsInfoResponse = z.infer<typeof EventsInfoResponseSchema>;
export type TechnologyInfoResponse = z.infer<typeof TechnologyInfoResponseSchema>;
export type HealthcareInfoResponse = z.infer<typeof HealthcareInfoResponseSchema>;
export type RestroomsInfoResponse = z.infer<typeof RestroomsInfoResponseSchema>;
export type SmokingInfoResponse = z.infer<typeof SmokingInfoResponseSchema>;
export type AlcoholInfoResponse = z.infer<typeof AlcoholInfoResponseSchema>;
