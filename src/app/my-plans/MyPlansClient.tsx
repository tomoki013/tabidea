'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  FaMapMarkerAlt,
  FaCalendarAlt,
  FaTrash,
  FaEye,
  FaEyeSlash,
  FaPlus,
  FaExternalLinkAlt,
} from 'react-icons/fa';

import type { PlanListItem } from '@/types';
import { deletePlan, updatePlanVisibility } from '@/app/actions/travel-planner';
import { usePlanModal } from '@/context/PlanModalContext';

interface MyPlansClientProps {
  initialPlans: PlanListItem[];
  totalPlans: number;
}

export default function MyPlansClient({
  initialPlans,
  totalPlans,
}: MyPlansClientProps) {
  const { openModal } = usePlanModal();
  const [plans, setPlans] = useState<PlanListItem[]>(initialPlans);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  const handleDelete = async (planId: string) => {
    if (!confirm('このプランを削除しますか？この操作は取り消せません。')) {
      return;
    }

    setIsDeleting(planId);
    const result = await deletePlan(planId);

    if (result.success) {
      setPlans((prev) => prev.filter((p) => p.id !== planId));
    } else {
      alert(result.error || '削除に失敗しました');
    }
    setIsDeleting(null);
  };

  const handleToggleVisibility = async (planId: string, currentPublic: boolean) => {
    setIsUpdating(planId);
    const result = await updatePlanVisibility(planId, !currentPublic);

    if (result.success) {
      setPlans((prev) =>
        prev.map((p) =>
          p.id === planId ? { ...p, isPublic: !currentPublic } : p
        )
      );
    } else {
      alert(result.error || '更新に失敗しました');
    }
    setIsUpdating(null);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(new Date(date));
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#fcfbf9]">
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="pt-24 pb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-serif font-bold text-stone-800">
                マイプラン
              </h1>
              <p className="text-stone-500 mt-2">
                保存した旅行プラン ({totalPlans}件)
              </p>
            </div>
            <button
              onClick={() => openModal()}
              className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-full font-bold hover:bg-primary/90 transition-colors"
            >
              <FaPlus />
              <span>新規作成</span>
            </button>
          </div>
        </div>

        {/* Plans List */}
        {plans.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">
              <FaMapMarkerAlt className="inline-block text-stone-300" />
            </div>
            <h2 className="text-xl font-bold text-stone-600 mb-2">
              プランがありません
            </h2>
            <p className="text-stone-500 mb-8">
              新しい旅行プランを作成して、ここに保存しましょう
            </p>
            <button
              onClick={() => openModal()}
              className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-white rounded-full font-bold hover:bg-primary/90 transition-colors"
            >
              <FaPlus />
              <span>プランを作成する</span>
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className="bg-white rounded-xl shadow-sm border border-stone-100 overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col sm:flex-row">
                  {/* Thumbnail */}
                  <div className="sm:w-48 h-32 sm:h-auto relative bg-stone-100">
                    {plan.thumbnailUrl ? (
                      <Image
                        src={plan.thumbnailUrl}
                        alt={plan.destination || '旅行プラン'}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <FaMapMarkerAlt className="text-4xl text-stone-300" />
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 p-4 sm:p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <Link
                          href={`/plan/${plan.shareCode}`}
                          className="group"
                        >
                          <h3 className="text-lg font-bold text-stone-800 group-hover:text-primary transition-colors flex items-center gap-2">
                            {plan.destination || '目的地未設定'}
                            <FaExternalLinkAlt className="text-xs opacity-0 group-hover:opacity-100 transition-opacity" />
                          </h3>
                        </Link>

                        <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-stone-500">
                          {plan.durationDays && (
                            <span className="flex items-center gap-1">
                              <FaCalendarAlt className="text-xs" />
                              {plan.durationDays}日間
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            {plan.isPublic ? (
                              <>
                                <FaEye className="text-xs" />
                                公開中
                              </>
                            ) : (
                              <>
                                <FaEyeSlash className="text-xs" />
                                非公開
                              </>
                            )}
                          </span>
                        </div>

                        <p className="text-xs text-stone-400 mt-2">
                          作成日: {formatDate(plan.createdAt)}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() =>
                            handleToggleVisibility(plan.id, plan.isPublic)
                          }
                          disabled={isUpdating === plan.id}
                          className="p-2 text-stone-400 hover:text-primary transition-colors disabled:opacity-50"
                          title={plan.isPublic ? '非公開にする' : '公開する'}
                        >
                          {plan.isPublic ? <FaEye /> : <FaEyeSlash />}
                        </button>
                        <button
                          onClick={() => handleDelete(plan.id)}
                          disabled={isDeleting === plan.id}
                          className="p-2 text-stone-400 hover:text-red-500 transition-colors disabled:opacity-50"
                          title="削除"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
