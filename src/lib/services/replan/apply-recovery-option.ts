import type { Itinerary, RecoveryOption } from '@/types';

/**
 * RecoveryOption の replacementSlots を Itinerary にマージして新しい Itinerary を返す。
 */
export function applyRecoveryOption(
  itinerary: Itinerary,
  option: RecoveryOption,
): Itinerary {
  const newDays = itinerary.days.map((day) => ({
    ...day,
    activities: [...day.activities],
  }));

  const slotsByDay = new Map<number, typeof option.replacementSlots>();
  for (const slot of option.replacementSlots) {
    const existing = slotsByDay.get(slot.dayNumber) ?? [];
    existing.push(slot);
    slotsByDay.set(slot.dayNumber, existing);
  }

  for (const [dayNumber, slots] of slotsByDay) {
    const dayIdx = newDays.findIndex((day) => day.day === dayNumber);
    if (dayIdx === -1) continue;

    const day = newDays[dayIdx];
    const affectedOriginalTimes = new Set<string>();
    for (const slot of slots) {
      if (slot.startTime) {
        affectedOriginalTimes.add(slot.startTime);
      }
    }

    if (affectedOriginalTimes.size > 0) {
      const affectedIndices: number[] = [];
      for (let index = 0; index < day.activities.length; index++) {
        const activityTime = day.activities[index].time;
        if (activityTime && affectedOriginalTimes.has(activityTime)) {
          affectedIndices.push(index);
        }
      }

      if (affectedIndices.length > 0) {
        const newActivities = slots.map((slot) => ({ ...slot.activity }));

        for (let index = affectedIndices.length - 1; index >= 0; index--) {
          day.activities.splice(affectedIndices[index], 1);
        }

        const insertIdx = Math.min(affectedIndices[0], day.activities.length);
        day.activities.splice(insertIdx, 0, ...newActivities);
        continue;
      }
    }

    applyRecoveryOptionBySlotIndex(day.activities, slots);
  }

  return { ...itinerary, days: newDays };
}

function applyRecoveryOptionBySlotIndex(
  activities: Itinerary['days'][number]['activities'],
  slots: RecoveryOption['replacementSlots'],
): void {
  const newActivities = slots.map((slot) => ({ ...slot.activity }));
  const affectedIndices = slots
    .map((slot) => slot.slotIndex)
    .filter((index) => index < activities.length)
    .sort((a, b) => a - b);

  if (affectedIndices.length > 0) {
    for (let index = affectedIndices.length - 1; index >= 0; index--) {
      activities.splice(affectedIndices[index], 1);
    }

    const insertIdx = Math.min(affectedIndices[0], activities.length);
    activities.splice(insertIdx, 0, ...newActivities);
    return;
  }

  activities.push(...newActivities);
}
