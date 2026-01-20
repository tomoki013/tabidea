'use client';

import { Wine, Calendar, AlertCircle, Info } from 'lucide-react';
import type { AlcoholInfo } from '@/types';
import type { SectionBaseProps } from '../types';

/**
 * AlcoholSection - 飲酒情報セクション
 */
export default function AlcoholSection({ data }: SectionBaseProps<AlcoholInfo>) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* ルール */}
        <div className="space-y-3">
          <h4 className="flex items-center gap-2 font-serif font-bold text-[#2c2c2c]">
            <AlertCircle className="w-5 h-5 text-primary" />
            販売・飲酒ルール
          </h4>
          <div className="p-5 bg-stone-50 border border-stone-100 rounded-xl h-full">
            <p className="text-stone-800 text-sm leading-relaxed">{data.rules}</p>
          </div>
        </div>

        {/* 年齢制限 */}
        <div className="space-y-3">
          <h4 className="flex items-center gap-2 font-serif font-bold text-[#2c2c2c]">
            <Calendar className="w-5 h-5 text-primary" />
            年齢制限
          </h4>
          <div className="p-5 bg-white border border-stone-100 rounded-xl shadow-sm h-full flex items-center justify-center">
             <div className="text-center">
                <p className="text-xs text-stone-500 mb-1">飲酒・購入可能年齢</p>
                <p className="text-2xl font-bold text-[#2c2c2c]">{data.ageLimit}</p>
             </div>
          </div>
        </div>
      </div>

      {/* 補足事項 */}
      {data.notes.length > 0 && (
        <div className="space-y-3">
          <h4 className="flex items-center gap-2 font-serif font-bold text-[#2c2c2c]">
            <Info className="w-5 h-5 text-primary" />
            その他の注意点
          </h4>
          <div className="bg-orange-50/50 rounded-xl p-5 border border-orange-100">
            <ul className="space-y-2">
              {data.notes.map((note, index) => (
                <li key={index} className="flex items-start gap-2.5 text-stone-700">
                  <span className="block w-1.5 h-1.5 mt-2 rounded-full bg-orange-400 flex-shrink-0" />
                  <span className="text-sm leading-relaxed">{note}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
