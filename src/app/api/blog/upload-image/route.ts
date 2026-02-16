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

  const ext = file.name.split('.').pop() ?? 'jpg';
  const filePath = `${user.id}/${crypto.randomUUID()}.${ext}`;
  const supabase = await createClient();

  const buffer = Buffer.from(await file.arrayBuffer());
  const { error } = await supabase.storage
    .from('blog-images')
    .upload(filePath, buffer, { contentType: file.type, upsert: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data } = supabase.storage.from('blog-images').getPublicUrl(filePath);
  return NextResponse.json({ path: filePath, publicUrl: data.publicUrl });
}
