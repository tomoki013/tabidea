'use client';

interface LimitExceededModalProps {
  isOpen: boolean;
  onClose: () => void;
  resetAt: Date | null;
  actionType: 'plan_generation' | 'travel_info';
}

export function LimitExceededModal({
  isOpen,
  onClose,
  resetAt,
  actionType,
}: LimitExceededModalProps) {
  const actionLabel =
    actionType === 'plan_generation' ? 'プラン生成' : '渡航情報取得';

  const formatResetDate = (date: Date) => {
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
    const weekday = weekdays[date.getDay()];
    return `${month}月${day}日 (${weekday})`;
  };

  const getTimeUntilReset = (date: Date) => {
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) {
      return `あと${days}日`;
    } else if (hours > 0) {
      return `あと${hours}時間`;
    } else {
      return 'もうすぐ';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md mx-4 bg-white rounded-2xl shadow-2xl p-6 sm:p-8">
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <svg
              className="w-5 h-5 text-amber-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h2 className="text-xl font-bold text-stone-800">
              {actionLabel}の利用制限に達しました
            </h2>
          </div>
          <p className="text-stone-600 mb-4">
            今月の無料枠を使い切りました。
          </p>

          {resetAt && (
            <div className="bg-stone-50 p-4 rounded-lg mb-6">
              <div className="flex items-center gap-2 text-stone-700 mb-1">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <span className="font-medium">次回リセット</span>
              </div>
              <p className="text-lg font-bold text-primary">
                {formatResetDate(resetAt)}
              </p>
              <p className="text-sm text-stone-500">
                {getTimeUntilReset(resetAt)}
              </p>
            </div>
          )}

          {/* 課金実装後に追加 */}
          {/* <div className="bg-primary/5 p-4 rounded-lg mb-4">
            <p className="text-sm text-stone-600 mb-3">
              プレミアムプランなら<strong>無制限</strong>で利用できます
            </p>
            <button className="w-full px-4 py-2.5 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-colors">
              プランを見る
            </button>
          </div> */}

          <button
            type="button"
            onClick={onClose}
            className="w-full px-4 py-2.5 border border-stone-300 text-stone-700 font-medium rounded-xl hover:bg-stone-50 transition-colors"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}
