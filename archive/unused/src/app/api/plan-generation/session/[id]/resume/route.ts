/**
 * POST /api/plan-generation/session/:id/resume
 * 失敗したセッションを最後の成功状態に復元して再開可能にする。
 *
 * レスポンス:
 *  - resumedState: 復元先の状態
 *  - session: 更新後のセッション情報
 *
 * 復元後はクライアントが通常の /run ループで実行を継続する。
 */

import { NextResponse } from 'next/server';
import { loadSession, transitionState, updateSession } from '@/lib/services/plan-generation/session-store';
import { determineResumeState } from '@/lib/services/plan-generation/state-machine';
import { SessionNotFoundError } from '@/lib/services/plan-generation/errors';
import { assertSessionAccess } from '@/lib/services/plan-generation/auth';

export const maxDuration = 10;
export const runtime = 'nodejs';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const session = await loadSession(id);

    // 所有権チェック
    const accessError = await assertSessionAccess(session);
    if (accessError) {
      return NextResponse.json({ error: accessError }, { status: 403 });
    }

    if (session.state !== 'failed') {
      return NextResponse.json(
        { error: `Session is not in failed state (state: ${session.state})` },
        { status: 400 },
      );
    }

    const resumeState = determineResumeState(session);

    // 状態を復元
    await transitionState(id, 'failed', resumeState);

    // 警告をリセット (前回の失敗警告を引き継がない)
    await updateSession(id, { warnings: [] });

    return NextResponse.json({
      resumedState: resumeState,
      session: {
        id,
        state: resumeState,
      },
    });
  } catch (err) {
    if (err instanceof SessionNotFoundError) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }
    console.error('[plan-generation] resume failed:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 },
    );
  }
}
