/**
 * POST /api/plan-generation/session/:id/run
 * 次のパスを実行する
 */

import { NextResponse } from 'next/server';
import type { PassBudget } from '@/types/plan-generation';
import { executeNextPass } from '@/lib/services/plan-generation/executor';
import { SessionNotFoundError, PassExecutionError, PassBudgetExceededError } from '@/lib/services/plan-generation/errors';
import { REQUEST_DEADLINE_MS, PLATFORM_HEADROOM_MS } from '@/lib/services/plan-generation/constants';
import { getNextPassForState } from '@/lib/services/plan-generation/state-machine';
import { loadSession } from '@/lib/services/plan-generation/session-store';
import { assertSessionAccess } from '@/lib/services/plan-generation/auth';
import { runEventService } from '@/lib/agent/run-events';
import { recordToolAuditLog } from '@/lib/agent/tool-audit';

export const maxDuration = 120;
export const runtime = 'nodejs';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const requestStart = Date.now();
  const { id } = await params;

  try {
    // 所有権チェック
    const session = await loadSession(id);
    const accessError = await assertSessionAccess(session);
    if (accessError) {
      return NextResponse.json({ error: accessError }, { status: 403 });
    }

    // PassBudget を HTTP デッドラインから構築
    const deadlineAt = requestStart + REQUEST_DEADLINE_MS - PLATFORM_HEADROOM_MS;
    const budget: PassBudget = {
      maxExecutionMs: REQUEST_DEADLINE_MS - PLATFORM_HEADROOM_MS,
      deadlineAt,
      remainingMs: () => deadlineAt - Date.now(),
    };

    const nextPass = getNextPassForState(session.state, session);
    if (nextPass === 'selective_verify') {
      await runEventService.appendEvent(id, 'tool.call.started', {
        toolName: 'search_places',
        passId: nextPass,
      });
    }

    const result = await executeNextPass(id, budget);
    await runEventService.appendEvent(id, 'run.progress', {
      passId: result.passId,
      outcome: result.outcome,
      state: result.newState,
      warnings: result.warnings,
      budget: {
        remainingMs: budget.remainingMs(),
      },
    });

    if (result.passId === 'draft_generate' && result.outcome === 'completed' && result.session.draftPlan) {
      await runEventService.appendEvent(id, 'plan.draft.created', {
        destination: result.session.draftPlan.destination,
        totalDays: result.session.draftPlan.days.length,
        description: result.session.draftPlan.description,
      });
    }

    if (result.passId === 'selective_verify' && result.session.verifiedEntities.length > 0) {
      await runEventService.appendEvent(id, 'tool.call.finished', {
        toolName: 'search_places',
        passId: result.passId,
        outcome: result.outcome,
      });
      await recordToolAuditLog({
        runId: id,
        toolName: 'search_places',
        status: 'completed',
        response: {
          verifiedEntities: result.session.verifiedEntities.length,
          metadata: result.session.verifiedEntities.map((entity) => ({
            draftId: entity.draftId,
            status: entity.status,
          })),
        },
        provider: 'google_places',
      }).catch(() => {});

      for (const entity of result.session.verifiedEntities) {
        const eventName =
          entity.status === 'confirmed'
            ? 'plan.block.verified'
            : 'plan.block.flagged';
        await runEventService.appendEvent(id, eventName, {
          blockId: entity.draftId,
          day: entity.day,
          stopName: entity.stopName,
          verificationStatus: entity.status,
          level: entity.level,
          details: entity.details ?? null,
        });
      }
    }

    if (result.newState === 'failed' || result.outcome === 'failed_terminal') {
      if (result.passId === 'selective_verify') {
        await runEventService.appendEvent(id, 'tool.call.failed', {
          toolName: 'search_places',
          passId: result.passId,
          warnings: result.warnings,
        });
        await recordToolAuditLog({
          runId: id,
          toolName: 'search_places',
          status: 'failed',
          response: {
            warnings: result.warnings,
          },
          provider: 'google_places',
          errorCode: 'selective_verify_failed',
        }).catch(() => {});
      }
      await runEventService.appendEvent(id, 'run.failed', {
        passId: result.passId,
        warnings: result.warnings,
      });
    }

    return NextResponse.json({
      passId: result.passId,
      outcome: result.outcome,
      newState: result.newState,
      warnings: result.warnings,
      durationMs: result.durationMs,
      session: {
        id: result.session.id,
        state: result.session.state,
        updatedAt: result.session.updatedAt,
      },
    });
  } catch (err) {
    if (err instanceof SessionNotFoundError) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }
    if (err instanceof PassBudgetExceededError) {
      await runEventService.appendEvent(id, 'run.failed', {
        passId: err.passId,
        error: err.message,
        budgetMs: err.budgetMs,
        actualMs: err.actualMs,
      }).catch(() => {});
      return NextResponse.json(
        {
          error: err.message,
          passId: err.passId,
          budgetMs: err.budgetMs,
          actualMs: err.actualMs,
          durationMs: Date.now() - requestStart,
        },
        { status: 408 },
      );
    }
    if (err instanceof PassExecutionError) {
      await runEventService.appendEvent(id, 'run.failed', {
        passId: err.passId,
        error: err.message,
      }).catch(() => {});
      return NextResponse.json(
        {
          error: err.message,
          passId: err.passId,
          durationMs: Date.now() - requestStart,
        },
        { status: 500 },
      );
    }
    console.error('[plan-generation] run failed:', err);
    await runEventService.appendEvent(id, 'run.failed', {
      error: err instanceof Error ? err.message : 'Internal error',
    }).catch(() => {});
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 },
    );
  }
}
