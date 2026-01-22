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
  const isMofaSource = source?.sourceType === 'official_api';

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
        className={`relative overflow-hidden rounded-3xl border shadow-sm ${style.border} bg-white/50 backdrop-blur-sm`}
      >
        <div className="p-8 flex flex-col sm:flex-row items-start sm:items-center gap-6 sm:gap-8">
          <div className={`flex-shrink-0 p-6 rounded-2xl ${style.bg} ${style.text} shadow-inner`}>
            <DangerIcon className="w-12 h-12" />
          </div>

          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-3">
              <span className="inline-block px-3 py-1 rounded-full bg-stone-100 text-stone-500 text-[10px] font-bold tracking-widest uppercase">
                Security Level
              </span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-4">
              <h3 className={`text-4xl font-serif font-bold ${style.text}`}>
                Lv.{data.dangerLevel}
              </h3>
              <span className={`text-xl font-bold ${style.text} opacity-80`}>
                {style.label}
              </span>
            </div>

            <p className="text-stone-600 leading-relaxed font-medium">
              {data.dangerLevelDescription}
            </p>

            {data.isPartialCountryRisk && data.maxCountryLevel !== undefined && (
              <div className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-orange-50 text-orange-800 text-xs font-bold rounded-xl border border-orange-100/50">
                <AlertTriangle className="w-3.5 h-3.5" />
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
          className="bg-white rounded-3xl border border-stone-100 overflow-hidden shadow-sm"
        >
          <div className="px-8 py-4 bg-stone-50/50 border-b border-stone-100 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-stone-200/50 flex items-center justify-center">
              <MapPinned className="w-4 h-4 text-stone-500" />
            </div>
            <h4 className="font-serif font-bold text-stone-700 text-base">地域別の危険情報</h4>
          </div>
          <div className="p-8">
            <p className="text-xs text-stone-400 mb-6 flex items-center gap-1.5 font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
              以下の地域へ渡航する際は特に注意が必要です
            </p>
            <div className="grid gap-4">
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
            <div className="bg-white p-8 rounded-3xl border border-stone-100 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-primary/20" />
              <h4 className="font-serif font-bold text-stone-800 mb-4 text-base flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <ShieldCheck className="w-4 h-4" />
                </span>
                概要
              </h4>
              <p className="font-medium text-stone-700 leading-loose text-base">
                {data.lead}
              </p>
            </div>
          )}

          {data.subText && (
            <details className="group bg-white rounded-3xl border border-stone-100 shadow-sm overflow-hidden">
              <summary className="flex items-center justify-between p-6 cursor-pointer hover:bg-stone-50/50 transition-colors list-none select-none">
                <span className="font-bold text-stone-700 flex items-center gap-3 text-base font-serif">
                  <span className="w-2 h-2 rounded-full bg-stone-300 group-open:bg-primary transition-colors" />
                  詳細な安全情報
                </span>
                <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center group-hover:bg-stone-200 transition-colors">
                  <ChevronDown className="w-4 h-4 text-stone-500 transition-transform duration-300 group-open:rotate-180" />
                </div>
              </summary>
              <div className="px-8 pb-8 pt-2 text-sm text-stone-600 leading-loose">
                <p className="whitespace-pre-wrap pl-5 border-l-2 border-stone-100">{data.subText}</p>
              </div>
            </details>
          )}
        </motion.div>
      )}

      {/* 警告・注意事項 */}
      {data.warnings.length > 0 && (
        <div className="space-y-6">
          <h4 className="flex items-center gap-3 font-serif font-bold text-stone-700 text-lg">
            <span className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
              <AlertTriangle className="w-4 h-4" />
            </span>
            主な注意事項
          </h4>
          <ul className="grid gap-4">
            {data.warnings.map((warning, index) => (
              <motion.li
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-start gap-5 p-6 bg-white border border-stone-100 rounded-3xl shadow-sm hover:shadow-md transition-all duration-300"
              >
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-stone-50 text-stone-400 flex items-center justify-center text-sm font-serif font-bold mt-0.5 border border-stone-100">
                  {index + 1}
                </span>
                <p className="text-stone-600 text-base leading-relaxed font-medium">
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
        {isMofaSource ? (
          <p className="text-[10px] text-stone-400">
            出典：外務省 海外安全情報オープンデータ 提供情報
            {source?.sourceUrl && (
              <>
                （
                <a
                  href={source.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-primary hover:underline"
                >
                  {source.sourceUrl}
                </a>
                ）
              </>
            )}
            を加工して作成
          </p>
        ) : (
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
        )}
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
