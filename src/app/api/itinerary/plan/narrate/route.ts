import {
  runNarratePipeline,
  type NarratePipelineInput,
} from '@/lib/services/itinerary/pipeline-orchestrator';
import { EventLogger } from '@/lib/services/analytics/event-logger';
import { ITINERARY_SPLIT_ROUTE_MAX_DURATION_SECONDS } from '@/lib/services/itinerary/runtime-budget';
import { createClient } from '@supabase/supabase-js';
import type { NormalizedRequest, TimelineDay } from '@/types/itinerary-pipeline';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
// Safe for Netlify free plan (10s limit)
export const maxDuration = ITINERARY_SPLIT_ROUTE_MAX_DURATION_SECONDS;

interface NarrateRequestBody {
  timeline: TimelineDay[];
  normalizedRequest: NormalizedRequest;
  narrativeModelName: string;
  provider: string;
  modelTier?: 'flash' | 'pro';
  destination?: string;
  description?: string;
  heroImage?: { url: string; photographer: string; photographerUrl: string } | null;
  warnings?: string[];
  originalInput?: unknown;
}

export async function POST(req: Request) {
  const encoder = new TextEncoder();
  const startTime = Date.now();

  let body: NarrateRequestBody;
  try {
    body = await req.json();
  } catch (error) {
    console.error('[POST /api/itinerary/plan/narrate] Invalid request body:', error);
    return Response.json({ ok: false, error: 'Invalid request body' }, { status: 400 });
  }

  const {
    timeline,
    normalizedRequest,
    narrativeModelName,
    provider,
    modelTier,
    destination,
    description,
    heroImage,
    warnings,
  } = body;

  const stream = new ReadableStream({
    async start(controller) {
      const emit = (type: string, payload: Record<string, unknown>) => {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type, ...payload })}\n\n`)
          );
        } catch {
          // Stream may already be closed
        }
      };

      try {
        const pipelineInput: NarratePipelineInput = {
          timeline,
          normalizedRequest,
          narrativeModelName,
          provider,
          modelTier,
        };

        const result = await runNarratePipeline(
          pipelineInput,
          {
            destination,
            description,
            heroImage: heroImage ?? undefined,
            warnings,
          },
          (event) => {
            if (event.type === 'day_complete') {
              emit('day_complete', {
                step: event.step,
                day: event.day,
                dayData: event.dayData,
                isComplete: event.isComplete,
                totalDays: event.totalDays,
                destination: event.destination,
                description: event.description,
              });
              return;
            }
            emit('progress', {
              step: event.step,
              message: event.message,
              ...(event.type === 'progress' && event.totalDays ? { totalDays: event.totalDays } : {}),
              ...(event.type === 'progress' && event.destination ? { destination: event.destination } : {}),
              ...(event.type === 'progress' && event.description ? { description: event.description } : {}),
            });
          }
        );

        if (result.success && result.itinerary) {
          emit('complete', {
            result: {
              itinerary: result.itinerary,
              warnings: result.warnings,
            },
          });

          // Log generation event (fire-and-forget)
          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
          const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
          if (supabaseUrl && supabaseKey) {
            const supabase = createClient(supabaseUrl, supabaseKey);
            const logger = new EventLogger(supabase);
            logger.logGeneration({
              eventType: 'plan_generated',
              destination: result.itinerary.destination,
              durationDays: result.itinerary.days.length,
              modelName: narrativeModelName,
              modelTier,
              processingTimeMs: Date.now() - startTime,
              metadata: {
                pipeline: 'compose_v3_split',
                warningCount: result.warnings.length,
              },
            }).catch(() => {});
          }

          emit('done', {});
        } else {
          console.error('[POST /api/itinerary/plan/narrate] Narrate pipeline failed:', {
            failedStep: result.failedStep,
            message: result.message,
          });
          emit('error', {
            message: result.message ?? 'narrate_pipeline_failed',
            failedStep: result.failedStep,
          });
          emit('done', {});
        }
      } catch (err) {
        console.error('[SSE /api/itinerary/plan/narrate] Uncaught error:', err);
        emit('error', { message: err instanceof Error ? err.message : 'unexpected_error' });
        emit('done', {});
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
