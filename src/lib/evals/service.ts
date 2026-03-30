import type { Itinerary } from '@/types/itinerary';
import { createServiceRoleClient } from '@/lib/supabase/admin';
import { evaluateItineraryRuleBased, type EvaluatedMetric, type RuleBasedEvalContext } from './rule-based';

export interface SaveEvalResultsParams {
  runId?: string;
  tripId?: string;
  tripVersion?: number;
  evalType: 'rule_based' | 'llm_judge' | 'user_feedback';
  metrics: EvaluatedMetric[];
}

function getClient() {
  return createServiceRoleClient();
}

export class EvalService {
  async saveEvalResults(params: SaveEvalResultsParams): Promise<void> {
    if (params.metrics.length === 0) {
      return;
    }

    const client = getClient();
    const { error } = await client
      .from('eval_results')
      .insert(
        params.metrics.map((metric) => ({
          run_id: params.runId ?? null,
          trip_id: params.tripId ?? null,
          trip_version: params.tripVersion ?? null,
          eval_type: params.evalType,
          metric_name: metric.metricName,
          metric_value: metric.metricValue,
          details_json: metric.details ?? null,
        })),
      );

    if (error) {
      throw new Error(`Failed to save eval results: ${error.message}`);
    }
  }

  async evaluateAndSaveItinerary(
    itinerary: Itinerary,
    params: Omit<SaveEvalResultsParams, 'evalType' | 'metrics'> & { context?: RuleBasedEvalContext },
  ): Promise<EvaluatedMetric[]> {
    const metrics = evaluateItineraryRuleBased(itinerary, params.context);
    await this.saveEvalResults({
      ...params,
      evalType: 'rule_based',
      metrics,
    });
    return metrics;
  }
}

export const evalService = new EvalService();
