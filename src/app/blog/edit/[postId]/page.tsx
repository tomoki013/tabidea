import { notFound } from 'next/navigation';

import BlogEditor from '@/components/blog/BlogEditor';
import { createClient, getUser } from '@/lib/supabase/server';

export default async function EditBlogPage({ params }: { params: Promise<{ postId: string }> }) {
  const { postId } = await params;
  const user = await getUser();
  if (!user) return notFound();

  const supabase = await createClient();
  const { data: post } = await supabase
    .from('blog_posts')
    .select('id,title,slug,excerpt,status,content_html,cover_image_path')
    .eq('id', postId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!post) return notFound();

  const { data: embeds } = await supabase
    .from('blog_post_embeds')
    .select('type,ref_slug,ref_token')
    .eq('post_id', post.id)
    .order('created_at', { ascending: true });

  return (
    <BlogEditor
      initial={{
        id: post.id,
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt ?? '',
        status: post.status,
        contentHtml: post.content_html ?? '',
        coverImagePath: post.cover_image_path,
        embeds: (embeds ?? []).map((embed) => ({ type: 'shiori' as const, refSlug: embed.ref_slug, refToken: embed.ref_token })),
      }}
    />
  );
}
