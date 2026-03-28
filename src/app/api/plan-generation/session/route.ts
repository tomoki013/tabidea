/**
 * POST /api/plan-generation/session
 * 新しい生成セッションを作成する
 * 認証ユーザーの場合は userId をセッションに紐付ける
 */

import { NextResponse } from 'next/server';
import type { UserInput } from '@/types/user-input';
import { createSession, updateSession } from '@/lib/services/plan-generation/session-store';
import { getUser } from '@/lib/supabase/server';
import { getUserSettings } from '@/app/actions/user-settings';
import {
  getDefaultHomeBaseCityForRegion,
  getDefaultRegionForLanguage,
  isLanguageCode,
  type LanguageCode,
  DEFAULT_LANGUAGE,
} from '@/lib/i18n/locales';

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

    // homeBaseCity をユーザー設定から解決 (v3 パリティ — フライト注入に必要)
    const { settings } = await getUserSettings().catch(() => ({ settings: null }));
    const preferredLanguage: LanguageCode =
      settings?.preferredLanguage && isLanguageCode(settings.preferredLanguage)
        ? settings.preferredLanguage
        : DEFAULT_LANGUAGE;
    const preferredRegion = settings?.preferredRegion ?? getDefaultRegionForLanguage(preferredLanguage);
    const homeBaseCity = settings?.homeBaseCity?.trim() || getDefaultHomeBaseCityForRegion(preferredRegion);

    const session = await createSession(userId);

    // inputSnapshot + pipelineContext を保存
    await updateSession(session.id, {
      inputSnapshot: body.input,
      pipelineContext: { homeBaseCity },
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
