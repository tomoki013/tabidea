'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { submitPlanFeedback } from '@/app/actions/feedback';

interface PlanFeedbackBarProps {
  planId?: string;
  destination?: string;
}

export default function PlanFeedbackBar({ planId, destination }: PlanFeedbackBarProps) {
  const t = useTranslations("components.features.planner.planFeedbackBar");
  const [rating, setRating] = useState<number>(0);
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [comment, setComment] = useState('');
  const [showComment, setShowComment] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string>();
  const [isPending, startTransition] = useTransition();

  const handleSubmit = () => {
    if (rating === 0) return;

    startTransition(async () => {
      const result = await submitPlanFeedback({
        planId,
        overallRating: rating,
        comment: comment.trim() || undefined,
        destination,
      });

      if (result.success) {
        setSubmitted(true);
      } else {
        setError(result.message);
      }
    });
  };

  if (submitted) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
        <p className="text-green-700 font-medium">{t("submittedTitle")}</p>
        <p className="text-green-600 text-sm mt-1">{t("submittedDescription")}</p>
      </div>
    );
  }

  return (
    <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 sm:p-6">
      <p className="text-stone-700 font-medium text-center mb-3">
        {t("title")}
      </p>

      {/* Star Rating */}
      <div className="flex justify-center gap-2 mb-3">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => {
              setRating(star);
              if (!showComment) setShowComment(true);
            }}
            onMouseEnter={() => setHoveredRating(star)}
            onMouseLeave={() => setHoveredRating(0)}
            className="text-2xl transition-transform hover:scale-110"
            aria-label={t("starAria", { star })}
          >
            {star <= (hoveredRating || rating) ? '⭐' : '☆'}
          </button>
        ))}
      </div>

      {/* Comment section (shown after rating) */}
      {showComment && (
        <div className="space-y-3">
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={t("commentPlaceholder")}
            className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
            rows={2}
          />

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={isPending || rating === 0}
            className="w-full py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {isPending ? t("submitting") : t("submit")}
          </button>
        </div>
      )}
    </div>
  );
}
