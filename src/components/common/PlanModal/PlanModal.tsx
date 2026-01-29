"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from 'next/navigation';
import TravelPlanner from "@/components/features/planner";
import { UserInput } from '@/types';
import { restorePendingState, clearPendingState } from '@/lib/restore/pending-state';

export interface PlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialInput?: UserInput | null;
  initialStep?: number;
}

/**
 * プランモーダルコンポーネント
 * 旅行プランナーをモーダル表示する
 * @param props.isOpen - モーダルの表示状態
 * @param props.onClose - 閉じる時のコールバック
 * @param props.initialInput - 初期入力値
 * @param props.initialStep - 初期ステップ
 */
export default function PlanModal({
  isOpen: isOpenProp,
  onClose,
  initialInput,
  initialStep = 0,
}: PlanModalProps) {
  const searchParams = useSearchParams();

  // 復元パラメータをチェック
  const shouldRestore = searchParams.get('restore') === 'true';
  const shouldOpenModal = searchParams.get('modal') === 'true';

  const [isOpen, setIsOpen] = useState(isOpenProp);
  const [restoredInput, setRestoredInput] = useState<UserInput | null>(null);
  const [restoredStep, setRestoredStep] = useState<number | null>(null);

  // 復元処理
  useEffect(() => {
    if (!shouldRestore || !shouldOpenModal) return;

    const result = restorePendingState();

    if (result.success && result.data && result.data.restoreType === 'modal') {
      setRestoredInput(result.data.userInput);
      setRestoredStep(result.data.currentStep);
      setIsOpen(true); // モーダルを開く
      clearPendingState();

      // URLからパラメータを削除
      const url = new URL(window.location.href);
      url.searchParams.delete('restore');
      url.searchParams.delete('modal');
      window.history.replaceState({}, '', url.toString());
    }
  }, [shouldRestore, shouldOpenModal]);

  // 外部からのisOpen変更に追従
  useEffect(() => {
    setIsOpen(isOpenProp);
  }, [isOpenProp]);

  const handleClose = () => {
    setIsOpen(false);
    setRestoredInput(null);
    setRestoredStep(null);
    onClose();
  };

  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      // Save current scroll position
      const scrollY = window.scrollY;

      // Prevent scrolling on both html and body
      document.documentElement.style.overflow = "hidden";
      document.documentElement.style.position = "fixed";
      document.documentElement.style.top = `-${scrollY}px`;
      document.documentElement.style.width = "100%";
      document.body.style.overflow = "hidden";

      return () => {
        // Restore scrolling
        document.documentElement.style.overflow = "";
        document.documentElement.style.position = "";
        document.documentElement.style.top = "";
        document.documentElement.style.width = "";
        document.body.style.overflow = "";

        // Restore scroll position
        window.scrollTo(0, scrollY);
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-stone-900/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300 overflow-y-auto"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-5xl h-[90vh] bg-transparent relative animate-in zoom-in-95 duration-300 my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute -top-2 -right-2 z-10 w-10 h-10 bg-white rounded-full shadow-lg hover:bg-stone-100 transition-all flex items-center justify-center text-stone-600 hover:text-stone-800 border-2 border-stone-200 hover:scale-110"
          aria-label="閉じる"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        <TravelPlanner
          initialInput={restoredInput ?? initialInput}
          initialStep={restoredStep ?? initialStep}
          onClose={handleClose}
        />
      </div>
    </div>
  );
}
