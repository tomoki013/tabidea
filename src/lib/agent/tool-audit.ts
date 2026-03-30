import { createServiceRoleClient } from '@/lib/supabase/admin';

export interface ToolAuditLogParams {
  runId?: string;
  toolName: string;
  request?: unknown;
  response?: unknown;
  status?: 'started' | 'completed' | 'failed';
  latencyMs?: number;
  provider?: string;
  errorCode?: string;
}

function getClient() {
  return createServiceRoleClient();
}

export async function recordToolAuditLog(params: ToolAuditLogParams): Promise<void> {
  const client = getClient();
  const { error } = await client
    .from('tool_audit_logs')
    .insert({
      run_id: params.runId ?? null,
      tool_name: params.toolName,
      request_json: params.request ?? null,
      response_json: params.response ?? null,
      status: params.status ?? 'completed',
      latency_ms: params.latencyMs ?? null,
      provider: params.provider ?? null,
      error_code: params.errorCode ?? null,
    });

  if (error) {
    throw new Error(`Failed to record tool audit log: ${error.message}`);
  }
}
