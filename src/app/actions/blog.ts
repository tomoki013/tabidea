'use server';

import { revalidatePath } from 'next/cache';

import { createClient, getUser } from '@/lib/supabase/server';

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80) || `post-${Date.now()}`;
}

export async function saveBlogPost(input: {
  id?: string;
  title: string;
  slug?: string;
  excerpt?: string;
  contentHtml: string;
  contentJson?: Record<string, unknown> | null;
  coverImagePath?: string | null;
  embeds?: Array<{ type: 'shiori'; refSlug: string; refToken?: string | null }>;
}) {
  const user = await getUser();
  if (!user) return { success: false, error: 'Unauthorized' };
  const supabase = await createClient();

  const slug = slugify(input.slug || input.title);

  const { data: post, error } = await supabase
    .from('blog_posts')
    .upsert({
      id: input.id,
      user_id: user.id,
      title: input.title,
      slug,
      excerpt: input.excerpt ?? null,
      content_html: input.contentHtml,
      content_json: input.contentJson ?? null,
      cover_image_path: input.coverImagePath ?? null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' })
    .select('id, slug')
    .single();

  if (error || !post) return { success: false, error: error?.message ?? 'Save failed' };

  await supabase.from('blog_post_embeds').delete().eq('post_id', post.id);

  if (input.embeds && input.embeds.length > 0) {
    const rows = input.embeds.map((embed) => ({
      post_id: post.id,
      type: embed.type,
      ref_slug: embed.refSlug,
      ref_token: embed.refToken ?? null,
    }));
    const { error: embedError } = await supabase.from('blog_post_embeds').insert(rows);
    if (embedError) return { success: false, error: embedError.message };
  }

  revalidatePath('/blog');
  revalidatePath(`/blog/@me/${post.slug}`);

  return { success: true, id: post.id, slug: post.slug };
}

export async function publishBlogPost(postId: string) {
  const user = await getUser();
  if (!user) return { success: false, error: 'Unauthorized' };
  const supabase = await createClient();

  const { error } = await supabase
    .from('blog_posts')
    .update({ status: 'published', published_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', postId)
    .eq('user_id', user.id);

  if (error) return { success: false, error: error.message };
  revalidatePath('/blog');
  return { success: true };
}

export async function listMyBlogPosts() {
  const user = await getUser();
  if (!user) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from('blog_posts')
    .select('id,title,slug,status,updated_at,published_at')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false });

  return data ?? [];
}

export async function ensureBlogProfile() {
  const user = await getUser();
  if (!user) return { success: false, error: 'Unauthorized' };
  const supabase = await createClient();

  const fallbackUsername = (user.email?.split('@')[0] || `user${user.id.slice(0, 8)}`).replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 30);
  const { error } = await supabase.from('blog_profiles').upsert({
    user_id: user.id,
    username: fallbackUsername || `user_${user.id.slice(0, 6)}`,
    display_name: user.user_metadata?.name ?? null,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' });

  if (error) return { success: false, error: error.message };
  return { success: true };
}
