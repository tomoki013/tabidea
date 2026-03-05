'use client';

import { Cigarette, MapPin, AlertCircle } from 'lucide-react';
import { useTranslations } from "next-intl";
import type { SmokingInfo } from '@/types';
import type { SectionBaseProps } from '../types';

/**
 * SmokingSection - 喫煙情報セクション
 */
export default function SmokingSection({ data }: SectionBaseProps<SmokingInfo>) {
  const t = useTranslations("components.extraUi.travelInfoSections.smoking");

  return (
    <div className="space-y-6">
      {/* ルール */}
      <div className="space-y-3">
        <h4 className="flex items-center gap-2 font-serif font-bold text-[#2c2c2c]">
          <AlertCircle className="w-5 h-5 text-primary" />
          {t("rulesTitle")}
        </h4>
        <div className="p-6 bg-[#fcfbf9] border border-stone-200 rounded-xl relative overflow-hidden shadow-sm">
          <div className="absolute right-[-10px] top-[-10px] opacity-10 rotate-12">
             <Cigarette className="w-32 h-32" />
          </div>
          <p className="text-stone-700 text-lg leading-loose relative z-10 font-serif">{data.rules}</p>
        </div>
      </div>

      {/* 喫煙場所 */}
      <div className="space-y-3">
        <h4 className="flex items-center gap-2 font-serif font-bold text-[#2c2c2c]">
          <MapPin className="w-5 h-5 text-primary" />
          {t("areasTitle")}
        </h4>
        <div className="p-6 bg-white border-2 border-dashed border-stone-200 rounded-xl">
          <p className="text-stone-700 leading-relaxed font-serif">{data.areas}</p>
        </div>
      </div>

      {/* 罰金情報 */}
      {data.fines && (
        <div className="space-y-3">
          <h4 className="flex items-center gap-2 font-serif font-bold text-[#2c2c2c]">
            <AlertCircle className="w-5 h-5 text-red-500" />
            {t("finesTitle")}
          </h4>
          <div className="p-5 bg-red-50/50 border border-red-200 rounded-xl shadow-sm">
            <p className="text-red-900 leading-relaxed font-bold font-serif">{data.fines}</p>
          </div>
        </div>
      )}
    </div>
  );
}
