/**
 * AI Service Factory
 * プロバイダに応じたAIサービスインスタンスを生成
 */

import { GeminiService, type GeminiServiceOptions } from './gemini';
import type { AIService } from './types';

export type AIProvider = 'gemini' | 'openai' | 'anthropic';

export interface AIServiceConfig {
  provider: AIProvider;
  modelName?: string;
  /** GeminiService固有のオプション（現在はプロバイダ非依存） */
  geminiOptions?: GeminiServiceOptions;
}

/**
 * AIサービスインスタンスを生成
 * 内部的に resolveModel がプロバイダを解決するため、
 * GeminiService は実際にはプロバイダ非依存のオーケストレーターとして動作
 */
export function createAIService(config?: Partial<AIServiceConfig>): AIService & { modifyItinerary: InstanceType<typeof GeminiService>['modifyItinerary']; generateOutline: InstanceType<typeof GeminiService>['generateOutline']; generateDayDetails: InstanceType<typeof GeminiService>['generateDayDetails']; lastModelInfo: InstanceType<typeof GeminiService>['lastModelInfo'] } {
  return new GeminiService(config?.geminiOptions);
}
