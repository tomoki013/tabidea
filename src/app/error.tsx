"use client";

import { useEffect } from "react";

/**
 * グローバルエラーバウンダリ
 * チャンクロードエラー（502/デプロイ後の古いチャンク参照）を検出し、
 * 自動リロードまたはユーザーフレンドリーなフォールバックUIを表示
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[global-error]", error);

    // チャンクロードエラーの検出と自動リロード
    const isChunkError =
      error.message.includes("Loading chunk") ||
      error.message.includes("Failed to fetch") ||
      error.message.includes("unexpected response") ||
      error.message.includes("ChunkLoadError") ||
      error.message.includes("Importing a module script failed") ||
      error.message.includes("dynamically imported module");

    if (isChunkError) {
      // 無限リロードループを防ぐためセッションストレージでチェック
      const reloadKey = "chunk_error_reload";
      const lastReload = sessionStorage.getItem(reloadKey);
      const now = Date.now();

      if (!lastReload || now - parseInt(lastReload, 10) > 30000) {
        sessionStorage.setItem(reloadKey, now.toString());
        window.location.reload();
        return;
      }
    }
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="text-6xl">😢</div>
        <h2 className="text-2xl font-serif font-bold text-stone-800">
          エラーが発生しました
        </h2>
        <p className="text-stone-600 text-sm leading-relaxed">
          予期しないエラーが発生しました。ページを再読み込みするか、しばらくしてからもう一度お試しください。
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-primary text-white rounded-full font-bold hover:bg-primary/90 transition-colors shadow-md"
          >
            ページを再読み込み
          </button>
          <button
            onClick={reset}
            className="px-6 py-3 bg-white text-stone-700 rounded-full font-bold border border-stone-200 hover:bg-stone-50 transition-colors shadow-sm"
          >
            もう一度試す
          </button>
        </div>
      </div>
    </div>
  );
}
