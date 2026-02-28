/**
 * AIServiceProvider — プロバイダー抽象インターフェース
 *
 * Gemini / OpenAI を統一的に扱うためのインターフェース定義。
 * 各プロバイダーはこのインターフェースを実装する。
 */

import type { LanguageModelV1 } from "ai";
import type { UserType } from "@/lib/limits/config";

// ============================================================================
// Provider Types
// ============================================================================

export type AIProviderName = "gemini" | "openai";

export type AIPhase =
  | "spot_extraction"
  | "outline"
  | "chunk"
  | "modify";

// ============================================================================
// AIServiceProvider Interface
// ============================================================================

export interface AIServiceProvider {
  /** プロバイダー名 */
  readonly name: AIProviderName;

  /** APIキーが設定されているか */
  isAvailable(): boolean;

  /**
   * フェーズ × ユーザータイプ に基づくモデルインスタンスを返す
   */
  getModel(phase: AIPhase, userType: UserType): ResolvedProviderModel;
}

// ============================================================================
// Resolved Model
// ============================================================================

export interface ResolvedProviderModel {
  /** Vercel AI SDK モデルインスタンス */
  model: LanguageModelV1;
  /** モデル名 (ログ用) */
  modelName: string;
  /** プロバイダー名 */
  provider: AIProviderName;
  /** 温度設定 */
  temperature: number;
}

// ============================================================================
// Phase-based Model Config
// ============================================================================

/**
 * 環境変数名のパターン:
 *   AI_MODEL_{PHASE}_{TIER}                  (単一プロバイダー)
 *   AI_MODEL_{PHASE}_{TIER}_{PROVIDER}       (マルチプロバイダー)
 *
 * 例:
 *   AI_MODEL_OUTLINE_FREE=gemini-2.5-flash
 *   AI_MODEL_CHUNK_PREMIUM_OPENAI=gpt-5.2
 */

/** ティア → 環境変数プレフィクスマッピング */
export const USER_TYPE_TO_TIER: Record<UserType, string> = {
  anonymous: "FREE",
  free: "FREE",
  pro: "PRO",
  premium: "PREMIUM",
  admin: "PREMIUM",
};

/** フェーズ別温度設定 */
export const PHASE_TEMPERATURE: Record<AIPhase, number> = {
  spot_extraction: 0.1,
  outline: 0.3,
  chunk: 0.1,
  modify: 0.1,
};
