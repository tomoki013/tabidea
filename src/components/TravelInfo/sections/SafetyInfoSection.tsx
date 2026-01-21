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
  MapPinned,
  ChevronDown,
} from 'lucide-react';
import type { SafetyInfo, DangerLevel, HighRiskRegion } from '@/types';
import { DANGER_LEVEL_DESCRIPTIONS } from '@/types';
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
  { bg: string; text: string; border: string; icon: typeof ShieldCheck; label: string }
> = {
  0: {
    bg: 'bg-white',
    text: 'text-stone-700',
    border: 'border-stone-200',
    icon: ShieldCheck,
    label: '危険情報なし',
  },
  1: {
    bg: 'bg-yellow-50',
    text: 'text-yellow-800',
    border: 'border-yellow-200',
    icon: ShieldAlert,
    label: '十分注意',
  },
  2: {
    bg: 'bg-orange-50',
    text: 'text-orange-800',
    border: 'border-orange-200',
    icon: AlertTriangle,
    label: '不要不急の渡航中止',
  },
  3: {
    bg: 'bg-red-50',
    text: 'text-red-800',
    border: 'border-red-200',
    icon: AlertTriangle,
    label: '渡航中止勧告',
  },
  4: {
    bg: 'bg-purple-50',
    text: 'text-purple-800',
    border: 'border-purple-200',
    icon: AlertOctagon,
    label: '退避勧告',
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
    <div className="space-y-8 font-sans">
      {/* AI生成警告（フォールバック時） */}
      {isAiGenerated && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-stone-100 border border-stone-300 rounded-xl flex items-start gap-3"
        >
          <Bot className="w-5 h-5 text-stone-500 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-stone-700 text-sm">
              AIによる生成情報です
            </h4>
            <p className="text-xs text-stone-500 mt-1 leading-relaxed">
              公式情報の取得に失敗したため、AIが一般的な情報を表示しています。
              正確な情報は必ず外務省海外安全ホームページをご確認ください。
            </p>
          </div>
        </motion.div>
      )}

      {/* 危険度レベルカード */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className={`relative overflow-hidden rounded-2xl border-2 shadow-sm ${style.border} bg-white`}
      >
        <div className={`absolute top-0 left-0 w-full h-2 ${style.bg.replace('bg-', 'bg-').replace('50', '400')}`} /> {/* Accent Bar */}

        <div className="p-6 flex flex-col sm:flex-row items-start sm:items-center gap-6">
          <div className={`flex-shrink-0 p-4 rounded-full ${style.bg} ${style.text}`}>
            <DangerIcon className="w-12 h-12" />
          </div>

          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-3 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-400">Security Level</span>
              <div className="flex-1 h-px bg-stone-100" />
            </div>

            <div className="flex flex-wrap items-baseline gap-3">
              <h3 className={`text-3xl font-bold ${style.text}`}>
                Lv.{data.dangerLevel}
              </h3>
              <span className={`text-lg font-bold ${style.text} opacity-90`}>
                {style.label}
              </span>
            </div>

            <p className="text-sm text-stone-600 leading-relaxed">
              {data.dangerLevelDescription}
            </p>

            {data.isPartialCountryRisk && data.maxCountryLevel !== undefined && (
              <div className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 bg-orange-50 text-orange-800 text-xs font-bold rounded-full border border-orange-100">
                <AlertTriangle className="w-3 h-3" />
                一部地域でレベル{data.maxCountryLevel}の警告が出ています
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* 高リスク地域の情報 */}
      {data.highRiskRegions && data.highRiskRegions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-sm"
        >
          <div className="px-5 py-3 bg-stone-50 border-b border-stone-200 flex items-center gap-2">
            <MapPinned className="w-4 h-4 text-stone-500" />
            <h4 className="font-bold text-stone-700 text-sm">地域別の危険情報</h4>
          </div>
          <div className="p-5">
            <p className="text-xs text-stone-500 mb-4">
              ※ 以下の地域へ渡航する際は特に注意が必要です
            </p>
            <div className="grid gap-3">
              {data.highRiskRegions.map((region, index) => (
                <HighRiskRegionItem key={index} region={region} />
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* 詳細情報（リード・詳細テキスト） */}
      {(data.lead || data.subText) && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {data.lead && (
            <div className="bg-white p-6 rounded-xl border-l-4 border-primary shadow-sm">
              <h4 className="font-bold text-stone-800 mb-2 text-sm flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-primary" />
                概要
              </h4>
              <p className="font-bold text-stone-700 leading-relaxed text-base">
                {data.lead}
              </p>
            </div>
          )}

          {data.subText && (
            <details className="group bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
              <summary className="flex items-center justify-between p-4 cursor-pointer hover:bg-stone-50 transition-colors list-none select-none">
                <span className="font-bold text-stone-700 flex items-center gap-2 text-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-stone-400" />
                  詳細な安全情報を見る
                </span>
                <ChevronDown className="w-5 h-5 text-stone-400 transition-transform group-open:rotate-180" />
              </summary>
              <div className="p-5 pt-0 text-sm text-stone-600 leading-loose border-t border-stone-100 mt-2">
                <p className="whitespace-pre-wrap">{data.subText}</p>
              </div>
            </details>
          )}
        </motion.div>
      )}

      {/* 警告・注意事項 */}
      {data.warnings.length > 0 && (
        <div className="space-y-4">
          <h4 className="flex items-center gap-2 font-bold text-stone-700 text-lg border-b pb-2 border-stone-200">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            主な注意事項
          </h4>
          <ul className="grid gap-3">
            {data.warnings.map((warning, index) => (
              <motion.li
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-start gap-4 p-4 bg-white border border-stone-100 rounded-xl shadow-sm hover:shadow-md transition-shadow"
              >
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-stone-100 text-stone-600 flex items-center justify-center text-xs font-bold mt-0.5 border border-stone-200">
                  {index + 1}
                </span>
                <p className="text-stone-700 text-sm leading-relaxed font-medium">
                  {warning}
                </p>
              </motion.li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-6">
        {/* 緊急連絡先 */}
        {data.emergencyContacts.length > 0 && (
          <div className="space-y-3">
            <h4 className="flex items-center gap-2 font-bold text-stone-700 text-sm uppercase tracking-wider">
              <Phone className="w-4 h-4 text-primary" />
              Emergency Contacts
            </h4>
            <div className="bg-white border border-stone-200 rounded-xl overflow-hidden shadow-sm">
              {data.emergencyContacts.map((contact, index) => (
                <div
                  key={index}
                  className={`p-4 flex items-center justify-between gap-3 ${index !== 0 ? 'border-t border-stone-100' : ''}`}
                >
                  <div className="flex-1">
                    <p className="text-xs text-stone-500 font-bold mb-0.5">{contact.name}</p>
                    <a
                      href={`tel:${contact.number}`}
                      className="text-lg font-mono font-bold text-stone-800 hover:text-primary transition-colors"
                    >
                      {contact.number}
                    </a>
                  </div>
                  <a
                    href={`tel:${contact.number}`}
                    className="p-2 bg-green-50 text-green-600 rounded-full hover:bg-green-100 transition-colors"
                  >
                    <Phone className="w-4 h-4" />
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 最寄りの日本大使館 */}
        {data.nearestEmbassy && (
          <div className="space-y-3">
            <h4 className="flex items-center gap-2 font-bold text-stone-700 text-sm uppercase tracking-wider">
              <Building2 className="w-4 h-4 text-primary" />
              Japanese Embassy
            </h4>
            <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-sm h-full flex flex-col justify-center">
              <p className="font-bold text-stone-800 mb-3 border-b border-stone-100 pb-2">
                {data.nearestEmbassy.name}
              </p>
              <div className="space-y-3 text-sm text-stone-600">
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-stone-400 mt-0.5 flex-shrink-0" />
                  <p className="leading-relaxed text-xs">{data.nearestEmbassy.address}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-stone-400 flex-shrink-0" />
                  <a
                    href={`tel:${data.nearestEmbassy.phone}`}
                    className="font-mono hover:text-primary transition-colors text-xs"
                  >
                    {data.nearestEmbassy.phone}
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 出典表記 */}
      <div className="mt-8 pt-4 border-t border-dashed border-stone-200 text-center">
        <p className="text-[10px] text-stone-400">
          情報提供: 外務省 海外安全情報オープンデータ
          <a
            href={MOFA_OPENDATA_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-2 hover:text-primary hover:underline inline-flex items-center gap-1"
          >
            公式サイト
            <ExternalLink className="w-2.5 h-2.5" />
          </a>
        </p>
      </div>
    </div>
  );
}

/**
 * 高リスク地域の表示アイテム
 */
function HighRiskRegionItem({ region }: { region: HighRiskRegion }) {
  const levelColors: Record<DangerLevel, string> = {
    0: 'bg-stone-100 text-stone-600 border-stone-200',
    1: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    2: 'bg-orange-50 text-orange-700 border-orange-200',
    3: 'bg-red-50 text-red-700 border-red-200',
    4: 'bg-purple-50 text-purple-700 border-purple-200',
  };

  return (
    <div className={`p-3 rounded-lg border flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 ${levelColors[region.level]}`}>
      <span className="flex-shrink-0 px-2 py-1 rounded bg-white/50 text-xs font-bold border border-black/5 self-start sm:self-center">
        LEVEL {region.level}
      </span>
      <div className="flex-1">
        <p className="font-bold text-sm mb-0.5">{region.regionName}</p>
        <p className="text-xs opacity-90">{DANGER_LEVEL_DESCRIPTIONS[region.level]}</p>
        {region.description && (
          <p className="text-xs mt-1 pt-1 border-t border-black/5 opacity-80 leading-relaxed">
            {region.description}
          </p>
        )}
      </div>
    </div>
  );
}
