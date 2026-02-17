/**
 * Plan storage and entitlement types
 */

import type { UserInput } from './user-input';
import type { Itinerary } from './itinerary';

// ============================================
// Plan Types
// ============================================

export interface Plan {
  id: string;
  shareCode: string;
  userId: string | null;
  destination: string | null;
  durationDays: number | null;
  thumbnailUrl: string | null;
  isPublic: boolean;
  viewCount: number;
  createdAt: Date;
  updatedAt: Date;
  // Decrypted data (only available after decryption)
  input?: UserInput;
  itinerary?: Itinerary;
}

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

export interface PlanListItem {
  id: string;
  shareCode: string;
  destination: string | null;
  durationDays: number | null;
  thumbnailUrl: string | null;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PublicShioriListItem extends PlanListItem {
  slug: string;
  likesCount: number;
  entriesCount: number;
  publishJournal: boolean;
}

// ============================================
// Local Storage Types
// ============================================

export interface LocalPlan {
  id: string;
  input: UserInput;
  itinerary: Itinerary;
  createdAt: string;
  updatedAt: string;
}

export interface LocalPlanStorage {
  plans: LocalPlan[];
  version: number;
}

// ============================================
// Encryption Types
// ============================================

export interface EncryptedPlanData {
  input: UserInput;
  itinerary: Itinerary;
  metadata?: {
    destination: string;
    durationDays: number;
    thumbnailUrl?: string;
  };
}

export interface PlanEncryptionResult {
  encryptedData: string;
  encryptionIv: string;
  keyVersion: number;
  destination?: string;
  durationDays?: number;
  thumbnailUrl?: string;
}

// ============================================
// Entitlement Types
// ============================================

export type EntitlementType =
  | 'plan_generation'
  | 'pdf_export'
  | 'premium_ai'
  | 'unlimited_history'
  | 'priority_support';

export type GrantType =
  | 'free_tier'
  | 'subscription'
  | 'ticket_pack'
  | 'campaign'
  | 'one_time'
  | 'admin_grant'
  | 'referral'
  | 'achievement';

export interface EntitlementStatus {
  type: EntitlementType;
  hasAccess: boolean;
  isUnlimited: boolean;
  remaining: number | null;
  sources: GrantSource[];
}

export interface GrantSource {
  grantType: GrantType;
  remaining: number | null;
  validUntil: Date | null;
}

export interface ConsumeResult {
  success: boolean;
  remaining: number | null;
  error?: string;
  rateLimitInfo?: RateLimitInfo;
}

export interface UserEntitlements {
  [key: string]: EntitlementStatus;
}

// ============================================
// Rate Limit Types
// ============================================

export interface RateLimitInfo {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  error?: string;
}

export interface RateLimitConfig {
  windowSeconds: number;
  maxRequests: number;
}

// ============================================
// Sync Types
// ============================================

export interface SyncResult {
  success: boolean;
  syncedCount: number;
  failedCount: number;
  skippedCount: number;
  errors: string[];
  mergeInfo: {
    existingPlansCount: number;
    newPlansAdded: number;
  };
}

export interface SyncPreviewInfo {
  localPlansCount: number;
  localPlans: Array<{
    id: string;
    destination: string;
    createdAt: string;
  }>;
}
