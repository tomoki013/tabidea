'use client';

import { ShoppingBag, MapPin, Tag } from 'lucide-react';
import type { SouvenirInfo } from '@/types';
import type { SectionBaseProps } from '../types';

/**
 * SouvenirSection - お土産・買い物セクション
 *
 * 人気のお土産、おすすめの買い物エリア、免税情報を表示
 */
export default function SouvenirSection({ data }: SectionBaseProps<SouvenirInfo>) {
  return (
    <div className="space-y-6">
      {/* 人気のお土産 */}
      <div className="space-y-3">
        <h4 className="flex items-center gap-2 font-serif font-bold text-[#2c2c2c]">
          <ShoppingBag className="w-5 h-5 text-primary" />
          人気のお土産
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {data.popularItems.map((item, index) => (
            <div
              key={index}
              className="p-5 bg-white border border-stone-100 rounded-xl shadow-sm flex flex-col h-full"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <h5 className="font-bold text-lg text-[#2c2c2c]">{item.name}</h5>
                {item.approximatePrice && (
                  <span className="text-xs font-bold text-stone-500 bg-stone-100 px-2 py-1 rounded-full whitespace-nowrap">
                    {item.approximatePrice}
                  </span>
                )}
              </div>
              <p className="text-sm text-stone-600 leading-relaxed flex-grow">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* おすすめの買い物エリア */}
      {data.shoppingAreas.length > 0 && (
        <div className="space-y-3">
          <h4 className="flex items-center gap-2 font-serif font-bold text-[#2c2c2c]">
            <MapPin className="w-5 h-5 text-primary" />
            おすすめの買い物エリア
          </h4>
          <div className="flex flex-wrap gap-2">
            {data.shoppingAreas.map((area, index) => (
              <span
                key={index}
                className="px-4 py-2 bg-white border border-stone-200 text-stone-700 rounded-lg text-sm shadow-sm"
              >
                {area}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 免税情報 */}
      {data.taxFreeInfo && (
        <div className="p-5 bg-stone-50 rounded-xl border border-stone-200">
          <h4 className="flex items-center gap-2 font-bold text-stone-700 mb-2 text-sm">
            <Tag className="w-4 h-4" />
            免税情報
          </h4>
          <p className="text-sm text-stone-600 leading-relaxed">
            {data.taxFreeInfo}
          </p>
        </div>
      )}
    </div>
  );
}
