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
  name: z.string().max(100).describe('スポット/アクティビティ名'),
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
    .max(100)
    .describe('Google Places API で検索するためのスポット正式名称'),
  categoryHint: z
    .string()
    .max(50)
    .optional()
    .describe('カテゴリヒント (例: "temple", "cafe")'),
  activityLabel: z
    .string()
    .max(100)
    .optional()
    .describe('装飾的なアクティビティ名 (例: "金閣寺で抹茶体験")'),
  locationEn: z
    .string()
    .max(100)
    .optional()
    .describe('英語での場所名 (例: "Kinkaku-ji Temple")'),
  // ---- v3 追加フィールド (LLM 出力、optional) ----
  rationale: z
    .string()
    .max(300)
    .optional()
    .describe('この候補を選んだ理由 (1文)'),
  areaHint: z
    .string()
    .max(50)
    .optional()
    .describe('候補が位置するエリア名 (例: "浅草エリア", "銀座周辺")'),
  indoorOutdoor: z
    .enum(['indoor', 'outdoor', 'both'])
    .optional()
    .describe('屋内/屋外'),
  tags: z
    .array(z.string().max(30))
    .optional()
    .describe('候補のタグ (例: ["写真映え", "静か"])'),
});

export const destinationHighlightSchema = z.object({
  name: z.string().max(100).describe('その目的地らしさを感じる具体的なスポット名'),
  searchQuery: z.string().max(100).optional().describe('Places API 検索に向いた正式名称'),
  areaHint: z.string().max(50).describe('そのスポットがあるエリア名'),
  dayHint: z.number().min(1).describe('どの日に入れると自然かの候補日'),
  rationale: z.string().max(300).describe('このスポットを入れる理由'),
  locationEn: z.string().max(100).optional().describe('英語の正式名称'),
  timeSlotHint: timeSlotHintSchema.optional().describe('おすすめの時間帯'),
  stayDurationMinutes: z.number().min(15).max(360).optional().describe('想定滞在時間'),
});

export const dayStructureSchema = z.object({
  day: z.number().min(1).describe('日番号 (1-based)'),
  title: z.string().max(100).describe('日のタイトル'),
  mainArea: z.string().max(50).describe('メインエリア'),
  startArea: z.string().max(50).optional().describe('その日の始まりに向くエリア名'),
  endArea: z.string().max(50).optional().describe('その日の終わりに向くエリア名'),
  overnightLocation: z.string().max(100).describe('宿泊地'),
  summary: z.string().max(300).describe('概要'),
  flowSummary: z.string().max(500).optional().describe('朝から夜までの流れの要約'),
  anchorMoments: z.array(z.string().max(100)).optional().describe('その日の代表的な時間帯アンカー'),
});

export const semanticPlanSchema = z.object({
  destination: z.string().max(100).describe('目的地'),
  description: z.string().max(500).describe('プラン全体の説明'),
  candidates: z
    .array(semanticCandidateSchema)
    .min(1)
    .describe('候補スポット一覧'),
  dayStructure: z
    .array(dayStructureSchema)
    .min(1)
    .describe('日ごとの構造'),
  themes: z
    .array(z.string().max(50))
    .optional()
    .describe('AIが選んだテーマタグ'),
  destinationHighlights: z
    .array(destinationHighlightSchema)
    .optional()
    .describe('その目的地らしさを担保する代表スポット'),
  // ---- v3 追加フィールド ----
  tripIntentSummary: z
    .string()
    .max(300)
    .optional()
    .describe('旅の意図サマリー (例: "歴史ある京都の寺社を巡り、抹茶スイーツを楽しむ3日間")'),
  orderingPreferences: z
    .array(z.string().max(200))
    .optional()
    .describe('順序に関する好み (例: ["寺社は午前中に", "食事は地元の店で"])'),
  fallbackHints: z
    .array(z.string().max(200))
    .optional()
    .describe('候補不足時の補完ヒント (例: ["近くの公園", "駅前のカフェ"])'),
});

export type SemanticPlanOutput = z.infer<typeof semanticPlanSchema>;

export const semanticSeedSchema = z.object({
  destination: z.string().max(100).describe('目的地'),
  description: z.string().max(500).describe('プラン全体の説明'),
  dayStructure: z
    .array(dayStructureSchema)
    .min(1)
    .describe('日ごとの構造'),
  themes: z
    .array(z.string().max(50))
    .optional()
    .describe('AIが選んだテーマタグ'),
  destinationHighlights: z
    .array(destinationHighlightSchema)
    .optional()
    .describe('その目的地らしさを担保する代表スポット'),
  tripIntentSummary: z
    .string()
    .max(300)
    .optional()
    .describe('旅の意図サマリー'),
  orderingPreferences: z
    .array(z.string().max(200))
    .optional()
    .describe('順序に関する好み'),
  fallbackHints: z
    .array(z.string().max(200))
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
// LLM-facing schemas (relaxed .max() limits)
// generateObject() validates with these schemas internally.
// Strict limits are enforced in post-processing sanitization
// to avoid hard validation failures on verbose LLM output.
// ============================================

/** LLM output buffer: generous enough to avoid hard failures, but capped to prevent token exhaustion */
const LLM_STRING_MAX = 500;

const semanticCandidateLlmSchema = z.object({
  name: z.string().max(100).describe('スポット/アクティビティ名'),
  role: candidateRoleSchema.describe('候補の役割'),
  priority: z.number().min(0).max(10).describe('優先度 (0=低, 10=高)'),
  dayHint: z.number().min(0).describe('推奨する日 (0 or 1-based)'),
  timeSlotHint: timeSlotHintSchema.describe('推奨する時間帯'),
  stayDurationMinutes: z.number().min(5).max(480).describe('滞在時間（分）'),
  searchQuery: z.string().max(100).describe('Google Places API で検索するためのスポット正式名称'),
  categoryHint: z.string().max(50).optional().describe('カテゴリヒント (例: "temple", "cafe")'),
  activityLabel: z.string().max(100).optional().describe('装飾的なアクティビティ名 (例: "金閣寺で抹茶体験")'),
  locationEn: z.string().max(100).optional().describe('英語での場所名 (例: "Kinkaku-ji Temple")'),
  rationale: z.string().max(LLM_STRING_MAX).optional().describe('この候補を選んだ理由（300文字以内の1文）'),
  areaHint: z.string().max(50).optional().describe('候補が位置するエリア名 (例: "浅草エリア", "銀座周辺")'),
  indoorOutdoor: z.enum(['indoor', 'outdoor', 'both']).optional().describe('屋内/屋外'),
  tags: z.array(z.string().max(30)).optional().describe('候補のタグ (例: ["写真映え", "静か"])'),
});

const destinationHighlightLlmSchema = z.object({
  name: z.string().max(100).describe('その目的地らしさを感じる具体的なスポット名'),
  searchQuery: z.string().max(100).optional().describe('Places API 検索に向いた正式名称'),
  areaHint: z.string().max(50).describe('そのスポットがあるエリア名'),
  dayHint: z.number().min(1).describe('どの日に入れると自然かの候補日'),
  rationale: z.string().max(LLM_STRING_MAX).describe('このスポットを入れる理由（300文字以内）'),
  locationEn: z.string().max(100).optional().describe('英語の正式名称'),
  timeSlotHint: timeSlotHintSchema.optional().describe('おすすめの時間帯'),
  stayDurationMinutes: z.number().min(15).max(360).optional().describe('想定滞在時間'),
});

const dayStructureLlmSchema = z.object({
  day: z.number().min(1).describe('日番号 (1-based)'),
  title: z.string().max(100).describe('日のタイトル'),
  mainArea: z.string().max(50).describe('メインエリア'),
  startArea: z.string().max(50).optional().describe('その日の始まりに向くエリア名'),
  endArea: z.string().max(50).optional().describe('その日の終わりに向くエリア名'),
  overnightLocation: z.string().max(100).describe('宿泊地'),
  summary: z.string().max(LLM_STRING_MAX).describe('概要（300文字以内で簡潔に）'),
  flowSummary: z.string().max(LLM_STRING_MAX).optional().describe('朝から夜までの流れの要約（500文字以内）'),
  anchorMoments: z.array(z.string().max(100)).optional().describe('その日の代表的な時間帯アンカー'),
});

export const semanticPlanLlmSchema = z.object({
  destination: z.string().max(100).describe('目的地'),
  description: z.string().max(LLM_STRING_MAX).describe('プラン全体の説明（500文字以内）'),
  candidates: z.array(semanticCandidateLlmSchema).min(1).describe('候補スポット一覧'),
  dayStructure: z.array(dayStructureLlmSchema).min(1).describe('日ごとの構造'),
  themes: z.array(z.string().max(50)).optional().describe('AIが選んだテーマタグ'),
  destinationHighlights: z.array(destinationHighlightLlmSchema).optional().describe('その目的地らしさを担保する代表スポット'),
  tripIntentSummary: z.string().max(LLM_STRING_MAX).optional()
    .describe('旅の意図サマリー（300文字以内の1文。例: "歴史ある京都の寺社を巡り、抹茶スイーツを楽しむ3日間"）'),
  orderingPreferences: z.array(z.string().max(LLM_STRING_MAX)).optional().describe('順序に関する好み（各200文字以内）'),
  fallbackHints: z.array(z.string().max(LLM_STRING_MAX)).optional().describe('候補不足時の補完ヒント（各200文字以内）'),
});

export const semanticSeedLlmSchema = z.object({
  destination: z.string().max(100).describe('目的地'),
  description: z.string().max(LLM_STRING_MAX).describe('プラン全体の説明（500文字以内）'),
  dayStructure: z.array(dayStructureLlmSchema).min(1).describe('日ごとの構造'),
  themes: z.array(z.string().max(50)).optional().describe('AIが選んだテーマタグ'),
  destinationHighlights: z.array(destinationHighlightLlmSchema).optional().describe('その目的地らしさを担保する代表スポット'),
  tripIntentSummary: z.string().max(LLM_STRING_MAX).optional()
    .describe('旅の意図サマリー（300文字以内の1文）'),
  orderingPreferences: z.array(z.string().max(LLM_STRING_MAX)).optional().describe('順序に関する好み（各200文字以内）'),
  fallbackHints: z.array(z.string().max(LLM_STRING_MAX)).optional().describe('候補不足時の補完ヒント（各200文字以内）'),
});

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
