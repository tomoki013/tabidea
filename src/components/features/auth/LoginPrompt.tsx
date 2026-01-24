'use client';

import Link from 'next/link';
import { FaLock, FaArrowRight } from 'react-icons/fa';

import { useAuth } from '@/context/AuthContext';
import { useLocalPlans } from '@/lib/local-storage/plans';

interface LoginPromptProps {
  className?: string;
  showLocalPlansCount?: boolean;
}

export function LoginPrompt({
  className = '',
  showLocalPlansCount = true,
}: LoginPromptProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const { plans: localPlans } = useLocalPlans();

  // Don't show if loading or already authenticated
  if (isLoading || isAuthenticated) {
    return null;
  }

  return (
    <div
      className={`bg-gradient-to-br from-primary/5 to-primary/10 rounded-2xl p-6 border border-primary/20 ${className}`}
    >
      <div className="flex items-start gap-4">
        <div className="p-3 bg-primary/10 rounded-full">
          <FaLock className="text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-stone-800 mb-1">
            プランを保存しませんか？
          </h3>
          <p className="text-sm text-stone-600 mb-4">
            ログインすると、プランを保存していつでも見返すことができます。
            {showLocalPlansCount && localPlans.length > 0 && (
              <span className="block mt-1 text-primary font-medium">
                現在 {localPlans.length} 件のプランがローカルに保存されています。
              </span>
            )}
          </p>

          <Link
            href="/auth/login"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-full text-sm font-bold hover:bg-primary/90 transition-colors"
          >
            ログインする
            <FaArrowRight className="text-xs" />
          </Link>
        </div>
      </div>
    </div>
  );
}

interface CompactLoginPromptProps {
  className?: string;
}

export function CompactLoginPrompt({ className = '' }: CompactLoginPromptProps) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading || isAuthenticated) {
    return null;
  }

  return (
    <div
      className={`flex items-center justify-between gap-4 bg-stone-50 rounded-lg px-4 py-3 ${className}`}
    >
      <p className="text-sm text-stone-600">
        <FaLock className="inline mr-2 text-stone-400" />
        ログインしてプランを保存
      </p>
      <Link
        href="/auth/login"
        className="text-sm font-medium text-primary hover:underline"
      >
        ログイン
      </Link>
    </div>
  );
}
