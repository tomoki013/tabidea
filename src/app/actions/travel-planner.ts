"use server";

import crypto from 'crypto';

import { GeminiService } from "@/lib/services/ai/gemini";
// import { WebScraperRetriever } from '@/lib/services/rag/scraper';
import { PineconeRetriever } from "@/lib/services/rag/pinecone-retriever";
import { Itinerary, UserInput, PlanOutline, PlanOutlineDay, DayPlan, Article, FixedScheduleItem } from '@/types';
import { getUnsplashImage } from "@/lib/unsplash";
import { extractDuration, splitDaysIntoChunks } from "@/lib/utils";
import { buildConstraintsPrompt, buildTransitSchedulePrompt } from "@/lib/prompts";
import { getOutlineCache, setOutlineCache } from "@/lib/cache";
import { getUser, createAdminClient, createClient } from "@/lib/supabase/server";
import { planService } from "@/lib/plans/service";
import { isAdminEmail } from "@/lib/billing/billing-checker";
import { EntitlementService } from "@/lib/entitlements";
import { getUserSettings } from "@/app/actions/user-settings";
import { checkAndRecordUsage } from "@/lib/limits/check";
import { checkPlanCreationRate, checkPlanUpdateRate } from "@/lib/security/rate-limit";
import type { UserType } from "@/lib/limits/config";
import { GOLDEN_PLAN_EXAMPLES } from "@/data/golden-plans/examples";
import { getSpotValidator } from "@/lib/services/validation/spot-validator";
import { selfCorrectItinerary } from "@/lib/services/ai/self-correction";
import { MetricsCollector } from "@/lib/services/ai/metrics/collector";
import { createOutlineTimer, createChunkTimer, OUTLINE_TARGETS_PRO, CHUNK_TARGETS_PRO } from "@/lib/utils/performance-timer";


export type ActionState = {
  success: boolean;
  message?: string;
  data?: Itinerary;
};

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
  // 利用制限関連
  limitExceeded?: boolean;
  userType?: UserType;
  resetAt?: string | null; // ISO string
  remaining?: number;
};

export type ChunkActionState = {
  success: boolean;
  message?: string;
  data?: DayPlan[];
  modelInfo?: { modelName: string; tier: 'flash' | 'pro' };
};

/**
 * Helper to generate budget context string
 */
/**
 * Helper to generate fixed schedule prompt
 */
function getFixedSchedulePrompt(schedule?: FixedScheduleItem[]): string {
  if (!schedule || schedule.length === 0) return "";

  return `
    === FIXED SCHEDULE (USER BOOKINGS) ===
    The user has the following fixed reservations. You MUST incorporate these into the itinerary at the specified times.
    ${schedule.map(item => `- [${item.type}] ${item.name} ${item.date ? `(Date: ${item.date})` : ''} ${item.time ? `(Time: ${item.time})` : ''} ${item.notes ? `Note: ${item.notes}` : ''}`).join('\n')}
    ======================================
  `;
}

function getBudgetContext(budget: string): string {
  if (!budget) return "Budget: Not specified";

  // Handle range format: "range:50000:100000"
  if (budget.startsWith("range:")) {
    const parts = budget.split(":");
    if (parts.length >= 3) {
      const min = parseInt(parts[1], 10);
      const max = parseInt(parts[2], 10);
      const minStr = (min / 10000).toFixed(0);
      const maxStr = (max / 10000).toFixed(0);
      return `
    Budget: ${minStr}万円 〜 ${maxStr}万円 (${min.toLocaleString()} JPY - ${max.toLocaleString()} JPY)
    (Please suggest hotels, restaurants, and activities that fit within this specific budget range per person for the entire trip.)
      `;
    }
  }

  return `
    Budget Level: ${budget}
    (Budget Guidance for AI:
     - If Destination is Domestic (Japan):
       - Saving: ~30,000 JPY total (Hostels, cheap eats)
       - Standard: ~50,000 JPY total (Business hotels, standard meals)
       - High: ~100,000 JPY total (Ryokan/Nice hotels, good dining)
       - Luxury: ~200,000+ JPY total
     - If Destination is Overseas:
       - Adjust scale accordingly. Standard usually implies 150,000-300,000 JPY depending on region (Asia vs Europe).
     - Please suggest hotels, restaurants, and activities that fit this financial scale.)
  `;
}

/**
 * Helper to fetch and format user custom instructions
 */
export async function getUserConstraintPrompt(): Promise<string> {
  const { settings } = await getUserSettings();
  let prompt = "";

  // Travel Style (Preferences)
  if (settings?.travelStyle && settings.travelStyle.trim().length > 0) {
    prompt += `
    === USER TRAVEL STYLE / PREFERENCES ===
    The user describes their travel style as:
    "${settings.travelStyle}"
    Please consider this tone and style when generating the plan.
    =======================================
    \n`;
  }

  // Custom Instructions (Constraints)
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


async function rollbackPlanGenerationUsage(attemptId: string) {
  try {
    const supabase = await createClient();
    const user = await getUser();
    if (!user) return;

    await supabase
      .from('usage_logs')
      .delete()
      .eq('user_id', user.id)
      .eq('action_type', 'plan_generation')
      .eq('metadata->>attempt_id', attemptId);
  } catch (error) {
    console.warn('[action] failed to rollback plan generation usage log', error);
  }
}

/**
 * Step 1: Generate Master Outline (Client-Side Orchestration Flow)
 */
export async function generatePlanOutline(input: UserInput): Promise<OutlineActionState> {
  const timer = createOutlineTimer();
  console.log(`[action] generatePlanOutline started`);

  const attemptId = crypto.randomUUID();

  // 利用制限チェック
  const limitResult = await timer.measure('usage_check', () =>
    checkAndRecordUsage('plan_generation', {
      destination: input.destinations.join(', ') || input.region,
      isDestinationDecided: input.isDestinationDecided,
      attempt_id: attemptId,
    })
  );

  if (!limitResult.allowed) {
    return {
      success: false,
      limitExceeded: true,
      userType: limitResult.userType,
      resetAt: limitResult.resetAt?.toISOString() ?? null,
      remaining: limitResult.remaining,
      message: '利用制限に達しました',
    };
  }

  const hasAIKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.OPENAI_API_KEY;
  if (!hasAIKey) {
    await rollbackPlanGenerationUsage(attemptId);
    return { success: false, message: "API Key missing" };
  }

  // キャッシュチェック
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

    const cached = await timer.measure('cache_check', () => getOutlineCache(cacheParams));
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
    const destinationsStr = input.destinations.join("、");
    const query = input.isDestinationDecided
      ? `${destinationsStr}で${input.companions}と${input.theme.join("や")}を楽しむ旅行`
      : `${input.region === "domestic" ? "日本国内" : input.region === "overseas" ? "海外" : "おすすめの場所"}で${input.travelVibe ? input.travelVibe + "な" : ""}${input.theme.join("や")}を楽しむ${input.companions}旅行`;

    // RAG検索とユーザー制約取得を並列実行
    const [contextArticles, userConstraintPrompt] = await timer.measure('rag_search', async () => {
      const [articles, constraints] = await Promise.all([
        scraper.search(query, { topK: 1 }).catch((err) => {
          console.warn("[action] Vector search failed:", err);
          return [] as Article[];
        }),
        getUserConstraintPrompt(),
      ]);
      return [articles, constraints] as const;
    });

    // 2. プロンプト構築
    const prompt = timer.measure('prompt_build', async () => {
      const totalDays = extractDuration(input.dates);
      const durationPrompt = totalDays > 0 ? `${totalDays}` : "Flexible (Suggest suitable duration, e.g. 2-5 days)";
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
    const metricsCollector = new MetricsCollector();
    metricsCollector.startGeneration(
      input.destinations.join('、') || 'unknown',
      extractDuration(input.dates) || 1
    );
    metricsCollector.recordRagArticles(contextArticles.length);

    const outline = await timer.measure('ai_generation', async () => {
      const result = await ai.generateOutline(resolvedPrompt, contextArticles);
      return result;
    });

    // Pro モデル使用時は目標時間を切り替え
    if (ai.lastModelInfo?.tier === 'pro') {
      timer.setTargets(OUTLINE_TARGETS_PRO);
    }

    metricsCollector.recordOutlineTime(
      timer.getReport().steps.find(s => s.name === 'ai_generation')?.duration ?? 0
    );

    // メトリクス非同期フラッシュ
    metricsCollector.flush().catch(() => {});

    // 4. 目的地更新
    const updatedInput = { ...input };
    if (!updatedInput.isDestinationDecided) {
      updatedInput.destinations = [outline.destination];
      updatedInput.isDestinationDecided = true;
    }

    // 5. ヒーロー画像取得
    const heroImageData = await timer.measure('hero_image', () =>
      getUnsplashImage(outline.destination)
    );

    // 6. キャッシュ保存（非同期）
    timer.start('cache_save');
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
    ).then(() => timer.end('cache_save')).catch((e) => {
      timer.end('cache_save');
      console.warn("[action] Cache save failed:", e);
    });

    // パフォーマンスログ出力
    timer.log();

    return {
      success: true,
      data: {
        outline,
        context: contextArticles,
        input: updatedInput,
        heroImage: heroImageData,
        modelInfo: ai.lastModelInfo || undefined,
      }
    };

  } catch (error) {
    await rollbackPlanGenerationUsage(attemptId);
    timer.log();
    console.error("[action] Outline generation failed:", error);
    return { success: false, message: "プラン概要の作成に失敗しました。" };
  }
}

/**
 * Step 2: Generate Details for a specific Chunk (Client-Side Orchestration Flow)
 */
export async function generatePlanChunk(
  input: UserInput,
  context: Article[],
  outlineDays: PlanOutlineDay[],
  startDay: number,
  endDay: number,
  previousOvernightLocation?: string
): Promise<ChunkActionState> {
  const timer = createChunkTimer(startDay, endDay);
  console.log(`[action] generatePlanChunk days ${startDay}-${endDay}`);

  const hasAIKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.OPENAI_API_KEY;
  if (!hasAIKey) return { success: false, message: "API Key missing" };

  try {
    const ai = new GeminiService({
      goldenPlanExamples: GOLDEN_PLAN_EXAMPLES,
    });

    // プロンプト構築（ユーザー制約取得含む）
    const prompt = await timer.measure('prompt_build', async () => {
      const budgetPrompt = getBudgetContext(input.budget);
      const destinationsStr = input.destinations.join("、");
      const isMultiCity = input.destinations.length > 1;
      const userConstraintPrompt = await getUserConstraintPrompt();
      const transitConstraints = buildConstraintsPrompt(input.transits);
      const transitSchedule = buildTransitSchedulePrompt(input.transits);
      const fixedSchedulePrompt = getFixedSchedulePrompt(input.fixedSchedule);

      return `
        Destinations: ${destinationsStr}${isMultiCity ? " (Multi-city trip)" : ""}
        Dates: ${input.dates}
        Companions: ${input.companions}
        Themes: ${input.theme.join(", ")}
        ${budgetPrompt}
        Pace: ${input.pace}
        Must-Visit: ${input.mustVisitPlaces?.join(", ") || "None"}
        Request: ${input.freeText || "None"}
        ${isMultiCity ? `Note: This is a multi-city trip visiting: ${destinationsStr}. Ensure the itinerary covers all locations.` : ""}

        ${transitSchedule}

        ${fixedSchedulePrompt}

        ${userConstraintPrompt}

        ${transitConstraints}
      `;
    });

    // AI生成
    const days = await timer.measure('ai_generation', () =>
      ai.generateDayDetails(
        prompt,
        context,
        startDay,
        endDay,
        outlineDays,
        previousOvernightLocation
      )
    );

    // Pro モデル使用時は目標時間を切り替え
    if (ai.lastModelInfo?.tier === 'pro') {
      timer.setTargets(CHUNK_TARGETS_PRO);
    }

    timer.log();
    return { success: true, data: days, modelInfo: ai.lastModelInfo || undefined };

  } catch (error) {
    timer.log();
    console.error(`[action] Chunk generation failed (${startDay}-${endDay}):`, error);
    return { success: false, message: "詳細プランの生成に失敗しました。" };
  }
}

/**
 * Auto-verify generated itinerary spots and self-correct if needed
 * Only runs when ENABLE_SPOT_VALIDATION=true
 */
export async function autoVerifyItinerary(
  itinerary: Itinerary,
  context: Article[],
  destination: string
): Promise<{ itinerary: Itinerary; validationResult?: { totalSpots: number; failedCount: number; corrected: boolean } }> {
  if (process.env.ENABLE_SPOT_VALIDATION !== 'true') {
    return { itinerary };
  }

  try {
    const validator = getSpotValidator({ usePlacesApi: true });
    const validationMap = await validator.validateItinerarySpots(
      itinerary.days,
      destination
    );

    // Count failures
    const failedSpots: Array<{ day: number; activityIndex: number; activityName: string; reason: string }> = [];
    for (const dayPlan of itinerary.days) {
      for (let i = 0; i < dayPlan.activities.length; i++) {
        const act = dayPlan.activities[i];
        const validation = validationMap.get(act.activity);
        if (validation && !validation.isVerified && (validation.confidence === 'low' || validation.confidence === 'unverified')) {
          failedSpots.push({
            day: dayPlan.day,
            activityIndex: i,
            activityName: act.activity,
            reason: 'not_found',
          });
        }
      }
    }

    const totalSpots = validationMap.size;

    if (failedSpots.length > 0 && failedSpots.length / totalSpots < 0.3) {
      console.warn(`[action] ${failedSpots.length} spots failed validation, attempting self-correction`);
      const hasKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.OPENAI_API_KEY;
      if (hasKey) {
        const ai = new GeminiService();
        const corrected = await selfCorrectItinerary(ai, itinerary, failedSpots, context);
        return {
          itinerary: corrected,
          validationResult: { totalSpots, failedCount: failedSpots.length, corrected: true },
        };
      }
    }

    return {
      itinerary,
      validationResult: { totalSpots, failedCount: failedSpots.length, corrected: false },
    };
  } catch (error) {
    console.warn('[action] Auto-verification failed (non-blocking):', error);
    return { itinerary };
  }
}

export async function fetchHeroImage(
  destination: string
) {
  try {
    const heroImageData = await getUnsplashImage(destination);
    return heroImageData;
  } catch (e) {
    console.error("Failed to fetch hero image:", e);
    return null;
  }
}

export async function regeneratePlan(
  currentPlan: Itinerary,
  chatHistory: { role: string; text: string }[]
): Promise<ActionState> {
  const hasAIKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.OPENAI_API_KEY;
  if (!hasAIKey) return { success: false, message: "API Key missing" };

  try {
    const ai = new GeminiService();

    // Inject user constraint prompt into chat history context if possible,
    // or we might need to modify modifyItinerary signature.
    // But better to append it as a "System" message in the history or similar.
    // However, GeminiService.modifyItinerary takes history as is.
    // We can prepend a system instruction to the history.

    const userConstraintPrompt = await getUserConstraintPrompt();
    let effectiveHistory = chatHistory;

    if (userConstraintPrompt) {
        // Prepend as a high-priority user message or system note
        effectiveHistory = [
            { role: 'user', text: `[SYSTEM NOTE: ${userConstraintPrompt}]` },
            ...chatHistory
        ];
    }

    const newPlan = await ai.modifyItinerary(currentPlan, effectiveHistory);

    // If the destination changed, fetch a new image
    if (newPlan.destination !== currentPlan.destination) {
      const heroImageData = await getUnsplashImage(newPlan.destination);
      if (heroImageData) {
        newPlan.heroImage = heroImageData.url;
        newPlan.heroImagePhotographer = heroImageData.photographer;
        newPlan.heroImagePhotographerUrl = heroImageData.photographerUrl;
      }
    } else {
        // Keep the old image if destination is the same
        newPlan.heroImage = currentPlan.heroImage;
        newPlan.heroImagePhotographer = currentPlan.heroImagePhotographer;
        newPlan.heroImagePhotographerUrl = currentPlan.heroImagePhotographerUrl;
    }

    return { success: true, data: newPlan };
  } catch (e) {
    console.error("Regeneration failed", e);
    return { success: false, message: "プランの再生成に失敗しました。" };
  }
}

// ============================================
// Plan Storage Actions (for authenticated users)
// ============================================

export type SavePlanResult = {
  success: boolean;
  shareCode?: string;
  plan?: {
    id: string;
    shareCode: string;
    destination: string | null;
    durationDays: number | null;
    thumbnailUrl: string | null;
    isPublic: boolean;
    createdAt: string;
    updatedAt: string;
  };
  error?: string;
};

/**
 * Save a plan to the database (for authenticated users)
 */
export async function savePlan(
  input: UserInput,
  itinerary: Itinerary,
  isPublic: boolean = false
): Promise<SavePlanResult> {
  try {
    const user = await getUser();

    if (!user) {
      return { success: false, error: "認証が必要です" };
    }

    // Rate Limit Check (Spam Protection)
    const rateLimit = await checkPlanCreationRate(user.id);
    if (!rateLimit.success) {
      return { success: false, error: rateLimit.message };
    }

    const result = await planService.createPlan({
      userId: user.id,
      input,
      itinerary,
      isPublic,
    });

    if (!result.success || !result.plan) {
      return { success: false, error: result.error };
    }

    return {
      success: true,
      shareCode: result.shareCode,
      plan: {
        id: result.plan.id,
        shareCode: result.plan.shareCode,
        destination: result.plan.destination,
        durationDays: result.plan.durationDays,
        thumbnailUrl: result.plan.thumbnailUrl,
        isPublic: result.plan.isPublic,
        createdAt: result.plan.createdAt.toISOString(),
        updatedAt: result.plan.updatedAt.toISOString(),
      },
    };
  } catch (error) {
    console.error("Failed to save plan:", error);
    return { success: false, error: "プランの保存に失敗しました" };
  }
}

/**
 * Get user's plans count (for sync preview)
 */
export async function getUserPlansCount(): Promise<number> {
  try {
    const user = await getUser();

    if (!user) {
      return 0;
    }

    const supabase = await createClient();
    const { count } = await supabase
      .from("plans")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    return count || 0;
  } catch (error) {
    console.error("Failed to get plans count:", error);
    return 0;
  }
}

/**
 * Delete a plan
 */
export async function deletePlan(planId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getUser();

    if (!user) {
      return { success: false, error: "認証が必要です" };
    }

    const result = await planService.deletePlan(planId, user.id);
    return result;
  } catch (error) {
    console.error("Failed to delete plan:", error);
    return { success: false, error: "プランの削除に失敗しました" };
  }
}

/**
 * Update plan visibility
 */
export async function updatePlanVisibility(
  planId: string,
  isPublic: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getUser();

    if (!user) {
      return { success: false, error: "認証が必要です" };
    }

    // Rate Limit
    const rateLimit = await checkPlanUpdateRate(planId);
    if (!rateLimit.success) {
      return { success: false, error: rateLimit.message };
    }

    const result = await planService.updatePlan(planId, user.id, { isPublic });

    if (!result.success) {
      return { success: false, error: result.error };
    }

    return { success: true };
  } catch (error) {
    console.error("Failed to update plan visibility:", error);
    return { success: false, error: "プランの更新に失敗しました" };
  }
}

/**
 * Update plan name (destination)
 */
export async function updatePlanName(
  planId: string,
  newName: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getUser();

    if (!user) {
      return { success: false, error: "認証が必要です" };
    }

    // Rate Limit
    const rateLimit = await checkPlanUpdateRate(planId);
    if (!rateLimit.success) {
      return { success: false, error: rateLimit.message };
    }

    if (!newName || newName.trim().length === 0) {
      return { success: false, error: "プラン名を入力してください" };
    }

    const result = await planService.updatePlan(planId, user.id, {
      destination: newName.trim(),
    });

    if (!result.success) {
      return { success: false, error: result.error };
    }

    return { success: true };
  } catch (error) {
    console.error("Failed to update plan name:", error);
    return { success: false, error: "プラン名の更新に失敗しました" };
  }
}

/**
 * Check if user can generate plans (entitlement check)
 */
export async function canGeneratePlan(): Promise<{
  canGenerate: boolean;
  remaining: number | null;
  isAuthenticated: boolean;
}> {
  try {
    const user = await getUser();

    if (!user) {
      // Unauthenticated users can always generate (stored locally)
      return { canGenerate: true, remaining: null, isAuthenticated: false };
    }

    const supabase = await createClient();
    const entitlementService = new EntitlementService(supabase);
    const status = await entitlementService.checkEntitlement(user.id, "plan_generation");

    return {
      canGenerate: status.hasAccess,
      remaining: status.remaining,
      isAuthenticated: true,
    };
  } catch (error) {
    console.error("Failed to check entitlement:", error);
    // Allow on error (fail open for better UX)
    return { canGenerate: true, remaining: null, isAuthenticated: false };
  }
}

/**
 * Get user's plans list for sidebar
 */
export async function getUserPlansList(limit: number = 5): Promise<{
  success: boolean;
  plans?: Array<{
    id: string;
    shareCode: string;
    destination: string | null;
    durationDays: number | null;
    thumbnailUrl: string | null;
    isPublic: boolean;
    createdAt: string;
    updatedAt: string;
  }>;
  error?: string;
}> {
  try {
    const user = await getUser();

    if (!user) {
      return { success: false, error: "認証が必要です" };
    }

    const result = await planService.getUserPlansList(user.id, { limit });

    if (!result.success || !result.plans) {
      return { success: false, error: result.error };
    }

    return {
      success: true,
      plans: result.plans.map((plan) => ({
        id: plan.id,
        shareCode: plan.shareCode,
        destination: plan.destination,
        durationDays: plan.durationDays,
        thumbnailUrl: plan.thumbnailUrl,
        isPublic: plan.isPublic,
        createdAt: plan.createdAt.toISOString(),
        updatedAt: plan.updatedAt.toISOString(),
      })),
    };
  } catch (error) {
    console.error("Failed to get user plans:", error);
    return { success: false, error: "プランの取得に失敗しました" };
  }
}

/**
 * Delete user account and all associated data
 */
export async function deleteAccount(): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getUser();

    if (!user) {
      return { success: false, error: "認証が必要です" };
    }

    const supabase = await createClient();

    // First, delete all user's plans
    const { error: plansDeleteError } = await supabase
      .from('plans')
      .delete()
      .eq('user_id', user.id);

    if (plansDeleteError) {
      console.error('Failed to delete user plans:', plansDeleteError);
      // Continue with account deletion even if plans deletion fails
    }

    // Delete the user from auth.users using admin client
    // This will cascade delete from users table and other related tables
    const adminClient = await createAdminClient();
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id);

    if (deleteError) {
      console.error('Failed to delete user:', deleteError);
      return { success: false, error: "アカウントの削除に失敗しました" };
    }

    return { success: true };
  } catch (error) {
    console.error("Failed to delete account:", error);
    return { success: false, error: "アカウントの削除に失敗しました" };
  }
}

/**
 * Update plan itinerary and input (for plan changes/regeneration)
 */
export async function updatePlanItinerary(
  planId: string,
  itinerary: Itinerary,
  input?: UserInput
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getUser();

    if (!user) {
      return { success: false, error: "認証が必要です" };
    }

    // Rate Limit
    const rateLimit = await checkPlanUpdateRate(planId);
    if (!rateLimit.success) {
      return { success: false, error: rateLimit.message };
    }

    const result = await planService.updatePlan(planId, user.id, {
      itinerary,
      ...(input && { input }),
    });

    if (!result.success) {
      return { success: false, error: result.error };
    }

    return { success: true };
  } catch (error) {
    console.error("Failed to update plan itinerary:", error);
    return { success: false, error: "プランの更新に失敗しました" };
  }
}

/**
 * Get plan by ID (for logged-in user only)
 */
export async function getPlanById(planId: string): Promise<{
  success: boolean;
  plan?: {
    id: string;
    shareCode: string;
    destination: string | null;
    durationDays: number | null;
    thumbnailUrl: string | null;
    isPublic: boolean;
    input?: UserInput;
    itinerary?: Itinerary;
  };
  error?: string;
}> {
  try {
    const user = await getUser();

    if (!user) {
      return { success: false, error: "認証が必要です" };
    }

    const result = await planService.getPlanById(planId, user.id);

    if (!result.success || !result.plan) {
      return { success: false, error: result.error || "プランが見つかりません" };
    }

    const { plan } = result;

    return {
      success: true,
      plan: {
        id: plan.id,
        shareCode: plan.shareCode,
        destination: plan.destination,
        durationDays: plan.durationDays,
        thumbnailUrl: plan.thumbnailUrl,
        isPublic: plan.isPublic,
        input: plan.input,
        itinerary: plan.itinerary,
      },
    };
  } catch (error) {
    console.error("Failed to get plan:", error);
    return { success: false, error: "プランの取得に失敗しました" };
  }
}

// ============================================
// Chat Message Actions
// ============================================

export type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

/**
 * Save chat messages for a plan
 */
export async function savePlanChatMessages(
  planId: string,
  messages: ChatMessage[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getUser();

    if (!user) {
      return { success: false, error: "認証が必要です" };
    }

    const supabase = await createClient();

    // Verify plan ownership
    const { data: plan, error: planError } = await supabase
      .from('plans')
      .select('id, user_id')
      .eq('id', planId)
      .eq('user_id', user.id)
      .single();

    if (planError || !plan) {
      return { success: false, error: "プランが見つからないか、アクセス権がありません" };
    }

    // Delete existing messages
    await supabase
      .from('plan_chat_messages')
      .delete()
      .eq('plan_id', planId);

    // Insert new messages if there are any
    if (messages.length > 0) {
      const messagesToInsert = messages.map((msg, index) => ({
        plan_id: planId,
        role: msg.role,
        content: msg.content,
        sequence_number: index + 1,
      }));

      const { error: insertError } = await supabase
        .from('plan_chat_messages')
        .insert(messagesToInsert);

      if (insertError) {
        console.error("Failed to insert chat messages:", insertError);
        return { success: false, error: "チャット履歴の保存に失敗しました" };
      }
    }

    return { success: true };
  } catch (error) {
    console.error("Failed to save chat messages:", error);
    return { success: false, error: "チャット履歴の保存に失敗しました" };
  }
}

/**
 * Load chat messages for a plan
 */
export async function loadPlanChatMessages(
  planId: string
): Promise<{
  success: boolean;
  messages?: ChatMessage[];
  error?: string;
}> {
  try {
    const user = await getUser();

    if (!user) {
      return { success: false, error: "認証が必要です" };
    }

    const supabase = await createClient();

    // Verify plan ownership
    const { data: plan, error: planError } = await supabase
      .from('plans')
      .select('id, user_id')
      .eq('id', planId)
      .eq('user_id', user.id)
      .single();

    if (planError || !plan) {
      return { success: false, error: "プランが見つからないか、アクセス権がありません" };
    }

    // Get chat messages
    const { data: messages, error: messagesError } = await supabase
      .from('plan_chat_messages')
      .select('role, content')
      .eq('plan_id', planId)
      .order('sequence_number', { ascending: true });

    if (messagesError) {
      console.error("Failed to load chat messages:", messagesError);
      return { success: false, error: "チャット履歴の取得に失敗しました" };
    }

    return {
      success: true,
      messages: (messages || []).map((msg) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })),
    };
  } catch (error) {
    console.error("Failed to load chat messages:", error);
    return { success: false, error: "チャット履歴の取得に失敗しました" };
  }
}

// ============================================
// Admin Actions
// ============================================

/**
 * Check if current user is admin
 */
export async function isCurrentUserAdmin(): Promise<boolean> {
  try {
    const user = await getUser();

    if (!user) {
      return false;
    }

    // Check environment variable first (supports multiple emails)
    if (isAdminEmail(user.email)) {
      return true;
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (error || !data) {
      return false;
    }

    return data.is_admin === true;
  } catch (error) {
    console.error("Failed to check admin status:", error);
    return false;
  }
}

/**
 * Grant admin role to a user (admin only)
 */
export async function grantAdminRole(
  targetUserId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getUser();

    if (!user) {
      return { success: false, error: "認証が必要です" };
    }

    // Check if current user is admin
    const isAdmin = await isCurrentUserAdmin();
    if (!isAdmin) {
      return { success: false, error: "管理者権限が必要です" };
    }

    const adminClient = await createAdminClient();
    const { error } = await adminClient
      .from('users')
      .update({ is_admin: true })
      .eq('id', targetUserId);

    if (error) {
      console.error("Failed to grant admin role:", error);
      return { success: false, error: "管理者権限の付与に失敗しました" };
    }

    return { success: true };
  } catch (error) {
    console.error("Failed to grant admin role:", error);
    return { success: false, error: "管理者権限の付与に失敗しました" };
  }
}

/**
 * Set initial admin user (via service role - for setup)
 * This should only be used once during initial setup
 */
export async function setInitialAdmin(
  userEmail: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // This requires the admin client (service role)
    const adminClient = await createAdminClient();

    // Find user by email
    const { data: users, error: findError } = await adminClient
      .from('users')
      .select('id, email')
      .eq('email', userEmail);

    if (findError || !users || users.length === 0) {
      return { success: false, error: "ユーザーが見つかりません" };
    }

    // Set as admin
    const { error } = await adminClient
      .from('users')
      .update({ is_admin: true })
      .eq('id', users[0].id);

    if (error) {
      console.error("Failed to set initial admin:", error);
      return { success: false, error: "管理者の設定に失敗しました" };
    }

    return { success: true };
  } catch (error) {
    console.error("Failed to set initial admin:", error);
    return { success: false, error: "管理者の設定に失敗しました" };
  }
}

// ============================================
// Flags Actions (formerly Favorites)
// ============================================

/**
 * Add a plan to user's flags
 */
export async function addPlanToFlags(
  planId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getUser();

    if (!user) {
      return { success: false, error: "認証が必要です" };
    }

    const { favoritesService } = await import("@/lib/favorites/service");
    return await favoritesService.addFavorite(user.id, planId);
  } catch (error) {
    console.error("Failed to add plan to flags:", error);
    return { success: false, error: "フラグへの追加に失敗しました" };
  }
}

/**
 * Remove a plan from user's flags
 */
export async function removePlanFromFlags(
  planId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getUser();

    if (!user) {
      return { success: false, error: "認証が必要です" };
    }

    const { favoritesService } = await import("@/lib/favorites/service");
    return await favoritesService.removeFavorite(user.id, planId);
  } catch (error) {
    console.error("Failed to remove plan from flags:", error);
    return { success: false, error: "フラグからの削除に失敗しました" };
  }
}

/**
 * Check if a plan is flagged by the current user
 */
export async function isPlanFlagged(
  planId: string
): Promise<{ success: boolean; isFlagged: boolean; error?: string }> {
  try {
    const user = await getUser();

    if (!user) {
      return { success: false, isFlagged: false, error: "認証が必要です" };
    }

    const { favoritesService } = await import("@/lib/favorites/service");
    const result = await favoritesService.isFavorited(user.id, planId);
    return {
      success: result.success,
      isFlagged: result.isFavorited,
      error: result.error,
    };
  } catch (error) {
    console.error("Failed to check flag status:", error);
    return { success: false, isFlagged: false, error: "フラグ状態の確認に失敗しました" };
  }
}

/**
 * Get all flagged plan IDs for the current user
 */
export async function getFlaggedPlanIds(): Promise<{
  success: boolean;
  planIds: string[];
  error?: string;
}> {
  try {
    const user = await getUser();

    if (!user) {
      return { success: false, planIds: [], error: "認証が必要です" };
    }

    const { favoritesService } = await import("@/lib/favorites/service");
    return await favoritesService.getFavoritePlanIds(user.id);
  } catch (error) {
    console.error("Failed to get flagged plan IDs:", error);
    return { success: false, planIds: [], error: "フラグプランIDの取得に失敗しました" };
  }
}

/**
 * Get user's flagged plans with full details
 */
export async function getFlaggedPlans(options?: {
  limit?: number;
  offset?: number;
}): Promise<{
  success: boolean;
  plans?: import("@/types").PlanListItem[];
  total?: number;
  error?: string;
}> {
  try {
    const user = await getUser();

    if (!user) {
      return { success: false, error: "認証が必要です" };
    }

    const { favoritesService } = await import("@/lib/favorites/service");
    return await favoritesService.getFavoritePlans(user.id, options);
  } catch (error) {
    console.error("Failed to get flagged plans:", error);
    return { success: false, error: "フラグプランの取得に失敗しました" };
  }
}

// ============================================
// Deprecated: Legacy Favorites Actions
// For backward compatibility
// ============================================

/** @deprecated Use addPlanToFlags instead */
export async function addPlanToFavorites(planId: string) {
  return addPlanToFlags(planId);
}

/** @deprecated Use removePlanFromFlags instead */
export async function removePlanFromFavorites(planId: string) {
  return removePlanFromFlags(planId);
}

/** @deprecated Use isPlanFlagged instead */
export async function isPlanFavorited(planId: string) {
  const result = await isPlanFlagged(planId);
  return {
    success: result.success,
    isFavorited: result.isFlagged,
    error: result.error,
  };
}

/** @deprecated Use getFlaggedPlanIds instead */
export async function getFavoritePlanIds() {
  return getFlaggedPlanIds();
}

/** @deprecated Use getFlaggedPlans instead */
export async function getFavoritePlans(options?: { limit?: number; offset?: number }) {
  return getFlaggedPlans(options);
}
