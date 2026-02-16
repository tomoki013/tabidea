'use server';

import { revalidatePath } from 'next/cache';

import { createClient, getUser } from '@/lib/supabase/server';

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 64) || 'post';
}

async function assertUser() {
  const user = await getUser();
  if (!user) throw new Error('Unauthorized');
  return user;
}

export async function upsertBlogProfile(input: { username: string; displayName?: string; bio?: string }) {
  const user = await assertUser();
  const supabase = await createClient();

  const username = input.username.replace(/^@/, '');
  const { error } = await supabase.from('blog_profiles').upsert({
    user_id: user.id,
    username,
    display_name: input.displayName ?? null,
    bio: input.bio ?? null,
    updated_at: new Date().toISOString(),
  });

  if (error) return { success: false, error: error.message };
  revalidatePath('/blog');
  return { success: true, username };
}

export async function saveBlogPost(input: {
  id?: string;
  title: string;
  slug?: string;
  excerpt?: string;
  contentHtml: string;
  status: 'draft' | 'published';
  coverImagePath?: string | null;
  embeds?: Array<{ type: 'shiori'; refSlug: string; refToken?: string | null }>;
}) {
  const user = await assertUser();
  const supabase = await createClient();

  const slug = slugify(input.slug?.trim() || input.title);

  let postId = input.id;
  if (postId) {
    const { error } = await supabase
      .from('blog_posts')
      .update({
        title: input.title,
        slug,
        excerpt: input.excerpt ?? null,
        content_html: input.contentHtml,
        status: input.status,
        published_at: input.status === 'published' ? new Date().toISOString() : null,
        cover_image_path: input.coverImagePath ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', postId)
      .eq('user_id', user.id);

    if (error) return { success: false, error: error.message };
  } else {
    const { data, error } = await supabase
      .from('blog_posts')
      .insert({
        user_id: user.id,
        title: input.title,
        slug,
        excerpt: input.excerpt ?? null,
        content_html: input.contentHtml,
        status: input.status,
        published_at: input.status === 'published' ? new Date().toISOString() : null,
        cover_image_path: input.coverImagePath ?? null,
      })
      .select('id')
      .single();

    if (error || !data) return { success: false, error: error?.message ?? 'Failed to create post' };
    postId = data.id;
  }

  await supabase.from('blog_post_embeds').delete().eq('post_id', postId);
  if (input.embeds && input.embeds.length > 0) {
    await supabase.from('blog_post_embeds').insert(
      input.embeds.map((embed) => ({
        post_id: postId,
        type: embed.type,
        ref_slug: embed.refSlug,
        ref_token: embed.refToken ?? null,
      })),
    );
  }

  revalidatePath('/blog');
  revalidatePath(`/blog/editor/${postId}`);

  return { success: true, postId, slug };
}
