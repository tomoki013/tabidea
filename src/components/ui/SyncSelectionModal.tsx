'use client';

import { useState } from 'react';

interface LocalPlanPreview {
  id: string;
  destination: string;
  createdAt: string;
}

interface SyncSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  localPlans: LocalPlanPreview[];
  availableSlots: number;
  onConfirm: (selectedIds: string[], deleteUnselected: boolean) => void;
}

export function SyncSelectionModal({
  isOpen,
  onClose,
  localPlans,
  availableSlots,
  onConfirm,
}: SyncSelectionModalProps) {
  // Default: select oldest plans up to limit
  const [selectedIds, setSelectedIds] = useState<string[]>(() => {
    const sorted = [...localPlans].sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    return sorted.slice(0, availableSlots).map((p) => p.id);
  });

  const [deleteUnselected, setDeleteUnselected] = useState(false);

  const togglePlan = (id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((i) => i !== id);
      }
      if (prev.length >= availableSlots) {
        // At limit, cannot add more
        return prev;
      }
      return [...prev, id];
    });
  };

  const handleConfirm = () => {
    onConfirm(selectedIds, deleteUnselected);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}月${day}日`;
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
      <div className="relative w-full max-w-lg mx-4 bg-white rounded-2xl shadow-2xl p-6 sm:p-8">
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
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <h2 className="text-xl font-bold text-stone-800">
              同期するプランを選択
            </h2>
          </div>

          <p className="text-stone-600 mb-4">
            このデバイスに{' '}
            <strong className="text-primary">{localPlans.length}個</strong>{' '}
            のプランがありますが、保存できるのは{' '}
            <strong className="text-primary">あと{availableSlots}個</strong>{' '}
            です。
            <br />
            同期するプランを選択してください。
          </p>

          {/* Plan list */}
          <div className="space-y-2 max-h-60 overflow-y-auto mb-4">
            {localPlans.map((plan) => {
              const isSelected = selectedIds.includes(plan.id);
              const isDisabled = !isSelected && selectedIds.length >= availableSlots;

              return (
                <label
                  key={plan.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    isSelected
                      ? 'border-primary bg-primary/5'
                      : 'border-stone-200 hover:border-stone-300'
                  } ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {/* Custom checkbox */}
                  <div className="relative flex items-center">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => togglePlan(plan.id)}
                      disabled={isDisabled}
                      className="w-5 h-5 rounded border-stone-300 text-primary focus:ring-primary focus:ring-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-stone-800 truncate">
                      {plan.destination || '目的地未設定'}
                    </p>
                    <p className="text-sm text-stone-500">
                      {formatDate(plan.createdAt)}
                    </p>
                  </div>

                  <svg
                    className="w-4 h-4 text-stone-400 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
                    />
                  </svg>
                </label>
              );
            })}
          </div>

          {/* Delete option */}
          <div className="p-3 bg-stone-50 rounded-lg mb-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={deleteUnselected}
                onChange={(e) => setDeleteUnselected(e.target.checked)}
                className="w-4 h-4 rounded border-stone-300 text-primary focus:ring-primary focus:ring-offset-0"
              />
              <span className="text-sm text-stone-700">
                選択しなかったプランをこのデバイスから削除する
              </span>
            </label>
          </div>

          <p className="text-xs text-stone-500 mb-6">
            選択: {selectedIds.length} / {availableSlots}
          </p>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-stone-300 text-stone-700 font-medium rounded-xl hover:bg-stone-50 transition-colors"
            >
              キャンセル
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={selectedIds.length === 0}
              className="flex-1 px-4 py-2.5 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
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
                  d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"
                />
              </svg>
              {selectedIds.length}個を同期
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
