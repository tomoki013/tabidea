export type AgentRole = 'planner' | 'verifier' | 'formatter' | 'system';

export type AgentRunStatus =
  | 'queued'
  | 'running'
  | 'core_ready'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type AgentRunPhase =
  | 'session_resolve'
  | 'planning'
  | 'verification'
  | 'formatting'
  | 'persisting'
  | 'completed';

export type AgentRunEventName =
  | 'run.started'
  | 'run.progress'
  | 'run.day.started'
  | 'run.day.completed'
  | 'run.paused'
  | 'run.retryable_failed'
  | 'run.core_ready'
  | 'assistant.delta'
  | 'tool.call.started'
  | 'tool.call.finished'
  | 'tool.call.failed'
  | 'plan.draft.created'
  | 'plan.block.verified'
  | 'plan.block.flagged'
  | 'itinerary.updated'
  | 'run.finished'
  | 'run.failed';

export interface AgentRunEventPayload {
  phase?: AgentRunPhase;
  status?: AgentRunStatus;
  passId?: string;
  attempt?: number;
  tripId?: string | null;
  tripVersion?: number | null;
  completionLevel?: string | null;
  generationStatus?: string | null;
  error?: string;
  errorCode?: string;
  retryable?: boolean;
  warningCodes?: string[];
  [key: string]: unknown;
}

export type CanonicalTripReplanScope =
  | { type: 'message_rewind'; rewindToMessageId?: string; rewindToTurnIndex?: number }
  | { type: 'block_replan'; dayIndex: number; blockId: string }
  | { type: 'day_replan'; dayIndex: number }
  | { type: 'style_replan' }
  | { type: 'weather_fallback_replan'; dayIndex?: number; blockId?: string };

export type LegacyTripReplanScope =
  | { type: 'block'; dayIndex: number; blockId: string }
  | { type: 'day'; dayIndex: number }
  | { type: 'style' }
  | { type: 'weather_fallback'; dayIndex?: number; blockId?: string };

export type TripReplanScope = CanonicalTripReplanScope | LegacyTripReplanScope;

export function normalizeTripReplanScope(scope: TripReplanScope): CanonicalTripReplanScope {
  switch (scope.type) {
    case 'block':
      return {
        type: 'block_replan',
        dayIndex: scope.dayIndex,
        blockId: scope.blockId,
      };
    case 'day':
      return {
        type: 'day_replan',
        dayIndex: scope.dayIndex,
      };
    case 'style':
      return {
        type: 'style_replan',
      };
    case 'weather_fallback':
      return {
        type: 'weather_fallback_replan',
        dayIndex: scope.dayIndex,
        blockId: scope.blockId,
      };
    default:
      return scope;
  }
}

export function isWeatherFallbackReplanScope(scope: TripReplanScope): boolean {
  const normalized = normalizeTripReplanScope(scope);
  return normalized.type === 'weather_fallback_replan';
}
