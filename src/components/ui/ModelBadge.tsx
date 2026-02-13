'use client';

/**
 * AIモデル名を表示するバッジコンポーネント
 * 全てのAI生成コンテンツの近くに配置して使用モデルを明示する
 */

interface ModelBadgeProps {
  /** モデル名 (e.g., "gemini-3-flash-preview", "gemini-2.5-flash") */
  modelName: string;
  className?: string;
}

/**
 * モデルIDからユーザー向け表示名を生成
 * 例: "gemini-3-flash-preview" → "Gemini 3 Flash"
 *     "gemini-2.5-flash" → "Gemini 2.5 Flash"
 *     "gemini-3-pro-preview" → "Gemini 3 Pro"
 */
function formatModelName(modelId: string): string {
  const lower = modelId.toLowerCase();

  // バージョン番号を抽出 (例: "3", "2.5", "2.0")
  const versionMatch = lower.match(/gemini[- ]?([\d.]+)/);
  const version = versionMatch ? versionMatch[1] : '';

  // ティアを判定
  let tier = '';
  if (lower.includes('pro')) {
    tier = 'Pro';
  } else if (lower.includes('flash')) {
    tier = 'Flash';
  } else if (lower.includes('ultra')) {
    tier = 'Ultra';
  }

  if (version && tier) {
    return `Gemini ${version} ${tier}`;
  }
  if (version) {
    return `Gemini ${version}`;
  }

  // フォールバック: そのまま返す
  return modelId;
}

export default function ModelBadge({ modelName, className = '' }: ModelBadgeProps) {
  const displayName = formatModelName(modelName);

  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-mono text-stone-400 bg-stone-50 px-1.5 py-0.5 rounded border border-stone-200 ${className}`}
      title={modelName}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        className="w-2.5 h-2.5"
      >
        <path d="M12 2a4 4 0 0 1 4 4v2a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4Z" />
        <path d="M12 12v4" />
        <path d="M8 18h8" />
        <circle cx="12" cy="20" r="2" />
      </svg>
      {displayName}
    </span>
  );
}
