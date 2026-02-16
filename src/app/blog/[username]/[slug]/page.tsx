import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';

async function fetchPost(usernameParam: string, slug: string) {
  const username = usernameParam.replace(/^@/, '');
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from('blog_profiles')
    .select('user_id,username,display_name,avatar_path,bio')
    .eq('username', username)
    .maybeSingle();

  if (!profile) return null;

  const { data: post } = await supabase
    .from('blog_posts')
    .select('id,title,excerpt,content_html,cover_image_path,status,published_at')
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

export async function generateMetadata({ params }: { params: Promise<{ username: string; slug: string }> }): Promise<Metadata> {
  const { username, slug } = await params;
  const data = await fetchPost(username, slug);
  if (!data) return { title: 'Not Found | Tabidea Blog' };

  return {
    title: `${data.post.title} | Tabidea Blog`,
    description: data.post.excerpt ?? `${data.profile.display_name ?? data.profile.username} の旅行ブログ`,
    openGraph: {
      title: data.post.title,
      description: data.post.excerpt ?? undefined,
      images: data.post.cover_image_path ? [`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/blog-images/${data.post.cover_image_path}`] : undefined,
    },
  };
}

export default async function BlogPostPage({ params }: { params: Promise<{ username: string; slug: string }> }) {
  const { username, slug } = await params;
  const data = await fetchPost(username, slug);
  if (!data) return notFound();

  const coverUrl = data.post.cover_image_path
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/blog-images/${data.post.cover_image_path}`
    : null;

  return (
    <article className="max-w-3xl mx-auto px-4 py-10 space-y-6">
      <header className="space-y-3">
        <h1 className="text-3xl font-bold">{data.post.title}</h1>
        <p className="text-sm text-stone-600">@{data.profile.username} ・ {data.post.published_at ? new Date(data.post.published_at).toLocaleDateString('ja-JP') : ''}</p>
        {coverUrl && <img src={coverUrl} alt={data.post.title} className="w-full rounded-lg border" />}
      </header>

      <section className="prose max-w-none" dangerouslySetInnerHTML={{ __html: data.post.content_html ?? '' }} />

      {data.embeds.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">埋め込みプラン</h2>
          {data.embeds.map((embed, idx) => {
            const src = `https://shiori.tabide.ai/${embed.ref_slug}${embed.ref_token ? `?t=${embed.ref_token}` : ''}`;
            return (
              <iframe
                key={`${embed.ref_slug}-${idx}`}
                src={src}
                className="w-full rounded border min-h-[420px]"
                loading="lazy"
                title={`Tabidea Plan ${embed.ref_slug}`}
              />
            );
          })}
        </section>
      )}
    </article>
  );
}
