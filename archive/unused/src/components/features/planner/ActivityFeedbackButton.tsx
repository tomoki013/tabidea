'use client';

import { useState, useTransition } from 'react';
import { submitActivityIssue } from '@/app/actions/feedback';

interface ActivityFeedbackButtonProps {
  planId?: string;
  day: number;
  activityIndex: number;
  destination?: string;
}

const ISSUE_TYPES = [
  { label: '閉店/休業', value: '閉店/休業' },
  { label: '場所が違う', value: '場所が違う' },
  { label: '情報が古い', value: '情報が古い' },
  { label: 'その他', value: 'その他' },
];

export default function ActivityFeedbackButton({
  planId,
  day,
  activityIndex,
  destination,
}: ActivityFeedbackButtonProps) {
  const [showModal, setShowModal] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState('');
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = () => {
    if (!selectedIssue) return;

    startTransition(async () => {
      const result = await submitActivityIssue({
        planId,
        day,
        activityIndex,
        issueType: selectedIssue,
        comment: comment.trim() || undefined,
        destination,
      });

      if (result.success) {
        setSubmitted(true);
        setShowModal(false);
      }
    });
  };

  if (submitted) {
    return (
      <span className="text-green-500 text-sm" aria-label="報告済み" title="報告済み">
        ✅
      </span>
    );
  }

  return (
    <>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setShowModal(true);
        }}
        className="text-stone-400 hover:text-red-500 text-sm transition-colors"
        aria-label="問題を報告"
        title="問題を報告"
      >
        🚩
      </button>

      {/* Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-white rounded-xl p-5 w-80 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-medium text-stone-800 mb-3">問題を報告</h3>

            <div className="space-y-2 mb-3">
              {ISSUE_TYPES.map(({ label, value }) => (
                <button
                  key={value}
                  onClick={() => setSelectedIssue(value)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm border transition-colors ${
                    selectedIssue === value
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-stone-200 hover:bg-stone-50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="詳細（任意）"
              className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 mb-3"
              rows={2}
            />

            <div className="flex gap-2">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-2 border border-stone-300 rounded-lg text-sm text-stone-600 hover:bg-stone-50 transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleSubmit}
                disabled={isPending || !selectedIssue}
                className="flex-1 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {isPending ? '送信中...' : '送信'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
