'use client';

import { Cigarette, MapPin, AlertCircle } from 'lucide-react';
import type { SmokingInfo } from '@/lib/types/travel-info';
import type { SectionBaseProps } from '../types';

/**
 * SmokingSection - 喫煙情報セクション
 */
export default function SmokingSection({ data }: SectionBaseProps<SmokingInfo>) {
  return (
    <div className="space-y-6">
      {/* ルール */}
      <div className="space-y-3">
        <h4 className="flex items-center gap-2 font-serif font-bold text-[#2c2c2c]">
          <AlertCircle className="w-5 h-5 text-primary" />
          喫煙ルール・罰則
        </h4>
        <div className="p-5 bg-stone-50 border border-stone-100 rounded-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 opacity-5">
             <Cigarette className="w-24 h-24" />
          </div>
          <p className="text-stone-800 text-lg leading-relaxed relative z-10">{data.rules}</p>
        </div>
      </div>

      {/* 喫煙場所 */}
      <div className="space-y-3">
        <h4 className="flex items-center gap-2 font-serif font-bold text-[#2c2c2c]">
          <MapPin className="w-5 h-5 text-primary" />
          喫煙場所
        </h4>
        <div className="p-5 bg-white border border-stone-100 rounded-xl shadow-sm">
          <p className="text-stone-700 leading-relaxed">{data.areas}</p>
        </div>
      </div>
    </div>
  );
}
