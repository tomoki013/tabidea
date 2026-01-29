'use client';

interface LockedCategorySectionProps {
  category: string;
  categoryLabel: string;
}

export function LockedCategorySection({
  category,
  categoryLabel,
}: LockedCategorySectionProps) {
  return (
    <div className="relative p-6 rounded-xl border border-stone-200 bg-stone-50">
      {/* ブラー効果 */}
      <div className="absolute inset-0 backdrop-blur-sm bg-white/60 rounded-xl flex items-center justify-center">
        <div className="text-center p-4">
          <svg
            className="w-8 h-8 text-stone-400 mx-auto mb-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
          <p className="text-stone-600 font-medium">{categoryLabel}</p>
          <p className="text-sm text-stone-500 mt-1">
            プレミアムプランで閲覧可能
          </p>
          {/* 課金実装後にアップグレードボタンを追加 */}
          {/* <button className="mt-3 px-4 py-2 bg-primary text-white text-sm font-bold rounded-lg hover:bg-primary/90 transition-colors">
            プランを見る
          </button> */}
        </div>
      </div>

      {/* プレースホルダーコンテンツ */}
      <div className="opacity-20 pointer-events-none">
        <div className="h-4 bg-stone-300 rounded w-3/4 mb-2" />
        <div className="h-4 bg-stone-300 rounded w-1/2 mb-2" />
        <div className="h-4 bg-stone-300 rounded w-2/3" />
      </div>
    </div>
  );
}
