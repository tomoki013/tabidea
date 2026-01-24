/**
 * Entitlement check and consumption service
 * Supports multiple grant types and rate limiting
 */

import { createClient } from '@/lib/supabase/server';
import type {
  EntitlementType,
  GrantType,
  EntitlementStatus,
  GrantSource,
  ConsumeResult,
  UserEntitlements,
  RateLimitInfo,
  RateLimitConfig,
} from '@/types';

// ============================================
// Rate Limit Service
// ============================================

export class RateLimitService {
  private supabase: Awaited<ReturnType<typeof createClient>>;

  constructor(supabase: Awaited<ReturnType<typeof createClient>>) {
    this.supabase = supabase;
  }

  async checkAndConsume(
    userId: string,
    actionType: string,
    config?: RateLimitConfig
  ): Promise<RateLimitInfo> {
    const windowSeconds = config?.windowSeconds ?? 60;
    const maxRequests = config?.maxRequests ?? 10;

    const { data, error } = await this.supabase.rpc('check_rate_limit', {
      p_user_id: userId,
      p_action_type: actionType,
      p_window_seconds: windowSeconds,
      p_max_requests: maxRequests,
    });

    if (error) {
      console.error('Rate limit check failed:', error);
      return {
        allowed: true,
        remaining: maxRequests,
        resetAt: new Date(Date.now() + windowSeconds * 1000),
      };
    }

    return {
      allowed: data.allowed,
      remaining: data.remaining,
      resetAt: new Date(data.reset_at),
      error: data.error,
    };
  }

  async getConfig(
    actionType: string,
    userPlan?: string
  ): Promise<RateLimitConfig> {
    const { data } = await this.supabase
      .from('rate_limit_config')
      .select('*')
      .eq('action_type', actionType)
      .eq('is_active', true)
      .single();

    if (!data) {
      return { windowSeconds: 60, maxRequests: 10 };
    }

    if (userPlan && data.plan_overrides?.[userPlan]) {
      const override = data.plan_overrides[userPlan];
      return {
        windowSeconds: override.window_seconds ?? data.default_window_seconds,
        maxRequests: override.max_requests ?? data.default_max_requests,
      };
    }

    return {
      windowSeconds: data.default_window_seconds,
      maxRequests: data.default_max_requests,
    };
  }
}

// ============================================
// Entitlement Service
// ============================================

export class EntitlementService {
  private supabase: Awaited<ReturnType<typeof createClient>>;
  private rateLimitService: RateLimitService;

  constructor(supabase: Awaited<ReturnType<typeof createClient>>) {
    this.supabase = supabase;
    this.rateLimitService = new RateLimitService(supabase);
  }

  async getUserEntitlements(userId: string): Promise<UserEntitlements> {
    const { data, error } = await this.supabase
      .from('entitlement_grants')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .or('valid_until.is.null,valid_until.gt.now()')
      .or('remaining_count.is.null,remaining_count.gt.0');

    if (error) {
      console.error('Failed to fetch entitlements:', error);
      return {};
    }

    const entitlements: UserEntitlements = {};

    for (const grant of data || []) {
      const type = grant.entitlement_type as EntitlementType;

      if (!entitlements[type]) {
        entitlements[type] = {
          type,
          hasAccess: true,
          isUnlimited: false,
          remaining: 0,
          sources: [],
        };
      }

      const status = entitlements[type];

      if (grant.remaining_count === null) {
        status.isUnlimited = true;
        status.remaining = null;
      } else if (!status.isUnlimited) {
        status.remaining = (status.remaining || 0) + grant.remaining_count;
      }

      status.sources.push({
        grantType: grant.grant_type as GrantType,
        remaining: grant.remaining_count,
        validUntil: grant.valid_until ? new Date(grant.valid_until) : null,
      });
    }

    return entitlements;
  }

  async checkEntitlement(
    userId: string,
    type: EntitlementType
  ): Promise<EntitlementStatus> {
    const entitlements = await this.getUserEntitlements(userId);

    return (
      entitlements[type] || {
        type,
        hasAccess: false,
        isUnlimited: false,
        remaining: 0,
        sources: [],
      }
    );
  }

  async consumeEntitlement(
    userId: string,
    type: EntitlementType,
    count: number = 1,
    options?: {
      skipRateLimit?: boolean;
      userPlan?: string;
    }
  ): Promise<ConsumeResult> {
    // Step 1: Rate limit check
    if (!options?.skipRateLimit) {
      const rateLimitConfig = await this.rateLimitService.getConfig(
        type,
        options?.userPlan
      );
      const rateLimitResult = await this.rateLimitService.checkAndConsume(
        userId,
        type,
        rateLimitConfig
      );

      if (!rateLimitResult.allowed) {
        return {
          success: false,
          remaining: null,
          error: 'rate_limit_exceeded',
          rateLimitInfo: rateLimitResult,
        };
      }
    }

    // Step 2: Consume entitlement
    const { data, error } = await this.supabase.rpc('consume_entitlement', {
      p_user_id: userId,
      p_entitlement_type: type,
      p_count: count,
    });

    if (error) {
      console.error('Failed to consume entitlement:', error);
      return {
        success: false,
        remaining: null,
        error: error.message,
      };
    }

    return {
      success: data.success,
      remaining: data.remaining,
      error: data.error,
    };
  }

  async grantEntitlement(params: {
    userId: string;
    entitlementType: EntitlementType;
    grantType: GrantType;
    count?: number | null;
    validDays?: number;
    sourceType?: string;
    sourceId?: string;
    metadata?: Record<string, unknown>;
  }): Promise<{ success: boolean; grantId?: string; error?: string }> {
    const validUntil = params.validDays
      ? new Date(
          Date.now() + params.validDays * 24 * 60 * 60 * 1000
        ).toISOString()
      : null;

    const { data, error } = await this.supabase
      .from('entitlement_grants')
      .insert({
        user_id: params.userId,
        entitlement_type: params.entitlementType,
        grant_type: params.grantType,
        granted_count: params.count,
        remaining_count: params.count,
        valid_until: validUntil,
        source_type: params.sourceType,
        source_id: params.sourceId,
        metadata: params.metadata || {},
      })
      .select('id')
      .single();

    if (error) {
      console.error('Failed to grant entitlement:', error);
      return { success: false, error: error.message };
    }

    return { success: true, grantId: data.id };
  }

  async revokeEntitlement(
    grantId: string,
    reason?: string
  ): Promise<{ success: boolean; error?: string }> {
    const { error } = await this.supabase
      .from('entitlement_grants')
      .update({
        status: 'revoked',
        metadata: {
          revoked_reason: reason,
          revoked_at: new Date().toISOString(),
        },
      })
      .eq('id', grantId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  }
}

// ============================================
// Helper Functions
// ============================================

export async function checkUserEntitlement(
  userId: string,
  type: EntitlementType
): Promise<boolean> {
  const supabase = await createClient();
  const service = new EntitlementService(supabase);
  const status = await service.checkEntitlement(userId, type);
  return status.hasAccess;
}

export async function consumeUserEntitlement(
  userId: string,
  type: EntitlementType,
  count: number = 1
): Promise<ConsumeResult> {
  const supabase = await createClient();
  const service = new EntitlementService(supabase);
  return service.consumeEntitlement(userId, type, count);
}

// ============================================
// Grant Helpers
// ============================================

export class GrantHelpers {
  private service: EntitlementService;

  constructor(service: EntitlementService) {
    this.service = service;
  }

  async grantSubscriptionEntitlements(
    userId: string,
    subscriptionId: string,
    planConfig: Record<string, number | boolean>
  ): Promise<void> {
    for (const [entitlementType, value] of Object.entries(planConfig)) {
      if (typeof value === 'boolean') {
        if (value) {
          await this.service.grantEntitlement({
            userId,
            entitlementType: entitlementType as EntitlementType,
            grantType: 'subscription',
            count: null,
            sourceType: 'subscription',
            sourceId: subscriptionId,
          });
        }
      } else if (typeof value === 'number') {
        await this.service.grantEntitlement({
          userId,
          entitlementType: entitlementType as EntitlementType,
          grantType: 'subscription',
          count: value === -1 ? null : value,
          sourceType: 'subscription',
          sourceId: subscriptionId,
        });
      }
    }
  }

  async grantTicketPackEntitlements(
    userId: string,
    ticketPackId: string,
    entitlementType: EntitlementType,
    count: number,
    expiresDays?: number
  ): Promise<void> {
    await this.service.grantEntitlement({
      userId,
      entitlementType,
      grantType: 'ticket_pack',
      count,
      validDays: expiresDays,
      sourceType: 'ticket_pack',
      sourceId: ticketPackId,
    });
  }

  async grantCampaignEntitlements(
    userId: string,
    campaignId: string,
    entitlementType: EntitlementType,
    count: number | null,
    durationDays?: number
  ): Promise<void> {
    await this.service.grantEntitlement({
      userId,
      entitlementType,
      grantType: 'campaign',
      count,
      validDays: durationDays,
      sourceType: 'campaign',
      sourceId: campaignId,
    });
  }
}
