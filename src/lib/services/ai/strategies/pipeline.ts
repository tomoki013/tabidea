/**
 * Pipeline戦略
 * 各フェーズで最適なプロバイダを使い分ける
 */

import { resolveProvider, type ProviderName } from '../model-provider';
import type { GenerationPhase } from '../model-selector';

// ============================================
// Pipeline Phase → Provider Mapping
// ============================================

const PIPELINE_ENV_MAP: Record<GenerationPhase, string> = {
  outline: 'AI_PIPELINE_OUTLINE',
  details: 'AI_PIPELINE_DETAILS',
  modify: 'AI_PIPELINE_MODIFY',
};

const PIPELINE_DEFAULTS: Record<GenerationPhase, ProviderName> = {
  outline: 'openai',   // 創造性重視
  details: 'gemini',   // 正確性・構造化重視
  modify: 'openai',    // 会話品質重視
};

/**
 * Pipelineフェーズに対応するプロバイダを取得
 * 環境変数 AI_PIPELINE_{PHASE} > デフォルト設定
 */
export function getPipelineProvider(phase: GenerationPhase): ProviderName {
  const envKey = PIPELINE_ENV_MAP[phase];
  const envValue = process.env[envKey] as ProviderName | undefined;
  return envValue || PIPELINE_DEFAULTS[phase];
}

/**
 * 全フェーズのPipeline設定を取得（ログ用）
 */
export function getPipelineConfig(): Record<GenerationPhase, ProviderName> {
  return {
    outline: getPipelineProvider('outline'),
    details: getPipelineProvider('details'),
    modify: getPipelineProvider('modify'),
  };
}
