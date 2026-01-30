/**
 * Favorites service for managing user saved plans
 */

import { createClient } from '@/lib/supabase/server';
import type { PlanListItem } from '@/types';
import { decryptPlan } from '@/lib/encryption';

// ============================================
// Types
// ============================================

export interface FavoriteRecord {
  id: string;
  userId: string;
  planId: string;
  savedAt: Date;
}

// ============================================
// Favorites Service
// ============================================

export class FavoritesService {
  /**
   * Add a plan to user's favorites
   */
  async addFavorite(
    userId: string,
    planId: string
  ): Promise<{
    success: boolean;
    error?: string;
  }> {
    const supabase = await createClient();

    // Check if the plan exists
    const { data: plan, error: planError } = await supabase
      .from('plans')
      .select('id')
      .eq('id', planId)
      .single();

    if (planError || !plan) {
      return { success: false, error: 'Plan not found' };
    }

    // Insert into user_saved_plans (UNIQUE constraint prevents duplicates)
    const { error: insertError } = await supabase
      .from('user_saved_plans')
      .insert({
        user_id: userId,
        plan_id: planId,
      });

    if (insertError) {
      // Check if it's a duplicate error
      if (insertError.code === '23505') {
        // Already favorited, not an error
        return { success: true };
      }
      console.error('Failed to add favorite:', insertError);
      return { success: false, error: insertError.message };
    }

    // Increment save_count on the plan
    const { error: updateError } = await supabase
      .from('plans')
      .update({ save_count: supabase.raw('save_count + 1') })
      .eq('id', planId);

    if (updateError) {
      console.error('Failed to increment save_count:', updateError);
      // Don't fail the operation if count update fails
    }

    return { success: true };
  }

  /**
   * Remove a plan from user's favorites
   */
  async removeFavorite(
    userId: string,
    planId: string
  ): Promise<{
    success: boolean;
    error?: string;
  }> {
    const supabase = await createClient();

    const { error: deleteError } = await supabase
      .from('user_saved_plans')
      .delete()
      .eq('user_id', userId)
      .eq('plan_id', planId);

    if (deleteError) {
      console.error('Failed to remove favorite:', deleteError);
      return { success: false, error: deleteError.message };
    }

    // Decrement save_count on the plan (but don't go below 0)
    const { error: updateError } = await supabase
      .from('plans')
      .update({
        save_count: supabase.raw('GREATEST(save_count - 1, 0)'),
      })
      .eq('id', planId);

    if (updateError) {
      console.error('Failed to decrement save_count:', updateError);
      // Don't fail the operation if count update fails
    }

    return { success: true };
  }

  /**
   * Check if a plan is favorited by the user
   */
  async isFavorited(
    userId: string,
    planId: string
  ): Promise<{
    success: boolean;
    isFavorited: boolean;
    error?: string;
  }> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('user_saved_plans')
      .select('id')
      .eq('user_id', userId)
      .eq('plan_id', planId)
      .single();

    if (error) {
      // PGRST116 means "not found", which is expected
      if (error.code === 'PGRST116') {
        return { success: true, isFavorited: false };
      }
      console.error('Failed to check favorite status:', error);
      return { success: false, isFavorited: false, error: error.message };
    }

    return { success: true, isFavorited: !!data };
  }

  /**
   * Get all favorited plan IDs for a user
   */
  async getFavoritePlanIds(userId: string): Promise<{
    success: boolean;
    planIds: string[];
    error?: string;
  }> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('user_saved_plans')
      .select('plan_id')
      .eq('user_id', userId)
      .order('saved_at', { ascending: false });

    if (error) {
      console.error('Failed to get favorite plan IDs:', error);
      return { success: false, planIds: [], error: error.message };
    }

    return {
      success: true,
      planIds: (data || []).map((record) => record.plan_id),
    };
  }

  /**
   * Get user's favorite plans with full details
   */
  async getFavoritePlans(
    userId: string,
    options?: {
      limit?: number;
      offset?: number;
    }
  ): Promise<{
    success: boolean;
    plans?: PlanListItem[];
    total?: number;
    error?: string;
  }> {
    const supabase = await createClient();
    const limit = options?.limit || 20;
    const offset = options?.offset || 0;

    // Get user's encryption salt for decrypting private plan metadata
    const { data: user } = await supabase
      .from('users')
      .select('encryption_salt')
      .eq('id', userId)
      .single();

    // Get total count of favorites
    const { count } = await supabase
      .from('user_saved_plans')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    // Get favorite plan IDs with pagination
    const { data: savedPlans, error: savedError } = await supabase
      .from('user_saved_plans')
      .select('plan_id')
      .eq('user_id', userId)
      .order('saved_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (savedError) {
      return { success: false, error: savedError.message };
    }

    if (!savedPlans || savedPlans.length === 0) {
      return { success: true, plans: [], total: 0 };
    }

    const planIds = savedPlans.map((sp) => sp.plan_id);

    // Fetch plan details
    const { data: plans, error: plansError } = await supabase
      .from('plans')
      .select('*')
      .in('id', planIds);

    if (plansError) {
      return { success: false, error: plansError.message };
    }

    // Map and sort to maintain saved_at order
    const planMap = new Map(plans?.map((p) => [p.id, p]) || []);
    const orderedPlans = planIds
      .map((id) => planMap.get(id))
      .filter((p): p is NonNullable<typeof p> => !!p);

    const mappedPlans: PlanListItem[] = orderedPlans.map((plan) => {
      let destination = plan.destination;
      let durationDays = plan.duration_days;
      let thumbnailUrl = plan.thumbnail_url;

      // For private plans owned by the user, decrypt to get metadata
      if (!plan.is_public && plan.user_id === userId && user?.encryption_salt) {
        try {
          const decrypted = decryptPlan(
            plan.encrypted_data,
            plan.encryption_iv,
            plan.user_id,
            user.encryption_salt,
            plan.key_version
          );
          if (decrypted.metadata) {
            destination = decrypted.metadata.destination;
            durationDays = decrypted.metadata.durationDays;
            thumbnailUrl = decrypted.metadata.thumbnailUrl || null;
          } else if (decrypted.itinerary) {
            destination = decrypted.itinerary.destination;
            durationDays = decrypted.itinerary.days?.length || null;
            thumbnailUrl = decrypted.itinerary.heroImage || null;
          }
        } catch (error) {
          console.error(`Failed to decrypt plan ${plan.id}:`, error);
        }
      }

      return {
        id: plan.id,
        shareCode: plan.share_code,
        destination,
        durationDays,
        thumbnailUrl,
        isPublic: plan.is_public,
        createdAt: new Date(plan.created_at),
        updatedAt: new Date(plan.updated_at),
      };
    });

    return {
      success: true,
      plans: mappedPlans,
      total: count || 0,
    };
  }
}

// Singleton instance
export const favoritesService = new FavoritesService();
