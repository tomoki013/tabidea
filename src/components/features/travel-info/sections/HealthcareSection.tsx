'use client';

import { Droplets, Syringe, Stethoscope, AlertTriangle } from 'lucide-react';
import type { HealthcareInfo } from '@/types';
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
        <div className="p-6 bg-blue-50/30 border border-blue-100 rounded-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-blue-100/50 rounded-full -mr-8 -mt-8" />
          <p className="font-serif font-bold text-stone-800 text-xl mb-1 relative z-10">{data.water}</p>
        </div>
      </div>

      {/* 予防接種 */}
      <div className="space-y-3">
        <h4 className="flex items-center gap-2 font-serif font-bold text-[#2c2c2c]">
          <Syringe className="w-5 h-5 text-primary" />
          推奨される予防接種
        </h4>
        {data.vaccines.length > 0 ? (
          <div className="flex flex-wrap gap-2 bg-[#fcfbf9] p-5 rounded-xl border border-stone-200 border-dashed">
            {data.vaccines.map((v, i) => (
              <span key={i} className="px-4 py-1.5 bg-white border border-stone-200 text-stone-700 rounded-full text-sm font-serif shadow-sm">
                {v}
              </span>
            ))}
          </div>
        ) : (
          <div className="bg-[#fcfbf9] p-5 rounded-xl border border-stone-200 border-dashed">
             <p className="text-stone-500 text-sm font-serif">特に指定はありません</p>
          </div>
        )}
      </div>

      {/* 医療事情 */}
      <div className="space-y-3">
        <h4 className="flex items-center gap-2 font-serif font-bold text-[#2c2c2c]">
          <Stethoscope className="w-5 h-5 text-primary" />
          医療水準・病院
        </h4>
        <div className="bg-[#fcfbf9] rounded-xl p-6 border-l-4 border-l-orange-400 border-y border-r border-stone-200 shadow-sm flex items-start gap-4">
          <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-stone-700 leading-loose font-serif">{data.medicalLevel}</p>
        </div>
      </div>
    </div>
  );
}
