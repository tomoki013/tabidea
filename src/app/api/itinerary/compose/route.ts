import { runComposePipeline } from '@/lib/services/itinerary/pipeline-orchestrator';
import { EventLogger } from '@/lib/services/analytics/event-logger';
import { createClient } from '@supabase/supabase-js';
import type { UserInput } from '@/types';
import type { PipelineStepId } from '@/types/itinerary-pipeline';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
// Legacy SSE endpoint — kept for backward compatibility.
// Main generation now uses /api/itinerary/plan/structure + /api/itinerary/plan/narrate.
export const maxDuration = 9;

const HEARTBEAT_INTERVAL_MS = 4_000;
const COMPOSE_RETRYABLE_STEPS: PipelineStepId[] = ['semantic_plan', 'place_resolve', 'feasibility_score', 'route_optimize', 'timeline_build', 'narrative_render'];

function shouldRetryCompose(result: Awaited<ReturnType<typeof runComposePipeline>>): boolean {
  if (result.success) {
    return false;
  }

  if (result.limitExceeded) {
    return false;
  }

  if (!result.failedStep || !COMPOSE_RETRYABLE_STEPS.includes(result.failedStep as PipelineStepId)) {
    return false;
  }

  return /timeout|timed out/i.test(result.message ?? '');
}

export async function POST(req: Request) {
  const encoder = new TextEncoder();
  const startTime = Date.now();

  let body: { input: UserInput; options?: { isRetry?: boolean } };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { input, options } = body;

  const stream = new ReadableStream({
    async start(controller) {
      let terminalEventSent = false;
      let currentStep: PipelineStepId | null = null;
      const requestId = crypto.randomUUID();

      const emit = (type: string, payload: Record<string, unknown>) => {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type, ...payload })}\n\n`)
          );
        } catch {
          // Stream may already be closed
        }
      };
      const heartbeatId = setInterval(() => {
        emit('heartbeat', {
          requestId,
          step: currentStep,
          elapsedMs: Date.now() - startTime,
          remainingMs: Math.max(0, maxDuration * 1_000 - (Date.now() - startTime)),
        });
      }, HEARTBEAT_INTERVAL_MS);

      try {
        emit('ack', {
          requestId,
          startedAt: new Date(startTime).toISOString(),
        });

        let result = await runComposePipeline(
          input,
          options,
          (event) => {
            currentStep = event.step;

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
              ...(event.totalDays ? { totalDays: event.totalDays } : {}),
              ...(event.destination ? { destination: event.destination } : {}),
              ...(event.description ? { description: event.description } : {}),
            });
          }
        );

        if (shouldRetryCompose(result)) {
          emit('progress', {
            step: 'usage_check',
            message: '通信状態を確認し、再試行しています...',
          });

          result = await runComposePipeline(
            input,
            {
              ...options,
              isRetry: true,
            },
            (event) => {
              currentStep = event.step;

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
                ...(event.totalDays ? { totalDays: event.totalDays } : {}),
                ...(event.destination ? { destination: event.destination } : {}),
                ...(event.description ? { description: event.description } : {}),
              });
            }
          );
        }

        if (result.success && result.itinerary) {
          emit('complete', {
            result: {
              itinerary: result.itinerary,
              warnings: result.warnings,
              metadata: result.metadata,
            },
          });

          // Log generation event (fire-and-forget)
          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
          const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
          if (supabaseUrl && supabaseKey) {
            const supabase = createClient(supabaseUrl, supabaseKey);
            const logger = new EventLogger(supabase);
            logger
              .logGeneration({
                eventType: 'plan_generated',
                destination: result.itinerary.destination,
                durationDays: result.itinerary.days.length,
                modelName: result.metadata?.modelName,
                modelTier: result.metadata?.modelTier,
                processingTimeMs: Date.now() - startTime,
                metadata: {
                  pipeline: 'compose_v3',
                  candidateCount: result.metadata?.candidateCount,
                  resolvedCount: result.metadata?.resolvedCount,
                  filteredCount: result.metadata?.filteredCount,
                  placeResolveEnabled: result.metadata?.placeResolveEnabled,
                  warningCount: result.warnings.length,
                },
              })
              .catch(() => {});
          }
          emit('done', {});
          terminalEventSent = true;
        } else {
          emit('error', {
            message: result.message || 'compose_pipeline_failed',
            failedStep: result.failedStep,
            limitExceeded: result.limitExceeded,
            userType: result.userType,
            resetAt: result.resetAt,
            remaining: result.remaining,
          });
          emit('done', {});
          terminalEventSent = true;
        }
      } catch (err) {
        console.error('[SSE /api/itinerary/compose] Uncaught error:', err);
        emit('error', {
          message: err instanceof Error ? err.message : 'unexpected_error',
        });
        emit('done', {});
        terminalEventSent = true;
      } finally {
        clearInterval(heartbeatId);
        if (!terminalEventSent) {
          emit('done', {});
        }
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
