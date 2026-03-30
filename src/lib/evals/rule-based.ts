import type { Itinerary } from '@/types/itinerary';

export interface EvaluatedMetric {
  metricName: string;
  metricValue: number;
  details?: Record<string, unknown>;
}

export interface RuleBasedEvalContext {
  mutationType?: 'generation' | 'patch' | 'replan';
  replanSucceeded?: boolean;
}

export function evaluateItineraryRuleBased(
  itinerary: Itinerary,
  context: RuleBasedEvalContext = {},
): EvaluatedMetric[] {
  const days = itinerary.days ?? [];
  const blocks = days.flatMap((day) => day.blocks ?? []);
  const activities = days.flatMap((day) => day.activities ?? []);
  const totalUnits = Math.max(blocks.length, activities.length, 1);
  const verificationSummary = itinerary.verificationSummary ?? {
    verifiedActivities: 0,
    partialActivities: 0,
    unknownActivities: activities.length,
    needsConfirmationCount: activities.length,
  };

  const completedDays = days.filter((day) => {
    const dayBlocks = day.blocks ?? [];
    return dayBlocks.length > 0 || day.activities.length > 0;
  }).length;

  const itineraryCompletionRate = days.length > 0 ? completedDays / days.length : 0;
  const verificationCoverage =
    (verificationSummary.verifiedActivities + verificationSummary.partialActivities) / totalUnits;
  const feasibilityRate =
    (verificationSummary.verifiedActivities + verificationSummary.partialActivities * 0.5) / totalUnits;

  const metrics: EvaluatedMetric[] = [
    {
      metricName: 'itinerary_completion_rate',
      metricValue: Number(itineraryCompletionRate.toFixed(4)),
      details: {
        dayCount: days.length,
        completedDays,
      },
    },
    {
      metricName: 'verification_coverage',
      metricValue: Number(Math.min(1, Math.max(0, verificationCoverage)).toFixed(4)),
      details: { ...verificationSummary },
    },
    {
      metricName: 'feasibility_rate',
      metricValue: Number(Math.min(1, Math.max(0, feasibilityRate)).toFixed(4)),
      details: { ...verificationSummary },
    },
  ];

  if (context.mutationType === 'patch') {
    metrics.push({
      metricName: 'user_edit_rate',
      metricValue: 1,
      details: { mutationType: context.mutationType },
    });
  }

  if (context.mutationType === 'replan') {
    metrics.push({
      metricName: 'replan_success_rate',
      metricValue: context.replanSucceeded === false ? 0 : 1,
      details: { mutationType: context.mutationType },
    });
  }

  return metrics;
}
