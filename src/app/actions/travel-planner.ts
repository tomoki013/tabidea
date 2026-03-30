"use server";

import { Itinerary, PlanMutationResult, PlanRegenerationPayload, UserInput } from '@/types';
import { getUnsplashImage } from "@/lib/unsplash";
import { getUser, createAdminClient, createClient } from "@/lib/supabase/server";
import { planService } from "@/lib/plans/service";
import { savePlanOnServer, type SavePlanResult } from "@/lib/plans/save-plan";
import { isAdminEmail } from "@/lib/billing/billing-checker";
import { EntitlementService } from "@/lib/entitlements";
import { checkPlanUpdateRate } from "@/lib/security/rate-limit";
import { revalidatePath } from "next/cache";
import { buildDefaultPublicationSlug } from "@/lib/plans/normalized";
import { regenerateItinerary } from "@/lib/services/plan-mutation";
import { tripService } from "@/lib/trips/service";


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
): Promise<PlanMutationResult<PlanRegenerationPayload>> {
  return regenerateItinerary({
    currentPlan,
    chatHistory,
  });
}

// ============================================
// Plan Storage Actions (for authenticated users)
// ============================================

/**
 * Save a plan to the database (for authenticated users)
 */
export async function savePlan(
  input: UserInput,
  itinerary: Itinerary,
  isPublic: boolean = false
): Promise<SavePlanResult> {
  return savePlanOnServer(input, itinerary, isPublic);
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
      return { success: false, error: "authentication_required" };
    }

    const result = await planService.deletePlan(planId, user.id);
    return result;
  } catch (error) {
    console.error("Failed to delete plan:", error);
    return { success: false, error: "plan_delete_failed" };
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
      return { success: false, error: "authentication_required" };
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
    revalidatePath('/my-plans');
    revalidatePath(`/plan/id/${planId}`);

    return { success: true };
  } catch (error) {
    console.error("Failed to update plan visibility:", error);
    return { success: false, error: "plan_update_failed" };
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
      return { success: false, error: "authentication_required" };
    }

    // Rate Limit
    const rateLimit = await checkPlanUpdateRate(planId);
    if (!rateLimit.success) {
      return { success: false, error: rateLimit.message };
    }

    if (!newName || newName.trim().length === 0) {
      return { success: false, error: "plan_name_required" };
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
    return { success: false, error: "plan_name_update_failed" };
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
      return { success: false, error: "authentication_required" };
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
    return { success: false, error: "plans_fetch_failed" };
  }
}

/**
 * Delete user account and all associated data
 */
export async function deleteAccount(): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getUser();

    if (!user) {
      return { success: false, error: "authentication_required" };
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
      return { success: false, error: "account_delete_failed" };
    }

    return { success: true };
  } catch (error) {
    console.error("Failed to delete account:", error);
    return { success: false, error: "account_delete_failed" };
  }
}

/**
 * Update plan itinerary and input (for plan changes/regeneration)
 */
export async function updatePlanItinerary(
  planId: string,
  itinerary: Itinerary,
  input?: UserInput
): Promise<{ success: boolean; itinerary?: Itinerary; error?: string }> {
  try {
    const user = await getUser();

    if (!user) {
      return { success: false, error: "authentication_required" };
    }

    // Rate Limit
    const rateLimit = await checkPlanUpdateRate(planId);
    if (!rateLimit.success) {
      return { success: false, error: rateLimit.message };
    }

    const persistedTrip = await tripService.persistTripVersion({
      itinerary,
      userId: user.id,
      createdBy: "user",
      changeType: "patch",
    });

    const result = await planService.updatePlan(planId, user.id, {
      itinerary: persistedTrip.itinerary,
      ...(input && { input }),
    });

    if (!result.success) {
      return { success: false, error: result.error };
    }

    return { success: true, itinerary: persistedTrip.itinerary };
  } catch (error) {
    console.error("Failed to update plan itinerary:", error);
    return { success: false, error: "plan_update_failed" };
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
      return { success: false, error: "authentication_required" };
    }

    const result = await planService.getPlanById(planId, user.id);

    if (!result.success || !result.plan) {
      return { success: false, error: result.error || "plan_not_found" };
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
    return { success: false, error: "plan_fetch_failed" };
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
      return { success: false, error: "authentication_required" };
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
      return { success: false, error: "plan_not_found_or_access_denied" };
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
        return { success: false, error: "chat_history_save_failed" };
      }
    }

    return { success: true };
  } catch (error) {
    console.error("Failed to save chat messages:", error);
    return { success: false, error: "chat_history_save_failed" };
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
      return { success: false, error: "authentication_required" };
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
      return { success: false, error: "plan_not_found_or_access_denied" };
    }

    // Get chat messages
    const { data: messages, error: messagesError } = await supabase
      .from('plan_chat_messages')
      .select('role, content')
      .eq('plan_id', planId)
      .order('sequence_number', { ascending: true });

    if (messagesError) {
      console.error("Failed to load chat messages:", messagesError);
      return { success: false, error: "chat_history_load_failed" };
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
    return { success: false, error: "chat_history_load_failed" };
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
): Promise<{ success: boolean; error?: string }> {
  return {
    success: false,
    error: "admin_managed_by_env",
  };
}

/**
 * Set initial admin user.
 * Admin management is now via ADMIN_EMAILS env var — this is a no-op placeholder.
 */
export async function setInitialAdmin(
): Promise<{ success: boolean; error?: string }> {
  return {
    success: false,
    error: "admin_managed_by_env",
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
      return { success: false, error: "authentication_required" };
    }

    const { favoritesService } = await import("@/lib/favorites/service");
    return await favoritesService.addFavorite(user.id, planId);
  } catch (error) {
    console.error("Failed to add plan to flags:", error);
    return { success: false, error: "flag_add_failed" };
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
      return { success: false, error: "authentication_required" };
    }

    const { favoritesService } = await import("@/lib/favorites/service");
    return await favoritesService.removeFavorite(user.id, planId);
  } catch (error) {
    console.error("Failed to remove plan from flags:", error);
    return { success: false, error: "flag_remove_failed" };
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
      return { success: false, isFlagged: false, error: "authentication_required" };
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
    return { success: false, isFlagged: false, error: "flag_status_check_failed" };
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
      return { success: false, planIds: [], error: "authentication_required" };
    }

    const { favoritesService } = await import("@/lib/favorites/service");
    return await favoritesService.getFavoritePlanIds(user.id);
  } catch (error) {
    console.error("Failed to get flagged plan IDs:", error);
    return { success: false, planIds: [], error: "flag_plan_ids_fetch_failed" };
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
      return { success: false, error: "authentication_required" };
    }

    const { favoritesService } = await import("@/lib/favorites/service");
    return await favoritesService.getFavoritePlans(user.id, options);
  } catch (error) {
    console.error("Failed to get flagged plans:", error);
    return { success: false, error: "flagged_plans_fetch_failed" };
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
