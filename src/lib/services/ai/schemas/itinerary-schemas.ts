/**
 * 旅程生成用のZodスキーマ定義
 * generateObjectでJSON形式のレスポンスを確実に取得するために使用
 */

import { z } from 'zod';

// ============================================
// TransitInfo スキーマ
// ============================================

export const TransitTypeSchema = z.enum([
  'flight',
  'train',
  'bus',
  'ship',
  'car',
  'other',
]);

// 厳格なスキーマ（出力用：アプリケーション内部で期待される形式）
export const TransitInfoStrictSchema = z.object({
  type: TransitTypeSchema.describe('移動手段'),
  departure: z.object({
    place: z.string().describe('出発地'),
    time: z.string().optional().describe('出発時刻（例: "09:00"）'),
  }),
  arrival: z.object({
    place: z.string().describe('到着地'),
    time: z.string().optional().describe('到着時刻（例: "12:30"）'),
  }),
  duration: z.string().optional().describe('所要時間（例: "3h 30m"）'),
  memo: z.string().optional().describe('メモ（便名など）'),
});

// 緩和されたスキーマ（入力用：AIからの応答バリデーション用）
const TransitLocationInputSchema = z.union([
  z.string(),
  z.object({
    place: z.string(),
    time: z.string().optional(),
  }),
]);

export const TransitInfoInputSchema = z.object({
  type: TransitTypeSchema.describe('移動手段'),
  departure: TransitLocationInputSchema.describe('出発地（場所名または { place, time }）'),
  arrival: TransitLocationInputSchema.describe('到着地（場所名または { place, time }）'),
  duration: z.string().optional().describe('所要時間（例: "3h 30m"）'),
  memo: z.string().optional().describe('メモ（便名など）'),
});

// Alias for internal use (legacy support)
export const TransitInfoSchema = TransitInfoStrictSchema;


// ============================================
// Activity スキーマ
// ============================================

export const ActivitySourceTypeSchema = z.enum(['blog', 'google_places', 'ai_knowledge', 'golden_plan']);

export const ActivitySourceSchema = z.object({
  type: ActivitySourceTypeSchema.describe('情報源の種類'),
  title: z.string().optional().describe('ブログ記事のタイトル（type: blog の場合）'),
  url: z.string().optional().describe('ブログ記事のURL（type: blog の場合）'),
  confidence: z.enum(['high', 'medium', 'low']).optional().describe('信頼度'),
});

// 厳格なスキーマ（出力用）
export const ActivityStrictSchema = z.object({
  time: z.string().describe('時間（例: "10:00"）'),
  activity: z.string().describe('アクティビティ名'),
  description: z.string().describe('詳細な説明（1-2文）'),
  activityType: z.enum(['spot', 'transit', 'accommodation', 'meal', 'other']).optional().describe('アクティビティの種類: spot=観光地, transit=移動, accommodation=宿泊, meal=食事, other=その他'),
  locationEn: z.string().optional().describe('英語での場所名（例: "Aswan, Egypt"）。予約リンク生成に使用'),
  source: ActivitySourceSchema.optional().nullable().describe('情報源（Citation）'),
});

// 緩和されたスキーマ（入力用）
const FlexibleSourceSchema = z.union([
  z.string(), // "ai_knowledge" などの文字列を許容
  ActivitySourceSchema,
]);

export const ActivityInputSchema = z.object({
  time: z.string().describe('時間（例: "10:00"）'),
  activity: z.string().describe('アクティビティ名'),
  description: z.string().describe('詳細な説明（1-2文）'),
  activityType: z.enum(['spot', 'transit', 'accommodation', 'meal', 'other']).optional().describe('アクティビティの種類'),
  locationEn: z.string().optional().describe('英語での場所名（例: "Aswan, Egypt"）'),
  source: FlexibleSourceSchema.optional().nullable().describe('情報源（Citation）: CONTEXTから採用した場合はblog、AI知識はai_knowledge'),
});

// Alias for internal use (legacy support)
export const ActivitySchema = ActivityStrictSchema;

// ============================================
// Timeline Item スキーマ
// ============================================

// Strict Timeline Items
export const TimelineActivityItemStrictSchema = z.object({
  itemType: z.literal('activity').describe('アクティビティアイテム'),
  data: ActivityStrictSchema,
});
export const TimelineTransitItemStrictSchema = z.object({
  itemType: z.literal('transit').describe('移動アイテム'),
  data: TransitInfoStrictSchema,
  time: z.string().optional().describe('表示用時刻'),
});
export const TimelineItemStrictSchema = z.discriminatedUnion('itemType', [
  TimelineActivityItemStrictSchema,
  TimelineTransitItemStrictSchema,
]);

// Input Timeline Items (Relaxed)
export const TimelineActivityItemInputSchema = z.object({
  itemType: z.literal('activity').describe('アクティビティアイテム'),
  data: ActivityInputSchema,
});
export const TimelineTransitItemInputSchema = z.object({
  itemType: z.literal('transit').describe('移動アイテム'),
  data: TransitInfoInputSchema,
  time: z.string().optional().describe('表示用時刻'),
});
export const TimelineItemInputSchema = z.discriminatedUnion('itemType', [
  TimelineActivityItemInputSchema,
  TimelineTransitItemInputSchema,
]);

// Alias
export const TimelineItemSchema = TimelineItemStrictSchema;


// ============================================
// DayPlan スキーマ
// ============================================

// 厳格なスキーマ（出力用）
export const DayPlanStrictSchema = z.object({
  day: z.number().int().min(1).describe('日数（1から開始）'),
  title: z.string().describe('日のタイトル・テーマ'),
  transit: TransitInfoStrictSchema.optional().describe('その日の主要な移動'),
  activities: z.array(ActivityStrictSchema).min(1).describe('アクティビティ一覧'),
  timelineItems: z.array(TimelineItemStrictSchema).optional().describe('時系列タイムライン（transit + activities統合）'),
  reference_indices: z.array(z.number()).optional().describe('参考記事のインデックス'),
  ui_type: z.enum(['default', 'compact', 'narrative']).optional().describe('AIが推奨するUIタイプ（default: 標準, compact: 詰め込み/移動多め, narrative: ゆったり/物語重視）'),
});

// 緩和されたスキーマ（入力用）
export const DayPlanInputSchema = z.object({
  day: z.number().int().min(1).describe('日数（1から開始）'),
  title: z.string().describe('日のタイトル・テーマ'),
  transit: TransitInfoInputSchema.optional().describe('その日の主要な移動'),
  activities: z.array(ActivityInputSchema).min(1).describe('アクティビティ一覧'),
  timelineItems: z.array(TimelineItemInputSchema).optional().describe('時系列タイムライン（transit + activities統合）'),
  reference_indices: z.array(z.number()).optional().describe('参考記事のインデックス'),
  ui_type: z.enum(['default', 'compact', 'narrative']).optional().describe('AIが推奨するUIタイプ'),
});

// Alias
export const DayPlanSchema = DayPlanStrictSchema;


// ============================================
// PlanOutline スキーマ（Step 1用 - 変更なし）
// ============================================

export const PlanOutlineDaySchema = z.object({
  day: z.number().int().min(1).describe('日数'),
  title: z.string().describe('タイトル'),
  highlight_areas: z.array(z.string()).describe('ハイライトエリア'),
  overnight_location: z.string().describe('宿泊地（その日の終了地点）'),
  travel_method_to_next: z.string().nullable().optional().describe('翌日への移動手段（最終日はnull）'),
});

export const PlanOutlineSchema = z.object({
  destination: z.string().describe('目的地名'),
  description: z.string().describe('旅行全体の説明（トラベルマガジン風に）'),
  days: z.array(PlanOutlineDaySchema).min(1).describe('日程アウトライン'),
});

// ============================================
// DayPlan Array スキーマ（Step 2用）
// ============================================

// 厳格なレスポンス（出力用）
export const DayPlanArrayResponseStrictSchema = z.object({
  days: z.array(DayPlanStrictSchema).min(1).describe('日程プラン配列'),
  reference_indices: z.array(z.number()).optional().describe('参考記事のインデックス'),
});

// 緩和されたレスポンス（入力用 - AI生成時に使用）
export const DayPlanArrayResponseInputSchema = z.object({
  days: z.array(DayPlanInputSchema).min(1).describe('日程プラン配列'),
  reference_indices: z.array(z.number()).optional().describe('参考記事のインデックス'),
});

// Alias
export const DayPlanArrayResponseSchema = DayPlanArrayResponseStrictSchema;


// ============================================
// Itinerary スキーマ（modifyItinerary用）
// ============================================

export const ReferenceSchema = z.object({
  title: z.string().describe('タイトル'),
  url: z.string().describe('URL'),
  image: z.string().optional().describe('画像URL'),
  snippet: z.string().optional().describe('スニペット'),
});

export const ItinerarySchema = z.object({
  id: z.string().describe('一意識別子'),
  destination: z.string().describe('目的地'),
  description: z.string().describe('説明'),
  reasoning: z.string().optional().describe('AIの思考プロセス'),
  heroImage: z.string().nullable().optional().describe('ヒーロー画像URL'),
  heroImagePhotographer: z.string().optional().describe('フォトグラファー名'),
  heroImagePhotographerUrl: z.string().optional().describe('フォトグラファープロフィールURL'),
  days: z.array(DayPlanStrictSchema).min(1).describe('日程プラン'),
  references: z.array(ReferenceSchema).optional().describe('参考情報'),
  reference_indices: z.array(z.number()).optional().describe('使用記事インデックス'),
});

// ============================================
// Legacy Itinerary スキーマ（generateItinerary用）
// ============================================

export const LegacyItineraryResponseSchema = z.object({
  reasoning: z.string().optional().describe('AIの思考プロセス'),
  id: z.string().describe('一意識別子'),
  destination: z.string().describe('目的地'),
  heroImage: z.string().nullable().optional().describe('ヒーロー画像URL'),
  description: z.string().describe('説明'),
  days: z.array(DayPlanStrictSchema).min(1).describe('日程プラン'),
  reference_indices: z.array(z.number()).optional().describe('使用記事インデックス'),
});

// ============================================
// 型エクスポート
// ============================================

export type TransitType = z.infer<typeof TransitTypeSchema>;

// Strict Types
export type TransitInfoParsed = z.infer<typeof TransitInfoStrictSchema>;
export type ActivityParsed = z.infer<typeof ActivityStrictSchema>;
export type DayPlanParsed = z.infer<typeof DayPlanStrictSchema>;
export type PlanOutlineDayParsed = z.infer<typeof PlanOutlineDaySchema>;
export type PlanOutlineParsed = z.infer<typeof PlanOutlineSchema>;
export type DayPlanArrayResponse = z.infer<typeof DayPlanArrayResponseStrictSchema>;
export type ReferenceParsed = z.infer<typeof ReferenceSchema>;
export type ItineraryParsed = z.infer<typeof ItinerarySchema>;
export type LegacyItineraryResponse = z.infer<typeof LegacyItineraryResponseSchema>;

// Input Types (Relaxed)
export type TransitInfoInput = z.infer<typeof TransitInfoInputSchema>;
export type ActivityInput = z.infer<typeof ActivityInputSchema>;
export type DayPlanInput = z.infer<typeof DayPlanInputSchema>;
export type DayPlanArrayResponseInput = z.infer<typeof DayPlanArrayResponseInputSchema>;
