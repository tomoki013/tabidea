'use client';

import { Bath, Info, CheckCircle2 } from 'lucide-react';
import type { RestroomsInfo } from '@/lib/types/travel-info';
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
        <div className="p-5 bg-stone-50 border border-stone-100 rounded-xl">
          <p className="text-stone-800 text-lg leading-relaxed">{data.availability}</p>
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
              <li key={index} className="flex items-start gap-2 p-3 bg-white border border-stone-100 rounded-lg shadow-sm">
                <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <span className="text-sm text-stone-700">{note}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
