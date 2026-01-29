'use client';

import { useRouter } from 'next/navigation';

interface LoginPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LoginPromptModal({ isOpen, onClose }: LoginPromptModalProps) {
  const router = useRouter();

  const handleLogin = () => {
    // ログインページへリダイレクト
    router.push('/login?redirect=' + encodeURIComponent(window.location.pathname));
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

          <ul className="space-y-2 text-sm text-stone-600 mb-6">
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
