'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import type { ActivitySource } from '@/types';

interface CitationBadgeProps {
  source: ActivitySource;
}

const SOURCE_ICONS: Record<string, string> = {
  blog: '📝',
  google_places: '📍',
  ai_knowledge: '🤖',
  golden_plan: '⭐',
};

const CONFIDENCE_STYLES: Record<string, string> = {
  high: 'bg-green-50 text-green-700 border-green-200',
  medium: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  low: 'bg-orange-50 text-orange-700 border-orange-200',
};

export default function CitationBadge({ source }: CitationBadgeProps) {
  const t = useTranslations('components.features.planner.citationBadge');
  const [showTooltip, setShowTooltip] = useState(false);

  const sourceType = SOURCE_ICONS[source.type] ? source.type : 'ai_knowledge';
  const icon = SOURCE_ICONS[sourceType];
  const label = t(`labels.${sourceType}`);
  const shortLabel = t(`shortLabels.${sourceType}`);
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
        aria-label={
          source.title
            ? t('aria.withTitle', { label, title: source.title })
            : t('aria.withoutTitle', { label })
        }
      >
        <span>{icon}</span>
        {/* Desktop: short label, mobile: icon only */}
        <span className="hidden sm:inline">{shortLabel}</span>
      </button>

      {/* Tooltip */}
      {showTooltip && (source.title || source.url) && (
        <div className="absolute bottom-full left-0 mb-1 z-50 w-64 p-2 bg-white rounded-lg shadow-lg border border-gray-200 text-xs">
          <div className="font-medium text-gray-900 mb-1">{label}</div>
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
              {t('viewArticle')}
            </a>
          )}
          {source.confidence && (
            <div className="mt-1 text-gray-400">
              {t('confidencePrefix')}
              {source.confidence === 'high'
                ? t('confidence.high')
                : source.confidence === 'medium'
                  ? t('confidence.medium')
                  : t('confidence.low')}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
