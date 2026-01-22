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
          <div className="p-6 bg-[#fcfbf9] border border-stone-200 rounded-xl h-full shadow-sm">
            <p className="text-stone-700 text-sm leading-loose font-serif">{data.rules}</p>
          </div>
        </div>

        {/* 年齢制限 */}
        <div className="space-y-3">
          <h4 className="flex items-center gap-2 font-serif font-bold text-[#2c2c2c]">
            <Calendar className="w-5 h-5 text-primary" />
            年齢制限
          </h4>
          <div className="p-5 bg-white border-2 border-primary/20 border-dashed rounded-xl shadow-sm h-full flex items-center justify-center relative overflow-hidden">
             <div className="absolute inset-0 bg-primary/5 rounded-full blur-2xl transform scale-150" />
             <div className="text-center relative z-10">
                <p className="text-xs text-stone-500 mb-1 font-bold uppercase tracking-widest">Legal Age</p>
                <p className="text-4xl font-serif font-bold text-primary">{data.ageLimit}</p>
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
          <div className="bg-[#fffaf5] rounded-xl p-6 border border-orange-100 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-8 h-8 border-t border-r border-orange-200 rounded-tr-lg" />
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b border-l border-orange-200 rounded-bl-lg" />

            <ul className="space-y-3 relative z-10">
              {data.notes.map((note, index) => (
                <li key={index} className="flex items-start gap-3 text-stone-700">
                  <span className="block w-1.5 h-1.5 mt-2 rounded-full bg-orange-400 flex-shrink-0" />
                  <span className="text-sm leading-relaxed font-serif">{note}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
