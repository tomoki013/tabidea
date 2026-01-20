/**
 * travel-info専用のAI生成サービス
 * generateObjectを使用してJSON形式のレスポンスを確実に取得
 */

import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateObject } from 'ai';
import type { TravelInfoCategory } from '@/types';
import {
  getCategorySchema,
  CountryExtractionSchema,
  type BasicInfoResponse,
  type SafetyInfoResponse,
  type ClimateInfoResponse,
  type VisaInfoResponse,
  type MannerInfoResponse,
  type TransportInfoResponse,
  type LocalFoodInfoResponse,
  type SouvenirInfoResponse,
  type EventsInfoResponse,
} from './schemas/travel-info-schemas';

// ============================================
// 型定義
// ============================================

export type CategoryResponse =
  | BasicInfoResponse
  | SafetyInfoResponse
  | ClimateInfoResponse
  | VisaInfoResponse
  | MannerInfoResponse
  | TransportInfoResponse
  | LocalFoodInfoResponse
  | SouvenirInfoResponse
  | EventsInfoResponse;

export interface TravelInfoGenerationResult {
  success: true;
  data: CategoryResponse;
}

export interface TravelInfoGenerationError {
  success: false;
  error: string;
}

export type TravelInfoGenerationOutcome =
  | TravelInfoGenerationResult
  | TravelInfoGenerationError;

export interface TravelInfoGeneratorConfig {
  apiKey?: string;
  modelName?: string;
  timeout?: number;
}

// ============================================
// プロンプト生成
// ============================================

const SYSTEM_INSTRUCTIONS = `あなたは渡航情報の専門家です。
提供する情報は正確で最新のものである必要があります。

【情報収集の優先順位】
1. 公的機関の公式情報（外務省、大使館、政府観光局）
2. 信頼性の高いニュースソース（主要報道機関）
3. 旅行会社・航空会社の公式情報

【重要事項】
- 日本語で回答してください
- 確信度（confidence）は情報の信頼性を0-100で評価してください
- 情報源（sources）は必ず含めてください
- 不明な情報は無理に生成せず、適切なデフォルト値を使用してください`;

function generateCategoryPrompt(
  category: TravelInfoCategory,
  destination: string,
  country: string,
  travelDates?: { start: Date; end: Date }
): string {
  const dateInfo = travelDates
    ? `渡航予定期間: ${travelDates.start.toISOString().split('T')[0]} 〜 ${travelDates.end.toISOString().split('T')[0]}`
    : '';

  const categoryPrompts: Record<TravelInfoCategory, string> = {
    basic: `${destination}（${country}）の基本的な渡航情報を提供してください。
- 現地通貨（コード、名称、記号）
- 為替レート（日本円との換算、おおよそで可）
- 公用語
- タイムゾーンと日本との時差`,

    safety: `${destination}（${country}）への渡航に関する安全情報を提供してください。
- 外務省の危険度レベル（0-4、0は危険情報なし、1は十分注意、2は不要不急の渡航中止、3は渡航中止勧告、4は退避勧告）
- 現在の治安状況
- 注意すべき点
- 緊急連絡先（警察、救急、日本大使館）`,

    climate: `${destination}（${country}）の気候情報を提供してください。
${dateInfo}
- 現在または一般的な天気
- おすすめの服装
- 季節の特徴`,

    visa: `${destination}（${country}）への日本人の入国に関する情報を提供してください。
- ビザの要否（日本国籍の場合）
- ビザなし滞在の場合の滞在可能日数
- 入国に必要な書類・条件
- 特記事項（電子渡航認証等）`,

    manner: `${destination}（${country}）での現地マナーやチップ文化について情報を提供してください。
- チップの習慣（必要か、相場）
- 現地で守るべきマナー・習慣
- 避けるべき行動・タブー`,

    transport: `${destination}（${country}）での移動手段について情報を提供してください。
- 主な公共交通機関
- ライドシェア・タクシー事情
- レンタカー・運転に関する注意（該当する場合）`,

    local_food: `${destination}（${country}）のグルメ情報を提供してください。
- 代表的な料理（名前、説明、価格帯）
- 食事のマナー・習慣`,

    souvenir: `${destination}（${country}）のお土産・買い物情報を提供してください。
- 人気のお土産（名前、説明、価格帯）
- おすすめの買い物エリア
- 免税情報`,

    events: `${destination}（${country}）のイベント情報を提供してください。
${dateInfo}
- 主要なイベント（名前、開催時期、内容）
- 季節の祭り`,

    technology: `${destination}（${country}）のテクノロジー情報を提供してください。
- インターネット事情（Wi-Fiの普及状況、速度）
- SIMカードの入手方法・推奨キャリア
- 電源プラグの形状と電圧`,

    healthcare: `${destination}（${country}）の医療情報を提供してください。
- 医療水準と医療機関の利用しやすさ
- 薬局の利用方法
- 推奨される予防接種や注意すべき病気
- 日本語対応可能な病院の有無`,

    restrooms: `${destination}（${country}）のトイレ事情について情報を提供してください。
- 公衆トイレの清潔さと普及状況
- 利用時の注意点（有料か無料か、紙を流せるかなど）
- トイレの探し方`,

    smoking: `${destination}（${country}）の喫煙ルールについて情報を提供してください。
- 公共の場所での喫煙規制
- 喫煙可能なエリア
- 違反時の罰則など`,

    alcohol: `${destination}（${country}）の飲酒に関するルールと文化について情報を提供してください。
- 飲酒可能な年齢
- お酒の販売規制（時間帯や場所）
- 公共の場所での飲酒ルール`,
  };

  return `${SYSTEM_INSTRUCTIONS}

【リクエスト】
${categoryPrompts[category]}

【情報確認日時】
${new Date().toISOString()}`;
}

// ============================================
// TravelInfoGenerator クラス
// ============================================

export class TravelInfoGenerator {
  private google: ReturnType<typeof createGoogleGenerativeAI>;
  private modelName: string;
  private timeout: number;

  constructor(config: TravelInfoGeneratorConfig = {}) {
    const apiKey = config.apiKey || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      throw new Error('Google AI API key is required');
    }
    this.google = createGoogleGenerativeAI({ apiKey });
    this.modelName = config.modelName || process.env.GOOGLE_MODEL_NAME || 'gemini-2.5-flash';
    this.timeout = config.timeout || 30000;
  }

  /**
   * カテゴリ別の渡航情報を生成（JSON形式を保証）
   */
  async generateCategoryInfo(
    category: TravelInfoCategory,
    destination: string,
    country: string,
    travelDates?: { start: Date; end: Date }
  ): Promise<TravelInfoGenerationOutcome> {
    const startTime = Date.now();
    console.log(`[travel-info-generator] Generating ${category} info for ${destination} (${country})`);

    try {
      const prompt = generateCategoryPrompt(category, destination, country, travelDates);
      const schema = getCategorySchema(category);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const { object } = await generateObject({
        model: this.google(this.modelName, { structuredOutputs: true }),
        schema,
        prompt,
        abortSignal: controller.signal,
      });

      clearTimeout(timeoutId);

      const elapsed = Date.now() - startTime;
      console.log(`[travel-info-generator] ${category} generated successfully in ${elapsed}ms`);

      return {
        success: true,
        data: object as CategoryResponse,
      };
    } catch (error) {
      const elapsed = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[travel-info-generator] Failed to generate ${category} in ${elapsed}ms:`, errorMessage);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * 目的地から国名を抽出（JSON形式を保証）
   */
  async extractCountry(destination: string): Promise<string> {
    console.log(`[travel-info-generator] Extracting country from: ${destination}`);

    try {
      const { object } = await generateObject({
        model: this.google(this.modelName, { structuredOutputs: true }),
        schema: CountryExtractionSchema,
        prompt: `以下の地名が属する国名を日本語で答えてください。
地名: ${destination}

例:
- パリ → フランス
- ニューヨーク → アメリカ
- 京都 → 日本
- バンコク → タイ`,
      });

      console.log(`[travel-info-generator] Country extracted: ${object.country}`);
      return object.country;
    } catch (error) {
      console.warn('[travel-info-generator] Country extraction failed, using destination as fallback:', error);
      return destination;
    }
  }
}

/**
 * TravelInfoGeneratorのシングルトンインスタンス
 */
let generatorInstance: TravelInfoGenerator | null = null;

export function getTravelInfoGenerator(config?: TravelInfoGeneratorConfig): TravelInfoGenerator {
  if (!generatorInstance) {
    generatorInstance = new TravelInfoGenerator(config);
  }
  return generatorInstance;
}

/**
 * テスト用：インスタンスをリセット
 */
export function resetTravelInfoGenerator(): void {
  generatorInstance = null;
}
