'use client';

import { motion } from 'framer-motion';
import {
  AlertTriangle,
  Phone,
  Building2,
  MapPin,
  ShieldAlert,
  ShieldCheck,
  AlertOctagon,
  ExternalLink,
  Bot,
} from 'lucide-react';
import type { SafetyInfo, DangerLevel } from '@/lib/types/travel-info';
import type { SectionBaseProps } from '../types';

/**
 * 外務省海外安全情報オープンデータのURL
 */
const MOFA_OPENDATA_URL = 'https://www.ezairyu.mofa.go.jp/html/opendata/index.html';

/**
 * 危険度レベルに応じたスタイル定義
 */
const DANGER_LEVEL_STYLES: Record<
  DangerLevel,
  { bg: string; text: string; border: string; icon: typeof ShieldCheck }
> = {
  0: {
    bg: 'bg-white',
    text: 'text-stone-800',
    border: 'border-stone-200',
    icon: ShieldCheck,
  },
  1: {
    bg: 'bg-yellow-50',
    text: 'text-yellow-800',
    border: 'border-yellow-200',
    icon: ShieldAlert,
  },
  2: {
    bg: 'bg-orange-50',
    text: 'text-orange-800',
    border: 'border-orange-200',
    icon: AlertTriangle,
  },
  3: {
    bg: 'bg-red-50',
    text: 'text-red-800',
    border: 'border-red-200',
    icon: AlertTriangle,
  },
  4: {
    bg: 'bg-purple-50',
    text: 'text-purple-800',
    border: 'border-purple-200',
    icon: AlertOctagon,
  },
};

/**
 * SafetyInfoSection - 安全・医療情報セクション
 *
 * 危険度レベル、警告、緊急連絡先を表示
 */
export default function SafetyInfoSection({ data, source }: SectionBaseProps<SafetyInfo>) {
  const style = DANGER_LEVEL_STYLES[data.dangerLevel];
  const DangerIcon = style.icon;
  const isAiGenerated = source?.sourceType === 'ai_generated';

  return (
    <div className="space-y-8">
      {/* AI生成警告（フォールバック時） */}
      {isAiGenerated && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-stone-100 border border-stone-300 rounded-xl flex items-start gap-3"
        >
          <Bot className="w-6 h-6 text-stone-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-stone-800 text-sm">
              AIによる生成情報です
            </h4>
            <p className="text-xs text-stone-600 mt-1 leading-relaxed">
              公式情報の取得に失敗したため、AIが一般的な情報を表示しています。
              正確な情報は必ず外務省海外安全ホームページをご確認ください。
            </p>
          </div>
        </motion.div>
      )}

      {/* 危険度レベルインジケーター */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className={`p-5 sm:p-6 rounded-2xl border shadow-md bg-white ${style.border}`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className={`p-4 rounded-2xl ${style.bg} ${style.text} inline-flex items-center justify-center w-16 h-16`}>
            <DangerIcon className="w-10 h-10" />
          </div>
          <div className="flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <span
                className={`px-3 py-1 rounded-full text-sm font-bold ${style.bg} ${style.text} border ${style.border}`}
              >
                レベル {data.dangerLevel}
              </span>
              <DangerLevelBar level={data.dangerLevel} />
            </div>
            <div className="flex flex-col gap-1">
              <p className={`font-bold text-xl leading-tight ${style.text}`}>
                {data.dangerLevelDescription}
              </p>
              {data.isPartialCountryRisk && data.maxCountryLevel !== undefined && (
                <p className="text-sm text-stone-500 flex flex-col sm:flex-row sm:items-center gap-1">
                  <span className="flex items-center gap-1">
                    <AlertTriangle className="w-4 h-4 text-orange-500" />
                    <span>国別最大レベルは {data.maxCountryLevel} です。</span>
                  </span>
                  <span>一部地域でより高い危険情報が出ています。</span>
                </p>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* 詳細情報（リード・詳細テキスト） */}
      {(data.lead || data.subText) && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-stone-50 p-5 rounded-xl border border-stone-200"
        >
          <h4 className="flex items-center gap-2 font-serif font-bold text-[#2c2c2c] mb-3">
            <ShieldCheck className="w-5 h-5 text-primary" />
            詳細情報
          </h4>
          <div className="space-y-4 text-stone-700 text-sm leading-relaxed">
            {data.lead && (
              <p className="font-bold whitespace-pre-wrap">{data.lead}</p>
            )}
            {data.subText && (
              <p className="whitespace-pre-wrap">{data.subText}</p>
            )}
          </div>
        </motion.div>
      )}

      {/* 警告・注意事項 */}
      {data.warnings.length > 0 && (
        <div className="space-y-4">
          <h4 className="flex items-center gap-2 font-serif font-bold text-[#2c2c2c] text-lg">
            <AlertTriangle className="w-6 h-6 text-orange-500" />
            注意事項
          </h4>
          <ul className="space-y-3">
            {data.warnings.map((warning, index) => (
              <motion.li
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-start gap-4 p-4 bg-white border border-orange-100 rounded-xl shadow-sm"
              >
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center text-sm font-bold mt-0.5">
                  {index + 1}
                </span>
                <p className="text-stone-800 text-base leading-relaxed">
                  {warning}
                </p>
              </motion.li>
            ))}
          </ul>
        </div>
      )}

      {/* 緊急連絡先 */}
      {data.emergencyContacts.length > 0 && (
        <div className="space-y-3">
          <h4 className="flex items-center gap-2 font-serif font-bold text-[#2c2c2c]">
            <Phone className="w-5 h-5 text-primary" />
            緊急連絡先
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {data.emergencyContacts.map((contact, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-4 bg-stone-50 rounded-xl"
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Phone className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-[#2c2c2c]">{contact.name}</p>
                  <a
                    href={`tel:${contact.number}`}
                    className="text-primary font-mono text-lg hover:underline"
                  >
                    {contact.number}
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 最寄りの日本大使館 */}
      {data.nearestEmbassy && (
        <div className="space-y-3">
          <h4 className="flex items-center gap-2 font-serif font-bold text-[#2c2c2c]">
            <Building2 className="w-5 h-5 text-primary" />
            日本大使館・領事館
          </h4>
          <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
            <p className="font-bold text-[#2c2c2c] mb-2">
              {data.nearestEmbassy.name}
            </p>
            <div className="space-y-1 text-sm text-stone-600">
              <p className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                {data.nearestEmbassy.address}
              </p>
              <p className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                <a
                  href={`tel:${data.nearestEmbassy.phone}`}
                  className="text-primary hover:underline"
                >
                  {data.nearestEmbassy.phone}
                </a>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 出典表記（外務省オープンデータ利用規約に基づく） */}
      <div className="mt-6 pt-4 border-t border-stone-200">
        <p className="text-xs text-stone-500 leading-relaxed">
          外務省 海外安全情報オープンデータ（
          <a
            href={MOFA_OPENDATA_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline inline-flex items-center gap-1"
          >
            {MOFA_OPENDATA_URL}
            <ExternalLink className="w-3 h-3" />
          </a>
          ）を加工して作成
        </p>
      </div>
    </div>
  );
}

/**
 * 危険度レベルバー
 */
function DangerLevelBar({ level }: { level: DangerLevel }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4].map((l) => (
        <div
          key={l}
          className={`h-2 w-4 rounded-sm transition-colors ${
            l <= level
              ? l === 1
                ? 'bg-yellow-500'
                : l === 2
                  ? 'bg-orange-500'
                  : l === 3
                    ? 'bg-red-500'
                    : 'bg-purple-500'
              : 'bg-stone-200'
          }`}
        />
      ))}
    </div>
  );
}
