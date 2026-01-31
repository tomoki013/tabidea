'use client';

import Link from 'next/link';

interface UpgradePromptBannerProps {
  message: string;
  ctaText: string;
  ctaHref: string;
  variant?: 'default' | 'compact';
}

export function UpgradePromptBanner({
  message,
  ctaText,
  ctaHref,
  variant = 'default',
}: UpgradePromptBannerProps) {
  if (variant === 'compact') {
    return (
      <div className="flex items-center justify-between gap-4 px-4 py-3 bg-gradient-to-r from-primary/10 to-amber-100/50 rounded-xl border border-primary/20">
        <div className="flex items-center gap-2">
          <svg
            className="w-5 h-5 text-primary flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
          <span className="text-sm text-stone-700">{message}</span>
        </div>
        <Link
          href={ctaHref}
          className="px-3 py-1.5 bg-primary text-white text-sm font-bold rounded-lg hover:bg-primary/90 transition-colors flex-shrink-0"
        >
          {ctaText}
        </Link>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary/10 via-amber-100/50 to-orange-100/50 p-6 border border-primary/20">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-amber-200/30 rounded-full translate-y-1/2 -translate-x-1/2" />

      <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
            <svg
              className="w-5 h-5 text-primary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
              />
            </svg>
          </div>
          <div>
            <p className="text-stone-800 font-medium">{message}</p>
            <p className="text-sm text-stone-600 mt-1">
              回数券も購入可能です
            </p>
          </div>
        </div>

        <Link
          href={ctaHref}
          className="px-5 py-2.5 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-colors shadow-sm hover:shadow-md"
        >
          {ctaText}
        </Link>
      </div>
    </div>
  );
}
