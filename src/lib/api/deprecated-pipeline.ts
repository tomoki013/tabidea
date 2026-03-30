import { NextResponse } from 'next/server';

export function deprecatedPipelineResponse(
  endpoint: string,
  replacement = '/api/agent/runs',
) {
  return NextResponse.json(
    {
      error: 'deprecated_pipeline',
      endpoint,
      replacement,
    },
    { status: 410 },
  );
}
