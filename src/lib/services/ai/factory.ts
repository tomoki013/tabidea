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
  apiKey: string;
  /** GeminiService固有のオプション */
  geminiOptions?: GeminiServiceOptions;
}

/**
 * AIサービスインスタンスを生成
 * 環境変数またはconfig引数に基づいてプロバイダを選択
 */
export function createAIService(config?: Partial<AIServiceConfig>): AIService & { modifyItinerary: InstanceType<typeof GeminiService>['modifyItinerary']; generateOutline: InstanceType<typeof GeminiService>['generateOutline']; generateDayDetails: InstanceType<typeof GeminiService>['generateDayDetails'] } {
  const provider = config?.provider || (process.env.AI_PROVIDER as AIProvider) || 'gemini';

  switch (provider) {
    case 'gemini': {
      const apiKey = config?.apiKey || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
      if (!apiKey) {
        throw new Error('GOOGLE_GENERATIVE_AI_API_KEY is required for Gemini provider');
      }
      return new GeminiService(apiKey, config?.geminiOptions);
    }
    // case 'openai':
    //   return new OpenAIService(config);
    // case 'anthropic':
    //   return new AnthropicService(config);
    default:
      throw new Error(`Unsupported AI provider: ${provider}`);
  }
}
