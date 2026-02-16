import { NextResponse } from 'next/server';

import { createClient, getUser } from '@/lib/supabase/server';

export async function POST(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const form = await request.formData();
  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'file is required' }, { status: 400 });
  }

  const ext = file.name.split('.').pop() || 'jpg';
  const path = `${user.id}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
  const supabase = await createClient();

  const { error } = await supabase.storage.from('blog-images').upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data } = supabase.storage.from('blog-images').getPublicUrl(path);
  return NextResponse.json({ path, publicUrl: data.publicUrl });
}
