/**
 * Compose Pipeline Zod Schemas
 * LLM 構造化出力の検証スキーマ
 */

import { z } from 'zod';

// ============================================
// Step 2: Semantic Planner Output Schema
// ============================================

export const candidateRoleSchema = z.enum([
  'must_visit',
  'recommended',
  'meal',
  'accommodation',
  'filler',
]);

export const timeSlotHintSchema = z.enum([
  'morning',
  'midday',
  'afternoon',
  'evening',
  'night',
  'flexible',
]);

export const semanticCandidateSchema = z.object({
  name: z.string().describe('スポット/アクティビティ名'),
  role: candidateRoleSchema.describe('候補の役割'),
  priority: z.number().min(0).max(10).describe('優先度 (0=低, 10=高)'),
  dayHint: z.number().min(0).describe('推奨する日 (0 or 1-based)'),
  timeSlotHint: timeSlotHintSchema.describe('推奨する時間帯'),
  stayDurationMinutes: z
    .number()
    .min(5)
    .max(480)
    .describe('滞在時間（分）'),
  searchQuery: z
    .string()
    .describe('Google Places API で検索するためのスポット正式名称'),
  categoryHint: z
    .string()
    .optional()
    .describe('カテゴリヒント (例: "temple", "cafe")'),
  activityLabel: z
    .string()
    .optional()
    .describe('装飾的なアクティビティ名 (例: "金閣寺で抹茶体験")'),
  locationEn: z
    .string()
    .optional()
    .describe('英語での場所名 (例: "Kinkaku-ji Temple")'),
  // ---- v3 追加フィールド (LLM 出力、optional) ----
  rationale: z
    .string()
    .optional()
    .describe('この候補を選んだ理由 (1文)'),
  areaHint: z
    .string()
    .optional()
    .describe('候補が位置するエリア名 (例: "浅草エリア", "銀座周辺")'),
  indoorOutdoor: z
    .enum(['indoor', 'outdoor', 'both'])
    .optional()
    .describe('屋内/屋外'),
  tags: z
    .array(z.string())
    .optional()
    .describe('候補のタグ (例: ["写真映え", "静か"])'),
});

export const destinationHighlightSchema = z.object({
  name: z.string().describe('その目的地らしさを感じる具体的なスポット名'),
  searchQuery: z.string().optional().describe('Places API 検索に向いた正式名称'),
  areaHint: z.string().describe('そのスポットがあるエリア名'),
  dayHint: z.number().min(1).describe('どの日に入れると自然かの候補日'),
  rationale: z.string().describe('このスポットを入れる理由'),
  locationEn: z.string().optional().describe('英語の正式名称'),
  timeSlotHint: timeSlotHintSchema.optional().describe('おすすめの時間帯'),
  stayDurationMinutes: z.number().min(15).max(360).optional().describe('想定滞在時間'),
});

export const dayStructureSchema = z.object({
  day: z.number().min(1).describe('日番号 (1-based)'),
  title: z.string().describe('日のタイトル'),
  mainArea: z.string().describe('メインエリア'),
  overnightLocation: z.string().describe('宿泊地'),
  summary: z.string().describe('概要'),
});

export const semanticPlanSchema = z.object({
  destination: z.string().describe('目的地'),
  description: z.string().describe('プラン全体の説明'),
  candidates: z
    .array(semanticCandidateSchema)
    .min(1)
    .describe('候補スポット一覧'),
  dayStructure: z
    .array(dayStructureSchema)
    .min(1)
    .describe('日ごとの構造'),
  themes: z
    .array(z.string())
    .optional()
    .describe('AIが選んだテーマタグ'),
  destinationHighlights: z
    .array(destinationHighlightSchema)
    .optional()
    .describe('その目的地らしさを担保する代表スポット'),
  // ---- v3 追加フィールド ----
  tripIntentSummary: z
    .string()
    .optional()
    .describe('旅の意図サマリー (例: "歴史ある京都の寺社を巡り、抹茶スイーツを楽しむ3日間")'),
  orderingPreferences: z
    .array(z.string())
    .optional()
    .describe('順序に関する好み (例: ["寺社は午前中に", "食事は地元の店で"])'),
  fallbackHints: z
    .array(z.string())
    .optional()
    .describe('候補不足時の補完ヒント (例: ["近くの公園", "駅前のカフェ"])'),
});

export type SemanticPlanOutput = z.infer<typeof semanticPlanSchema>;

export const semanticSeedSchema = z.object({
  destination: z.string().describe('目的地'),
  description: z.string().describe('プラン全体の説明'),
  dayStructure: z
    .array(dayStructureSchema)
    .min(1)
    .describe('日ごとの構造'),
  themes: z
    .array(z.string())
    .optional()
    .describe('AIが選んだテーマタグ'),
  destinationHighlights: z
    .array(destinationHighlightSchema)
    .optional()
    .describe('その目的地らしさを担保する代表スポット'),
  tripIntentSummary: z
    .string()
    .optional()
    .describe('旅の意図サマリー'),
  orderingPreferences: z
    .array(z.string())
    .optional()
    .describe('順序に関する好み'),
  fallbackHints: z
    .array(z.string())
    .optional()
    .describe('候補不足時の補完ヒント'),
});

export type SemanticSeedOutput = z.infer<typeof semanticSeedSchema>;

export const semanticDayPlanSchema = z.object({
  candidates: z
    .array(semanticCandidateSchema)
    .min(1)
    .describe('特定の日に割り当てる候補スポット一覧'),
});

export type SemanticDayPlanOutput = z.infer<typeof semanticDayPlanSchema>;

// ============================================
// Step 7: Narrative Renderer Output Schema
// ============================================

export const narrativeActivitySchema = z.object({
  /** TimelineNode の arrivalTime に一致するキー */
  arrivalTime: z.string().describe('到着時刻 (HH:mm)'),
  /** AI 生成の説明文 */
  description: z.string().describe('アクティビティの説明文 (1-2文)'),
  /** アクティビティ名 */
  activityName: z.string().describe('表示用アクティビティ名'),
});

export const narrativeDaySchema = z.object({
  day: z.number().min(1).describe('日番号'),
  title: z.string().describe('日のタイトル'),
  activities: z
    .array(narrativeActivitySchema)
    .min(1)
    .describe('アクティビティ説明'),
});

export const narrativeOutputSchema = z.object({
  description: z.string().describe('旅程全体の説明'),
  days: z.array(narrativeDaySchema).min(1).describe('日ごとの説明'),
});

export type NarrativeOutput = z.infer<typeof narrativeOutputSchema>;
