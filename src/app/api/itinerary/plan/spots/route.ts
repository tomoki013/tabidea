import { deprecatedPipelineResponse } from '@/lib/api/deprecated-pipeline';

export const runtime = 'nodejs';

export async function POST() {
  return deprecatedPipelineResponse('/api/itinerary/plan/spots');
}
