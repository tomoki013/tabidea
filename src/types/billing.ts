/**
 * 課金関連の型定義
 */

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
// User Billing Status
// ============================================

/** ユーザーの課金状態 */
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
