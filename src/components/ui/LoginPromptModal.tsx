'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { savePendingState } from '@/lib/restore/pending-state';
import type { UserInput, Itinerary } from '@/types';
import { JournalSheet, Stamp, HandwrittenText, Tape, JournalButton } from '@/components/ui/journal';
import { FaPlane, FaCheck } from 'react-icons/fa';

interface LoginPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  userInput?: UserInput;
  itinerary?: Itinerary;
  localPlanId?: string;
  currentStep?: number;
  isInModal?: boolean;
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal - Styled as a Passport/Ticket */}
      <div className="relative w-full max-w-md transform rotate-1">
        <JournalSheet className="relative p-0 overflow-hidden shadow-2xl border-l-4 border-l-stone-300">
           {/* Decorative Header */}
           <div className="bg-primary/10 border-b-2 border-stone-300 border-dashed p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                 <FaPlane className="text-primary text-xl" />
                 <HandwrittenText className="font-bold text-stone-700">TRAVEL PASS</HandwrittenText>
              </div>
              <Stamp color="blue" size="sm" className="w-12 h-12 text-[0.6rem] border-2 rotate-12 opacity-80">
                 ACCESS<br/>GRANTED
              </Stamp>
           </div>

           <div className="p-6 sm:p-8">
              <HandwrittenText tag="h2" className="text-xl font-bold text-stone-800 mb-4 text-center">
                旅の続きを始めましょう
              </HandwrittenText>

              <div className="bg-stone-50 border border-stone-200 rounded-sm p-4 mb-6 relative">
                 <Tape color="yellow" position="top-center" className="w-24 -top-3 opacity-80" />
                 <p className="text-stone-600 text-sm mb-3 font-hand">
                    無料アカウントを作成すると...
                 </p>
                 <ul className="space-y-2 text-sm text-stone-600 font-hand">
                    <li className="flex items-center gap-2">
                       <FaCheck className="text-primary text-xs" />
                       <strong className="text-primary">月3回まで</strong>プラン生成
                    </li>
                    <li className="flex items-center gap-2">
                       <FaCheck className="text-primary text-xs" />
                       プランの保存・管理
                    </li>
                    <li className="flex items-center gap-2">
                       <FaCheck className="text-primary text-xs" />
                       複数デバイスからアクセス
                    </li>
                 </ul>
              </div>

              {userInput && (
                <div className="mb-6 text-center">
                   <p className="text-xs text-stone-500 font-hand bg-blue-50 inline-block px-3 py-1 rounded-sm border border-blue-100">
                      ※ 入力中のデータはログイン後に復元されます
                   </p>
                </div>
              )}

              <div className="flex flex-col gap-3">
                <JournalButton
                  variant="primary"
                  onClick={handleLogin}
                  className="w-full font-bold shadow-md"
                >
                  ログイン / 無料登録
                </JournalButton>
                <button
                  type="button"
                  onClick={onClose}
                  className="text-stone-400 hover:text-stone-600 text-sm underline decoration-dashed font-hand"
                >
                  あとで登録する
                </button>
              </div>
           </div>

           {/* Perforated edge bottom */}
           <div className="h-4 w-full bg-stone-100 border-t-2 border-dashed border-stone-300 relative">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[10px] text-stone-400 font-mono tracking-widest">
                 TABIDEA-2025
              </div>
           </div>
        </JournalSheet>
      </div>
    </div>
  );
}
