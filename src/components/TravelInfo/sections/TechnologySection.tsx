'use client';

import { Zap, Wifi, Smartphone, Plug } from 'lucide-react';
import type { TechnologyInfo } from '@/lib/types/travel-info';
import type { SectionBaseProps } from '../types';

/**
 * TechnologySection - 電源・通信情報セクション
 */
export default function TechnologySection({ data }: SectionBaseProps<TechnologyInfo>) {
  return (
    <div className="space-y-6">
      {/* 電源事情 */}
      <div className="space-y-3">
        <h4 className="flex items-center gap-2 font-serif font-bold text-[#2c2c2c]">
          <Zap className="w-5 h-5 text-primary" />
          電源・コンセント
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <InfoCard
            label="コンセント形状"
            value={data.plugs.join(', ')}
            icon={<Plug className="w-4 h-4 text-stone-500" />}
          />
          <InfoCard
            label="電圧"
            value={data.voltage}
            icon={<Zap className="w-4 h-4 text-stone-500" />}
          />
        </div>
      </div>

      {/* インターネット事情 */}
      <div className="space-y-3">
        <h4 className="flex items-center gap-2 font-serif font-bold text-[#2c2c2c]">
          <Wifi className="w-5 h-5 text-primary" />
          インターネット・Wi-Fi
        </h4>
        <div className="bg-stone-50 rounded-xl p-5 border border-stone-100">
          <ul className="space-y-2">
            {data.internet.map((item, index) => (
              <li key={index} className="flex items-start gap-2.5 text-stone-700">
                <Smartphone className="w-4 h-4 text-primary mt-1 flex-shrink-0" />
                <span className="text-sm leading-relaxed">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function InfoCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="p-5 bg-white border border-stone-100 rounded-xl shadow-sm flex flex-col justify-between h-full">
      <p className="text-xs font-bold text-stone-500 mb-1 tracking-wide">{label}</p>
      <div className="flex items-center gap-2 mt-auto">
        {icon}
        <p className="font-bold text-lg text-[#2c2c2c]">{value}</p>
      </div>
    </div>
  );
}
