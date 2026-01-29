'use client';

import { useRouter, usePathname } from 'next/navigation';
import { savePendingState } from '@/lib/restore/pending-state';
import type { UserInput, Itinerary } from '@/types';

interface LoginPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** 現在の入力状態 */
  userInput?: UserInput;
  /** 生成済みプラン（ある場合） */
  itinerary?: Itinerary;
  /** ローカルプランID（/plan/local/[id] から来た場合） */
  localPlanId?: string;
  /** 現在のステップ */
  currentStep?: number;
  /** モーダル内のウィザードか */
  isInModal?: boolean;
  /** 自動保存するか（プラン生成後の場合） */
  autoSaveOnLogin?: boolean;
}

export function LoginPromptModal({
  isOpen,
  onClose,
  userInput,
  itinerary,
  localPlanId,
  currentStep = 8,
  isInModal = false,
  autoSaveOnLogin = false,
}: LoginPromptModalProps) {
  const router = useRouter();
  const pathname = usePathname();

  const handleLogin = () => {
    // 状態を保存
    if (userInput) {
      savePendingState({
        userInput,
        itinerary,
        localPlanId,
        currentStep,
        restoreType: itinerary ? 'plan' : isInModal ? 'modal' : 'wizard',
        returnPath: isInModal ? pathname : undefined,
      });
    }

    // リダイレクトURLを構築
    // ローカルプランがある場合はそのページに戻る
    const redirectPath = localPlanId
      ? `/plan/local/${localPlanId}`
      : isInModal
        ? pathname
        : '/';

    const params = new URLSearchParams({
      redirect: redirectPath,
      restore: 'true',
    });

    if (isInModal) {
      params.set('modal', 'true');
    }

    if (autoSaveOnLogin && itinerary) {
      params.set('autoSave', 'true');
    }

    router.push(`/auth/login?${params.toString()}`);
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
            <h2 className="text-xl font-bold text-stone-800">
              もっとプランを作成しませんか？
            </h2>
          </div>
          <p className="text-stone-600 mb-4">
            無料アカウントを作成すると、
            <strong className="text-primary">月3回まで</strong>
            プランを生成できます。
          </p>

          <ul className="space-y-2 text-sm text-stone-600 mb-4">
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-primary rounded-full" />
              プランの保存・管理
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-primary rounded-full" />
              複数デバイスからアクセス
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-primary rounded-full" />
              渡航情報の週次更新
            </li>
          </ul>

          {/* 入力内容の保持について */}
          {userInput && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <div className="flex items-start gap-2">
                <svg
                  className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0"
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
                <div className="text-sm">
                  <p className="text-blue-700 font-medium">入力内容は保持されます</p>
                  <p className="text-blue-600">
                    ログイン後、入力内容が復元されます。
                    <br />
                    <span className="text-xs">
                      ※ 24時間以内にログインしてください
                    </span>
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-stone-300 text-stone-700 font-medium rounded-xl hover:bg-stone-50 transition-colors"
            >
              あとで
            </button>
            <button
              type="button"
              onClick={handleLogin}
              className="flex-1 px-4 py-2.5 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
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
                  d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
                />
              </svg>
              ログイン / 登録
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
