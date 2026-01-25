'use client';

import Link from 'next/link';
import { FaMapMarkerAlt, FaArrowRight, FaSuitcase } from 'react-icons/fa';

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
      className={`relative bg-[#fcfbf9] rounded-2xl p-6 border-2 border-dashed border-[#e67e22]/30 ${className}`}
    >
      {/* Corner tape decorations */}
      <div className="absolute -top-1.5 -left-1.5 w-6 h-6 bg-[#e67e22]/20 rotate-45 rounded-sm" />
      <div className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-[#27ae60]/20 -rotate-45 rounded-sm" />

      <div className="flex items-start gap-4">
        <div className="p-3 bg-[#e67e22]/10 rounded-full">
          <FaSuitcase className="text-[#e67e22] text-lg" />
        </div>
        <div className="flex-1">
          <h3 className="font-serif font-bold text-stone-800 text-lg mb-1">
            プランを保存しませんか？
          </h3>
          <p className="text-sm text-stone-600 mb-4">
            ログインすると、プランを保存していつでも見返すことができます。
            {showLocalPlansCount && localPlans.length > 0 && (
              <span className="block mt-2 text-[#e67e22] font-medium bg-[#e67e22]/5 px-3 py-1.5 rounded-lg inline-flex items-center gap-2">
                <FaMapMarkerAlt className="text-xs" />
                現在 {localPlans.length} 件のプランがローカルに保存されています
              </span>
            )}
          </p>

          <Link
            href="/auth/login"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#e67e22] text-white rounded-full text-sm font-bold hover:bg-[#d35400] transition-all transform hover:-translate-y-0.5 shadow-md hover:shadow-lg"
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
      className={`flex items-center justify-between gap-4 bg-[#fcfbf9] border border-dashed border-[#e67e22]/30 rounded-xl px-4 py-3 ${className}`}
    >
      <p className="text-sm text-stone-600 flex items-center gap-2">
        <FaSuitcase className="text-[#e67e22]/60" />
        ログインしてプランを保存
      </p>
      <Link
        href="/auth/login"
        className="text-sm font-bold text-[#e67e22] hover:text-[#d35400] transition-colors flex items-center gap-1"
      >
        ログイン
        <FaArrowRight className="text-xs" />
      </Link>
    </div>
  );
}
