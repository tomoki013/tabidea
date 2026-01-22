'use client';

import { Utensils, Info } from 'lucide-react';
import type { LocalFoodInfo } from '@/types';
import type { SectionBaseProps } from '../types';

/**
 * LocalFoodSection - グルメ情報セクション
 *
 * 代表的な料理、食事のマナー・習慣を表示
 */
export default function LocalFoodSection({ data }: SectionBaseProps<LocalFoodInfo>) {
  return (
    <div className="space-y-6">
      {/* 代表的な料理 */}
      <div className="space-y-3">
        <h4 className="flex items-center gap-2 font-serif font-bold text-[#2c2c2c]">
          <Utensils className="w-5 h-5 text-primary" />
          代表的な料理
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {data.popularDishes.map((dish, index) => (
            <div
              key={index}
              className="p-5 bg-[#fcfbf9] border border-stone-200 rounded-sm shadow-sm flex flex-col h-full relative"
              style={{
                backgroundImage: 'radial-gradient(#e5e7eb 1px, transparent 1px)',
                backgroundSize: '12px 12px'
              }}
            >
              {/* Tape effect */}
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-16 h-6 bg-stone-200/50 rotate-1 shadow-sm backdrop-blur-sm" />

              <div className="flex items-start justify-between gap-2 mb-4 mt-2">
                <h5 className="font-serif font-bold text-xl text-[#2c2c2c] border-b-2 border-primary/20 pb-1">{dish.name}</h5>
                {dish.approximatePrice && (
                  <span className="text-xs font-bold text-stone-600 bg-white border border-stone-200 px-3 py-1 rounded-full whitespace-nowrap shadow-sm">
                    {dish.approximatePrice}
                  </span>
                )}
              </div>
              <p className="text-sm text-stone-700 leading-relaxed flex-grow font-serif">
                {dish.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* 食事のマナー・習慣 */}
      {data.diningEtiquette.length > 0 && (
        <div className="space-y-3">
          <h4 className="flex items-center gap-2 font-serif font-bold text-[#2c2c2c]">
            <Info className="w-5 h-5 text-primary" />
            食事のマナー・習慣
          </h4>
          <ul className="space-y-2">
            {data.diningEtiquette.map((item, index) => (
              <li key={index} className="flex items-start gap-3 p-3 bg-stone-50 rounded-lg">
                <span className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0" />
                <span className="text-sm text-stone-700">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
