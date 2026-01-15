/**
 * Gemini AIフォールバックソース
 * 他のAPIが失敗した場合にGemini AIを使用して情報を生成
 *
 * 注意: AI生成情報は信頼性が低いためフォールバックとしてのみ使用
 */

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

  constructor(config: GeminiFallbackConfig = {}) {
    this.config = {
      modelName: 'gemini-2.5-flash',
      timeout: 30000,
      ...config,
    };
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

      // TODO: 実際のGemini API呼び出し
      // 現在はプレースホルダー
      const generatedData = await this.generateWithGemini(
        destination,
        options?.additionalParams?.category as TravelInfoCategory | undefined
      );

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
   * Gemini AIで渡航情報を生成
   * TODO: 実際のGemini API統合
   */
  private async generateWithGemini(
    _destination: string,
    _category?: TravelInfoCategory
  ): Promise<AnyCategoryData | null> {
    // TODO: 実際の実装
    // 1. Gemini APIクライアントを初期化
    // 2. プロンプトを構築
    // 3. 構造化出力を要求
    // 4. レスポンスをパース

    console.warn('[gemini-fallback] Using placeholder - implement actual generation');

    return null;
  }

  /**
   * カテゴリに応じたプロンプトを生成
   */
  private buildPromptForCategory(
    destination: string,
    category: TravelInfoCategory
  ): string {
    const categoryLabel = CATEGORY_LABELS[category];

    const basePrompt = `
      以下の目的地についての${categoryLabel}を日本語で提供してください。
      目的地: ${destination}

      回答は以下のJSON形式で返してください。
    `;

    // カテゴリ別のスキーマ指定
    const schemas: Record<TravelInfoCategory, string> = {
      basic: `{
        "currency": { "code": "...", "name": "...", "symbol": "..." },
        "languages": ["..."],
        "timezone": "...",
        "timeDifference": "..."
      }`,
      safety: `{
        "dangerLevel": 1-4,
        "dangerLevelDescription": "...",
        "warnings": ["..."],
        "emergencyContacts": [{ "name": "...", "number": "..." }]
      }`,
      climate: `{
        "seasonDescription": "...",
        "recommendedClothing": ["..."]
      }`,
      visa: `{
        "required": true/false,
        "visaFreeStayDays": number,
        "requirements": ["..."],
        "notes": ["..."]
      }`,
      manner: `{
        "tipping": { "required": true/false, "customary": true/false, "guideline": "..." },
        "customs": ["..."],
        "taboos": ["..."]
      }`,
      transport: `{
        "publicTransport": ["..."],
        "rideshare": { "available": true/false, "services": ["..."] }
      }`,
    };

    return `${basePrompt}\n${schemas[category]}`;
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
