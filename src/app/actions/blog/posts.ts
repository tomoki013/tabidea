'use server';

import { revalidatePath } from 'next/cache';

import { createClient, getUser } from '@/lib/supabase/server';
import { toSlug } from '@/lib/blog/slugs';

async function requireUser() {
  const user = await getUser();
  if (!user) throw new Error('Unauthorized');
  return user;
}

async function ensureProfile(userId: string) {
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from('blog_profiles')
    .select('username')
    .eq('user_id', userId)
    .maybeSingle();

  if (profile?.username) return profile;

  const fallback = `user_${userId.slice(0, 8)}`;
  const { data, error } = await supabase
    .from('blog_profiles')
    .insert({ user_id: userId, username: fallback, display_name: 'Tabidea User' })
    .select('username')
    .single();

  if (error) throw error;
  return data;
}

export async function saveBlogPost(input: {
  postId?: string;
  title: string;
  slug?: string;
  excerpt?: string | null;
  contentJson: Record<string, unknown>;
  contentHtml?: string | null;
  status: 'draft' | 'published';
  coverImagePath?: string | null;
  embeds?: Array<{ type: 'shiori'; refSlug: string; refToken?: string | null }>;
}) {
  const user = await requireUser();
  const supabase = await createClient();
  const profile = await ensureProfile(user.id);

  const slug = toSlug(input.slug?.trim() || input.title);
  const payload = {
    user_id: user.id,
    title: input.title,
    slug,
    excerpt: input.excerpt ?? null,
    content_json: input.contentJson,
    content_html: input.contentHtml ?? null,
    status: input.status,
    published_at: input.status === 'published' ? new Date().toISOString() : null,
    cover_image_path: input.coverImagePath ?? null,
    updated_at: new Date().toISOString(),
  };

  const query = input.postId
    ? supabase.from('blog_posts').update(payload).eq('id', input.postId).eq('user_id', user.id).select('id').single()
    : supabase.from('blog_posts').insert(payload).select('id').single();

  const { data, error } = await query;
  if (error || !data) return { success: false, error: error?.message ?? '保存失敗' };

  await supabase.from('blog_post_embeds').delete().eq('post_id', data.id);
  if ((input.embeds ?? []).length > 0) {
    const rows = (input.embeds ?? []).map((embed) => ({
      post_id: data.id,
      type: embed.type,
      ref_slug: embed.refSlug,
      ref_token: embed.refToken ?? null,
    }));
    const { error: embedError } = await supabase.from('blog_post_embeds').insert(rows);
    if (embedError) return { success: false, error: embedError.message };
  }

  revalidatePath(`/blog/@${profile.username}/${slug}`);
  revalidatePath('/blog');

  return { success: true, postId: data.id, slug, username: profile.username };
}

export async function listMyBlogPosts() {
  const user = await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('blog_posts')
    .select('id,title,slug,status,updated_at,published_at')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false });

  if (error) return { success: false, error: error.message, posts: [] as Array<Record<string, unknown>> };
  return { success: true, posts: data ?? [] };
}
