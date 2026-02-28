/**
 * OpenAIProvider — OpenAI AIServiceProvider 実装
 */

import { createOpenAI } from "@ai-sdk/openai";
import type { UserType } from "@/lib/limits/config";
import type {
  AIServiceProvider,
  AIPhase,
  ResolvedProviderModel,
} from "./types";
import { USER_TYPE_TO_TIER, PHASE_TEMPERATURE } from "./types";

// ============================================================================
// Default Models
// ============================================================================

const DEFAULT_MODELS: Record<string, string> = {
  SPOT_EXTRACTION: "gpt-4o-mini",
  OUTLINE_FREE: "gpt-4o-mini",
  CHUNK_FREE: "gpt-4o-mini",
  OUTLINE_PRO: "gpt-4o-mini",
  CHUNK_PRO: "gpt-4o",
  OUTLINE_PREMIUM: "gpt-4o",
  CHUNK_PREMIUM: "gpt-4o",
  MODIFY_FREE: "gpt-4o-mini",
  MODIFY_PRO: "gpt-4o",
  MODIFY_PREMIUM: "gpt-4o",
};

// ============================================================================
// Provider
// ============================================================================

export class OpenAIProvider implements AIServiceProvider {
  readonly name = "openai" as const;
  private instance: ReturnType<typeof createOpenAI> | null = null;

  isAvailable(): boolean {
    return !!process.env.OPENAI_API_KEY;
  }

  getModel(phase: AIPhase, userType: UserType): ResolvedProviderModel {
    const provider = this.getProviderInstance();
    const modelName = this.resolveModelName(phase, userType);
    const temperature = PHASE_TEMPERATURE[phase];

    return {
      model: provider(modelName, { structuredOutputs: true }),
      modelName,
      provider: this.name,
      temperature,
    };
  }

  // ============================================================================
  // Private
  // ============================================================================

  private getProviderInstance(): ReturnType<typeof createOpenAI> {
    if (this.instance) return this.instance;

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is required for OpenAI provider");
    }

    this.instance = createOpenAI({ apiKey });
    return this.instance;
  }

  /**
   * 環境変数からモデル名を解決
   *
   * Resolution order:
   * 1. AI_MODEL_{PHASE}_{TIER}_OPENAI    (プロバイダー固有)
   * 2. AI_MODEL_{PHASE}_{TIER}           (プロバイダー共通)
   * 3. DEFAULT_MODELS[{PHASE}_{TIER}]    (ハードコードデフォルト)
   */
  private resolveModelName(phase: AIPhase, userType: UserType): string {
    const tier = USER_TYPE_TO_TIER[userType];
    const phaseKey = phase.toUpperCase();

    // spot_extraction はティア共通
    if (phase === "spot_extraction") {
      return (
        process.env.AI_MODEL_SPOT_EXTRACTION_OPENAI ||
        process.env.AI_MODEL_SPOT_EXTRACTION ||
        DEFAULT_MODELS.SPOT_EXTRACTION
      );
    }

    // フェーズ×ティア×プロバイダー
    const providerSpecific = process.env[`AI_MODEL_${phaseKey}_${tier}_OPENAI`];
    if (providerSpecific) return providerSpecific;

    // フェーズ×ティア
    const tierSpecific = process.env[`AI_MODEL_${phaseKey}_${tier}`];
    if (tierSpecific) return tierSpecific;

    // デフォルト
    return DEFAULT_MODELS[`${phaseKey}_${tier}`] || DEFAULT_MODELS.SPOT_EXTRACTION;
  }

  /** テスト用: シングルトンリセット */
  reset(): void {
    this.instance = null;
  }
}
