'use client';

import {
  Coins,
  Languages,
  Clock,
  ArrowRightLeft,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import type { BasicCountryInfo } from '@/lib/types/travel-info';
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
    <div className="p-5 bg-white border border-stone-100 rounded-xl shadow-sm">
      <p className="text-xs font-bold text-stone-500 mb-1 tracking-wide">{label}</p>
      <div className="flex items-center gap-2">
        {icon}
        <p className="font-bold text-lg text-[#2c2c2c]">{value}</p>
      </div>
      {subValue && (
        <p className="text-xs text-stone-400 mt-1">{subValue}</p>
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
