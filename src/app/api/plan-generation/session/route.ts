/**
 * POST /api/plan-generation/session
 * 新しい生成セッションを作成する
 */

import { NextResponse } from 'next/server';
import type { UserInput } from '@/types/user-input';
import { createSession, updateSession } from '@/lib/services/plan-generation/session-store';

export const maxDuration = 25;
export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const body = await request.json() as { input: UserInput; userId?: string };

    if (!body.input) {
      return NextResponse.json(
        { error: 'input is required' },
        { status: 400 },
      );
    }

    const session = await createSession(body.userId);

    // inputSnapshot を保存
    await updateSession(session.id, {
      inputSnapshot: body.input,
    });

    return NextResponse.json({
      sessionId: session.id,
      state: session.state,
    });
  } catch (err) {
    console.error('[plan-generation] session create failed:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 },
    );
  }
}
