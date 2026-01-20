'use client';

import { Calendar, Star } from 'lucide-react';
import type { EventsInfo } from '@/types';
import type { SectionBaseProps } from '../types';

/**
 * EventsSection - イベント・祭りセクション
 *
 * 主要なイベント、季節の祭りを表示
 */
export default function EventsSection({ data }: SectionBaseProps<EventsInfo>) {
  return (
    <div className="space-y-6">
      {/* 主要なイベント */}
      <div className="space-y-3">
        <h4 className="flex items-center gap-2 font-serif font-bold text-[#2c2c2c]">
          <Star className="w-5 h-5 text-primary" />
          主要なイベント
        </h4>
        <div className="space-y-3">
          {data.majorEvents.map((event, index) => (
            <EventCard key={index} event={event} />
          ))}
        </div>
      </div>

      {/* 季節の祭り */}
      {data.seasonalFestivals.length > 0 && (
        <div className="space-y-3">
          <h4 className="flex items-center gap-2 font-serif font-bold text-[#2c2c2c]">
            <Calendar className="w-5 h-5 text-primary" />
            季節の祭り
          </h4>
          <div className="space-y-3">
            {data.seasonalFestivals.map((festival, index) => (
              <EventCard key={index} event={festival} variant="seasonal" />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * イベントカードコンポーネント
 */
function EventCard({
  event,
  variant = 'default'
}: {
  event: { name: string; date: string; description: string };
  variant?: 'default' | 'seasonal';
}) {
  return (
    <div className={`
      p-5 rounded-xl border flex flex-col sm:flex-row gap-4
      ${variant === 'default'
        ? 'bg-white border-stone-100 shadow-sm'
        : 'bg-orange-50/50 border-orange-100'
      }
    `}>
      <div className="flex-shrink-0">
        <div className={`
          inline-flex flex-col items-center justify-center w-16 h-16 rounded-lg border
          ${variant === 'default'
            ? 'bg-stone-50 border-stone-200 text-stone-600'
            : 'bg-white border-orange-200 text-orange-600'
          }
        `}>
          <span className="text-[10px] font-bold uppercase tracking-wider">DATE</span>
          <span className="text-xs font-bold text-center px-1 leading-tight mt-1">
            {event.date}
          </span>
        </div>
      </div>

      <div>
        <h5 className="font-bold text-lg text-[#2c2c2c] mb-1">{event.name}</h5>
        <p className="text-sm text-stone-600 leading-relaxed">
          {event.description}
        </p>
      </div>
    </div>
  );
}
