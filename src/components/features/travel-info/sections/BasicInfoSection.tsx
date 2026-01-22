'use client';

import {
  Coins,
  Languages,
  Clock,
  ArrowRightLeft,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import type { BasicCountryInfo } from '@/types';
import type { SectionBaseProps } from '../types';

/**
 * BasicInfoSection - 基本情報セクション
 *
 * 通貨、為替レート、言語、タイムゾーン情報を表示
 */
export default function BasicInfoSection({ data }: SectionBaseProps<BasicCountryInfo>) {
  return (
    <div className="space-y-6">
      {/* 通貨情報 */}
      <div className="space-y-3">
        <h4 className="flex items-center gap-2 font-serif font-bold text-[#2c2c2c]">
          <Coins className="w-5 h-5 text-primary" />
          通貨情報
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <InfoCard
            label="通貨"
            value={data.currency.name}
            subValue={`${data.currency.code} (${data.currency.symbol})`}
          />
          {data.exchangeRate && (
            <InfoCard
              label="為替レート"
              value={`1 ${data.currency.code} = ${data.exchangeRate.rate.toFixed(2)} ${data.exchangeRate.baseCurrency}`}
              subValue={`更新: ${formatUpdateDate(data.exchangeRate.updatedAt)}`}
              icon={
                data.exchangeRate.rate > 100 ? (
                  <TrendingUp className="w-4 h-4 text-green-500" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-500" />
                )
              }
            />
          )}
        </div>
      </div>

      {/* 言語情報 */}
      <div className="space-y-3">
        <h4 className="flex items-center gap-2 font-serif font-bold text-[#2c2c2c]">
          <Languages className="w-5 h-5 text-primary" />
          言語
        </h4>
        <div className="flex flex-wrap gap-2">
          {data.languages.map((language, index) => (
            <span
              key={index}
              className="px-3 py-1.5 bg-stone-100 text-stone-700 rounded-full text-sm"
            >
              {language}
            </span>
          ))}
        </div>
      </div>

      {/* 時差情報 */}
      <div className="space-y-3">
        <h4 className="flex items-center gap-2 font-serif font-bold text-[#2c2c2c]">
          <Clock className="w-5 h-5 text-primary" />
          時差
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <InfoCard
            label="タイムゾーン"
            value={data.timezone}
          />
          <InfoCard
            label="日本との時差"
            value={data.timeDifference}
            icon={<ArrowRightLeft className="w-4 h-4 text-primary" />}
          />
        </div>
      </div>
    </div>
  );
}

/**
 * 情報カード
 */
function InfoCard({
  label,
  value,
  subValue,
  icon,
}: {
  label: string;
  value: string;
  subValue?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="p-5 bg-[#fcfbf9] border border-stone-200 rounded-xl shadow-sm relative overflow-hidden group hover:shadow-md transition-all duration-300">
      {/* Decorative corner */}
      <div className="absolute top-0 right-0 w-8 h-8 bg-stone-100/50 rounded-bl-2xl -mr-4 -mt-4 transition-all group-hover:bg-primary/10" />

      <p className="text-xs font-bold text-stone-500 mb-2 tracking-wide font-sans uppercase">{label}</p>
      <div className="flex items-center gap-3">
        {icon && <div className="text-primary/80">{icon}</div>}
        <p className="font-serif font-bold text-xl text-[#2c2c2c]">{value}</p>
      </div>
      {subValue && (
        <div className="mt-2 pt-2 border-t border-dashed border-stone-200">
          <p className="text-xs text-stone-400 font-mono">{subValue}</p>
        </div>
      )}
    </div>
  );
}

/**
 * 更新日時をフォーマット
 */
function formatUpdateDate(date: Date): string {
  return new Intl.DateTimeFormat('ja-JP', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}
