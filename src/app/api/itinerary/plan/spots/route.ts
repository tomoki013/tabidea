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
  try {
    let body: SpotsRequestBody;
    try {
      body = await req.json();
    } catch (error) {
      console.error('[POST /api/itinerary/plan/spots] Invalid request body:', error);
      return Response.json({ ok: false, error: 'Invalid request body' }, { status: 400 });
    }

    const result = await runSpotCandidatesPipeline(body);

    if (result.success) {
      return Response.json({
        ok: true,
        candidates: result.candidates,
        warnings: result.warnings,
      });
    }

    console.error('[POST /api/itinerary/plan/spots] Spots pipeline failed:', {
      failedStep: result.failedStep,
      message: result.message,
      day: body.day,
    });
    return Response.json({
      ok: false,
      error: result.message ?? 'spots_pipeline_failed',
      failedStep: result.failedStep,
    }, { status: 500 });
  } catch (error) {
    console.error('[POST /api/itinerary/plan/spots] Unexpected error:', error);
    return Response.json({ ok: false, error: 'spots_pipeline_failed' }, { status: 500 });
  }
}
