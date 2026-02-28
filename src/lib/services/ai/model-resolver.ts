/**
 * Model Resolver — フェーズ×ティア×プロバイダー 動的モデル解決
 *
 * 環境変数ベースの柔軟なモデル設定を提供する。
 * 既存の model-selector.ts / model-provider.ts との互換性を維持しつつ、
 * より細かい粒度の制御を可能にする。
 *
 * ## 環境変数パターン
 *
 * ```
 * AI_MODEL_{PHASE}_{TIER}                  単一プロバイダー構成
 * AI_MODEL_{PHASE}_{TIER}_{PROVIDER}       マルチプロバイダー構成
 * AI_DEFAULT_PROVIDER                       デフォルトプロバイダー
 * ```
 *
 * ## 例
 *
 * ```env
 * AI_MODEL_OUTLINE_FREE=gemini-2.5-flash
 * AI_MODEL_CHUNK_PRO=gemini-3-flash-preview
 * AI_MODEL_OUTLINE_PREMIUM_OPENAI=gpt-5.0
 * AI_MODEL_CHUNK_PREMIUM_OPENAI=gpt-5.2
 * AI_DEFAULT_PROVIDER=gemini
 * ```
 */

import type { UserType } from "@/lib/limits/config";
import type { AIProviderName, AIPhase } from "./providers/types";
import { USER_TYPE_TO_TIER, PHASE_TEMPERATURE } from "./providers/types";

// ============================================================================
// Types
// ============================================================================

export interface ModelResolution {
  /** 解決されたモデル名 */
  modelName: string;
  /** 使用プロバイダー */
  provider: AIProviderName;
  /** 温度設定 */
  temperature: number;
  /** 解決元 (デバッグ用) */
  source: "env_provider_specific" | "env_tier_specific" | "default";
}

// ============================================================================
// Default Model Tables
// ============================================================================

const GEMINI_DEFAULTS: Record<string, string> = {
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

const OPENAI_DEFAULTS: Record<string, string> = {
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
// Resolver
// ============================================================================

/**
 * フェーズ×ユーザータイプ×プロバイダー からモデル名を解決
 *
 * @param phase - 生成フェーズ
 * @param userType - ユーザータイプ
 * @param provider - プロバイダー
 * @returns ModelResolution
 */
export function resolveModelForPhase(
  phase: AIPhase,
  userType: UserType,
  provider: AIProviderName,
): ModelResolution {
  const tier = USER_TYPE_TO_TIER[userType];
  const phaseKey = phase.toUpperCase();
  const providerKey = provider.toUpperCase();
  const temperature = PHASE_TEMPERATURE[phase];

  const defaults = provider === "openai" ? OPENAI_DEFAULTS : GEMINI_DEFAULTS;

  // spot_extraction はティア共通
  if (phase === "spot_extraction") {
    const envProvider = process.env[`AI_MODEL_SPOT_EXTRACTION_${providerKey}`];
    if (envProvider) {
      return { modelName: envProvider, provider, temperature, source: "env_provider_specific" };
    }
    const envCommon = process.env.AI_MODEL_SPOT_EXTRACTION;
    if (envCommon) {
      return { modelName: envCommon, provider, temperature, source: "env_tier_specific" };
    }
    return { modelName: defaults.SPOT_EXTRACTION, provider, temperature, source: "default" };
  }

  // 1. AI_MODEL_{PHASE}_{TIER}_{PROVIDER}
  const envProviderSpecific = process.env[`AI_MODEL_${phaseKey}_${tier}_${providerKey}`];
  if (envProviderSpecific) {
    return { modelName: envProviderSpecific, provider, temperature, source: "env_provider_specific" };
  }

  // 2. AI_MODEL_{PHASE}_{TIER}
  const envTierSpecific = process.env[`AI_MODEL_${phaseKey}_${tier}`];
  if (envTierSpecific) {
    return { modelName: envTierSpecific, provider, temperature, source: "env_tier_specific" };
  }

  // 3. Default table
  const key = `${phaseKey}_${tier}`;
  const defaultModel = defaults[key] || defaults.SPOT_EXTRACTION;
  return { modelName: defaultModel, provider, temperature, source: "default" };
}

/**
 * デフォルトプロバイダー名を取得
 */
export function getDefaultProvider(): AIProviderName {
  const envProvider = process.env.AI_DEFAULT_PROVIDER;
  if (envProvider === "openai" || envProvider === "gemini") {
    return envProvider;
  }
  return "gemini";
}

/**
 * 環境変数名のリストを返す (デバッグ/ドキュメント用)
 */
export function listModelEnvVars(): string[] {
  const phases = ["SPOT_EXTRACTION", "OUTLINE", "CHUNK", "MODIFY"];
  const tiers = ["FREE", "PRO", "PREMIUM"];
  const providers = ["GEMINI", "OPENAI"];
  const vars: string[] = ["AI_DEFAULT_PROVIDER"];

  for (const phase of phases) {
    if (phase === "SPOT_EXTRACTION") {
      vars.push(`AI_MODEL_${phase}`);
      for (const p of providers) vars.push(`AI_MODEL_${phase}_${p}`);
      continue;
    }
    for (const tier of tiers) {
      vars.push(`AI_MODEL_${phase}_${tier}`);
      for (const p of providers) vars.push(`AI_MODEL_${phase}_${tier}_${p}`);
    }
  }

  return vars;
}
