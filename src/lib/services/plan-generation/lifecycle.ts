import type { AgentRunPhase, AgentRunStatus } from '@/types/agent-runtime';
import type { SessionState } from '@/types/plan-generation';

export function isFailedState(state: SessionState): boolean {
  return state === 'failed_retryable' || state === 'failed_terminal' || state === 'cancelled';
}

export function isRetryableFailedState(state: SessionState): boolean {
  return state === 'failed_retryable';
}

export function isTerminalFailedState(state: SessionState): boolean {
  return state === 'failed_terminal';
}

export function isCoreReadyState(state: SessionState): boolean {
  return state === 'core_ready' || state === 'completed';
}

export function isTerminalState(state: SessionState): boolean {
  return isCoreReadyState(state) || isTerminalFailedState(state) || state === 'cancelled';
}

export function canExecuteCorePasses(state: SessionState): boolean {
  return !isTerminalState(state) && state !== 'timeline_ready';
}

export function requiresCoreFinalize(state: SessionState): boolean {
  return state === 'timeline_ready';
}

export function getAgentRunStatus(state: SessionState): AgentRunStatus {
  if (state === 'created') return 'queued';
  if (state === 'core_ready') return 'core_ready';
  if (state === 'completed') return 'completed';
  if (state === 'failed_retryable' || state === 'failed_terminal') return 'failed';
  if (state === 'cancelled') return 'cancelled';
  return 'running';
}

export function getAgentRunPhase(state: SessionState): AgentRunPhase {
  switch (state) {
    case 'created':
      return 'session_resolve';
    case 'normalized':
    case 'draft_generated':
      return 'planning';
    case 'draft_formatted':
    case 'draft_scored':
    case 'draft_repaired_partial':
      return 'formatting';
    case 'verification_partial':
      return 'verification';
    case 'timeline_ready':
    case 'core_ready':
      return 'persisting';
    case 'enrichment_running':
      return 'persisting';
    case 'completed':
      return 'completed';
    default:
      return 'planning';
  }
}
