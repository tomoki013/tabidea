'use client';

import { useState } from 'react';
import type { ActivitySource } from '@/types';

interface CitationBadgeProps {
  source: ActivitySource;
}

const SOURCE_CONFIG: Record<string, { icon: string; label: string; shortLabel: string }> = {
  blog: { icon: '📝', label: 'ブログ記事', shortLabel: '記事' },
  google_places: { icon: '📍', label: 'Google Places', shortLabel: 'Places' },
  ai_knowledge: { icon: '🤖', label: 'AI推薦', shortLabel: 'AI' },
  golden_plan: { icon: '⭐', label: 'おすすめプラン', shortLabel: 'おすすめ' },
};

const CONFIDENCE_STYLES: Record<string, string> = {
  high: 'bg-green-50 text-green-700 border-green-200',
  medium: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  low: 'bg-orange-50 text-orange-700 border-orange-200',
};

export default function CitationBadge({ source }: CitationBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  const config = SOURCE_CONFIG[source.type] || SOURCE_CONFIG.ai_knowledge;
  const confidenceStyle = CONFIDENCE_STYLES[source.confidence || 'medium'] || CONFIDENCE_STYLES.medium;

  const handleClick = () => {
    if (source.type === 'blog' && source.url) {
      window.open(source.url, '_blank', 'noopener,noreferrer');
    } else {
      setShowTooltip(!showTooltip);
    }
  };

  return (
    <div className="relative inline-block">
      <button
        onClick={handleClick}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs border ${confidenceStyle} hover:opacity-80 transition-opacity cursor-pointer`}
        aria-label={`情報源: ${config.label}${source.title ? ` - ${source.title}` : ''}`}
      >
        <span>{config.icon}</span>
        {/* PC: フルラベル、モバイル: アイコンのみ */}
        <span className="hidden sm:inline">{config.shortLabel}</span>
      </button>

      {/* Tooltip */}
      {showTooltip && (source.title || source.url) && (
        <div className="absolute bottom-full left-0 mb-1 z-50 w-64 p-2 bg-white rounded-lg shadow-lg border border-gray-200 text-xs">
          <div className="font-medium text-gray-900 mb-1">{config.label}</div>
          {source.title && (
            <div className="text-gray-600 mb-1">{source.title}</div>
          )}
          {source.url && (
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline break-all"
            >
              記事を見る →
            </a>
          )}
          {source.confidence && (
            <div className="mt-1 text-gray-400">
              信頼度: {source.confidence === 'high' ? '高' : source.confidence === 'medium' ? '中' : '低'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
