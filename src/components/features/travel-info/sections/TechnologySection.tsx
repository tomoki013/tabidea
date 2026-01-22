'use client';

import { Zap, Wifi, Smartphone, Plug } from 'lucide-react';
import type { TechnologyInfo } from '@/types';
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
        <div className="bg-[#fcfbf9] rounded-xl p-6 border border-stone-200 relative shadow-sm">
          <div className="absolute top-0 right-0 w-16 h-16 border-t-4 border-r-4 border-primary/10 rounded-tr-xl" />
          <ul className="space-y-3 relative z-10">
            {data.internet.map((item, index) => (
              <li key={index} className="flex items-start gap-3 text-stone-700">
                <div className="bg-white p-1 rounded-full border border-stone-200 shadow-sm mt-0.5">
                  <Smartphone className="w-3 h-3 text-primary" />
                </div>
                <span className="text-sm leading-relaxed font-serif">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* SIMカード事情 */}
      {data.sim && (
        <div className="space-y-3">
          <h4 className="flex items-center gap-2 font-serif font-bold text-[#2c2c2c]">
            <Smartphone className="w-5 h-5 text-primary" />
            SIMカード
          </h4>
          <div className="bg-white rounded-xl p-6 border border-stone-200 border-dashed shadow-sm">
            <p className="text-stone-700 leading-relaxed text-sm font-serif">{data.sim}</p>
          </div>
        </div>
      )}
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
    <div className="p-5 bg-[#fcfbf9] border border-stone-200 rounded-xl shadow-sm flex flex-col justify-between h-full relative overflow-hidden group hover:shadow-md transition-all">
       <div className="absolute top-0 right-0 w-8 h-8 bg-stone-100/50 rounded-bl-2xl -mr-4 -mt-4 transition-all group-hover:bg-primary/10" />
      <p className="text-xs font-bold text-stone-500 mb-2 tracking-wide uppercase">{label}</p>
      <div className="flex items-center gap-3 mt-auto">
        {icon}
        <p className="font-serif font-bold text-xl text-[#2c2c2c]">{value}</p>
      </div>
    </div>
  );
}
