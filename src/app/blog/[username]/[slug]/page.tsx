import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';

interface PageProps {
  params: Promise<{ username: string; slug: string }>;
}

async function loadPost(rawUsername: string, slug: string) {
  const username = rawUsername.replace(/^@/, '');
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from('blog_profiles')
    .select('user_id,username,display_name,bio,avatar_path')
    .eq('username', username)
    .maybeSingle();

  if (!profile) return null;

  const { data: post } = await supabase
    .from('blog_posts')
    .select('id,title,excerpt,content_html,status,published_at,cover_image_path')
    .eq('user_id', profile.user_id)
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle();

  if (!post) return null;

  const { data: embeds } = await supabase
    .from('blog_post_embeds')
    .select('type,ref_slug,ref_token')
    .eq('post_id', post.id)
    .order('created_at', { ascending: true });

  return { profile, post, embeds: embeds ?? [] };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { username, slug } = await params;
  const data = await loadPost(username, slug);
  if (!data) return { title: '記事が見つかりません' };

  const title = `${data.post.title} | @${data.profile.username}`;
  const description = data.post.excerpt ?? `${data.profile.display_name ?? data.profile.username}の旅行ブログ記事`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: data.post.cover_image_path ? [{ url: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/blog-images/${data.post.cover_image_path}` }] : undefined,
    },
  };
}

export default async function BlogPostPage({ params }: PageProps) {
  const { username, slug } = await params;
  const data = await loadPost(username, slug);

  if (!data) notFound();

  return (
    <main className="min-h-screen bg-[#fcfbf9] px-4 py-10">
      <article className="mx-auto max-w-3xl rounded-xl border border-stone-200 bg-white p-6 space-y-4">
        <p className="text-xs text-stone-500">@{data.profile.username}</p>
        <h1 className="text-3xl font-bold text-stone-800">{data.post.title}</h1>
        {data.post.excerpt && <p className="text-stone-600">{data.post.excerpt}</p>}
        <div className="prose prose-stone max-w-none" dangerouslySetInnerHTML={{ __html: data.post.content_html }} />

        {data.embeds.filter((x) => x.type === 'shiori').map((embed, index) => (
          <section key={`${embed.ref_slug}-${index}`} className="rounded border p-3">
            <p className="text-xs text-stone-500">Tabidea Plan Embed</p>
            <iframe
              src={`https://shiori.tabide.ai/${embed.ref_slug}${embed.ref_token ? `?t=${embed.ref_token}` : ''}`}
              className="mt-2 w-full min-h-[460px] rounded border"
              loading="lazy"
            />
          </section>
        ))}
      </article>
    </main>
  );
}
