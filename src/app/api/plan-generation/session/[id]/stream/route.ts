/**
 * POST /api/plan-generation/session/:id/stream
 * narrative_polish パスを SSE ストリーミングで実行する
 */

import type { PassBudget, PassContext } from '@/types/plan-generation';
import { loadSession, updateSession, transitionState } from '@/lib/services/plan-generation/session-store';
import { narrativePolishPassStreaming } from '@/lib/services/plan-generation/passes/narrative-polish';
import { SessionNotFoundError } from '@/lib/services/plan-generation/errors';
import { REQUEST_DEADLINE_MS, PLATFORM_HEADROOM_MS, DEFAULT_RETRY_POLICIES, DEFAULT_QUALITY_POLICY } from '@/lib/services/plan-generation/constants';
import { PlanGenerationLogger } from '@/lib/services/plan-generation/logger';

export const maxDuration = 25;
export const runtime = 'nodejs';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const requestStart = Date.now();
  const encoder = new TextEncoder();

  const { id } = await params;

  const stream = new ReadableStream({
    async start(controller) {
      const emit = (type: string, payload: Record<string, unknown> = {}) => {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type, ...payload })}\n\n`),
          );
        } catch {
          // Stream may already be closed
        }
      };

      try {
        const session = await loadSession(id);

        if (session.state !== 'timeline_ready') {
          emit('error', { message: `Invalid state for streaming: expected timeline_ready, got ${session.state}` });
          emit('done');
          controller.close();
          return;
        }

        const { draftPlan, normalizedInput } = session;
        const totalDays = draftPlan?.days.length ?? 0;
        const destination = draftPlan?.destination ?? '';
        const description = session.narrativeState?.description ?? draftPlan?.description ?? '';

        // Progress event
        emit('progress', {
          step: 'narrative_polish',
          totalDays,
          destination,
          description,
        });

        // Build PassContext
        const deadlineAt = requestStart + REQUEST_DEADLINE_MS - PLATFORM_HEADROOM_MS;
        const budget: PassBudget = {
          maxExecutionMs: REQUEST_DEADLINE_MS - PLATFORM_HEADROOM_MS,
          deadlineAt,
          remainingMs: () => deadlineAt - Date.now(),
        };

        const ctx: PassContext = {
          session,
          budget,
          retryPolicy: DEFAULT_RETRY_POLICIES.narrative_polish,
          qualityPolicy: DEFAULT_QUALITY_POLICY,
        };

        // Execute streaming narrative polish
        const { dayStream, finalResult } = await narrativePolishPassStreaming(ctx);

        // Stream day_complete events
        for await (const event of dayStream) {
          emit('day_complete', {
            day: event.day,
            dayData: event.dayData,
            isComplete: event.isComplete,
            totalDays,
            destination,
            description,
          });
        }

        // Wait for final result
        const result = await finalResult;

        if (result.outcome === 'completed' && result.data) {
          // Save NarrativeState and transition to completed
          await updateSession(id, { narrativeState: result.data });
          await transitionState(id, 'timeline_ready', 'completed');

          // Accumulate warnings
          if (result.warnings.length > 0) {
            await updateSession(id, {
              warnings: [...session.warnings, ...result.warnings],
            });
          }

          // Log (fire-and-forget)
          const logger = new PlanGenerationLogger(id);
          logger.logPassRun({
            passId: 'narrative_polish',
            attempt: 1,
            outcome: result.outcome,
            durationMs: result.durationMs,
            startedAt: new Date(requestStart).toISOString(),
            metadata: result.metadata,
          });

          emit('complete', {
            session: { id, state: 'completed' },
          });
        } else {
          emit('error', {
            message: result.warnings[0] ?? 'Narrative generation failed',
            outcome: result.outcome,
          });
        }
      } catch (err) {
        if (err instanceof SessionNotFoundError) {
          emit('error', { message: 'Session not found' });
        } else {
          console.error('[plan-generation] stream failed:', err);
          emit('error', {
            message: err instanceof Error ? err.message : 'Internal error',
          });
        }
      } finally {
        emit('done');
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
