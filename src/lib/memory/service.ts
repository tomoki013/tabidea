import { createServiceRoleClient } from '@/lib/supabase/admin';

export interface MemoryCapabilities {
  crossTripPersonalization: boolean;
  preferenceInference: boolean;
}

export interface MemoryProfileEnvelope {
  enabled: boolean;
  version: number;
  schemaVersion: number;
  capabilities: MemoryCapabilities;
  profile: Record<string, unknown> | null;
  source: 'explicit' | 'inferred' | 'mixed';
}

export interface UpdateMemoryProfileParams {
  userId: string;
  enabled: boolean;
  baseVersion?: number;
  schemaVersion?: number;
  capabilities?: Partial<MemoryCapabilities>;
  profile?: Record<string, unknown> | null;
  source?: MemoryProfileEnvelope['source'];
}

const DEFAULT_CAPABILITIES: MemoryCapabilities = {
  crossTripPersonalization: true,
  preferenceInference: false,
};

function getClient() {
  return createServiceRoleClient();
}

function rowToEnvelope(row?: Record<string, unknown> | null): MemoryProfileEnvelope {
  return {
    enabled: Boolean(row?.enabled ?? false),
    version: typeof row?.version === 'number' ? row.version : 1,
    schemaVersion: typeof row?.schema_version === 'number' ? row.schema_version : 1,
    capabilities: {
      ...DEFAULT_CAPABILITIES,
      ...((row?.capabilities_json as Record<string, unknown> | null) ?? {}),
    },
    profile: (row?.profile_json as Record<string, unknown> | null) ?? null,
    source: (row?.source as MemoryProfileEnvelope['source']) ?? 'explicit',
  };
}

export class MemoryService {
  async getMemoryProfile(userId: string): Promise<MemoryProfileEnvelope> {
    const client = getClient();
    const { data, error } = await client
      .from('user_preferences')
      .select('version, enabled, schema_version, capabilities_json, profile_json, source')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to load memory profile: ${error.message}`);
    }

    return rowToEnvelope(data);
  }

  async updateMemoryProfile(params: UpdateMemoryProfileParams): Promise<MemoryProfileEnvelope> {
    const client = getClient();
    const existing = await this.getMemoryProfile(params.userId);

    if (
      typeof params.baseVersion === 'number'
      && params.baseVersion !== existing.version
      && !(existing.version === 1 && existing.profile === null && existing.enabled === false && params.baseVersion === 0)
    ) {
      throw new Error('memory_version_conflict');
    }

    const nextEnvelope: MemoryProfileEnvelope = {
      enabled: params.enabled,
      version: existing.version + 1,
      schemaVersion: params.schemaVersion ?? existing.schemaVersion ?? 1,
      capabilities: {
        ...existing.capabilities,
        ...(params.capabilities ?? {}),
      },
      profile: params.profile === undefined ? existing.profile : params.profile,
      source: params.source ?? existing.source,
    };

    const { error } = await client
      .from('user_preferences')
      .upsert({
        user_id: params.userId,
        version: nextEnvelope.version,
        enabled: nextEnvelope.enabled,
        schema_version: nextEnvelope.schemaVersion,
        capabilities_json: nextEnvelope.capabilities,
        profile_json: nextEnvelope.profile,
        source: nextEnvelope.source,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      throw new Error(`Failed to update memory profile: ${error.message}`);
    }

    return nextEnvelope;
  }
}

export const memoryService = new MemoryService();
