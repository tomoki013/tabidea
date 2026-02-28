import { GeminiService } from "@/lib/services/ai/gemini";
import { PineconeRetriever } from "@/lib/services/rag/pinecone-retriever";
import type { UserInput, PlanOutline, Article } from "@/types";
import type { UserType } from "@/lib/limits/config";
import { getUnsplashImage } from "@/lib/unsplash";
import { extractDuration } from "@/lib/utils";
import { buildConstraintsPrompt, buildTransitSchedulePrompt } from "@/lib/prompts";
import { getBudgetContext, getFixedSchedulePrompt } from "@/lib/utils/plan-prompt-helpers";
import { getOutlineCache, setOutlineCache } from "@/lib/cache";
import { checkAndRecordUsage } from "@/lib/limits/check";
import { getUserSettings } from "@/app/actions/user-settings";
import { GOLDEN_PLAN_EXAMPLES } from "@/data/golden-plans/examples";
import { MetricsCollector } from "@/lib/services/ai/metrics/collector";
import {
  createOutlineTimer,
  OUTLINE_TARGETS_PRO,
} from "@/lib/utils/performance-timer";

// ============================================================================
// Types
// ============================================================================

export type ProgressCallback = (step: string, message: string) => void;

export type OutlineActionState = {
  success: boolean;
  message?: string;
  data?: {
    outline: PlanOutline;
    context: Article[];
    input: UserInput;
    heroImage?: { url: string; photographer: string; photographerUrl: string } | null;
    modelInfo?: { modelName: string; tier: 'flash' | 'pro' };
  };
  limitExceeded?: boolean;
  userType?: UserType;
  resetAt?: string | null;
  remaining?: number;
};

// ============================================================================
// Helpers
// ============================================================================

/**
 * Fetch and format user custom instructions (travel style + constraints).
 */
export async function getUserConstraintPrompt(): Promise<string> {
  const { settings } = await getUserSettings();
  let prompt = "";

  if (settings?.travelStyle && settings.travelStyle.trim().length > 0) {
    prompt += `
    === USER TRAVEL STYLE / PREFERENCES ===
    The user describes their travel style as:
    "${settings.travelStyle}"
    Please consider this tone and style when generating the plan.
    =======================================
    \n`;
  }

  if (settings?.customInstructions && settings.customInstructions.trim().length > 0) {
    prompt += `
    === CRITICAL USER INSTRUCTIONS (MUST FOLLOW) ===
    The user has set the following global preferences/constraints.
    You MUST strictly adhere to these instructions. Priority: HIGHEST.
    ${settings.customInstructions}
    ================================================
    `;
  }
  return prompt;
}

// ============================================================================
// Core Logic
// ============================================================================

/**
 * Execute outline generation with optional progress callback.
 * Shared core logic used by both the server action and the SSE API route.
 */
export async function executeOutlineGeneration(
  input: UserInput,
  options?: { isRetry?: boolean },
  onProgress?: ProgressCallback
): Promise<OutlineActionState> {
  const timer = createOutlineTimer();
  console.log(`[action] generatePlanOutline started`);

  // 利用制限チェック
  onProgress?.("usage_check", "利用制限を確認中...");
  const limitResult = await timer.measure("usage_check", () =>
    checkAndRecordUsage(
      "plan_generation",
      {
        destination: input.destinations.join(", ") || input.region,
        isDestinationDecided: input.isDestinationDecided,
      },
      { skipConsume: options?.isRetry === true }
    )
  );

  if (!limitResult.allowed) {
    return {
      success: false,
      limitExceeded: true,
      userType: limitResult.userType,
      resetAt: limitResult.resetAt?.toISOString() ?? null,
      remaining: limitResult.remaining,
      message: "利用制限に達しました",
    };
  }

  const hasAIKey =
    process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.OPENAI_API_KEY;
  if (!hasAIKey) {
    return { success: false, message: "API Key missing" };
  }

  // キャッシュチェック
  onProgress?.("cache_check", "キャッシュを確認中...");
  try {
    const cacheParams = {
      destinations: input.destinations,
      days: input.dates,
      companions: input.companions,
      theme: input.theme,
      budget: input.budget,
      pace: input.pace,
      isDestinationDecided: input.isDestinationDecided,
      region: input.region,
      travelVibe: input.travelVibe,
    };

    const cached = await timer.measure("cache_check", () =>
      getOutlineCache(cacheParams)
    );
    if (cached) {
      timer.log();
      console.log(`[action] Outline served from cache`);

      const updatedInput = { ...input };
      if (!updatedInput.isDestinationDecided) {
        updatedInput.destinations = [cached.outline.destination];
        updatedInput.isDestinationDecided = true;
      }

      return {
        success: true,
        data: {
          outline: cached.outline,
          context: cached.context,
          input: updatedInput,
          heroImage: cached.heroImage,
        },
      };
    }
  } catch (cacheError) {
    console.warn("[action] Cache check failed:", cacheError);
  }

  try {
    const scraper = new PineconeRetriever();
    const ai = new GeminiService({
      goldenPlanExamples: GOLDEN_PLAN_EXAMPLES,
    });

    // 1. RAG検索とプロンプト構築を並列実行
    onProgress?.("rag_search", "関連記事を検索中...");
    const destinationsStr = input.destinations.join("、");
    const query = input.isDestinationDecided
      ? `${destinationsStr}で${input.companions}と${input.theme.join("や")}を楽しむ旅行`
      : `${input.region === "domestic" ? "日本国内" : input.region === "overseas" ? "海外" : "おすすめの場所"}で${input.travelVibe ? input.travelVibe + "な" : ""}${input.theme.join("や")}を楽しむ${input.companions}旅行`;

    const [contextArticles, userConstraintPrompt] = await timer.measure(
      "rag_search",
      async () => {
        const [articles, constraints] = await Promise.all([
          scraper.search(query, { topK: 1 }).catch((err) => {
            console.warn("[action] Vector search failed:", err);
            return [] as Article[];
          }),
          getUserConstraintPrompt(),
        ]);
        return [articles, constraints] as const;
      }
    );

    // 2. プロンプト構築
    onProgress?.("prompt_build", "プロンプトを構築中...");
    const prompt = timer.measure("prompt_build", async () => {
      const totalDays = extractDuration(input.dates);
      const durationPrompt =
        totalDays > 0
          ? `${totalDays}`
          : "Flexible (Suggest suitable duration, e.g. 2-5 days)";
      const budgetPrompt = getBudgetContext(input.budget);
      const transitConstraints = buildConstraintsPrompt(input.transits);
      const transitSchedule = buildTransitSchedulePrompt(input.transits);
      const fixedSchedulePrompt = getFixedSchedulePrompt(input.fixedSchedule);

      if (input.isDestinationDecided) {
        const isMultiCity = input.destinations.length > 1;
        return `
          Destinations: ${destinationsStr}${isMultiCity ? " (Multi-city trip - please create an efficient route visiting all locations)" : ""}
          Dates: ${input.dates}
          Total Days: ${durationPrompt}
          Companions: ${input.companions}
          Themes: ${input.theme.join(", ")}
          ${budgetPrompt}
          Pace: ${input.pace}
          Must-Visit Places: ${input.mustVisitPlaces?.join(", ") || "None"}
          Preferred Transport: ${input.preferredTransport?.join(", ") || "None"}
          Note: ${input.freeText || "None"}

          ${transitSchedule}

          ${fixedSchedulePrompt}

          ${userConstraintPrompt}

          ${transitConstraints}

          === ROUTE OPTIMIZATION INSTRUCTIONS ===
          1. You are NOT bound by the order in which destinations were entered by the user, UNLESS fixed by transit anchors above.
          2. Freely rearrange the visiting order to optimize for:
             - Geographic efficiency (minimize backtracking)
             - Travel convenience (logical flow between locations)
             - Time of day considerations (e.g., morning activities vs evening activities)
          3. **RESPECT ANCHORS**: If the user has a booked flight to a city, you MUST start the relevant day there.

          === MANDATORY VISITS ===
          1. ALL destinations listed above (${destinationsStr}) MUST be included in the itinerary. No destination may be omitted.
          2. ALL "Must-Visit Places" listed above MUST be incorporated into the plan. Omitting any specified place is NOT acceptable.
          3. If time constraints make it difficult to visit everything, compress visit durations rather than removing locations.
          ${isMultiCity ? `\nIMPORTANT: This is a multi-city trip. Please plan the itinerary to visit ALL specified destinations (${destinationsStr}) in a geographically optimized order, considering travel time between locations.` : ""}
        `;
      } else {
        return `
          Region: ${input.region === "domestic" ? "Japan (Domestic)" : input.region === "overseas" ? "Overseas (International - NOT Japan)" : "Anywhere"}
          Vibe: ${input.travelVibe || "None"}
          Dates: ${input.dates}
          Total Days: ${durationPrompt}
          Companions: ${input.companions}
          Themes: ${input.theme.join(", ")}
          ${budgetPrompt}
          Pace: ${input.pace}
          Must-Visit Places: ${input.mustVisitPlaces?.join(", ") || "None"}
          Preferred Transport: ${input.preferredTransport?.join(", ") || "None"}
          Note: ${input.freeText || "None"}

          ${transitSchedule}

          ${fixedSchedulePrompt}

          ${userConstraintPrompt}

          ${transitConstraints}

          === MANDATORY VISITS ===
          1. If "Must-Visit Places" are specified above, ALL of them MUST be incorporated into the plan.
          2. Omitting any specified place is NOT acceptable.
          3. These places should influence destination selection - choose a destination that allows visiting all specified places.

          TASK: Select best destination and outline plan.
        `;
      }
    });

    const resolvedPrompt = await prompt;

    // 3. AI生成（メトリクス付き）
    onProgress?.("ai_generation", "AIがプランを生成中...");
    const metricsCollector = new MetricsCollector();
    metricsCollector.startGeneration(
      input.destinations.join("、") || "unknown",
      extractDuration(input.dates) || 1
    );
    metricsCollector.recordRagArticles(contextArticles.length);

    const outline = await timer.measure("ai_generation", async () => {
      const result = await ai.generateOutline(resolvedPrompt, contextArticles);
      return result;
    });

    if (ai.lastModelInfo?.tier === "pro") {
      timer.setTargets(OUTLINE_TARGETS_PRO);
    }

    metricsCollector.recordOutlineTime(
      timer.getReport().steps.find((s) => s.name === "ai_generation")
        ?.duration ?? 0
    );

    metricsCollector.flush().catch(() => {});

    // 4. 目的地更新
    const updatedInput = { ...input };
    if (!updatedInput.isDestinationDecided) {
      updatedInput.destinations = [outline.destination];
      updatedInput.isDestinationDecided = true;
    }

    // 5. ヒーロー画像取得
    onProgress?.("hero_image", "メイン画像を取得中...");
    const heroImageData = await timer.measure("hero_image", () =>
      getUnsplashImage(outline.destination)
    );

    // 6. キャッシュ保存（非同期）
    timer.start("cache_save");
    setOutlineCache(
      {
        destinations: input.destinations,
        days: input.dates,
        companions: input.companions,
        theme: input.theme,
        budget: input.budget,
        pace: input.pace,
        isDestinationDecided: input.isDestinationDecided,
        region: input.region,
        travelVibe: input.travelVibe,
      },
      {
        outline,
        context: contextArticles,
        heroImage: heroImageData,
      }
    )
      .then(() => timer.end("cache_save"))
      .catch((e) => {
        timer.end("cache_save");
        console.warn("[action] Cache save failed:", e);
      });

    timer.log();

    return {
      success: true,
      data: {
        outline,
        context: contextArticles,
        input: updatedInput,
        heroImage: heroImageData,
        modelInfo: ai.lastModelInfo || undefined,
      },
    };
  } catch (error) {
    timer.log();
    console.error("[action] Outline generation failed:", error);
    return { success: false, message: "プラン概要の作成に失敗しました。" };
  }
}
