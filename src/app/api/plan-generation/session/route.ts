/**
 * POST /api/plan-generation/session
 * 新しい生成セッションを作成する
 * 認証ユーザーの場合は userId をセッションに紐付ける
 */

import { NextResponse } from 'next/server';
import type { UserInput } from '@/types/user-input';
import { createSession, updateSession } from '@/lib/services/plan-generation/session-store';
import { getUser } from '@/lib/supabase/server';

export const maxDuration = 25;
export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const body = await request.json() as { input: UserInput };

    if (!body.input) {
      return NextResponse.json(
        { error: 'input is required' },
        { status: 400 },
      );
    }

    // 認証ユーザーを取得 (未認証でも生成は許可 — ローカルプラン)
    const user = await getUser().catch(() => null);
    const userId = user?.id;

    const session = await createSession(userId);

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
