import { runSpotCandidatesPipeline } from '@/lib/services/itinerary/pipeline-orchestrator';
import type { NormalizedRequest, SemanticCandidate } from '@/types/itinerary-pipeline';
import type { SemanticSeedPlan } from '@/lib/services/itinerary/steps/semantic-planner';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 9;

interface SpotsRequestBody {
  normalizedRequest: NormalizedRequest;
  seed: SemanticSeedPlan;
  day: number;
  accumulatedCandidates?: SemanticCandidate[];
  modelName: string;
  provider: string;
}

export async function POST(req: Request) {
  let body: SpotsRequestBody;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const result = await runSpotCandidatesPipeline(body);

  if (result.success) {
    return Response.json({
      ok: true,
      candidates: result.candidates,
      warnings: result.warnings,
    });
  }

  return Response.json({
    ok: false,
    error: result.message ?? 'spots_pipeline_failed',
    failedStep: result.failedStep,
  }, { status: 500 });
}
