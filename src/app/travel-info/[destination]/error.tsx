'use client';

import { useEffect } from 'react';
import { AlertCircle, RefreshCw, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * 目的地ページのエラー表示
 */
export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error('Travel info page error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-[#fcfbf9] flex items-center justify-center">
      <div className="max-w-md mx-auto px-4 text-center">
        <div className="bg-white rounded-3xl border-2 border-red-200 p-8 shadow-sm">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-serif font-bold text-red-800 mb-2">
            エラーが発生しました
          </h1>
          <p className="text-red-600 mb-6">
            渡航情報の読み込み中に問題が発生しました。
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={reset}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors"
            >
              <RefreshCw className="w-5 h-5" />
              再試行
            </button>
            <Link
              href="/travel-info"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-stone-100 text-stone-700 font-bold rounded-xl hover:bg-stone-200 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              トップに戻る
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
