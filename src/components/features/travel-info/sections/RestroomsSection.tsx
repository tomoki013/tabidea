'use client';

import { Bath, Info, CheckCircle2 } from 'lucide-react';
import type { RestroomsInfo } from '@/types';
import type { SectionBaseProps } from '../types';

/**
 * RestroomsSection - トイレ事情セクション
 */
export default function RestroomsSection({ data }: SectionBaseProps<RestroomsInfo>) {
  return (
    <div className="space-y-6">
      {/* 普及状況・清潔度 */}
      <div className="space-y-3">
        <h4 className="flex items-center gap-2 font-serif font-bold text-[#2c2c2c]">
          <Bath className="w-5 h-5 text-primary" />
          トイレの清潔度・普及状況
        </h4>
        <div className="p-6 bg-[#fcfbf9] border border-stone-200 rounded-xl shadow-sm relative overflow-hidden">
           <div className="absolute left-0 top-0 w-1 h-full bg-primary/20" />
          <p className="text-stone-700 text-lg leading-loose font-serif pl-4">{data.availability}</p>
        </div>
      </div>

      {/* 注意点 */}
      {data.notes.length > 0 && (
        <div className="space-y-3">
          <h4 className="flex items-center gap-2 font-serif font-bold text-[#2c2c2c]">
            <Info className="w-5 h-5 text-primary" />
            利用時の注意
          </h4>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {data.notes.map((note, index) => (
              <li key={index} className="flex items-start gap-3 p-4 bg-white border border-stone-100 rounded-xl shadow-sm hover:border-primary/20 transition-colors">
                <CheckCircle2 className="w-5 h-5 text-stone-400 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-stone-700 font-serif leading-relaxed">{note}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
