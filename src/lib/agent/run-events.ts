import { createServiceRoleClient } from '@/lib/supabase/admin';
import type { AgentRunEventName, AgentRunEventPayload } from '@/types/agent-runtime';

export interface StoredRunEvent {
  eventId: number;
  runId: string;
  seq: number;
  eventName: AgentRunEventName;
  payload: AgentRunEventPayload;
  createdAt: string;
}

function getClient() {
  return createServiceRoleClient();
}

function mapRowToStoredEvent(row: Record<string, unknown>): StoredRunEvent {
  return {
    eventId: row.event_id as number,
    runId: row.run_id as string,
    seq: row.seq as number,
    eventName: row.event_name as AgentRunEventName,
    payload: (row.payload_json as Record<string, unknown>) ?? {},
    createdAt: row.created_at as string,
  };
}

export function createStoredRunEvent(
  runId: string,
  seq: number,
  eventName: AgentRunEventName,
  payload: AgentRunEventPayload = {},
  createdAt: string = new Date().toISOString(),
): StoredRunEvent {
  return {
    eventId: -seq,
    runId,
    seq,
    eventName,
    payload,
    createdAt,
  };
}

export class RunEventService {
  async appendEventWithSeq(
    runId: string,
    seq: number,
    eventName: AgentRunEventName,
    payload: AgentRunEventPayload = {},
  ): Promise<StoredRunEvent> {
    const client = getClient();
    const { data, error } = await client
      .from('run_events')
      .upsert(
        {
          run_id: runId,
          seq,
          event_name: eventName,
          payload_json: payload,
        },
        {
          onConflict: 'run_id,seq',
          ignoreDuplicates: true,
        },
      )
      .select('event_id, run_id, seq, event_name, payload_json, created_at')
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to append run event: ${error?.message ?? 'no data'}`);
    }

    if (data) {
      return mapRowToStoredEvent(data as Record<string, unknown>);
    }

    const { data: existing, error: existingError } = await client
      .from('run_events')
      .select('event_id, run_id, seq, event_name, payload_json, created_at')
      .eq('run_id', runId)
      .eq('seq', seq)
      .maybeSingle();

    if (existingError || !existing) {
      throw new Error(`Failed to append run event: ${existingError?.message ?? 'no data'}`);
    }

    return mapRowToStoredEvent(existing as Record<string, unknown>);
  }

  async appendEvent(
    runId: string,
    eventName: AgentRunEventName,
    payload: AgentRunEventPayload = {},
  ): Promise<StoredRunEvent> {
    const client = getClient();
    const { data: latest } = await client
      .from('run_events')
      .select('seq')
      .eq('run_id', runId)
      .order('seq', { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextSeq = ((latest?.seq as number | undefined) ?? 0) + 1;

    return this.appendEventWithSeq(runId, nextSeq, eventName, payload);
  }

  async listEvents(runId: string, afterSeq?: number): Promise<StoredRunEvent[]> {
    const client = getClient();
    let query = client
      .from('run_events')
      .select('event_id, run_id, seq, event_name, payload_json, created_at')
      .eq('run_id', runId)
      .order('seq', { ascending: true });

    if (typeof afterSeq === 'number' && Number.isFinite(afterSeq)) {
      query = query.gt('seq', afterSeq);
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(`Failed to list run events: ${error.message}`);
    }

    return (data ?? []).map((row) => mapRowToStoredEvent(row as Record<string, unknown>));
  }
}

export const runEventService = new RunEventService();

export function formatRunEventSse(event: StoredRunEvent): string {
  return `id: ${event.seq}\nevent: ${event.eventName}\ndata: ${JSON.stringify({
    event: event.eventName,
    runId: event.runId,
    seq: event.seq,
    timestamp: event.createdAt,
    ...event.payload,
  })}\n\n`;
}
