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
  FaSuitcase,
  FaPlane,
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
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-[#e67e22]/10 rounded-full">
                  <FaSuitcase className="text-[#e67e22]" />
                </div>
                <h1 className="font-serif text-3xl font-bold text-stone-800">
                  マイプラン
                </h1>
              </div>
              <p className="text-stone-500 ml-12">
                保存した旅行プラン ({totalPlans}件)
              </p>
            </div>
            <button
              onClick={() => openModal()}
              className="flex items-center gap-2 px-6 py-3 bg-[#e67e22] text-white rounded-full font-bold hover:bg-[#d35400] transition-all transform hover:-translate-y-0.5 shadow-md hover:shadow-lg"
            >
              <FaPlus />
              <span>新規作成</span>
            </button>
          </div>
        </div>

        {/* Plans List */}
        {plans.length === 0 ? (
          <div className="text-center py-16">
            <div className="relative inline-block">
              {/* Decorative background */}
              <div className="absolute inset-0 bg-[#e67e22]/5 rounded-full scale-150" />
              <div className="relative p-8 bg-[#fcfbf9] rounded-full border-2 border-dashed border-[#e67e22]/30 mb-6">
                <FaPlane className="text-6xl text-[#e67e22]/30" />
              </div>
            </div>
            <h2 className="font-serif text-xl font-bold text-stone-600 mb-2">
              プランがありません
            </h2>
            <p className="text-stone-500 mb-8 font-hand">
              新しい旅行プランを作成して、ここに保存しましょう
            </p>
            <button
              onClick={() => openModal()}
              className="inline-flex items-center gap-2 px-8 py-4 bg-[#e67e22] text-white rounded-full font-bold hover:bg-[#d35400] transition-all transform hover:-translate-y-0.5 shadow-md hover:shadow-lg"
            >
              <FaPlus />
              <span>プランを作成する</span>
            </button>
          </div>
        ) : (
          <div className="grid gap-5">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className="relative bg-[#fcfbf9] rounded-2xl border-2 border-dashed border-stone-200 overflow-hidden hover:border-[#e67e22]/40 hover:shadow-lg transition-all group"
              >
                {/* Corner tape decorations */}
                <div className="absolute top-0 left-0 w-6 h-6 bg-[#e67e22]/15 rotate-45 -translate-x-3 -translate-y-3" />
                <div className="absolute top-0 right-0 w-6 h-6 bg-[#27ae60]/15 -rotate-45 translate-x-3 -translate-y-3" />

                <div className="flex flex-col sm:flex-row">
                  {/* Thumbnail */}
                  <div className="sm:w-48 h-36 sm:h-auto relative bg-stone-100 overflow-hidden">
                    {plan.thumbnailUrl ? (
                      <Image
                        src={plan.thumbnailUrl}
                        alt={plan.destination || '旅行プラン'}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#e67e22]/5 to-[#27ae60]/5">
                        <FaMapMarkerAlt className="text-4xl text-[#e67e22]/30" />
                      </div>
                    )}
                    {/* Visibility badge */}
                    <div className={`absolute top-2 left-2 px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${
                      plan.isPublic
                        ? 'bg-[#27ae60]/90 text-white'
                        : 'bg-stone-700/90 text-white'
                    }`}>
                      {plan.isPublic ? <FaEye className="text-[10px]" /> : <FaEyeSlash className="text-[10px]" />}
                      {plan.isPublic ? '公開' : '非公開'}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 p-5 sm:p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <Link
                          href={`/plan/${plan.shareCode}`}
                          className="group/link"
                        >
                          <h3 className="font-serif text-lg font-bold text-stone-800 group-hover/link:text-[#e67e22] transition-colors flex items-center gap-2">
                            {plan.destination || '目的地未設定'}
                            <FaExternalLinkAlt className="text-xs opacity-0 group-hover/link:opacity-100 transition-opacity" />
                          </h3>
                        </Link>

                        <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-stone-500">
                          {plan.durationDays && (
                            <span className="flex items-center gap-1.5 bg-[#e67e22]/5 px-2.5 py-1 rounded-full">
                              <FaCalendarAlt className="text-[#e67e22]/60 text-xs" />
                              {plan.durationDays}日間
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-stone-400 mt-3 font-hand">
                          作成日: {formatDate(plan.createdAt)}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() =>
                            handleToggleVisibility(plan.id, plan.isPublic)
                          }
                          disabled={isUpdating === plan.id}
                          className={`p-2.5 rounded-full transition-all disabled:opacity-50 ${
                            plan.isPublic
                              ? 'text-[#27ae60] hover:bg-[#27ae60]/10'
                              : 'text-stone-400 hover:bg-stone-100 hover:text-stone-600'
                          }`}
                          title={plan.isPublic ? '非公開にする' : '公開する'}
                        >
                          {plan.isPublic ? <FaEye /> : <FaEyeSlash />}
                        </button>
                        <button
                          onClick={() => handleDelete(plan.id)}
                          disabled={isDeleting === plan.id}
                          className="p-2.5 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all disabled:opacity-50"
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
