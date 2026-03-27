/**
 * POST /api/plan-generation/cleanup
 * TTL 超過の古いセッションを削除する。
 * Cron ジョブ or 管理者から呼び出す想定。
 *
 * Authorization: Bearer <CRON_SECRET> で保護。
 */

import { NextResponse } from 'next/server';
import { cleanupExpiredSessions } from '@/lib/services/plan-generation/session-store';

export const maxDuration = 30;
export const runtime = 'nodejs';

export async function POST(request: Request) {
  // 簡易認証: CRON_SECRET ヘッダーチェック
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = request.headers.get('authorization');
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    const body = await request.json().catch(() => ({})) as { ttlDays?: number };
    const ttlDays = body.ttlDays ?? 7;

    const deletedCount = await cleanupExpiredSessions(ttlDays);

    return NextResponse.json({
      ok: true,
      deletedCount,
      ttlDays,
    });
  } catch (err) {
    console.error('[plan-generation] cleanup failed:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 },
    );
  }
}
