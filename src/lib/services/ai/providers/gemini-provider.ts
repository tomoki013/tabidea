/**
 * GeminiProvider — Google Gemini AIServiceProvider 実装
 */

import { createGoogleGenerativeAI } from "@ai-sdk/google";
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
  SPOT_EXTRACTION: "gemini-2.5-flash",
  OUTLINE_FREE: "gemini-2.5-flash",
  CHUNK_FREE: "gemini-2.5-flash",
  OUTLINE_PRO: "gemini-2.5-flash",
  CHUNK_PRO: "gemini-3-flash-preview",
  OUTLINE_PREMIUM: "gemini-3-flash-preview",
  CHUNK_PREMIUM: "gemini-3-pro-preview",
  MODIFY_FREE: "gemini-2.5-flash",
  MODIFY_PRO: "gemini-3-flash-preview",
  MODIFY_PREMIUM: "gemini-3-pro-preview",
};

// ============================================================================
// Provider
// ============================================================================

export class GeminiProvider implements AIServiceProvider {
  readonly name = "gemini" as const;
  private instance: ReturnType<typeof createGoogleGenerativeAI> | null = null;

  isAvailable(): boolean {
    return !!process.env.GOOGLE_GENERATIVE_AI_API_KEY;
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

  private getProviderInstance(): ReturnType<typeof createGoogleGenerativeAI> {
    if (this.instance) return this.instance;

    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is required for Gemini provider");
    }

    this.instance = createGoogleGenerativeAI({ apiKey });
    return this.instance;
  }

  /**
   * 環境変数からモデル名を解決
   *
   * Resolution order:
   * 1. AI_MODEL_{PHASE}_{TIER}_GEMINI    (プロバイダー固有)
   * 2. AI_MODEL_{PHASE}_{TIER}           (プロバイダー共通)
   * 3. DEFAULT_MODELS[{PHASE}_{TIER}]    (ハードコードデフォルト)
   * 4. DEFAULT_MODELS[SPOT_EXTRACTION]   (最終フォールバック)
   */
  private resolveModelName(phase: AIPhase, userType: UserType): string {
    const tier = USER_TYPE_TO_TIER[userType];
    const phaseKey = phase.toUpperCase();

    // spot_extraction はティア共通
    if (phase === "spot_extraction") {
      return (
        process.env.AI_MODEL_SPOT_EXTRACTION_GEMINI ||
        process.env.AI_MODEL_SPOT_EXTRACTION ||
        DEFAULT_MODELS.SPOT_EXTRACTION
      );
    }

    // フェーズ×ティア×プロバイダー
    const providerSpecific = process.env[`AI_MODEL_${phaseKey}_${tier}_GEMINI`];
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
