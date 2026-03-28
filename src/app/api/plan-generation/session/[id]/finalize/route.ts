/**
 * POST /api/plan-generation/session/:id/finalize
 * 完了したセッションから Itinerary を生成して返却する
 * EventLogger で generation_logs に記録 (v3 パリティ)
 */

import { NextResponse } from 'next/server';
import { loadSession } from '@/lib/services/plan-generation/session-store';
import { sessionToItinerary } from '@/lib/services/plan-generation/bridges/session-to-itinerary';
import { SessionNotFoundError } from '@/lib/services/plan-generation/errors';
import { PlanGenerationLogger } from '@/lib/services/plan-generation/logger';
import { createPerformanceTimer } from '@/lib/utils/performance-timer';
import { assertSessionAccess } from '@/lib/services/plan-generation/auth';

export const maxDuration = 10;
export const runtime = 'nodejs';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const timer = createPerformanceTimer('v4:finalize');

  try {
    const { id } = await params;

    const session = await timer.measure('load_session', () => loadSession(id));

    // 所有権チェック
    const accessError = await assertSessionAccess(session);
    if (accessError) {
      return NextResponse.json({ error: accessError }, { status: 403 });
    }

    if (session.state !== 'completed') {
      return NextResponse.json(
        { error: `Session is not completed (state: ${session.state})` },
        { status: 400 },
      );
    }

    const itinerary = await timer.measure('session_to_itinerary', () =>
      Promise.resolve(sessionToItinerary(session)),
    );

    // Fetch hero image (decorative — timeout 3s, failure is non-fatal)
    const destination = session.draftPlan?.destination ?? '';
    if (destination) {
      try {
        const heroImage = await timer.measure('hero_image', async () => {
          const { getUnsplashImage } = await import('@/lib/unsplash');
          return Promise.race([
            getUnsplashImage(destination),
            new Promise<undefined>((resolve) => setTimeout(() => resolve(undefined), 3000)),
          ]);
        });
        if (heroImage) {
          itinerary.heroImage = heroImage.url;
          itinerary.heroImagePhotographer = heroImage.photographer;
          itinerary.heroImagePhotographerUrl = heroImage.photographerUrl;
        }
      } catch {
        // Hero image is decorative — skip on failure
      }
    }

    // Performance log
    timer.log();

    // EventLogger: generation_logs に記録 (fire-and-forget)
    const logger = new PlanGenerationLogger(id);
    const sessionCreatedAt = new Date(session.createdAt).getTime();
    const totalDurationMs = Date.now() - sessionCreatedAt;
    logger.logCompletedSession(session, totalDurationMs);

    return NextResponse.json({ itinerary });
  } catch (err) {
    timer.log();

    if (err instanceof SessionNotFoundError) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }
    console.error('[plan-generation] finalize failed:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 },
    );
  }
}
