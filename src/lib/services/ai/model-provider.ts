/**
 * AI Model Provider
 * タスク名に基づいてVercel AI SDKのモデルインスタンスを返す
 * 環境変数でプロバイダ（gemini/openai）とモデル名を設定可能
 */

import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import type { LanguageModelV1 } from 'ai';

// ============================================
// Types
// ============================================

export type AITaskName =
  | 'itinerary'
  | 'chat'
  | 'packing'
  | 'travel-info'
  | 'travel-info-fallback';

export type ProviderName = 'gemini' | 'openai';

export interface ModelProviderOptions {
  /** Override provider for this call */
  provider?: ProviderName;
  /** Override model name for this call */
  modelName?: string;
  /** Enable structured outputs (provider-specific) */
  structuredOutputs?: boolean;
  /** Explicit API key override */
  apiKey?: string;
}

export interface ResolvedModel {
  /** The Vercel AI SDK model instance */
  model: LanguageModelV1;
  /** The resolved model name string (for logging) */
  modelName: string;
  /** The provider that was selected */
  provider: ProviderName;
}

// ============================================
// Provider env var mapping
// ============================================

const TASK_PROVIDER_ENV_MAP: Record<AITaskName, string> = {
  'itinerary':            'AI_PROVIDER_ITINERARY',
  'chat':                 'AI_PROVIDER_CHAT',
  'packing':              'AI_PROVIDER_PACKING',
  'travel-info':          'AI_PROVIDER_TRAVEL_INFO',
  'travel-info-fallback': 'AI_PROVIDER_TRAVEL_INFO_FALLBACK',
};

const TASK_MODEL_ENV_MAP_OPENAI: Record<AITaskName, string> = {
  'itinerary':            'OPENAI_MODEL_ITINERARY',
  'chat':                 'OPENAI_MODEL_CHAT',
  'packing':              'OPENAI_MODEL_PACKING',
  'travel-info':          'OPENAI_MODEL_TRAVEL_INFO',
  'travel-info-fallback': 'OPENAI_MODEL_TRAVEL_INFO_FALLBACK',
};

// ============================================
// Singleton provider instances
// ============================================

let googleInstance: ReturnType<typeof createGoogleGenerativeAI> | null = null;
let openaiInstance: ReturnType<typeof createOpenAI> | null = null;

function getGoogleProvider(apiKey?: string): ReturnType<typeof createGoogleGenerativeAI> {
  const key = apiKey || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!key) throw new Error('GOOGLE_GENERATIVE_AI_API_KEY is required for Gemini provider');
  if (!googleInstance || apiKey) {
    const instance = createGoogleGenerativeAI({ apiKey: key });
    if (!apiKey) googleInstance = instance;
    return instance;
  }
  return googleInstance;
}

function getOpenAIProvider(apiKey?: string): ReturnType<typeof createOpenAI> {
  const key = apiKey || process.env.OPENAI_API_KEY;
  if (!key) throw new Error('OPENAI_API_KEY is required for OpenAI provider');
  if (!openaiInstance || apiKey) {
    const instance = createOpenAI({ apiKey: key });
    if (!apiKey) openaiInstance = instance;
    return instance;
  }
  return openaiInstance;
}

// ============================================
// Core Resolution Functions
// ============================================

/**
 * Resolve provider name for a given task.
 *
 * Resolution order:
 * 1. options.provider (explicit override)
 * 2. AI_PROVIDER_{TASK} env var
 * 3. AI_PROVIDER env var (global fallback)
 * 4. 'gemini' (default)
 */
export function resolveProvider(
  task: AITaskName,
  provider?: ProviderName
): ProviderName {
  return (
    provider ||
    (process.env[TASK_PROVIDER_ENV_MAP[task]] as ProviderName) ||
    (process.env.AI_PROVIDER as ProviderName) ||
    'gemini'
  );
}

/**
 * Resolve model name for a given provider and task.
 *
 * Resolution order:
 * 1. explicit modelName
 * 2. {PROVIDER}_MODEL_{TASK} env var
 * 3. {PROVIDER}_MODEL_NAME env var (global)
 * 4. Provider default
 */
export function resolveModelName(
  provider: ProviderName,
  task: AITaskName,
  modelName?: string
): string {
  if (modelName) return modelName;

  if (provider === 'openai') {
    return (
      process.env[TASK_MODEL_ENV_MAP_OPENAI[task]] ||
      process.env.OPENAI_MODEL_NAME ||
      'gpt-4o-mini'
    );
  }

  // Gemini
  return process.env.GOOGLE_MODEL_NAME || 'gemini-2.5-flash';
}

/**
 * Create a Vercel AI SDK model instance for a specific provider.
 * Used by Race strategy to explicitly target a provider.
 */
export function resolveModelForProvider(
  provider: ProviderName,
  task: AITaskName,
  options: Omit<ModelProviderOptions, 'provider'> = {}
): ResolvedModel {
  const modelName = resolveModelName(provider, task, options.modelName);
  const structuredOutputs = options.structuredOutputs ?? true;

  let model: LanguageModelV1;

  if (provider === 'openai') {
    const openai = getOpenAIProvider(options.apiKey);
    model = openai(modelName, { structuredOutputs });
  } else {
    const google = getGoogleProvider(options.apiKey);
    model = google(modelName, { structuredOutputs });
  }

  console.log(`[model-provider] Provider "${provider}" / Task "${task}" → ${modelName}`);
  return { model, modelName, provider };
}

/**
 * Resolve a Vercel AI SDK model instance for a given task.
 * Main entry point for single-provider resolution.
 */
export function resolveModel(
  task: AITaskName,
  options: ModelProviderOptions = {}
): ResolvedModel {
  const provider = resolveProvider(task, options.provider);
  return resolveModelForProvider(provider, task, options);
}

/**
 * Check if both providers are available (both API keys set).
 */
export function isBothProvidersAvailable(): boolean {
  return !!(process.env.GOOGLE_GENERATIVE_AI_API_KEY && process.env.OPENAI_API_KEY);
}

/**
 * Get the "other" provider (for cross-review).
 */
export function getAlternateProvider(provider: ProviderName): ProviderName {
  return provider === 'gemini' ? 'openai' : 'gemini';
}

/**
 * Reset singleton instances (for testing)
 */
export function resetProviders(): void {
  googleInstance = null;
  openaiInstance = null;
}
