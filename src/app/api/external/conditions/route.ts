import { generateObject } from 'ai';
import { NextResponse } from 'next/server';

import { getUser } from '@/lib/supabase/server';
import { AIConditionRequestSchema, FlightSearchConditionSchema, HotelSearchConditionSchema } from '@/lib/external/schemas';
import { resolveModelForProvider, resolveProvider } from '@/lib/services/ai/model-provider';

export async function POST(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const parsed = AIConditionRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const schema = parsed.data.type === 'hotel' ? HotelSearchConditionSchema : FlightSearchConditionSchema;
  const provider = resolveProvider('itinerary');
  const model = resolveModelForProvider(provider, 'itinerary', { structuredOutputs: true });

  try {
    const result = await generateObject({
      model: model.model,
      schema,
      prompt: `あなたは旅行検索条件の生成器です。提案の本文は書かず、必ずJSONのみを返してください。\n\nユーザー要望:\n${parsed.data.prompt}\n\n補足コンテキスト:\n${JSON.stringify(parsed.data.context ?? {})}`,
    });
    return NextResponse.json({ conditions: result.object, model: model.modelName });
  } catch (error) {
    console.error('[external/conditions] generation failed', error);
    return NextResponse.json({ error: '検索条件の生成に失敗しました。手動で調整してください。' }, { status: 500 });
  }
}
