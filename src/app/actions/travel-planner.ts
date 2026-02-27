"use server";

import { GeminiService } from "@/lib/services/ai/gemini";
import { Itinerary, UserInput, PlanOutlineDay, DayPlan, Article } from '@/types';
import { getUnsplashImage } from "@/lib/unsplash";
import { extractDuration, splitDaysIntoChunks } from "@/lib/utils";
import { buildConstraintsPrompt, buildTransitSchedulePrompt } from "@/lib/prompts";
import { getBudgetContext, getFixedSchedulePrompt } from "@/lib/utils/plan-prompt-helpers";
import { getUser, createAdminClient, createClient } from "@/lib/supabase/server";
import { planService } from "@/lib/plans/service";
import { isAdminEmail } from "@/lib/billing/billing-checker";
import { EntitlementService } from "@/lib/entitlements";
import { checkPlanCreationRate, checkPlanUpdateRate } from "@/lib/security/rate-limit";
import { revalidatePath } from "next/cache";
import { GOLDEN_PLAN_EXAMPLES } from "@/data/golden-plans/examples";
import { getSpotValidator } from "@/lib/services/validation/spot-validator";
import { selfCorrectItinerary } from "@/lib/services/ai/self-correction";
import { createChunkTimer, CHUNK_TARGETS_PRO } from "@/lib/utils/performance-timer";
import { buildDefaultPublicationSlug } from "@/lib/plans/normalized";
import {
  executeOutlineGeneration,
  getUserConstraintPrompt,
  type OutlineActionState,
} from "@/lib/services/plan-generation/generate-outline";

// Re-export for backward compatibility
export { getUserConstraintPrompt, type OutlineActionState };

export type ActionState = {
  success: boolean;
  message?: string;
  data?: Itinerary;
};

export type ChunkActionState = {
  success: boolean;
  message?: string;
  data?: DayPlan[];
  modelInfo?: { modelName: string; tier: 'flash' | 'pro' };
};

/**
 * Step 1: Generate Master Outline (Client-Side Orchestration Flow)
 * Delegates to shared core logic in plan-generation/generate-outline.ts
 */
export async function generatePlanOutline(
  input: UserInput,
  options?: { isRetry?: boolean }
): Promise<OutlineActionState> {
  return executeOutlineGeneration(input, options);
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

    if (!result.success || !result.plan) {
      return { success: false, error: result.error };
    }

    // Sync with plan_publications table
    // This is necessary because the public feed (Travel Shiori) reads from plan_publications
    try {
      const supabase = await createClient();

      // Check for existing publication
      const { data: existingPub } = await supabase
        .from('plan_publications')
        .select('slug, unlisted_token, publish_journal, publish_budget')
        .eq('plan_id', planId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (isPublic) {
        // Prepare data for publication
        const slug = existingPub?.slug ?? buildDefaultPublicationSlug(result.plan.destination ?? 'trip');
        const publishJournal = existingPub?.publish_journal ?? true;
        const publishBudget = existingPub?.publish_budget ?? true;

        // Upsert publication with 'public' visibility
        const { error: pubError } = await supabase
          .from('plan_publications')
          .upsert({
            plan_id: planId,
            user_id: user.id,
            slug,
            visibility: 'public',
            publish_journal: publishJournal,
            publish_budget: publishBudget,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'plan_id' });

        if (pubError) {
          console.error("Failed to sync plan_publications (public):", pubError);
          // Non-blocking error, but worth logging
        }
      } else {
        // If switching to private, update visibility if record exists
        if (existingPub) {
          const { error: pubError } = await supabase
            .from('plan_publications')
            .update({
              visibility: 'private',
              updated_at: new Date().toISOString(),
            })
            .eq('plan_id', planId);

          if (pubError) {
            console.error("Failed to sync plan_publications (private):", pubError);
          }
        }
      }
    } catch (syncError) {
      console.error("Error syncing with plan_publications:", syncError);
      // Don't fail the whole request if sync fails, as the plan update succeeded
    }

    // Revalidate paths to reflect changes immediately
    revalidatePath('/shiori');
    revalidatePath('/public');
    revalidatePath(`/plan/id/${planId}`);

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
 * Check if current user is admin.
 * Admin status is determined solely by ADMIN_EMAILS environment variable.
 */
export async function isCurrentUserAdmin(): Promise<boolean> {
  try {
    const user = await getUser();
    if (!user) return false;
    return isAdminEmail(user.email);
  } catch {
    return false;
  }
}

/**
 * Grant admin role to a user.
 * Admin management is now via ADMIN_EMAILS env var — this is a no-op placeholder.
 */
export async function grantAdminRole(
  _targetUserId: string
): Promise<{ success: boolean; error?: string }> {
  return {
    success: false,
    error: "管理者権限は環境変数 ADMIN_EMAILS で管理されています",
  };
}

/**
 * Set initial admin user.
 * Admin management is now via ADMIN_EMAILS env var — this is a no-op placeholder.
 */
export async function setInitialAdmin(
  _userEmail: string
): Promise<{ success: boolean; error?: string }> {
  return {
    success: false,
    error: "管理者権限は環境変数 ADMIN_EMAILS で管理されています",
  };
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
