import type { Itinerary } from '@/types/itinerary';
import { regenerateItinerary } from '@/lib/services/plan-mutation';
import { synchronizeItineraryStructures } from './sync';

export type TripReplanScope =
  | { type: 'block'; dayIndex: number; blockId: string }
  | { type: 'day'; dayIndex: number }
  | { type: 'style' }
  | { type: 'weather_fallback'; dayIndex?: number; blockId?: string };

function buildReplanInstruction(scope: TripReplanScope, instruction: string): string {
  switch (scope.type) {
    case 'block':
      return `Replan only the targeted block "${scope.blockId}" on day ${scope.dayIndex + 1}. Preserve every other day and block as-is. ${instruction}`;
    case 'day':
      return `Replan only day ${scope.dayIndex + 1}. Preserve every other day exactly. ${instruction}`;
    case 'weather_fallback':
      return `Apply a weather-safe fallback. Prioritize indoor or low-risk alternatives while preserving the trip structure. ${instruction}`;
    case 'style':
    default:
      return `Adjust the overall travel style while preserving the trip length, destination, and locked commitments. ${instruction}`;
  }
}

function mergeScopedResult(base: Itinerary, candidate: Itinerary, scope: TripReplanScope): Itinerary {
  switch (scope.type) {
    case 'style':
      return synchronizeItineraryStructures(candidate, base);

    case 'day': {
      const next = structuredClone(base) as Itinerary;
      next.days[scope.dayIndex] = candidate.days[scope.dayIndex] ?? next.days[scope.dayIndex];
      return synchronizeItineraryStructures(next, base);
    }

    case 'block': {
      const targetDayIndex = scope.dayIndex;
      const targetBlockId = scope.blockId;
      const baseDay = base.days[targetDayIndex];
      const candidateDay = candidate.days[targetDayIndex];
      if (!baseDay?.blocks || !candidateDay?.blocks) {
        return synchronizeItineraryStructures(base, base);
      }

      const baseBlockIndex = baseDay.blocks.findIndex((block) => block.blockId === targetBlockId);
      const replacementBlock =
        candidateDay.blocks.find((block) => block.blockId === targetBlockId)
        ?? (baseBlockIndex >= 0 ? candidateDay.blocks[baseBlockIndex] : undefined);

      if (!replacementBlock || baseBlockIndex === -1) {
        return synchronizeItineraryStructures(base, base);
      }

      const next = structuredClone(base) as Itinerary;
      if (!next.days[targetDayIndex]?.blocks) {
        return synchronizeItineraryStructures(base, base);
      }

      next.days[targetDayIndex].blocks![baseBlockIndex] = replacementBlock;
      return synchronizeItineraryStructures(next, base);
    }

    case 'weather_fallback': {
      if (typeof scope.dayIndex === 'number' && typeof scope.blockId === 'string') {
        return mergeScopedResult(base, candidate, {
          type: 'block',
          dayIndex: scope.dayIndex,
          blockId: scope.blockId,
        });
      }

      if (typeof scope.dayIndex === 'number') {
        return mergeScopedResult(base, candidate, {
          type: 'day',
          dayIndex: scope.dayIndex,
        });
      }

      return synchronizeItineraryStructures(candidate, base);
    }

    default:
      return synchronizeItineraryStructures(candidate, base);
  }
}

export async function replanTripItinerary(params: {
  itinerary: Itinerary;
  scope: TripReplanScope;
  instruction: string;
}): Promise<Itinerary> {
  const base = synchronizeItineraryStructures(params.itinerary, params.itinerary);

  const regeneration = await regenerateItinerary({
    currentPlan: base,
    chatHistory: [
      {
        role: 'user',
        text: buildReplanInstruction(params.scope, params.instruction),
      },
    ],
  });

  if (!regeneration.ok) {
    throw new Error(regeneration.error);
  }

  const candidate = synchronizeItineraryStructures(regeneration.data.itinerary, base);
  return mergeScopedResult(base, candidate, params.scope);
}
