"use server";

import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";
import type {
  TravelInfoCategory,
  TravelInfoResponse,
  TravelInfoSource,
  CategoryDataEntry,
  SourceType,
  FailedCategory,
} from "@/lib/types/travel-info";
import { CATEGORY_LABELS } from "@/lib/types/travel-info";
import {
  generateCategorySpecificPrompt,
  parseStructuredResponse,
  generateSearchQueries,
  type TravelInfoPromptResult,
  type ParsedSource,
} from "@/lib/ai/prompts/travel-info-prompt";

// ============================================
// AI Client Initialization
// ============================================

let google: ReturnType<typeof createGoogleGenerativeAI>;

function getGoogleAI(apiKey: string): ReturnType<typeof createGoogleGenerativeAI> {
  if (!google) {
    google = createGoogleGenerativeAI({ apiKey });
  }
  return google;
}

// ============================================
// 型定義
// ============================================

/**
 * 渡航情報取得結果
 */
export type TravelInfoResult =
  | { success: true; data: TravelInfoResponse }
  | {
      success: false;
      error: string;
      partialData?: Partial<TravelInfoResponse>;
    };

/**
 * カテゴリ別取得結果（内部用）
 */
type CategoryFetchResult<T extends TravelInfoCategory = TravelInfoCategory> =
  | { success: true; data: TravelInfoPromptResult<T>; source: SourceType }
  | { success: false; error: string };

/**
 * 取得オプション
 */
interface TravelInfoOptions {
  travelDates?: { start: string; end: string };
  forceRefresh?: boolean;
}

// ============================================
// 定数
// ============================================

const DEFAULT_CATEGORIES: TravelInfoCategory[] = ["basic", "safety", "climate"];
const REQUEST_TIMEOUT_MS = 30000; // 30秒
const MAX_RETRIES = 2;

const countryExtractionCache = new Map<string, Promise<string>>();

// 一般的な都市名と国名のマッピング（キャッシュ的に使用）
const KNOWN_MAPPINGS: Record<string, string> = {
  // 日本
  東京: "日本",
  大阪: "日本",
  京都: "日本",
  北海道: "日本",
  沖縄: "日本",
  福岡: "日本",
  名古屋: "日本",
  札幌: "日本",
  // アジア
  ソウル: "韓国",
  釜山: "韓国",
  台北: "台湾",
  高雄: "台湾",
  香港: "香港",
  マカオ: "マカオ",
  上海: "中国",
  北京: "中国",
  バンコク: "タイ",
  プーケット: "タイ",
  シンガポール: "シンガポール",
  クアラルンプール: "マレーシア",
  ジャカルタ: "インドネシア",
  バリ: "インドネシア",
  マニラ: "フィリピン",
  セブ: "フィリピン",
  ハノイ: "ベトナム",
  ホーチミン: "ベトナム",
  // ヨーロッパ
  パリ: "フランス",
  ロンドン: "イギリス",
  ローマ: "イタリア",
  ミラノ: "イタリア",
  バルセロナ: "スペイン",
  マドリード: "スペイン",
  ベルリン: "ドイツ",
  アムステルダム: "オランダ",
  チューリッヒ: "スイス",
  ウィーン: "オーストリア",
  プラハ: "チェコ",
  // アメリカ
  ニューヨーク: "アメリカ",
  ロサンゼルス: "アメリカ",
  ハワイ: "アメリカ",
  ホノルル: "アメリカ",
  サンフランシスコ: "アメリカ",
  ラスベガス: "アメリカ",
  シアトル: "アメリカ",
  バンクーバー: "カナダ",
  トロント: "カナダ",
  // オセアニア
  シドニー: "オーストラリア",
  メルボルン: "オーストラリア",
  ケアンズ: "オーストラリア",
  オークランド: "ニュージーランド",
  // 中東
  ドバイ: "アラブ首長国連邦",
  アブダビ: "アラブ首長国連邦",
};

// 目的地が国名の場合はそのまま返す
const COMMON_COUNTRIES = [
  "日本",
  "韓国",
  "台湾",
  "中国",
  "タイ",
  "シンガポール",
  "マレーシア",
  "インドネシア",
  "フィリピン",
  "ベトナム",
  "フランス",
  "イギリス",
  "イタリア",
  "スペイン",
  "ドイツ",
  "アメリカ",
  "カナダ",
  "オーストラリア",
  "ニュージーランド",
];

// ============================================
// ロギングヘルパー
// ============================================

/**
 * タイムスタンプ付きログ出力
 */
function logInfo(
  context: string,
  message: string,
  data?: Record<string, unknown>
): void {
  const timestamp = new Date().toISOString();
  console.log(
    `[${timestamp}] [travel-info] [${context}] ${message}`,
    data ? JSON.stringify(data, null, 2) : ""
  );
}

function logWarn(
  context: string,
  message: string,
  data?: Record<string, unknown>
): void {
  const timestamp = new Date().toISOString();
  console.warn(
    `[${timestamp}] [travel-info] [${context}] ${message}`,
    data ? JSON.stringify(data, null, 2) : ""
  );
}

function logError(
  context: string,
  message: string,
  error?: unknown,
  data?: Record<string, unknown>
): void {
  const timestamp = new Date().toISOString();
  const errorInfo =
    error instanceof Error
      ? {
          name: error.name,
          message: error.message,
          stack: error.stack?.split("\n").slice(0, 3).join("\n"),
        }
      : { raw: String(error) };
  console.error(`[${timestamp}] [travel-info] [${context}] ${message}`, {
    error: errorInfo,
    ...data,
  });
}

// ============================================
// メイン関数
// ============================================

/**
 * 渡航情報を取得するメイン関数
 *
 * @param destination - 目的地（都市名または国名）
 * @param categories - 取得するカテゴリ一覧（デフォルト: basic, safety, climate）
 * @param options - オプション（渡航日程、キャッシュ無視フラグ）
 * @returns 渡航情報の取得結果
 */
export async function getTravelInfo(
  destination: string,
  categories: TravelInfoCategory[] = DEFAULT_CATEGORIES,
  options?: TravelInfoOptions
): Promise<TravelInfoResult> {
  const startTime = Date.now();
  const requestId = `req_${Date.now()}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;

  logInfo("getTravelInfo", "処理開始", {
    requestId,
    destination,
    categories,
    options,
  });

  // 入力バリデーション
  if (!destination || destination.trim().length === 0) {
    logWarn("getTravelInfo", "バリデーションエラー: 目的地が空", { requestId });
    return { success: false, error: "目的地を指定してください。" };
  }

  if (categories.length === 0) {
    logWarn("getTravelInfo", "バリデーションエラー: カテゴリが空", {
      requestId,
    });
    return { success: false, error: "カテゴリを1つ以上指定してください。" };
  }

  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    logError("getTravelInfo", "APIキーが設定されていません", undefined, {
      requestId,
    });
    return {
      success: false,
      error: "システムエラーが発生しました。管理者にお問い合わせください。",
    };
  }

  try {
    // 目的地から国名を抽出
    logInfo("getTravelInfo", "国名抽出開始", { requestId, destination });
    const countryStartTime = Date.now();
    const country = await extractCountryFromDestination(destination, apiKey);
    logInfo("getTravelInfo", "国名抽出完了", {
      requestId,
      country,
      elapsedMs: Date.now() - countryStartTime,
    });

    // 渡航日程のパース
    const travelDates = options?.travelDates
      ? {
          start: new Date(options.travelDates.start),
          end: new Date(options.travelDates.end),
        }
      : undefined;

    // カテゴリごとに情報を取得
    const categoryResults = new Map<TravelInfoCategory, CategoryFetchResult>();
    const allSources: TravelInfoSource[] = [];

    logInfo("getTravelInfo", "カテゴリ情報取得開始", {
      requestId,
      categoriesCount: categories.length,
    });
    const categoryFetchStartTime = Date.now();

    // 並列で全カテゴリの情報を取得
    const fetchPromises = categories.map(async (category) => {
      const categoryStartTime = Date.now();
      logInfo("fetchCategory", `カテゴリ取得開始: ${category}`, {
        requestId,
        category,
        destination,
        country,
      });

      const result = await fetchCategoryInfo(
        category,
        destination,
        country,
        travelDates,
        apiKey
      );

      const categoryElapsed = Date.now() - categoryStartTime;
      if (result.success) {
        logInfo("fetchCategory", `カテゴリ取得成功: ${category}`, {
          requestId,
          category,
          elapsedMs: categoryElapsed,
          confidence: result.data.confidence,
        });
      } else {
        logWarn("fetchCategory", `カテゴリ取得失敗: ${category}`, {
          requestId,
          category,
          error: result.error,
          elapsedMs: categoryElapsed,
        });
      }

      return { category, result };
    });

    // Promise.allSettled を使用して、成功・失敗を個別に処理
    const settledResults = await Promise.allSettled(fetchPromises);

    logInfo("getTravelInfo", "カテゴリ情報取得完了", {
      requestId,
      totalElapsedMs: Date.now() - categoryFetchStartTime,
    });

    // 結果を整理
    let successCount = 0;
    const failedCategoriesInfo: FailedCategory[] = [];
    for (const settledResult of settledResults) {
      if (settledResult.status === "fulfilled") {
        const { category, result } = settledResult.value;
        categoryResults.set(category, result);
        if (result.success) {
          successCount++;
          // ソース情報を変換して追加
          const convertedSources = convertParsedSourcesToTravelInfoSources(
            result.data.sources,
            result.source
          );
          allSources.push(...convertedSources);
        } else {
          failedCategoriesInfo.push({
            category,
            error: result.error || "情報の取得に失敗しました",
          });
        }
      } else {
        // Promise自体が reject された場合（通常は発生しないが念のため）
        logError("getTravelInfo", "Promise rejected", settledResult.reason, {
          requestId,
        });
      }
    }

    // 全カテゴリ失敗の場合
    if (successCount === 0) {
      logError("getTravelInfo", "全カテゴリの取得に失敗", undefined, {
        requestId,
        failedCategories: failedCategoriesInfo.map((fc) => fc.category),
      });
      return {
        success: false,
        error:
          "渡航情報の取得に失敗しました。しばらく経ってから再度お試しください。",
      };
    }

    // カテゴリデータをMapに変換
    const categoriesMap = new Map<TravelInfoCategory, CategoryDataEntry>();
    for (const [category, result] of categoryResults) {
      if (result.success) {
        categoriesMap.set(category, {
          category,
          data: result.data.content,
          source: {
            sourceType: result.source,
            sourceName: getSourceName(result.source),
            retrievedAt: new Date(),
            reliabilityScore: result.data.confidence,
          },
        });
      }
    }

    // ソースをマージ・重複排除
    const mergedSources = mergeInfoSources(allSources);

    // 総合信頼性を計算
    const overallReliability = calculateOverallReliability(categoryResults);

    // 免責事項を生成
    const disclaimer = generateDisclaimer(overallReliability, categories);

    const response: TravelInfoResponse = {
      destination,
      country,
      categories: categoriesMap,
      sources: mergedSources,
      generatedAt: new Date(),
      disclaimer,
      // 失敗したカテゴリがあれば含める
      ...(failedCategoriesInfo.length > 0 && {
        failedCategories: failedCategoriesInfo,
      }),
    };

    const elapsed = Date.now() - startTime;

    // 部分的成功の場合はログ
    if (successCount < categories.length) {
      logWarn("getTravelInfo", "一部カテゴリの取得に失敗", {
        requestId,
        successCount,
        totalCategories: categories.length,
        failedCategories: failedCategoriesInfo.map((fc) => fc.category),
        elapsedMs: elapsed,
      });
    } else {
      logInfo("getTravelInfo", "処理完了（全カテゴリ成功）", {
        requestId,
        successCount,
        totalCategories: categories.length,
        sourcesCount: mergedSources.length,
        elapsedMs: elapsed,
      });
    }

    return { success: true, data: response };
  } catch (error) {
    const elapsed = Date.now() - startTime;
    logError("getTravelInfo", "予期しないエラー発生", error, {
      requestId,
      destination,
      categories,
      elapsedMs: elapsed,
    });
    return {
      success: false,
      error:
        "予期しないエラーが発生しました。しばらく経ってから再度お試しください。",
    };
  }
}

// ============================================
// カテゴリ情報取得
// ============================================

/**
 * 単一カテゴリの情報を取得
 */
async function fetchCategoryInfo<T extends TravelInfoCategory>(
  category: T,
  destination: string,
  country: string,
  travelDates: { start: Date; end: Date } | undefined,
  apiKey: string
): Promise<CategoryFetchResult<T>> {
  // Gemini Web検索で取得
  return fetchFromGemini(category, destination, country, travelDates, apiKey);
}

/**
 * Gemini Web検索から情報を取得
 */
async function fetchFromGemini<T extends TravelInfoCategory>(
  category: T,
  destination: string,
  country: string,
  travelDates: { start: Date; end: Date } | undefined,
  apiKey: string
): Promise<CategoryFetchResult<T>> {
  const google = getGoogleAI(apiKey);
  const modelName = process.env.GOOGLE_MODEL_NAME || "gemini-2.5-flash";

  // カテゴリ専用プロンプトを生成
  const prompt = generateCategorySpecificPrompt(
    category,
    destination,
    country,
    travelDates
  );

  // 検索クエリを生成（Web検索の参考用）
  const searchQueries = generateSearchQueries(destination, country, category);
  const searchHint = `\n\n【参考検索クエリ】\n${searchQueries.join("\n")}`;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const attemptStartTime = Date.now();

    try {
      logInfo(
        "fetchFromGemini",
        `API呼び出し開始 (試行 ${attempt + 1}/${MAX_RETRIES})`,
        {
          category,
          destination,
          modelName,
        }
      );

      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        REQUEST_TIMEOUT_MS
      );

      const { text } = await generateText({
        model: google(modelName, { structuredOutputs: true }),
        prompt: prompt + searchHint,
        temperature: 0.1,
        abortSignal: controller.signal,
      });

      clearTimeout(timeoutId);

      const apiElapsed = Date.now() - attemptStartTime;
      logInfo("fetchFromGemini", "API応答受信", {
        category,
        elapsedMs: apiElapsed,
        responseLength: text.length,
      });

      // レスポンスをパース
      const parseResult = parseStructuredResponse(category, text);

      if (parseResult.success) {
        logInfo("fetchFromGemini", "パース成功", {
          category,
          confidence: parseResult.data.confidence,
        });
        return {
          success: true,
          data: parseResult.data as TravelInfoPromptResult<T>,
          source: "ai_generated",
        };
      } else {
        logWarn("fetchFromGemini", "パース失敗", {
          category,
          error: parseResult.error.error,
        });
        lastError = new Error(parseResult.error.error);
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Unknown error");
      const attemptElapsed = Date.now() - attemptStartTime;

      if (lastError.name === "AbortError") {
        logWarn("fetchFromGemini", "リクエストタイムアウト", {
          category,
          attempt: attempt + 1,
          timeoutMs: REQUEST_TIMEOUT_MS,
          elapsedMs: attemptElapsed,
        });
      } else {
        logError("fetchFromGemini", `試行 ${attempt + 1} 失敗`, lastError, {
          category,
          elapsedMs: attemptElapsed,
        });
      }

      // リトライ前に待機（指数バックオフ）
      if (attempt < MAX_RETRIES - 1) {
        const backoffMs = Math.pow(2, attempt) * 1000;
        logInfo("fetchFromGemini", `リトライ待機中`, {
          category,
          backoffMs,
          nextAttempt: attempt + 2,
        });
        await sleep(backoffMs);
      }
    }
  }

  logError("fetchFromGemini", "全試行失敗", lastError, {
    category,
    maxRetries: MAX_RETRIES,
  });

  return {
    success: false,
    error: lastError?.message || `${category}情報の取得に失敗しました`,
  };
}

// ============================================
// ヘルパー関数
// ============================================

/**
 * 目的地から国名を抽出
 */
async function extractCountryFromDestination(
  destination: string,
  apiKey: string
): Promise<string> {
  // キャッシュを確認
  if (countryExtractionCache.has(destination)) {
    return countryExtractionCache.get(destination)!;
  }

  const promise = (async () => {
    // 既知のマッピングをチェック
    const normalized = destination.trim();
    if (KNOWN_MAPPINGS[normalized]) {
      return KNOWN_MAPPINGS[normalized];
    }

    if (COMMON_COUNTRIES.includes(normalized)) {
      return normalized;
    }

    // AIで国名を推測
    try {
      const google = createGoogleGenerativeAI({ apiKey });
      const modelName = process.env.GOOGLE_MODEL_NAME || "gemini-2.5-flash";

      const { text } = await generateText({
        model: google(modelName),
        prompt: `「${destination}」という地名の国名を日本語で答えてください。国名のみを回答してください。例: タイ、フランス、アメリカ`,
        temperature: 0,
      });

      return text.trim() || destination;
    } catch (error) {
      console.warn("[travel-info] Failed to extract country:", error);
      return destination; // フォールバック
    }
  })();

  // キャッシュに保存
  countryExtractionCache.set(destination, promise);

  // 完了後（成功・失敗問わず）はキャッシュから削除（インフライトリクエストの重複排除のみを行う）
  promise.finally(() => {
    countryExtractionCache.delete(destination);
  });

  return promise;
}

/**
 * 複数ソースからの情報をマージ・重複排除
 */
function mergeInfoSources(sources: TravelInfoSource[]): TravelInfoSource[] {
  const uniqueSources = new Map<string, TravelInfoSource>();

  for (const source of sources) {
    const key = source.sourceUrl || source.sourceName;
    const existing = uniqueSources.get(key);

    if (!existing || source.reliabilityScore > existing.reliabilityScore) {
      uniqueSources.set(key, source);
    }
  }

  // 信頼性スコア順にソート
  return Array.from(uniqueSources.values()).sort(
    (a, b) => b.reliabilityScore - a.reliabilityScore
  );
}

/**
 * 総合信頼性スコアを計算
 */
function calculateOverallReliability(
  results: Map<TravelInfoCategory, CategoryFetchResult>
): number {
  let totalScore = 0;
  let count = 0;

  for (const result of results.values()) {
    if (result.success) {
      totalScore += result.data.confidence;
      count++;
    }
  }

  if (count === 0) {
    return 0;
  }

  return Math.round(totalScore / count);
}

/**
 * 免責事項を生成
 */
function generateDisclaimer(
  reliability: number,
  categories: TravelInfoCategory[]
): string {
  const hasSafetyInfo = categories.includes("safety");
  const hasVisaInfo = categories.includes("visa");

  let disclaimer =
    "この情報はAIによって生成されたものであり、正確性を保証するものではありません。";

  if (reliability < 50) {
    disclaimer +=
      "情報の信頼性が低い可能性があります。必ず公式情報をご確認ください。";
  }

  if (hasSafetyInfo) {
    disclaimer +=
      "安全情報については、外務省海外安全ホームページで最新情報をご確認ください。";
  }

  if (hasVisaInfo) {
    disclaimer +=
      "ビザ・入国条件は変更される場合があります。渡航前に大使館・領事館にご確認ください。";
  }

  disclaimer +=
    "渡航に関する最終的な判断は、必ず公式情報に基づいてご自身の責任で行ってください。";

  return disclaimer;
}

/**
 * ParsedSourceをTravelInfoSourceに変換
 */
function convertParsedSourcesToTravelInfoSources(
  parsedSources: ParsedSource[],
  fetchSourceType: SourceType
): TravelInfoSource[] {
  return parsedSources.map((source) => ({
    sourceType: mapParsedSourceTypeToSourceType(source.type, fetchSourceType),
    sourceName: source.name,
    sourceUrl: source.url || undefined,
    retrievedAt: new Date(),
    reliabilityScore: getReliabilityScore(source.type),
  }));
}

/**
 * パースされたソースタイプをSourceTypeにマッピング
 */
function mapParsedSourceTypeToSourceType(
  parsedType: "official" | "news" | "commercial" | "personal",
  fetchSourceType: SourceType
): SourceType {
  // AI生成の場合はそのままfetchSourceTypeを使用
  if (fetchSourceType === "ai_generated") {
    return "ai_generated";
  }

  // それ以外はパースされたタイプに基づいて判断
  switch (parsedType) {
    case "official":
      return "official_api";
    case "news":
    case "commercial":
    case "personal":
      return "web_search";
    default:
      return fetchSourceType;
  }
}

/**
 * ソースタイプに基づく信頼性スコア
 */
function getReliabilityScore(
  type: "official" | "news" | "commercial" | "personal"
): number {
  switch (type) {
    case "official":
      return 95;
    case "news":
      return 80;
    case "commercial":
      return 70;
    case "personal":
      return 50;
    default:
      return 60;
  }
}

/**
 * ソースタイプの日本語名を取得
 */
function getSourceName(type: SourceType): string {
  switch (type) {
    case "official_api":
      return "公式API";
    case "web_search":
      return "Web検索";
    case "ai_generated":
      return "AI生成";
    case "blog":
      return "ブログ記事";
    default:
      return "不明";
  }
}

/**
 * スリープ関数
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ユーティリティ関数は別ファイルからインポート
// @see src/lib/travel-info/utils.ts

// ============================================
// 単一カテゴリ取得API（プログレッシブローディング用）
// ============================================

/**
 * 単一カテゴリ取得結果
 */
export type SingleCategoryResult =
  | {
      success: true;
      category: TravelInfoCategory;
      data: CategoryDataEntry;
      country: string;
    }
  | {
      success: false;
      category: TravelInfoCategory;
      error: string;
    };

/**
 * 単一カテゴリの渡航情報を取得する
 * プログレッシブローディング用：各カテゴリを独立して取得し、逐次表示する
 *
 * @param destination - 目的地（都市名または国名）
 * @param category - 取得するカテゴリ
 * @param options - オプション（渡航日程等）
 * @returns 単一カテゴリの取得結果
 */
export async function getSingleCategoryInfo(
  destination: string,
  category: TravelInfoCategory,
  options?: {
    travelDates?: { start: string; end: string };
    knownCountry?: string;
  }
): Promise<SingleCategoryResult> {
  const startTime = Date.now();
  const requestId = `single_${category}_${Date.now()}_${Math.random()
    .toString(36)
    .slice(2, 6)}`;

  logInfo("getSingleCategoryInfo", "処理開始", {
    requestId,
    destination,
    category,
  });

  // 入力バリデーション
  if (!destination || destination.trim().length === 0) {
    logWarn("getSingleCategoryInfo", "バリデーションエラー: 目的地が空", {
      requestId,
    });
    return { success: false, category, error: "目的地を指定してください。" };
  }

  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    logError(
      "getSingleCategoryInfo",
      "APIキーが設定されていません",
      undefined,
      {
        requestId,
      }
    );
    return {
      success: false,
      category,
      error: "システムエラーが発生しました。",
    };
  }

  try {
    // 目的地から国名を抽出
    let country: string;
    if (options?.knownCountry) {
      country = options.knownCountry;
      logInfo("getSingleCategoryInfo", "国名抽出スキップ（指定あり）", {
        requestId,
        country,
      });
    } else {
      country = await extractCountryFromDestination(destination, apiKey);
      logInfo("getSingleCategoryInfo", "国名抽出完了", {
        requestId,
        country,
      });
    }

    // 渡航日程のパース
    const travelDates = options?.travelDates
      ? {
          start: new Date(options.travelDates.start),
          end: new Date(options.travelDates.end),
        }
      : undefined;

    // カテゴリ情報を取得
    const result = await fetchCategoryInfo(
      category,
      destination,
      country,
      travelDates,
      apiKey
    );

    const elapsed = Date.now() - startTime;

    if (result.success) {
      logInfo("getSingleCategoryInfo", "取得成功", {
        requestId,
        category,
        elapsedMs: elapsed,
      });

      return {
        success: true,
        category,
        country,
        data: {
          category,
          data: result.data.content,
          source: {
            sourceType: result.source,
            sourceName: getSourceName(result.source),
            retrievedAt: new Date(),
            reliabilityScore: result.data.confidence,
          },
        },
      };
    } else {
      logWarn("getSingleCategoryInfo", "取得失敗", {
        requestId,
        category,
        error: result.error,
        elapsedMs: elapsed,
      });

      return {
        success: false,
        category,
        error:
          result.error ||
          `${CATEGORY_LABELS[category]}の取得に失敗しました。しばらく経ってから再度お試しください。`,
      };
    }
  } catch (error) {
    const elapsed = Date.now() - startTime;
    logError("getSingleCategoryInfo", "予期しないエラー発生", error, {
      requestId,
      category,
      elapsedMs: elapsed,
    });

    return {
      success: false,
      category,
      error: `${CATEGORY_LABELS[category]}の取得中にエラーが発生しました。`,
    };
  }
}

// ============================================
// レガシーAPI（後方互換性のため）
// ============================================

/**
 * 旧TravelInfo型（後方互換性のため）
 */
interface LegacyTravelInfo {
  country: string;
  visa: string;
  power: {
    voltage: string;
    frequency: string;
    plugType: string;
  };
  tipping: string;
  safety: {
    overview: string;
    warnings: string[];
  };
  generalInfo: string;
}

export type LegacyTravelInfoState = {
  success: boolean;
  error?: string;
  data?: LegacyTravelInfo;
};

/**
 * 旧API形式での渡航情報取得（後方互換性のため）
 * @deprecated 新しいgetTravelInfo関数を使用してください
 */
export async function getLegacyTravelInfo(
  country: string
): Promise<LegacyTravelInfoState> {
  const startTime = Date.now();
  console.log(
    `[travel-info] getLegacyTravelInfo started for country: ${country}`
  );

  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    console.error("[travel-info] API Key is missing in environment variables");
    return {
      success: false,
      error: "システムエラー: APIキーが設定されていません。",
    };
  }

  try {
    const google = getGoogleAI(apiKey);
    const modelName = process.env.GOOGLE_MODEL_NAME || "gemini-2.5-flash";

    const prompt = `
あなたは旅行者向けに渡航情報を提供する専門アシスタントです。

ユーザーが指定した国・地域について、以下の情報を正確に提供してください：

対象国: ${country}

回答は必ず以下のJSON形式で返してください：

{
  "country": "国名（日本語）",
  "visa": "ビザ情報の詳細。日本国籍の場合のビザ免除期間、必要な手続き、注意点など。具体的に記載。",
  "power": {
    "voltage": "電圧（例: 220V）",
    "frequency": "周波数（例: 50Hz）",
    "plugType": "プラグタイプ（例: Aタイプ、Cタイプなど）。必要に応じて変換プラグの必要性も記載。"
  },
  "tipping": "チップの習慣について。チップが必要か、相場はいくらか、どのような場面で渡すかなど具体的に記載。",
  "safety": {
    "overview": "一般的な治安状況の概要。観光地の安全性、夜間の外出、交通機関の安全性など。",
    "warnings": ["注意点1", "注意点2", "注意点3"]  // 具体的な注意事項を配列で返す（3-5項目程度）
  },
  "generalInfo": "その他の役立つ情報。通貨、言語、時差、ベストシーズン、文化的マナーなど。"
}

重要な注意事項：
1. 情報は2025-2026年時点の一般的な情報を基にしてください
2. 必ず日本語で回答してください
3. JSONフォーマット以外の余計なテキストは含めないでください
4. 情報が不明な場合は「情報が限定的です」と記載してください
5. ビザ情報は必ず「日本国籍の場合」を前提としてください
6. 具体的で実用的な情報を提供してください
`;

    console.log(`[travel-info] Sending request to Vercel AI SDK...`);
    const { text } = await generateText({
      model: google(modelName, { structuredOutputs: true }),
      prompt,
      temperature: 0.3,
    });

    const endTime = Date.now();
    console.log(`[travel-info] Response received in ${endTime - startTime}ms`);

    // Clean up response
    const cleanedText = text
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    try {
      const data = JSON.parse(cleanedText) as LegacyTravelInfo;
      console.log(
        `[travel-info] Successfully parsed travel info for ${data.country}`
      );

      return {
        success: true,
        data,
      };
    } catch (jsonError) {
      console.error(`[travel-info] JSON Parse Error:`, jsonError);
      console.error(`[travel-info] Raw Response text:`, cleanedText);
      return {
        success: false,
        error: "AI応答の解析に失敗しました。",
      };
    }
  } catch (error) {
    console.error("[travel-info] Generation failed:", error);
    return {
      success: false,
      error: "情報の取得中にエラーが発生しました。もう一度お試しください。",
    };
  }
}
