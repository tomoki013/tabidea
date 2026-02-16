import Link from 'next/link';

import { createClient } from '@/lib/supabase/server';

export default async function BlogTopPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: published } = await supabase
    .from('blog_posts')
    .select('id,title,slug,excerpt,published_at,user_id')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(20);

  let profileMap = new Map<string, string>();
  if (published && published.length > 0) {
    const userIds = Array.from(new Set(published.map((p) => p.user_id)));
    const { data: profiles } = await supabase
      .from('blog_profiles')
      .select('user_id,username')
      .in('user_id', userIds);
    profileMap = new Map((profiles ?? []).map((p) => [p.user_id, p.username]));
  }

  return (
    <main className="mx-auto max-w-4xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Tabidea Blog</h1>
        {user && <Link href="/blog/editor" className="px-3 py-1 rounded border text-sm">記事を書く</Link>}
      </div>
      <div className="space-y-3">
        {(published ?? []).map((post) => {
          const username = profileMap.get(post.user_id) ?? 'unknown';
          return (
            <article key={post.id} className="rounded border p-3">
              <h2 className="font-semibold">
                <Link href={`/blog/@${username}/${post.slug}`}>{post.title}</Link>
              </h2>
              <p className="text-sm text-stone-600">@{username}</p>
              {post.excerpt && <p className="text-sm mt-1">{post.excerpt}</p>}
            </article>
          );
        })}
      </div>
    </main>
  );
}
