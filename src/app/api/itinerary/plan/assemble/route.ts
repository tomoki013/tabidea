import { runAssemblePipeline } from '@/lib/services/itinerary/pipeline-orchestrator';
import type { NormalizedRequest, SemanticCandidate } from '@/types/itinerary-pipeline';
import type { SemanticSeedPlan } from '@/lib/services/itinerary/steps/semantic-planner';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 25;

interface AssembleRequestBody {
  normalizedRequest: NormalizedRequest;
  seed: SemanticSeedPlan;
  candidates: SemanticCandidate[];
  metadata: {
    modelName: string;
    narrativeModelName: string;
    modelTier: 'flash' | 'pro';
    provider: string;
    timeoutMitigationUsed: boolean;
  };
}

export async function POST(req: Request) {
  try {
    let body: AssembleRequestBody;
    try {
      body = await req.json();
    } catch (error) {
      console.error('[POST /api/itinerary/plan/assemble] Invalid request body:', error);
      return Response.json({ ok: false, error: 'Invalid request body' }, { status: 400 });
    }

    const result = await runAssemblePipeline(body);

    if (result.success) {
      return Response.json({
        ok: true,
        timeline: result.timeline,
        destination: result.destination,
        description: result.description,
        heroImage: result.heroImage ?? null,
        warnings: result.warnings,
        metadata: result.metadata,
      });
    }

    console.error('[POST /api/itinerary/plan/assemble] Assemble pipeline failed:', {
      failedStep: result.failedStep,
      message: result.message,
      candidateCount: body.candidates?.length ?? 0,
    });
    return Response.json({
      ok: false,
      error: result.message ?? 'assemble_pipeline_failed',
      failedStep: result.failedStep,
    }, { status: 500 });
  } catch (error) {
    console.error('[POST /api/itinerary/plan/assemble] Unexpected error:', error);
    return Response.json({ ok: false, error: 'assemble_pipeline_failed' }, { status: 500 });
  }
}
