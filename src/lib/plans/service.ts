/**
 * Plan CRUD service with encryption
 */

import { createClient } from '@/lib/supabase/server';
import {
  encryptPlan,
  decryptPlan,
  type EncryptedPlanData,
} from '@/lib/encryption';
import { nanoid } from 'nanoid';
import type { UserInput, Itinerary, Plan, PlanListItem } from '@/types';

// ============================================
// Types
// ============================================

export interface CreatePlanParams {
  userId: string;
  input: UserInput;
  itinerary: Itinerary;
  isPublic?: boolean;
}

export interface UpdatePlanParams {
  input?: UserInput;
  itinerary?: Itinerary;
  isPublic?: boolean;
}

// ============================================
// Plan Service
// ============================================

export class PlanService {
  async createPlan(params: CreatePlanParams): Promise<{
    success: boolean;
    plan?: Plan;
    shareCode?: string;
    error?: string;
  }> {
    const supabase = await createClient();

    // Get user's encryption salt
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('encryption_salt')
      .eq('id', params.userId)
      .single();

    if (userError || !user) {
      return { success: false, error: 'User not found' };
    }

    // Generate unique share_code
    let shareCode: string;
    let attempts = 0;
    do {
      shareCode = nanoid(10);
      const { data: existing } = await supabase
        .from('plans')
        .select('id')
        .eq('share_code', shareCode)
        .single();
      if (!existing) break;
      attempts++;
    } while (attempts < 5);

    if (attempts >= 5) {
      return { success: false, error: 'Failed to generate unique share code' };
    }

    // Prepare encrypted data
    const encryptedData: EncryptedPlanData = {
      input: params.input,
      itinerary: params.itinerary,
    };

    const encrypted = encryptPlan(
      encryptedData,
      params.userId,
      user.encryption_salt,
      params.isPublic ?? false
    );

    // Insert plan
    const { data: plan, error: insertError } = await supabase
      .from('plans')
      .insert({
        user_id: params.userId,
        share_code: shareCode,
        destination: encrypted.destination || null,
        duration_days: encrypted.durationDays || null,
        thumbnail_url: encrypted.thumbnailUrl || null,
        encrypted_data: encrypted.encryptedData,
        encryption_iv: encrypted.encryptionIv,
        key_version: encrypted.keyVersion,
        is_public: params.isPublic ?? false,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Failed to create plan:', insertError);
      return { success: false, error: insertError.message };
    }

    return {
      success: true,
      shareCode,
      plan: {
        id: plan.id,
        shareCode: plan.share_code,
        userId: plan.user_id,
        destination: plan.destination,
        durationDays: plan.duration_days,
        thumbnailUrl: plan.thumbnail_url,
        isPublic: plan.is_public,
        viewCount: plan.view_count,
        createdAt: new Date(plan.created_at),
        updatedAt: new Date(plan.updated_at),
      },
    };
  }

  async getPlanByShareCode(
    shareCode: string,
    requestingUserId?: string
  ): Promise<{
    success: boolean;
    plan?: Plan;
    error?: string;
  }> {
    const supabase = await createClient();

    // Use RPC function to get plan with encryption salt
    const { data: plans, error: planError } = await supabase.rpc(
      'get_plan_by_share_code',
      { p_share_code: shareCode }
    );

    if (planError || !plans || plans.length === 0) {
      return { success: false, error: 'Plan not found' };
    }

    const plan = plans[0];

    // Access check
    const isOwner = requestingUserId && plan.user_id === requestingUserId;
    if (!plan.is_public && !isOwner) {
      // For share_code access, we allow viewing even if not owner
      // The RPC function already handles this
    }

    // Decrypt plan data
    let input: UserInput | undefined;
    let itinerary: Itinerary | undefined;

    if (plan.user_id && plan.owner_encryption_salt) {
      try {
        const decrypted = decryptPlan(
          plan.encrypted_data,
          plan.encryption_iv,
          plan.user_id,
          plan.owner_encryption_salt,
          plan.key_version
        );
        input = decrypted.input;
        itinerary = decrypted.itinerary;
      } catch (error) {
        console.error('Failed to decrypt plan:', error);
        return { success: false, error: 'Decryption failed' };
      }
    }

    return {
      success: true,
      plan: {
        id: plan.id,
        shareCode: plan.share_code,
        userId: plan.user_id,
        destination: plan.destination || itinerary?.destination || null,
        durationDays: plan.duration_days || itinerary?.days?.length || null,
        thumbnailUrl: plan.thumbnail_url || itinerary?.heroImage || null,
        isPublic: plan.is_public,
        viewCount: plan.view_count,
        createdAt: new Date(plan.created_at),
        updatedAt: new Date(plan.updated_at),
        input,
        itinerary,
      },
    };
  }

  async getUserPlans(
    userId: string,
    options?: {
      limit?: number;
      offset?: number;
      includeDecrypted?: boolean;
    }
  ): Promise<{
    success: boolean;
    plans?: Plan[];
    total?: number;
    error?: string;
  }> {
    const supabase = await createClient();
    const limit = options?.limit || 20;
    const offset = options?.offset || 0;

    // Get total count
    const { count } = await supabase
      .from('plans')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    // Get user's encryption salt if decryption is needed
    let encryptionSalt: string | null = null;
    if (options?.includeDecrypted) {
      const { data: user } = await supabase
        .from('users')
        .select('encryption_salt')
        .eq('id', userId)
        .single();
      encryptionSalt = user?.encryption_salt || null;
    }

    // Get plans
    const { data: plans, error } = await supabase
      .from('plans')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return { success: false, error: error.message };
    }

    const mappedPlans: Plan[] = (plans || []).map((plan) => {
      const result: Plan = {
        id: plan.id,
        shareCode: plan.share_code,
        userId: plan.user_id,
        destination: plan.destination,
        durationDays: plan.duration_days,
        thumbnailUrl: plan.thumbnail_url,
        isPublic: plan.is_public,
        viewCount: plan.view_count,
        createdAt: new Date(plan.created_at),
        updatedAt: new Date(plan.updated_at),
      };

      // Decrypt if requested
      if (options?.includeDecrypted && encryptionSalt && plan.user_id) {
        try {
          const decrypted = decryptPlan(
            plan.encrypted_data,
            plan.encryption_iv,
            plan.user_id,
            encryptionSalt,
            plan.key_version
          );
          result.input = decrypted.input;
          result.itinerary = decrypted.itinerary;

          // Use decrypted metadata for private plans
          if (!plan.is_public && decrypted.metadata) {
            result.destination = decrypted.metadata.destination;
            result.durationDays = decrypted.metadata.durationDays;
            result.thumbnailUrl = decrypted.metadata.thumbnailUrl || null;
          }
        } catch (error) {
          console.error(`Failed to decrypt plan ${plan.id}:`, error);
        }
      }

      return result;
    });

    return {
      success: true,
      plans: mappedPlans,
      total: count || 0,
    };
  }

  async getUserPlansList(
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

    // Get total count
    const { count } = await supabase
      .from('plans')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    // Get plans
    const { data: plans, error } = await supabase
      .from('plans')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return { success: false, error: error.message };
    }

    const mappedPlans: PlanListItem[] = (plans || []).map((plan) => {
      let destination = plan.destination;
      let durationDays = plan.duration_days;
      let thumbnailUrl = plan.thumbnail_url;

      // For private plans, decrypt to get metadata
      if (!plan.is_public && user?.encryption_salt) {
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

  async updatePlan(
    planId: string,
    userId: string,
    params: UpdatePlanParams
  ): Promise<{
    success: boolean;
    plan?: Plan;
    error?: string;
  }> {
    const supabase = await createClient();

    // Get existing plan and user's encryption salt
    const { data: existingPlan, error: fetchError } = await supabase
      .from('plans')
      .select('*')
      .eq('id', planId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !existingPlan) {
      return { success: false, error: 'Plan not found or access denied' };
    }

    const { data: user } = await supabase
      .from('users')
      .select('encryption_salt')
      .eq('id', userId)
      .single();

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    // Decrypt existing data
    const decrypted = decryptPlan(
      existingPlan.encrypted_data,
      existingPlan.encryption_iv,
      userId,
      user.encryption_salt,
      existingPlan.key_version
    );

    // Merge updates
    const newInput = params.input || decrypted.input;
    const newItinerary = params.itinerary || decrypted.itinerary;
    const newIsPublic = params.isPublic ?? existingPlan.is_public;

    // Re-encrypt
    const encryptedData: EncryptedPlanData = {
      input: newInput,
      itinerary: newItinerary,
    };

    const encrypted = encryptPlan(
      encryptedData,
      userId,
      user.encryption_salt,
      newIsPublic
    );

    // Update in DB
    const { data: updatedPlan, error: updateError } = await supabase
      .from('plans')
      .update({
        destination: encrypted.destination || null,
        duration_days: encrypted.durationDays || null,
        thumbnail_url: encrypted.thumbnailUrl || null,
        encrypted_data: encrypted.encryptedData,
        encryption_iv: encrypted.encryptionIv,
        key_version: encrypted.keyVersion,
        is_public: newIsPublic,
        updated_at: new Date().toISOString(),
      })
      .eq('id', planId)
      .select()
      .single();

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    return {
      success: true,
      plan: {
        id: updatedPlan.id,
        shareCode: updatedPlan.share_code,
        userId: updatedPlan.user_id,
        destination: updatedPlan.destination,
        durationDays: updatedPlan.duration_days,
        thumbnailUrl: updatedPlan.thumbnail_url,
        isPublic: updatedPlan.is_public,
        viewCount: updatedPlan.view_count,
        createdAt: new Date(updatedPlan.created_at),
        updatedAt: new Date(updatedPlan.updated_at),
        input: newInput,
        itinerary: newItinerary,
      },
    };
  }

  async deletePlan(
    planId: string,
    userId: string
  ): Promise<{
    success: boolean;
    error?: string;
  }> {
    const supabase = await createClient();

    const { error } = await supabase
      .from('plans')
      .delete()
      .eq('id', planId)
      .eq('user_id', userId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  }

  async getPublicPlans(options?: {
    limit?: number;
    offset?: number;
    destination?: string;
  }): Promise<{
    success: boolean;
    plans?: PlanListItem[];
    total?: number;
    error?: string;
  }> {
    const supabase = await createClient();
    const limit = options?.limit || 20;
    const offset = options?.offset || 0;

    let query = supabase
      .from('plans')
      .select('*', { count: 'exact' })
      .eq('is_public', true)
      .order('created_at', { ascending: false });

    if (options?.destination) {
      query = query.ilike('destination', `%${options.destination}%`);
    }

    const { data: plans, count, error } = await query.range(
      offset,
      offset + limit - 1
    );

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      plans: (plans || []).map((plan) => ({
        id: plan.id,
        shareCode: plan.share_code,
        destination: plan.destination,
        durationDays: plan.duration_days,
        thumbnailUrl: plan.thumbnail_url,
        isPublic: plan.is_public,
        createdAt: new Date(plan.created_at),
        updatedAt: new Date(plan.updated_at),
      })),
      total: count || 0,
    };
  }
}

// Singleton instance
export const planService = new PlanService();
