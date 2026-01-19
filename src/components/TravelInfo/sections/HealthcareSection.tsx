'use client';

import { Droplets, Syringe, Stethoscope, AlertTriangle } from 'lucide-react';
import type { HealthcareInfo } from '@/lib/types/travel-info';
import type { SectionBaseProps } from '../types';

/**
 * HealthcareSection - 医療・衛生情報セクション
 */
export default function HealthcareSection({ data }: SectionBaseProps<HealthcareInfo>) {
  return (
    <div className="space-y-6">
      {/* 水事情 */}
      <div className="space-y-3">
        <h4 className="flex items-center gap-2 font-serif font-bold text-[#2c2c2c]">
          <Droplets className="w-5 h-5 text-primary" />
          飲料水
        </h4>
        <div className="p-5 bg-blue-50/50 border border-blue-100 rounded-xl">
          <p className="font-bold text-stone-800 text-lg mb-1">{data.water}</p>
        </div>
      </div>

      {/* 予防接種 */}
      <div className="space-y-3">
        <h4 className="flex items-center gap-2 font-serif font-bold text-[#2c2c2c]">
          <Syringe className="w-5 h-5 text-primary" />
          推奨される予防接種
        </h4>
        {data.vaccines.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {data.vaccines.map((v, i) => (
              <span key={i} className="px-3 py-1.5 bg-stone-100 text-stone-700 rounded-lg text-sm font-medium">
                {v}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-stone-500 text-sm">特に指定はありません</p>
        )}
      </div>

      {/* 医療事情 */}
      <div className="space-y-3">
        <h4 className="flex items-center gap-2 font-serif font-bold text-[#2c2c2c]">
          <Stethoscope className="w-5 h-5 text-primary" />
          医療水準・病院
        </h4>
        <div className="bg-stone-50 rounded-xl p-5 border border-stone-100 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-stone-700 leading-relaxed">{data.medicalLevel}</p>
        </div>
      </div>
    </div>
  );
}
