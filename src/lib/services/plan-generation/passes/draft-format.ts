import type {
  DraftPlan,
  PassContext,
  PassResult,
} from '@/types/plan-generation';
import { formatPlannerDraft } from '../formatters/planner-draft';

export async function draftFormatPass(ctx: PassContext): Promise<PassResult<DraftPlan>> {
  const start = Date.now();

  const plannerDraft = ctx.session.plannerDraft;
  const normalized = ctx.session.normalizedInput;

  if (!plannerDraft || !normalized) {
    return {
      outcome: 'failed_terminal',
      warnings: ['Missing plannerDraft or normalizedInput for draft formatting'],
      durationMs: Date.now() - start,
    };
  }

  const draftPlan = formatPlannerDraft(plannerDraft, normalized);

  return {
    outcome: 'completed',
    data: draftPlan,
    warnings: [],
    durationMs: Date.now() - start,
    metadata: {
      substage: 'formatter',
      formatterContractVersion: 'draft_format_v2',
      dayCount: draftPlan.days.length,
      totalStops: draftPlan.days.reduce((sum, day) => sum + day.stops.length, 0),
    },
  };
}
