/**
 * プロンプトシステム統合モジュール
 * Unified prompt system for itinerary generation
 */

// Re-export all prompt components
export * from './system-prompts';
export * from './examples';
export * from './personas';

import {
  buildOutlineSystemPrompt,
  buildDetailsSystemPrompt,
  buildModifySystemPrompt,
  type SystemPromptConfig,
} from './system-prompts';
import { getItineraryExamplesPrompt } from './examples';
import { buildPersonaPrompt, inferCompanionType, type CompanionType } from './personas';

// ============================================
// Types
// ============================================

export interface PromptBuilderOptions {
  /** コンテキスト記事のテキスト（フォーマット済み） */
  contextText?: string;
  /** 同行者タイプ */
  companionType?: CompanionType;
  /** 同行者の説明文（推定用） */
  companions?: string;
  /** Few-shot例を含めるか */
  includeFewShot?: boolean;
  /** カスタム指示 */
  customInstructions?: string;
  /** システムプロンプトの設定 */
  systemConfig?: SystemPromptConfig;
}

export interface OutlinePromptOptions extends PromptBuilderOptions {
  /** ユーザーリクエスト */
  userRequest: string;
}

export interface DetailsPromptOptions extends PromptBuilderOptions {
  /** ユーザーリクエスト */
  userRequest: string;
  /** 対象日（開始） */
  startDay: number;
  /** 対象日（終了） */
  endDay: number;
  /** アウトライン情報（JSON文字列） */
  outlineInfo: string;
  /** 開始地点 */
  startingLocation?: string;
}

export interface ModifyPromptOptions {
  /** 現在の旅程（JSON文字列） */
  currentPlanJson: string;
  /** 会話履歴 */
  conversationHistory: string;
  /** カスタム指示 */
  customInstructions?: string;
}

// ============================================
// Prompt Builders
// ============================================

/**
 * Step 1: Outline生成用のプロンプトを構築
 */
export function buildOutlinePrompt(options: OutlinePromptOptions): string {
  const {
    userRequest,
    contextText,
    companionType,
    companions,
    includeFewShot = true,
    customInstructions,
    systemConfig,
  } = options;

  const parts: string[] = [];

  // 1. システムプロンプト
  parts.push(buildOutlineSystemPrompt({
    ...systemConfig,
    customInstructions,
  }));

  // 2. ペルソナ（同行者タイプ）
  const effectiveCompanionType = companionType || (companions ? inferCompanionType(companions) : undefined);
  if (effectiveCompanionType) {
    parts.push(buildPersonaPrompt(effectiveCompanionType));
  }

  // 3. Few-shot例（オプション）
  if (includeFewShot) {
    parts.push(getItineraryExamplesPrompt());
  }

  // 4. コンテキスト記事
  if (contextText) {
    parts.push(`
# CONTEXT ARTICLES
以下の記事を参考にしてください（関連するもののみ reference_indices に含めること）:
${contextText}
`);
  }

  // 5. 出力スキーマのリマインダー
  parts.push(`
# OUTPUT SCHEMA REMINDER
JSONスキーマに完全準拠した出力を生成してください:
- destination: 目的地名
- description: 旅行全体の魅力的な説明
- days: 各日のアウトライン配列
  - day: 日数
  - title: その日のテーマ
  - highlight_areas: 訪問エリア配列
  - overnight_location: 宿泊地
  - travel_method_to_next: 翌日への移動手段（最終日はnull）
`);

  // 6. ユーザーリクエスト
  parts.push(`
# USER REQUEST
${userRequest}
`);

  return parts.join('\n\n');
}

/**
 * Step 2: DayDetails生成用のプロンプトを構築
 */
export function buildDetailsPrompt(options: DetailsPromptOptions): string {
  const {
    userRequest,
    startDay,
    endDay,
    outlineInfo,
    startingLocation,
    contextText,
    companionType,
    companions,
    includeFewShot = false, // 詳細生成ではデフォルトOFF（コンテキスト節約）
    customInstructions,
    systemConfig,
  } = options;

  const parts: string[] = [];

  // 1. システムプロンプト
  parts.push(buildDetailsSystemPrompt({
    ...systemConfig,
    customInstructions,
  }));

  // 2. ペルソナ（同行者タイプ）
  const effectiveCompanionType = companionType || (companions ? inferCompanionType(companions) : undefined);
  if (effectiveCompanionType) {
    parts.push(buildPersonaPrompt(effectiveCompanionType));
  }

  // 3. Few-shot例（オプション）
  if (includeFewShot) {
    parts.push(getItineraryExamplesPrompt());
  }

  // 4. アウトライン情報
  parts.push(`
# MASTER PLAN OUTLINE（必ず従うこと）
対象日: Day ${startDay} 〜 Day ${endDay}
${outlineInfo}
`);

  // 5. 開始地点制約
  if (startingLocation) {
    parts.push(`
# STARTING LOCATION CONSTRAINT（重要）
Day ${startDay} の開始地点: ${startingLocation}
この地点から1日目の行動を開始してください。他の都市・国から始めることは物理的に不可能です。
`);
  }

  // 6. コンテキスト記事
  if (contextText) {
    parts.push(`
# CONTEXT ARTICLES
${contextText}
`);
  }

  // 7. 出力スキーマのリマインダー
  parts.push(`
# OUTPUT SCHEMA REMINDER
days配列を含むJSONを生成:
- day: 日数
- title: その日のテーマ
- transit: 移動情報（該当する場合のみ）
- activities: アクティビティ配列
  - time: 時間
  - activity: アクティビティ名
  - description: 詳細説明
`);

  // 8. ユーザーリクエスト
  parts.push(`
# USER REQUEST
${userRequest}
`);

  return parts.join('\n\n');
}

/**
 * Modify用のプロンプトを構築
 */
export function buildModifyPrompt(options: ModifyPromptOptions): string {
  const {
    currentPlanJson,
    conversationHistory,
    customInstructions,
  } = options;

  const parts: string[] = [];

  // 1. システムプロンプト
  parts.push(buildModifySystemPrompt({
    customInstructions,
  }));

  // 2. 現在の旅程
  parts.push(`
# CURRENT ITINERARY
以下が現在の旅程です。ユーザーの要望に応じて修正してください:
${currentPlanJson}
`);

  // 3. 会話履歴
  parts.push(`
# CONVERSATION HISTORY
${conversationHistory}
`);

  // 4. 指示リマインダー
  parts.push(`
# REMINDER
- 変更依頼のある部分のみ修正
- それ以外は完全に同一に保つ
- id, heroImage, references などのメタデータは保持
`);

  return parts.join('\n\n');
}

// ============================================
// Utility Functions
// ============================================

/**
 * コンテキスト記事をプロンプト用にフォーマット
 */
export function formatContextArticles(
  articles: Array<{ title: string; content: string }>,
  maxContentLength: number = 150
): string {
  return articles
    .map((a, i) => {
      const truncatedContent =
        a.content.length > maxContentLength
          ? a.content.substring(0, maxContentLength) + "..."
          : a.content;
      return `[${i}] ${a.title}: ${truncatedContent}`;
    })
    .join("\n");
}

/**
 * 会話履歴をプロンプト用にフォーマット
 */
export function formatConversationHistory(
  history: Array<{ role: string; text: string }>
): string {
  return history
    .map((m) => `${m.role === "user" ? "USER" : "AI"}: ${m.text}`)
    .join("\n\n");
}
