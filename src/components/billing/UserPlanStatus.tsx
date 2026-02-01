'use client';

import Link from 'next/link';
import { PRO_PLAN_NAME } from '@/lib/billing/constants';

import type { UserBillingStatus } from '@/types/billing';

interface UserPlanStatusProps {
  billingStatus: UserBillingStatus | null;
  variant?: 'default' | 'compact';
}

export function UserPlanStatus({ billingStatus, variant = 'default' }: UserPlanStatusProps) {
  if (!billingStatus) {
    return null;
  }

  const isPro = billingStatus.planType === 'pro_monthly';

  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-2 text-sm">
        <span
          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
            isPro ? 'bg-primary/10 text-primary' : 'bg-stone-100 text-stone-600'
          }`}
        >
          {isPro ? PRO_PLAN_NAME : 'Free'}
        </span>
        {billingStatus.ticketCount > 0 && (
          <span className="text-stone-500">
            回数券: {billingStatus.ticketCount}回
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="p-4 bg-white rounded-xl border border-stone-200 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="text-xs text-stone-500 mb-0.5">現在のプラン</p>
          <p className="text-lg font-bold text-stone-800 flex items-center gap-2">
            {isPro ? (
              <>
                {PRO_PLAN_NAME}
                <span className="px-1.5 py-0.5 bg-primary/10 text-primary text-xs rounded-full">
                  アクティブ
                </span>
              </>
            ) : (
              'Free'
            )}
          </p>
        </div>
        {!isPro && (
          <Link
            href="/pricing"
            className="px-3 py-1.5 bg-primary text-white text-sm font-bold rounded-lg hover:bg-primary/90 transition-colors"
          >
            アップグレード
          </Link>
        )}
        {isPro && (
          <Link
            href="/pricing"
            className="px-3 py-1.5 border border-stone-200 text-stone-600 text-sm font-medium rounded-lg hover:bg-stone-50 transition-colors"
          >
            プラン管理
          </Link>
        )}
      </div>

      {isPro && billingStatus.subscriptionEndsAt && (
        <p className="text-xs text-stone-500">
          次回更新日: {new Date(billingStatus.subscriptionEndsAt).toLocaleDateString('ja-JP')}
        </p>
      )}

      {billingStatus.ticketCount > 0 && (
        <div className="mt-3 pt-3 border-t border-stone-100">
          <div className="flex items-center justify-between">
            <span className="text-sm text-stone-600">回数券残数</span>
            <span className="text-sm font-bold text-primary">
              {billingStatus.ticketCount}回
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
