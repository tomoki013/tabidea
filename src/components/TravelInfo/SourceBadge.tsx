'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2,
  Search,
  Bot,
  PenLine,
  Star,
  Clock,
  ExternalLink,
  Info,
  type LucideIcon,
} from 'lucide-react';
import type { SourceBadgeProps } from './types';

/**
 * ソースタイプに応じたアイコンのマッピング
 */
const SOURCE_ICONS: Record<SourceBadgeProps['sourceType'], LucideIcon> = {
  official_api: Building2,
  web_search: Search,
  ai_generated: Bot,
  blog: PenLine,
};

/**
 * ソースタイプの日本語ラベル
 */
function getSourceLabel(sourceType: SourceBadgeProps['sourceType']): string {
  switch (sourceType) {
    case 'official_api':
      return '公式情報';
    case 'web_search':
      return 'Web検索';
    case 'ai_generated':
      return 'AI生成';
    case 'blog':
      return 'ブログ';
    default:
      return '情報源';
  }
}

/**
 * 信頼性スコアに基づく色を取得
 */
function getReliabilityColor(score: number): string {
  if (score >= 80) return 'text-green-600 bg-green-50';
  if (score >= 60) return 'text-yellow-600 bg-yellow-50';
  if (score >= 40) return 'text-orange-600 bg-orange-50';
  return 'text-red-600 bg-red-50';
}

/**
 * 信頼性スコアを星表示用に変換（0-5）
 */
function scoreToStars(score: number): number {
  return Math.round((score / 100) * 5);
}

/**
 * 日時をフォーマット
 */
function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

/**
 * SourceBadge - 情報源バッジ
 *
 * 情報源のタイプ、信頼性、更新日時を表示
 * ホバーで詳細情報を表示するTooltip付き
 */
export default function SourceBadge({
  sourceType,
  sourceName,
  sourceUrl,
  reliabilityScore,
  retrievedAt,
  compact = false,
}: SourceBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const IconComponent = SOURCE_ICONS[sourceType] || Info;
  const label = getSourceLabel(sourceType);
  const reliabilityColorClass = getReliabilityColor(reliabilityScore);
  const stars = scoreToStars(reliabilityScore);

  if (compact) {
    // コンパクト表示
    return (
      <div
        className="relative inline-flex"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onFocus={() => setShowTooltip(true)}
        onBlur={() => setShowTooltip(false)}
      >
        <button
          type="button"
          className={`
            inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs
            ${reliabilityColorClass}
            transition-colors duration-200 hover:opacity-80
          `}
          aria-label={`${sourceName}の詳細を表示`}
        >
          <IconComponent className="w-3 h-3" />
          <span>{label}</span>
        </button>

        <AnimatePresence>
          {showTooltip && (
            <Tooltip
              sourceName={sourceName}
              sourceUrl={sourceUrl}
              reliabilityScore={reliabilityScore}
              stars={stars}
              retrievedAt={retrievedAt}
            />
          )}
        </AnimatePresence>
      </div>
    );
  }

  // フル表示
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-3 bg-stone-50 rounded-xl">
      {/* ソースタイプ */}
      <div className="flex items-center gap-2">
        <div className={`p-2 rounded-lg ${reliabilityColorClass}`}>
          <IconComponent className="w-4 h-4" />
        </div>
        <div>
          <p className="text-sm font-medium text-[#2c2c2c]">{sourceName}</p>
          <p className="text-xs text-stone-500">{label}</p>
        </div>
      </div>

      {/* 区切り線（デスクトップ） */}
      <div className="hidden sm:block w-px h-8 bg-stone-200" />

      {/* 信頼性スコア */}
      <div className="flex items-center gap-2">
        <div className="flex items-center">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={`w-4 h-4 ${
                i < stars ? 'text-yellow-400 fill-yellow-400' : 'text-stone-300'
              }`}
            />
          ))}
        </div>
        <span className="text-sm text-stone-600">
          {reliabilityScore}%
        </span>
      </div>

      {/* 区切り線（デスクトップ） */}
      <div className="hidden sm:block w-px h-8 bg-stone-200" />

      {/* 更新日時 */}
      <div className="flex items-center gap-1.5 text-stone-500 text-sm">
        <Clock className="w-4 h-4" />
        <span>{formatDate(retrievedAt)}</span>
      </div>

      {/* ソースリンク */}
      {sourceUrl && (
        <>
          <div className="hidden sm:block w-px h-8 bg-stone-200" />
          <a
            href={sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
            aria-label={`${sourceName}を開く（新しいタブ）`}
          >
            <ExternalLink className="w-4 h-4" />
            <span>ソースを確認</span>
          </a>
        </>
      )}
    </div>
  );
}

/**
 * Tooltip - ホバー時の詳細表示
 */
function Tooltip({
  sourceName,
  sourceUrl,
  reliabilityScore,
  stars,
  retrievedAt,
}: {
  sourceName: string;
  sourceUrl?: string;
  reliabilityScore: number;
  stars: number;
  retrievedAt: Date;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 5, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 5, scale: 0.95 }}
      transition={{ duration: 0.15 }}
      className="absolute z-50 left-0 bottom-full mb-2 w-64 p-3 bg-white rounded-xl shadow-lg border border-stone-200"
    >
      <div className="space-y-2">
        <p className="font-medium text-sm text-[#2c2c2c]">{sourceName}</p>

        <div className="flex items-center gap-2">
          <div className="flex items-center">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={`w-3 h-3 ${
                  i < stars ? 'text-yellow-400 fill-yellow-400' : 'text-stone-300'
                }`}
              />
            ))}
          </div>
          <span className="text-xs text-stone-600">
            信頼性 {reliabilityScore}%
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-stone-500">
          <Clock className="w-3 h-3" />
          <span>{formatDate(retrievedAt)}</span>
        </div>

        {sourceUrl && (
          <a
            href={sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <ExternalLink className="w-3 h-3" />
            <span>ソースを確認</span>
          </a>
        )}
      </div>

      {/* 吹き出しの矢印 */}
      <div className="absolute left-4 bottom-0 translate-y-full">
        <div className="w-2 h-2 bg-white border-r border-b border-stone-200 transform rotate-45 -translate-y-1" />
      </div>
    </motion.div>
  );
}
