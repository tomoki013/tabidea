'use server';

import { revalidatePath } from 'next/cache';

import { createClient, getUser } from '@/lib/supabase/server';

function parseEmbeds(contentHtml: string): Array<{ type: 'shiori'; ref_slug: string; ref_token: string | null }> {
  const regex = /\[\[tabidea:shiori:([a-z0-9-]+)(?:\?t=([a-zA-Z0-9]+))?\]\]/gi;
  const embeds: Array<{ type: 'shiori'; ref_slug: string; ref_token: string | null }> = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(contentHtml)) !== null) {
    embeds.push({ type: 'shiori', ref_slug: match[1], ref_token: match[2] ?? null });
  }
  return embeds;
}

function toSlug(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 64);
}

export async function upsertBlogProfile(input: {
  username: string;
  displayName?: string | null;
  bio?: string | null;
  avatarPath?: string | null;
}) {
  const user = await getUser();
  if (!user) return { success: false, error: 'Unauthorized' };

  const supabase = await createClient();
  const username = input.username.toLowerCase();

  const { error } = await supabase.from('blog_profiles').upsert({
    user_id: user.id,
    username,
    display_name: input.displayName ?? null,
    bio: input.bio ?? null,
    avatar_path: input.avatarPath ?? null,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' });

  if (error) return { success: false, error: error.message };

  revalidatePath('/blog');
  return { success: true, username };
}

export async function createOrUpdateBlogPost(input: {
  id?: string;
  title: string;
  slug?: string;
  excerpt?: string | null;
  contentHtml: string;
  coverImagePath?: string | null;
  status: 'draft' | 'published';
}) {
  const user = await getUser();
  if (!user) return { success: false, error: 'Unauthorized' };

  const supabase = await createClient();

  const { data: profile } = await supabase
    .from('blog_profiles')
    .select('username')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!profile?.username) {
    return { success: false, error: 'ブログプロフィールのユーザー名を先に設定してください。' };
  }

  const slug = toSlug(input.slug || input.title || 'post');
  const now = new Date().toISOString();
  const postPayload = {
    user_id: user.id,
    title: input.title,
    slug,
    excerpt: input.excerpt ?? null,
    content_html: input.contentHtml,
    content_json: null,
    status: input.status,
    published_at: input.status === 'published' ? now : null,
    cover_image_path: input.coverImagePath ?? null,
    updated_at: now,
  };

  const postQuery = input.id
    ? supabase.from('blog_posts').update(postPayload).eq('id', input.id).eq('user_id', user.id).select('id').single()
    : supabase.from('blog_posts').insert(postPayload).select('id').single();

  const { data: post, error } = await postQuery;
  if (error || !post) return { success: false, error: error?.message ?? 'post save failed' };

  const embeds = parseEmbeds(input.contentHtml);
  await supabase.from('blog_post_embeds').delete().eq('post_id', post.id);
  if (embeds.length > 0) {
    const { error: embedError } = await supabase.from('blog_post_embeds').insert(
      embeds.map((embed) => ({ ...embed, post_id: post.id })),
    );
    if (embedError) return { success: false, error: embedError.message };
  }

  revalidatePath('/blog');
  revalidatePath(`/blog/@${profile.username}/${slug}`);

  return { success: true, id: post.id, slug, username: profile.username };
}

export async function listMyBlogPosts() {
  const user = await getUser();
  if (!user) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from('blog_posts')
    .select('id,title,slug,status,published_at,updated_at')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false });

  return data ?? [];
}

export async function uploadBlogImage(input: { fileName: string; fileBase64: string; contentType: string }) {
  const user = await getUser();
  if (!user) return { success: false, error: 'Unauthorized' };

  const supabase = await createClient();
  const data = Buffer.from(input.fileBase64, 'base64');
  const path = `${user.id}/${Date.now()}-${input.fileName}`;

  const { error } = await supabase.storage
    .from('blog-images')
    .upload(path, data, {
      contentType: input.contentType,
      upsert: false,
    });

  if (error) return { success: false, error: error.message };

  const { data: publicUrl } = supabase.storage.from('blog-images').getPublicUrl(path);
  return { success: true, path, publicUrl: publicUrl.publicUrl };
}
