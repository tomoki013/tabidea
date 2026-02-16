import { notFound } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';

import BlogEditorClient from '../BlogEditorClient';

export default async function BlogEditorDetailPage({ params }: { params: Promise<{ postId: string }> }) {
  const { postId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) notFound();

  const [{ data: post }, { data: embeds }, { data: profile }] = await Promise.all([
    supabase.from('blog_posts').select('*').eq('id', postId).eq('user_id', user.id).maybeSingle(),
    supabase.from('blog_post_embeds').select('ref_slug,ref_token').eq('post_id', postId),
    supabase.from('blog_profiles').select('username,display_name,bio').eq('user_id', user.id).maybeSingle(),
  ]);

  if (!post) notFound();

  return <BlogEditorClient initial={{ ...post, embeds: embeds ?? [] }} profile={profile ?? undefined} />;
}
