import { runStructurePipeline } from '@/lib/services/itinerary/pipeline-orchestrator';
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
  let body: { input: UserInput; options?: { isRetry?: boolean } };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { input } = body;

  // Resolve homeBaseCity from user settings
  const { settings } = await getUserSettings().catch(() => ({ settings: null }));
  const preferredLanguage: LanguageCode =
    settings?.preferredLanguage && isLanguageCode(settings.preferredLanguage)
      ? settings.preferredLanguage
      : DEFAULT_LANGUAGE;
  const preferredRegion = settings?.preferredRegion ?? getDefaultRegionForLanguage(preferredLanguage);
  const homeBaseCity = settings?.homeBaseCity?.trim() || getDefaultHomeBaseCityForRegion(preferredRegion);

  const options = { ...body.options, pipelineContext: { homeBaseCity } };

  const result = await runStructurePipeline(input, options);

  if (result.success) {
    return Response.json({
      ok: true,
      timeline: result.timeline,
      normalizedRequest: result.normalizedRequest,
      destination: result.destination,
      description: result.description,
      heroImage: result.heroImage ?? null,
      warnings: result.warnings,
      metadata: result.metadata,
    });
  }

  const status = result.limitExceeded ? 429 : 500;
  return Response.json({
    ok: false,
    error: result.message ?? 'structure_pipeline_failed',
    failedStep: result.failedStep,
    limitExceeded: result.limitExceeded ?? false,
    userType: result.userType,
    resetAt: result.resetAt,
    remaining: result.remaining,
  }, { status });
}
