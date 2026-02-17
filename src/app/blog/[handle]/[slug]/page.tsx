import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import type React from 'react';

import { createClient } from '@/lib/supabase/server';

interface Props {
  params: Promise<{ handle: string; slug: string }>;
}

async function getPublishedPost(handle: string, slug: string) {
  const username = handle.startsWith('@') ? handle.slice(1) : handle;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('get_published_blog_post', {
    p_username: username,
    p_slug: slug,
  });
  if (error) throw error;
  return data as {
    title: string;
    excerpt: string | null;
    content_html: string | null;
    cover_image_path: string | null;
    published_at: string;
    author: { username: string; display_name: string | null };
  } | null;
}

function renderContentWithEmbeds(content: string) {
  const regex = /\[\[tabidea:shiori:([a-z0-9-]+)(?:\?t=([a-zA-Z0-9]+))?\]\]/gi;
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(content)) !== null) {
    const [raw, slug, token] = match;
    if (match.index > lastIndex) {
      nodes.push(<p key={`text-${match.index}`} className="whitespace-pre-wrap">{content.slice(lastIndex, match.index)}</p>);
    }
    nodes.push(
      <iframe
        key={`embed-${slug}-${match.index}`}
        src={`/shiori/${slug}${token ? `?t=${token}` : ''}`}
        className="w-full min-h-[360px] rounded-xl border border-stone-200"
        loading="lazy"
      />,
    );
    lastIndex = match.index + raw.length;
  }

  if (lastIndex < content.length) {
    nodes.push(<p key="text-last" className="whitespace-pre-wrap">{content.slice(lastIndex)}</p>);
  }

  return nodes;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle, slug } = await params;
  const post = await getPublishedPost(handle, slug);
  if (!post) return { title: '記事が見つかりません' };

  const title = `${post.title} | Tabidea Blog`;
  const description = post.excerpt || 'Tabidea 旅行ブログ記事';
  const image = post.cover_image_path
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/blog-images/${post.cover_image_path}`
    : '/favicon.ico';

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'article',
      images: [{ url: image }],
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { handle, slug } = await params;
  const post = await getPublishedPost(handle, slug);

  if (!post) notFound();

  const coverUrl = post.cover_image_path
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/blog-images/${post.cover_image_path}`
    : null;

  return (
    <main className="max-w-3xl mx-auto px-4 py-24 space-y-6">
      <header className="space-y-2">
        <p className="text-xs text-stone-500">@{post.author.username}</p>
        <h1 className="text-3xl font-bold text-stone-900">{post.title}</h1>
        {post.excerpt && <p className="text-stone-600">{post.excerpt}</p>}
      </header>

      {coverUrl && (
        <div className="relative w-full h-64 rounded-xl overflow-hidden border border-stone-200">
          <Image src={coverUrl} alt={post.title} fill className="object-cover" />
        </div>
      )}

      <article className="prose prose-stone max-w-none">
        {renderContentWithEmbeds(post.content_html || '')}
      </article>
    </main>
  );
}
