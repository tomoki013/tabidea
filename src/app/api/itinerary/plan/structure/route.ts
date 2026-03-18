import { runStructurePipeline } from '@/lib/services/itinerary/pipeline-orchestrator';
import type { UserInput } from '@/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
// Safe for Netlify free plan (10s limit) and Vercel hobby (60s limit)
export const maxDuration = 9;

export async function POST(req: Request) {
  let body: { input: UserInput; options?: { isRetry?: boolean } };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { input, options } = body;

  const progressEvents: unknown[] = [];

  const result = await runStructurePipeline(input, options, (event) => {
    progressEvents.push(event);
  });

  if (result.success) {
    return Response.json({
      ok: true,
      timeline: result.timeline,
      normalizedRequest: result.normalizedRequest,
      destination: result.destination,
      description: result.description,
      heroImage: result.heroImage ?? null,
      warnings: result.warnings,
      metadata: result.metadata,
    });
  }

  const status = result.limitExceeded ? 429 : 500;
  return Response.json({
    ok: false,
    error: result.message ?? 'structure_pipeline_failed',
    failedStep: result.failedStep,
    limitExceeded: result.limitExceeded ?? false,
    userType: result.userType,
    resetAt: result.resetAt,
    remaining: result.remaining,
  }, { status });
}
