/**
 * 課金関連の型定義
 */

import type { UserType } from '@/lib/limits/config';

// ============================================
// Plan Types
// ============================================

/** サブスクリプションプランの種類 */
export type PlanType = 'free' | 'pro_monthly';

/** 回数券の種類 */
export type TicketType = 'ticket_1' | 'ticket_5' | 'ticket_10';

/** 購入可能なアイテムの種類 */
export type PurchaseType = PlanType | TicketType;

// ============================================
// User Billing Status (Legacy - use BillingAccessInfo instead)
// ============================================

/**
 * ユーザーの課金状態
 * @deprecated Use BillingAccessInfo from billing-checker.ts instead
 */
export interface UserBillingStatus {
  /** 現在のプラン */
  planType: PlanType;
  /** サブスクリプション中かどうか */
  isSubscribed: boolean;
  /** サブスクリプション終了日（ISO 8601形式） */
  subscriptionEndsAt?: string;
  /** 保有回数券の数 */
  ticketCount: number;
}

// ============================================
// Billing Access Info (New unified type)
// ============================================

/**
 * 包括的な課金アクセス情報
 * 全ての課金関連チェックにこの型を使用してください
 */
export interface BillingAccessInfo {
  // ユーザー識別情報
  userId: string | null;
  email: string | null;

  // ユーザー分類
  userType: UserType;

  // サブスクリプション状態
  isSubscribed: boolean;
  planType: PlanType;
  subscriptionEndsAt: string | null;

  // 回数券情報
  ticketCount: number;

  // 便利なアクセスフラグ
  isPremium: boolean;
  isAdmin: boolean;
  isFree: boolean;
  isAnonymous: boolean;

  // サブスクリプション詳細（内部使用）
  subscriptionId?: string;
  externalSubscriptionId?: string;
  subscriptionStatus?: string;
}

// ============================================
// Pricing Plan Info
// ============================================

/** プラン情報の表示用データ */
export interface PricingPlanInfo {
  /** プランID */
  id: PurchaseType;
  /** プラン名 */
  name: string;
  /** 説明 */
  description: string;
  /** 価格（ドル） */
  price: number;
  /** 価格表示（フォーマット済み） */
  priceDisplay: string;
  /** 特徴リスト */
  features: string[];
  /** おすすめプランかどうか */
  isRecommended?: boolean;
  /** ボタンのラベル */
  buttonLabel: string;
  /** 回数券の回数（回数券の場合のみ） */
  ticketCount?: number;
}

// ============================================
// Checkout Types
// ============================================

/** チェックアウトセッション作成のレスポンス */
export interface CheckoutSessionResult {
  success: boolean;
  url?: string;
  error?: string;
}

/** ポータルセッション作成のレスポンス */
export interface PortalSessionResult {
  success: boolean;
  url?: string;
  error?: string;
}
