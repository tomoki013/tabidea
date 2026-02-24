/**
 * Provider Factory — プロバイダーインスタンス管理
 *
 * - AI_DEFAULT_PROVIDER 環境変数でデフォルトプロバイダーを設定
 * - OpenAI のキーが未設定の場合は Gemini にフォールバック
 * - Premium のみマルチプロバイダーが有効
 */

import type { UserType } from "@/lib/limits/config";
import type { AIServiceProvider, AIProviderName, AIPhase, ResolvedProviderModel } from "./types";
import { GeminiProvider } from "./gemini-provider";
import { OpenAIProvider } from "./openai-provider";

// ============================================================================
// Singleton Instances
// ============================================================================

let geminiProvider: GeminiProvider | null = null;
let openaiProvider: OpenAIProvider | null = null;

function getGeminiProvider(): GeminiProvider {
  if (!geminiProvider) geminiProvider = new GeminiProvider();
  return geminiProvider;
}

function getOpenAIProvider(): OpenAIProvider {
  if (!openaiProvider) openaiProvider = new OpenAIProvider();
  return openaiProvider;
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * プロバイダー名からインスタンスを取得
 */
export function getProvider(name: AIProviderName): AIServiceProvider {
  switch (name) {
    case "openai":
      return getOpenAIProvider();
    case "gemini":
    default:
      return getGeminiProvider();
  }
}

/**
 * デフォルトプロバイダー名を取得
 *
 * Resolution:
 * 1. AI_DEFAULT_PROVIDER 環境変数
 * 2. 'gemini' (フォールバック)
 */
export function getDefaultProviderName(): AIProviderName {
  const envProvider = process.env.AI_DEFAULT_PROVIDER;
  if (envProvider === "openai" || envProvider === "gemini") {
    return envProvider;
  }
  return "gemini";
}

/**
 * ユーザータイプに基づいてプロバイダーを選択
 *
 * - premium/admin: マルチプロバイダー可（指定可能）
 * - その他: デフォルトプロバイダーのみ
 */
export function selectProvider(
  userType: UserType,
  preferredProvider?: AIProviderName,
): AIServiceProvider {
  const defaultName = getDefaultProviderName();

  // Premium/Admin はプロバイダー指定可能
  if (
    (userType === "premium" || userType === "admin") &&
    preferredProvider
  ) {
    const preferred = getProvider(preferredProvider);
    if (preferred.isAvailable()) {
      return preferred;
    }
    // フォールバック
    console.warn(
      `[provider-factory] ${preferredProvider} is not available, falling back to ${defaultName}`,
    );
  }

  const provider = getProvider(defaultName);

  // デフォルトプロバイダーが利用不可の場合、代替を試行
  if (!provider.isAvailable()) {
    const alternateName: AIProviderName =
      defaultName === "gemini" ? "openai" : "gemini";
    const alternate = getProvider(alternateName);

    if (alternate.isAvailable()) {
      console.warn(
        `[provider-factory] ${defaultName} is not available, falling back to ${alternateName}`,
      );
      return alternate;
    }

    // 両方利用不可
    throw new Error(
      "No AI provider available. Set GOOGLE_GENERATIVE_AI_API_KEY or OPENAI_API_KEY.",
    );
  }

  return provider;
}

/**
 * フェーズ×ユーザータイプ からモデルを解決する統合関数
 *
 * @param phase - 生成フェーズ
 * @param userType - ユーザータイプ
 * @param preferredProvider - 希望プロバイダー (Premium/Admin のみ有効)
 */
export function getModelForPhase(
  phase: AIPhase,
  userType: UserType,
  preferredProvider?: AIProviderName,
): ResolvedProviderModel {
  const provider = selectProvider(userType, preferredProvider);
  const resolved = provider.getModel(phase, userType);

  console.log(
    `[provider-factory] getModelForPhase: phase=${phase}, userType=${userType} → ${resolved.provider}/${resolved.modelName} (temp=${resolved.temperature})`,
  );

  return resolved;
}

/**
 * 両方のプロバイダーが利用可能か
 */
export function areBothProvidersAvailable(): boolean {
  return getGeminiProvider().isAvailable() && getOpenAIProvider().isAvailable();
}

/**
 * テスト用: シングルトンリセット
 */
export function resetProviderInstances(): void {
  if (geminiProvider) {
    geminiProvider.reset();
    geminiProvider = null;
  }
  if (openaiProvider) {
    openaiProvider.reset();
    openaiProvider = null;
  }
}
