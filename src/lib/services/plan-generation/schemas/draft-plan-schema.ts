/**
 * Draft Plan Zod Schema
 * Pass B (Full Draft Generation) の AI 構造化出力スキーマ
 *
 * 現行の semanticPlanSchema と異なり:
 * - candidates + dayStructure の分離ではなく、day > stops の統合構造
 * - 各 stop に aiConfidence (AI の自己評価) を含む
 * - 各 day に完全なストップ順序を含む
 */

import { z } from 'zod';

// ============================================
// Stop Schema
// ============================================

export const draftStopSchema = z.object({
  name: z.string().max(200).describe('スポット名 (具体的で実在する場所名)'),
  searchQuery: z.string().max(300).describe('Google Places API 検索クエリ (英語推奨)'),
  role: z.enum(['must_visit', 'recommended', 'meal', 'accommodation', 'filler']).describe('ストップの役割'),
  timeSlotHint: z.enum(['morning', 'midday', 'afternoon', 'evening', 'night', 'flexible']).describe('推奨する時間帯'),
  stayDurationMinutes: z.number().int().min(10).max(480).describe('滞在時間 (分)'),
  areaHint: z.string().max(200).describe('エリア名 (例: "浅草エリア", "銀座周辺")'),
  rationale: z.string().max(500).describe('このストップを選んだ理由'),
  aiConfidence: z.enum(['high', 'medium', 'low']).describe('確信度: high=確実に存在, medium=おそらく存在, low=不確か'),
  categoryHint: z.string().max(100).optional().describe('カテゴリ (例: "temple", "cafe", "restaurant")'),
  activityLabel: z.string().max(200).optional().describe('説明的なアクティビティ名 (例: "金閣寺で抹茶体験")'),
  locationEn: z.string().max(200).optional().describe('英語での場所名'),
  indoorOutdoor: z.enum(['indoor', 'outdoor', 'both']).optional().describe('屋内/屋外'),
  tags: z.array(z.string().max(50)).max(5).optional().describe('タグ (例: ["写真映え", "静か"])'),
});

// ============================================
// Day Schema
// ============================================

export const draftDaySchema = z.object({
  day: z.number().int().min(1).describe('日番号 (1-based)'),
  title: z.string().max(200).describe('日のタイトル'),
  mainArea: z.string().max(200).describe('メインエリア'),
  overnightLocation: z.string().max(200).describe('宿泊地'),
  summary: z.string().max(500).describe('この日の概要 — なぜこの日にこの行程なのか'),
  stops: z.array(draftStopSchema).min(1).max(12).describe('ストップ一覧 (訪問順)'),
});

// ============================================
// Draft Plan Schema (Main Output)
// ============================================

export const draftPlanSchema = z.object({
  destination: z.string().max(200).describe('旅行先'),
  description: z.string().max(1000).describe('旅程全体の説明'),
  tripIntentSummary: z.string().max(500).describe('この旅の意図・テーマの要約'),
  days: z.array(draftDaySchema).min(1).max(30).describe('日ごとの旅程'),
  themes: z.array(z.string().max(100)).max(10).describe('旅のテーマタグ'),
  orderingPreferences: z.array(z.string().max(200)).max(10).describe('順序の好み (例: "寺社は午前中に")'),
});

/** LLM 向け緩和版 — 文字数制限を緩くして validation failure を避ける */
export const draftPlanLlmSchema = z.object({
  destination: z.string().describe('旅行先'),
  description: z.string().describe('旅程全体の説明'),
  tripIntentSummary: z.string().describe('この旅の意図・テーマの要約'),
  days: z.array(z.object({
    day: z.number().int().min(1).describe('日番号 (1-based)'),
    title: z.string().describe('日のタイトル'),
    mainArea: z.string().describe('メインエリア'),
    overnightLocation: z.string().describe('宿泊地'),
    summary: z.string().describe('この日の概要'),
    stops: z.array(z.object({
      name: z.string().describe('スポット名'),
      searchQuery: z.string().describe('Google Places API 検索クエリ'),
      role: z.enum(['must_visit', 'recommended', 'meal', 'accommodation', 'filler']).describe('役割'),
      timeSlotHint: z.enum(['morning', 'midday', 'afternoon', 'evening', 'night', 'flexible']).describe('時間帯'),
      stayDurationMinutes: z.number().int().min(10).max(480).describe('滞在時間 (分)'),
      areaHint: z.string().describe('エリア名'),
      rationale: z.string().describe('選定理由'),
      aiConfidence: z.enum(['high', 'medium', 'low']).describe('確信度'),
      categoryHint: z.string().optional().describe('カテゴリ'),
      activityLabel: z.string().optional().describe('アクティビティ名'),
      locationEn: z.string().optional().describe('英語名'),
      indoorOutdoor: z.enum(['indoor', 'outdoor', 'both']).optional().describe('屋内/屋外'),
      tags: z.array(z.string()).optional().describe('タグ'),
    })).min(1).describe('ストップ一覧'),
  })).min(1).describe('日ごとの旅程'),
  themes: z.array(z.string()).optional().describe('テーマ'),
  orderingPreferences: z.array(z.string()).optional().describe('順序の好み'),
});

export type DraftPlanLlmOutput = z.infer<typeof draftPlanLlmSchema>;
