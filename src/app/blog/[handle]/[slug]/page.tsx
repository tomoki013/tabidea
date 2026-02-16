import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';

type BlogPayload = {
  title: string;
  slug: string;
  excerpt: string | null;
  content_html: string;
  cover_image_path: string | null;
  author: { username: string; display_name: string | null };
  embeds: Array<{ type: 'shiori'; ref_slug: string; ref_token?: string | null }>;
};

async function fetchPost(handle: string, slug: string): Promise<BlogPayload | null> {
  const supabase = await createClient();
  const username = handle.replace(/^@/, '');
  const { data } = await supabase.rpc('get_blog_post_by_username_slug', {
    p_username: username,
    p_slug: slug,
  });
  return data as BlogPayload | null;
}

export async function generateMetadata({ params }: { params: Promise<{ handle: string; slug: string }> }): Promise<Metadata> {
  const { handle, slug } = await params;
  const post = await fetchPost(handle, slug);
  if (!post) {
    return { title: 'Post not found | Tabidea Blog' };
  }

  const coverUrl = post.cover_image_path
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/blog-images/${post.cover_image_path}`
    : undefined;

  return {
    title: `${post.title} | Tabidea Blog`,
    description: post.excerpt ?? undefined,
    openGraph: {
      title: post.title,
      description: post.excerpt ?? undefined,
      images: coverUrl ? [{ url: coverUrl }] : undefined,
    },
  };
}

export default async function BlogPostPage({ params }: { params: Promise<{ handle: string; slug: string }> }) {
  const { handle, slug } = await params;
  const post = await fetchPost(handle, slug);
  if (!post) notFound();

  return (
    <main className="mx-auto max-w-3xl p-6 space-y-6">
      <header>
        <p className="text-sm text-stone-600">@{post.author.username}</p>
        <h1 className="text-3xl font-bold">{post.title}</h1>
        {post.excerpt && <p className="mt-2 text-stone-700">{post.excerpt}</p>}
      </header>
      <article className="prose max-w-none" dangerouslySetInnerHTML={{ __html: post.content_html }} />
      {post.embeds?.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-semibold">Tabideaしおり埋め込み</h2>
          {post.embeds.map((embed, index) => {
            const src = `https://shiori.tabide.ai/${embed.ref_slug}${embed.ref_token ? `?t=${embed.ref_token}` : ''}`;
            return (
              <iframe
                key={`${embed.ref_slug}-${index}`}
                src={src}
                className="w-full h-[540px] rounded border"
                loading="lazy"
              />
            );
          })}
        </section>
      )}
    </main>
  );
}
