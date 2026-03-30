import { deprecatedPipelineResponse } from '@/lib/api/deprecated-pipeline';

export const runtime = 'nodejs';

export async function GET() {
  return deprecatedPipelineResponse('/api/plan-generation/session/[id]');
}
