import { runSeedPipeline } from '@/lib/services/itinerary/pipeline-orchestrator';
import type { PreCheckedUsage } from '@/lib/services/itinerary/pipeline-orchestrator';
import type { UserInput } from '@/types';
import { getUserSettings } from '@/app/actions/user-settings';
import {
  getDefaultHomeBaseCityForRegion,
  getDefaultRegionForLanguage,
  isLanguageCode,
  type LanguageCode,
  DEFAULT_LANGUAGE,
} from '@/lib/i18n/locales';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 25;

export async function POST(req: Request) {
  const encoder = new TextEncoder();

  let body: {
    input: UserInput;
    options?: { isRetry?: boolean };
    preCheckedUsage?: PreCheckedUsage;
  };
  try {
    body = await req.json();
  } catch (error) {
    console.error('[POST /api/itinerary/plan/seed] Invalid request body:', error);
    return Response.json({ ok: false, error: 'Invalid request body' }, { status: 400 });
  }

  // Resolve homeBaseCity from user settings
  const { settings } = await getUserSettings().catch(() => ({ settings: null }));
  const preferredLanguage: LanguageCode =
    settings?.preferredLanguage && isLanguageCode(settings.preferredLanguage)
      ? settings.preferredLanguage
      : DEFAULT_LANGUAGE;
  const preferredRegion = settings?.preferredRegion ?? getDefaultRegionForLanguage(preferredLanguage);
  const homeBaseCity = settings?.homeBaseCity?.trim() || getDefaultHomeBaseCityForRegion(preferredRegion);

  if (!body.options) body.options = {};
  (body.options as Record<string, unknown>).pipelineContext = { homeBaseCity };

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
        const result = await runSeedPipeline(
          body.input,
          body.options,
          (event) => {
            // Forward pipeline progress events as SSE
            if (event.type === 'progress') {
              emit('progress', {
                step: event.step,
                message: event.message,
                ...(event.totalDays != null ? { totalDays: event.totalDays } : {}),
              });
            }
          },
          body.preCheckedUsage
        );

        if (result.success) {
          // Emit normalized request early so client has partial data
          if (result.normalizedRequest && result.metadata) {
            emit('normalized', {
              normalizedRequest: result.normalizedRequest,
              metadata: result.metadata,
            });
          }

          emit('complete', {
            ok: true,
            normalizedRequest: result.normalizedRequest,
            seed: result.seed,
            warnings: result.warnings,
            metadata: result.metadata,
          });
        } else {
          console.error('[POST /api/itinerary/plan/seed] Seed pipeline failed:', {
            failedStep: result.failedStep,
            message: result.message,
            limitExceeded: result.limitExceeded ?? false,
          });

          emit('error', {
            ok: false,
            error: result.message ?? 'seed_pipeline_failed',
            failedStep: result.failedStep,
            limitExceeded: result.limitExceeded ?? false,
            userType: result.userType,
            resetAt: result.resetAt,
            remaining: result.remaining,
          });
        }

        emit('done', {});
      } catch (err) {
        console.error('[SSE /api/itinerary/plan/seed] Uncaught error:', err);
        emit('error', {
          ok: false,
          error: err instanceof Error ? err.message : 'unexpected_error',
        });
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
