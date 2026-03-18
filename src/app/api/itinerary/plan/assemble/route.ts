import { runAssemblePipeline } from '@/lib/services/itinerary/pipeline-orchestrator';
import type { NormalizedRequest, SemanticCandidate } from '@/types/itinerary-pipeline';
import type { SemanticSeedPlan } from '@/lib/services/itinerary/steps/semantic-planner';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 9;

interface AssembleRequestBody {
  normalizedRequest: NormalizedRequest;
  seed: SemanticSeedPlan;
  candidates: SemanticCandidate[];
  metadata: {
    modelName: string;
    narrativeModelName: string;
    modelTier: 'flash' | 'pro';
    provider: string;
  };
}

export async function POST(req: Request) {
  let body: AssembleRequestBody;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 });
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

  return Response.json({
    ok: false,
    error: result.message ?? 'assemble_pipeline_failed',
    failedStep: result.failedStep,
  }, { status: 500 });
}
