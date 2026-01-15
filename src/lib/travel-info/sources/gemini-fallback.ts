/**
 * Gemini AIフォールバックソース
 * 他のAPIが失敗した場合にGemini AIを使用して情報を生成
 *
 * 注意: AI生成情報は信頼性が低いためフォールバックとしてのみ使用
 */

import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateObject } from 'ai';
import {
  TravelInfoCategory,
  SourceType,
  TravelInfoSource,
  AnyCategoryData,
  CATEGORY_LABELS,
} from '@/lib/types/travel-info';

import {
  ITravelInfoSource,
  SourceOptions,
  SourceResult,
} from '../interfaces';

import {
  BasicInfoSchema,
  SafetyInfoSchema,
  ClimateInfoSchema,
  VisaInfoSchema,
  MannerInfoSchema,
  TransportInfoSchema,
} from '@/lib/ai/schemas/travel-info-schemas';
import { z } from 'zod';

/**
 * Geminiフォールバック設定
 */
export interface GeminiFallbackConfig {
  /** Google AI APIキー */
  apiKey?: string;
  /** モデル名 */
  modelName?: string;
  /** タイムアウト（ミリ秒） */
  timeout?: number;
}

/**
 * カテゴリ別コンテンツスキーマ
 */
const CATEGORY_CONTENT_SCHEMAS: Record<TravelInfoCategory, z.ZodType> = {
  basic: BasicInfoSchema,
  safety: SafetyInfoSchema,
  climate: ClimateInfoSchema,
  visa: VisaInfoSchema,
  manner: MannerInfoSchema,
  transport: TransportInfoSchema,
};

/**
 * Gemini AIフォールバックソース
 * 全カテゴリに対応するが、信頼性スコアは低め
 */
export class GeminiFallbackSource implements ITravelInfoSource<AnyCategoryData> {
  readonly sourceName = 'Gemini AI';
  readonly sourceType: SourceType = 'ai_generated';
  readonly reliabilityScore = 60; // AI生成のため低めの信頼性
  readonly supportedCategories: TravelInfoCategory[] = [
    'basic',
    'safety',
    'climate',
    'visa',
    'manner',
    'transport',
  ];

  private readonly config: GeminiFallbackConfig;
  private google: ReturnType<typeof createGoogleGenerativeAI> | null = null;

  constructor(config: GeminiFallbackConfig = {}) {
    this.config = {
      modelName: 'gemini-2.5-flash',
      timeout: 30000,
      ...config,
    };
  }

  /**
   * Google AIクライアントを取得（遅延初期化）
   */
  private getGoogleAI(): ReturnType<typeof createGoogleGenerativeAI> {
    if (!this.google) {
      const apiKey = this.config.apiKey || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
      if (!apiKey) {
        throw new Error('Google AI API key not configured');
      }
      this.google = createGoogleGenerativeAI({ apiKey });
    }
    return this.google;
  }

  /**
   * 渡航情報を生成
   */
  async fetch(
    destination: string,
    options?: SourceOptions
  ): Promise<SourceResult<AnyCategoryData>> {
    console.log(`[gemini-fallback] Generating info for: ${destination}`);

    try {
      const apiKey = this.config.apiKey || process.env.GOOGLE_GENERATIVE_AI_API_KEY;

      if (!apiKey) {
        return {
          success: false,
          error: 'Google AI API key not configured',
        };
      }

      const category = options?.additionalParams?.category as TravelInfoCategory | undefined;
      if (!category) {
        return {
          success: false,
          error: 'Category is required for Gemini fallback',
        };
      }

      const generatedData = await this.generateWithGemini(destination, category);

      if (!generatedData) {
        return {
          success: false,
          error: 'AI生成に失敗しました',
        };
      }

      const source: TravelInfoSource = {
        sourceType: this.sourceType,
        sourceName: this.sourceName,
        retrievedAt: new Date(),
        reliabilityScore: this.reliabilityScore,
      };

      return {
        success: true,
        data: generatedData,
        source,
      };
    } catch (error) {
      console.error('[gemini-fallback] Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * ソースが利用可能かチェック
   */
  async isAvailable(): Promise<boolean> {
    const apiKey = this.config.apiKey || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    return !!apiKey;
  }

  /**
   * Gemini AIで渡航情報を生成（generateObjectを使用）
   */
  private async generateWithGemini(
    destination: string,
    category: TravelInfoCategory
  ): Promise<AnyCategoryData | null> {
    const startTime = Date.now();
    console.log(`[gemini-fallback] Generating ${category} for ${destination}`);

    try {
      const google = this.getGoogleAI();
      const modelName = this.config.modelName || 'gemini-2.5-flash';
      const prompt = this.buildPromptForCategory(destination, category);
      const schema = CATEGORY_CONTENT_SCHEMAS[category];

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout || 30000);

      const { object } = await generateObject({
        model: google(modelName, { structuredOutputs: true }),
        schema,
        prompt,
        abortSignal: controller.signal,
      });

      clearTimeout(timeoutId);

      const elapsed = Date.now() - startTime;
      console.log(`[gemini-fallback] Generated ${category} in ${elapsed}ms`);

      return object as AnyCategoryData;
    } catch (error) {
      const elapsed = Date.now() - startTime;
      console.error(`[gemini-fallback] Failed to generate ${category} in ${elapsed}ms:`, error);
      return null;
    }
  }

  /**
   * カテゴリに応じたプロンプトを生成
   */
  private buildPromptForCategory(
    destination: string,
    category: TravelInfoCategory
  ): string {
    const categoryLabel = CATEGORY_LABELS[category];

    const basePrompt = `あなたは渡航情報の専門家です。
以下の目的地についての${categoryLabel}を日本語で提供してください。
目的地: ${destination}

【情報収集の優先順位】
1. 公的機関の公式情報（外務省、大使館、政府観光局）
2. 信頼性の高いニュースソース
3. 旅行会社・航空会社の公式情報

【重要事項】
- 正確で最新の情報を提供してください
- 不明な場合は無理に情報を生成せず、適切なデフォルト値を使用してください`;

    const categorySpecificInstructions: Record<TravelInfoCategory, string> = {
      basic: `
【基本情報で必要な項目】
- 現地通貨（コード、名称、記号）
- 為替レート（日本円との換算）
- 公用語
- タイムゾーンと日本との時差`,

      safety: `
【安全情報で必要な項目】
- 外務省の危険度レベル（1-4、該当なしは1）
- 危険度の説明
- 注意事項・警告
- 緊急連絡先（警察、救急、日本大使館など）`,

      climate: `
【気候情報で必要な項目】
- 現在または一般的な天気情報
- おすすめの服装
- 季節の説明`,

      visa: `
【ビザ情報で必要な項目】
- 日本国籍の場合のビザ要否
- ビザなし滞在可能日数
- 入国要件
- 補足事項（電子渡航認証など）`,

      manner: `
【マナー情報で必要な項目】
- チップの習慣（必須か、慣習的か、目安）
- 現地の習慣・マナー
- タブー・避けるべきこと`,

      transport: `
【交通情報で必要な項目】
- 公共交通機関の情報
- ライドシェア（利用可否、サービス名）
- 運転に関する注意事項`,
    };

    return `${basePrompt}

${categorySpecificInstructions[category]}`;
  }
}

/**
 * Geminiフォールバックソースのファクトリ関数
 */
export function createGeminiFallbackSource(
  config?: GeminiFallbackConfig
): GeminiFallbackSource {
  return new GeminiFallbackSource(config);
}
