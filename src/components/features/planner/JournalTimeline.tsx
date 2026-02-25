'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { FaMapMarkerAlt, FaPlus, FaTrash, FaClock, FaCamera } from 'react-icons/fa';
import { JournalSheet, Tape, Stamp, HandwrittenText } from '@/components/ui/journal';
import { EditableText } from '@/components/ui/editable/EditableText';
import { DayPlan, Activity, TransitInfo, TimelineItem } from '@/types';
import { useSpotCoordinates } from '@/lib/hooks/useSpotCoordinates';
import { buildTimeline } from '@/lib/utils/plan';
import { getActivityIcon } from '@/lib/utils/activity-icon';
import { cn } from '@/lib/utils';
import { MapRouteViewRenderer } from './map-route';
import type { MapProviderType } from '@/lib/limits/config';

interface JournalTimelineProps {
  days: DayPlan[];
  destination: string;
  enableEditing?: boolean;
  onUpdateDay?: (dayIndex: number, updates: Partial<DayPlan>) => void;
  onUpdateActivity?: (dayIndex: number, actIndex: number, updates: Partial<Activity>) => void;
  onUpdateTransit?: (dayIndex: number, originalTransit: TransitInfo, updates: Partial<TransitInfo>) => void;
  onAddActivity?: (dayIndex: number) => void;
  onDeleteActivity?: (dayIndex: number, actIndex: number) => void;
  /** マッププロバイダー（ティア別: static/leaflet/google_maps） */
  mapProvider?: MapProviderType;
}

export default function JournalTimeline({
  days,
  destination,
  enableEditing = false,
  onUpdateDay,
  onUpdateActivity,
  onUpdateTransit,
  onAddActivity,
  onDeleteActivity,
  mapProvider = "google_maps",
}: JournalTimelineProps) {
  const { enrichedDays } = useSpotCoordinates(days, destination);

  return (
    <div className="space-y-12 max-w-4xl mx-auto">
      {days.map((day, dayIndex) => {
        const timelineItems = buildTimeline(day);
        const enrichedDay = enrichedDays.find(d => d.day === day.day);

        return (
          <div key={day.day} className="relative group/day">
            {/* Notebook Binding Effect (Left side holes?) - JournalSheet 'notebook' variant handles lines */}
            <JournalSheet variant="notebook" className="min-h-[600px] shadow-xl transform transition-transform hover:scale-[1.002]">

              {/* Decorative Date Stamp */}
              <div className="absolute top-6 right-6 z-20 transform rotate-12 opacity-80">
                 <div className="border-2 border-red-800 text-red-900 rounded-full w-20 h-20 flex flex-col items-center justify-center p-2 font-bold font-serif bg-red-100/50 backdrop-blur-sm shadow-sm">
                    <span className="text-[0.6rem] uppercase tracking-wider">Day</span>
                    <span className="text-3xl leading-none">{day.day}</span>
                 </div>
              </div>

              {/* Day Title Header */}
              <div className="mb-8 border-b-2 border-stone-800/20 pb-2 mr-24">
                 <div className="flex items-end gap-2">
                    <HandwrittenText tag="h2" className="text-3xl font-bold text-stone-800">
                       {enableEditing ? (
                          <EditableText
                             value={day.title}
                             onChange={(val) => onUpdateDay?.(dayIndex, { title: val })}
                             isEditable={true}
                             placeholder="タイトルを入力..."
                             className="bg-transparent border-none focus:ring-0 w-full"
                          />
                       ) : (
                          day.title
                       )}
                    </HandwrittenText>
                 </div>
              </div>

              {/* Map Polaroid (If available) */}
              {enrichedDay && enrichedDay.activities.length > 0 && (
                 <div className="float-right ml-4 mb-4 relative w-48 rotate-2 hover:rotate-0 transition-transform duration-300 z-10 hidden sm:block">
                    <Tape color="yellow" position="top-center" className="-top-3 w-20 opacity-80" />
                    <div className="bg-white p-2 pb-8 shadow-md border border-stone-200">
                       <div className="h-32 w-full relative bg-stone-100 overflow-hidden">
                          <MapRouteViewRenderer mapProvider={mapProvider} days={[enrichedDay]} destination={destination} className="w-full h-full pointer-events-none" />
                       </div>
                       <p className="text-center font-hand text-xs text-stone-500 mt-2">Today's Route</p>
                    </div>
                 </div>
              )}

              {/* Timeline Items */}
              <div className="space-y-8 relative pl-2">
                 {/* Vertical Line for Time */}
                 <div className="absolute left-[4.5rem] top-0 bottom-0 w-0.5 bg-red-300/30" />

                 {timelineItems.map((item, index) => {
                    const isTransit = item.itemType === 'transit';

                    if (isTransit) {
                       const transit = item.data as TransitInfo;
                       return (
                          <div key={`transit-${index}`} className="flex gap-4 relative group/item">
                             {/* Time Column */}
                             <div className="w-16 pt-1 text-right shrink-0">
                                <span className="font-mono text-xs text-stone-400 block">{transit.departure.time || '--:--'}</span>
                             </div>

                             {/* Content */}
                             <div className="flex-1 pb-4">
                                <div className="flex items-center gap-2 text-stone-500 mb-1">
                                   <div className="w-2 h-2 rounded-full bg-stone-300" />
                                   <div className="flex-1 h-px bg-stone-300/50 border-t border-dashed border-stone-400" />
                                   <span className="text-xs font-hand bg-stone-100 px-2 py-0.5 rounded-full border border-stone-200">
                                      Moving: {transit.duration || '??min'}
                                   </span>
                                </div>

                                <div className="pl-4 border-l-2 border-stone-200 ml-1 py-2">
                                   <div className="flex items-center gap-2 text-sm text-stone-600 font-hand">
                                      {enableEditing ? (
                                         <EditableText
                                            value={transit.memo || ''}
                                            onChange={(val) => onUpdateTransit?.(dayIndex, transit, { memo: val })}
                                            isEditable={true}
                                            placeholder="移動のメモ（例: 新幹線 No.123）"
                                            className="w-full bg-stone-50/50 italic"
                                         />
                                      ) : (
                                         <span className="italic">{transit.memo || `${transit.departure.place} → ${transit.arrival.place}`}</span>
                                      )}
                                   </div>
                                </div>
                             </div>
                          </div>
                       );
                    }

                    // Activity
                    const act = item.data as Activity;
                    const actIndex = day.activities.indexOf(act); // Need distinct index if possible, or pass item ref
                    const iconInfo = getActivityIcon(act.activity);

                    return (
                       <div key={`activity-${index}`} className="flex gap-4 relative group/item">
                          {/* Time Column */}
                          <div className="w-16 pt-2 text-right shrink-0">
                             {enableEditing ? (
                                <EditableText
                                   value={act.time}
                                   onChange={(val) => onUpdateActivity?.(dayIndex, actIndex, { time: val })}
                                   isEditable={true}
                                   type="time"
                                   className="font-hand font-bold text-lg text-stone-600 w-full text-right bg-transparent border-b border-stone-300 border-dashed"
                                />
                             ) : (
                                <span className="font-hand font-bold text-lg text-stone-600">{act.time}</span>
                             )}
                          </div>

                          {/* Content */}
                          <div className="flex-1 pb-6 border-b border-stone-200/50 border-dashed">
                             <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                   <div className="flex items-center gap-2 mb-1">
                                      <span className="text-xl">{iconInfo.icon}</span>
                                      <div className="flex-1">
                                         {enableEditing ? (
                                            <EditableText
                                               value={act.activity}
                                               onChange={(val) => onUpdateActivity?.(dayIndex, actIndex, { activity: val })}
                                               isEditable={true}
                                               className="font-hand font-bold text-xl text-stone-800 bg-transparent border-none w-full"
                                            />
                                         ) : (
                                            <HandwrittenText className="text-xl font-bold text-stone-800">{act.activity}</HandwrittenText>
                                         )}
                                      </div>
                                   </div>

                                   <div className="pl-7">
                                      {enableEditing ? (
                                         <EditableText
                                            value={act.description}
                                            onChange={(val) => onUpdateActivity?.(dayIndex, actIndex, { description: val })}
                                            isEditable={true}
                                            multiline
                                            className="font-hand text-stone-600 leading-relaxed w-full min-h-[60px] bg-transparent border-b border-stone-200 resize-none focus:border-stone-400 transition-colors"
                                         />
                                      ) : (
                                         <HandwrittenText className="text-stone-600 leading-relaxed text-sm">
                                            {act.description}
                                         </HandwrittenText>
                                      )}
                                   </div>
                                </div>

                                {/* Delete Button (Edit Mode Only) */}
                                {enableEditing && (
                                   <button
                                      onClick={() => onDeleteActivity?.(dayIndex, actIndex)}
                                      className="text-stone-300 hover:text-red-400 p-2 opacity-0 group-hover/item:opacity-100 transition-opacity"
                                      title="削除"
                                   >
                                      <FaTrash />
                                   </button>
                                )}
                             </div>
                          </div>
                       </div>
                    );
                 })}

                 {/* Add Button */}
                 {enableEditing && (
                    <div className="pl-20 mt-4">
                       <button
                          onClick={() => onAddActivity?.(dayIndex)}
                          className="flex items-center gap-2 text-stone-400 hover:text-primary font-hand text-sm border-2 border-dashed border-stone-300 hover:border-primary rounded-full px-4 py-2 transition-all w-full justify-center"
                       >
                          <FaPlus /> 予定を書き足す
                       </button>
                    </div>
                 )}
              </div>

              {/* Bottom Note Area */}
              <div className="mt-8 pt-4 border-t-4 border-double border-stone-300">
                 <p className="text-xs font-mono text-stone-400 mb-2 tracking-widest uppercase">Memo / Expenses</p>
                 <div className="h-24 w-full bg-[linear-gradient(to_right,#e5e7eb_1px,transparent_1px),linear-gradient(to_bottom,#e5e7eb_1px,transparent_1px)] bg-[size:20px_20px] rounded-sm p-4 text-stone-500 font-hand text-sm opacity-60">
                    自由記入欄（近日公開予定...）
                 </div>
              </div>

            </JournalSheet>
          </div>
        );
      })}
    </div>
  );
}
