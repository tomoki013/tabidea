'use client';

interface StorageLimitWarningProps {
  currentCount: number;
  limit: number;
}

/**
 * Warning banner shown when plan storage limit is reached
 */
export function StorageLimitWarning({
  currentCount,
  limit,
}: StorageLimitWarningProps) {
  if (currentCount < limit) return null;

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
      <div className="flex items-start gap-3">
        <svg
          className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
        <div className="flex-1">
          <h3 className="font-bold text-amber-900 mb-1">
            保存上限に達しています
          </h3>
          <p className="text-sm text-amber-800">
            現在{' '}
            <strong className="font-bold">
              {currentCount}/{limit}個
            </strong>{' '}
            のプランが保存されています。新しいプランを保存するには、不要なプランを削除してください。
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Info banner showing remaining storage
 */
export function StorageStatusInfo({
  currentCount,
  limit,
}: {
  currentCount: number;
  limit: number;
}) {
  if (limit === -1) return null;

  const remaining = Math.max(0, limit - currentCount);
  const percentage = (currentCount / limit) * 100;
  const isNearLimit = percentage >= 80;

  return (
    <div
      className={`rounded-lg p-3 mb-4 ${
        isNearLimit ? 'bg-amber-50 border border-amber-200' : 'bg-stone-50'
      }`}
    >
      <div className="flex items-center gap-2 mb-2">
        <svg
          className={`w-4 h-4 ${
            isNearLimit ? 'text-amber-600' : 'text-stone-500'
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
          />
        </svg>
        <span
          className={`text-sm font-medium ${
            isNearLimit ? 'text-amber-900' : 'text-stone-700'
          }`}
        >
          プラン保存数
        </span>
      </div>

      <div className="flex items-center gap-3">
        {/* Progress bar */}
        <div className="flex-1 h-2 bg-stone-200 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              isNearLimit ? 'bg-amber-500' : 'bg-primary'
            }`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>

        {/* Count */}
        <span
          className={`text-sm font-bold ${
            isNearLimit ? 'text-amber-900' : 'text-stone-700'
          }`}
        >
          {currentCount} / {limit}
        </span>
      </div>

      {isNearLimit && remaining > 0 && (
        <p className="text-xs text-amber-700 mt-2">
          残り{remaining}個で上限です
        </p>
      )}
    </div>
  );
}
