import { NextResponse } from 'next/server';
import { getUser } from '@/lib/supabase/server';
import { memoryService } from '@/lib/memory/service';

interface UpdateMemoryRequestBody {
  enabled: boolean;
  baseVersion?: number;
  schemaVersion?: number;
  capabilities?: {
    crossTripPersonalization?: boolean;
    preferenceInference?: boolean;
  };
  profile?: Record<string, unknown> | null;
  source?: 'explicit' | 'inferred' | 'mixed';
}

export const runtime = 'nodejs';

export async function GET() {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'authentication_required' }, { status: 401 });
  }

  const memory = await memoryService.getMemoryProfile(user.id);
  return NextResponse.json(memory);
}

export async function POST(request: Request) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'authentication_required' }, { status: 401 });
    }

    const body = await request.json() as UpdateMemoryRequestBody;
    const memory = await memoryService.updateMemoryProfile({
      userId: user.id,
      enabled: body.enabled,
      baseVersion: body.baseVersion,
      schemaVersion: body.schemaVersion,
      capabilities: body.capabilities,
      profile: body.profile,
      source: body.source,
    });

    return NextResponse.json(memory);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'memory_update_failed';
    const status = message === 'memory_version_conflict' ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
