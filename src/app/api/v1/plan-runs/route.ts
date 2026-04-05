/**
 * POST /api/v1/plan-runs
 * 初回プラン生成開始
 * 設計書 §7.2 — 匿名・認証済み双方を許可
 */

import { NextResponse } from 'next/server';
import type { UserInput } from '@/types/user-input';
import { getUser } from '@/lib/supabase/server';
import { checkAndRecordUsage } from '@/lib/limits/check';
import { withPromiseTimeout } from '@/lib/utils/promise-timeout';
import {
  createPlanRun,
  computeInputHash,
  findPlanRunByIdempotencyKey,
  updatePlanRun,
} from '@/lib/services/plan-run/run-store';
import { resolveModel } from '@/lib/services/ai/model-provider';

export const maxDuration = 10;
export const runtime = 'nodejs';

const AUTH_TIMEOUT_MS = 3_000;
const USAGE_TIMEOUT_MS = 1_500;

interface CreatePlanRunBody {
  input: UserInput;
  idempotencyKey?: string;
  runtimeProfile?: string;
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as CreatePlanRunBody;

    if (!body.input) {
      return NextResponse.json({ error: 'invalid_request', message: 'input は必須です' }, { status: 400 });
    }

    // 認証 (任意)
    const user = await withPromiseTimeout(
      () => getUser().catch(() => null),
      AUTH_TIMEOUT_MS,
      'auth resolve',
    ).catch(() => null);
    const userId = user?.id;

    // 利用制限チェック
    const usageResult = await withPromiseTimeout(
      () => checkAndRecordUsage('plan_generation', undefined, {
        resolvedUser: user ? { id: user.id, email: user.email ?? null } : null,
      }),
      USAGE_TIMEOUT_MS,
      'usage check',
    ).catch(() => null);

    if (usageResult && !usageResult.allowed) {
      return NextResponse.json({
        error: 'limit_exceeded',
        limitExceeded: true,
        userType: usageResult.userType,
        remaining: usageResult.remaining,
        resetAt: usageResult.resetAt?.toISOString() ?? null,
      }, { status: 429 });
    }

    const inputHash = computeInputHash(body.input);
    const runtimeProfile = body.runtimeProfile ?? 'netlify_free_30s';

    // create-only: 既存 run の返却は idempotency key の厳密一致のみ
    if (userId && body.idempotencyKey) {
      const duplicate = await findPlanRunByIdempotencyKey(userId, body.idempotencyKey);
      if (duplicate) {
        return NextResponse.json({
          runId: duplicate.id,
          accessToken: duplicate.accessToken ?? null,
          state: duplicate.state,
          stateVersion: duplicate.stateVersion,
          currentPassId: duplicate.currentPassId ?? null,
          statusUrl: `/api/v1/plan-runs/${duplicate.id}`,
          resumeUrl: `/api/v1/plan-runs/${duplicate.id}/resume`,
          resultUrl: `/api/v1/plan-runs/${duplicate.id}/result`,
          resumeHint: duplicate.resumeHint,
          execution: duplicate.execution,
        }, { status: 200 });
      }
    }

    // モデル解決
    const resolved = resolveModel('itinerary');
    const modelName = resolved.modelName;

    // run 作成
    const run = await createPlanRun(userId, {
      idempotencyKey: body.idempotencyKey,
      runtimeProfile,
      modelName,
    });

    const updatedRun = await updatePlanRun(run.id, {
      inputSnapshot: body.input,
      inputHash,
    });

    return NextResponse.json({
      runId: updatedRun.id,
      accessToken: updatedRun.accessToken ?? null,
      state: updatedRun.state,
      stateVersion: updatedRun.stateVersion,
      currentPassId: updatedRun.currentPassId ?? null,
      statusUrl: `/api/v1/plan-runs/${updatedRun.id}`,
      resumeUrl: `/api/v1/plan-runs/${updatedRun.id}/resume`,
      resultUrl: `/api/v1/plan-runs/${updatedRun.id}/result`,
      resumeHint: updatedRun.resumeHint,
      execution: updatedRun.execution,
    }, { status: 201 });
  } catch (error) {
    console.error('[POST /v1/plan-runs]', error);
    return NextResponse.json({
      error: 'internal_error',
      message: error instanceof Error ? error.message : 'Internal error',
    }, { status: 500 });
  }
}
