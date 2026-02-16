import Link from 'next/link';

import { createClient, getUser } from '@/lib/supabase/server';
import { listMyBlogPosts } from '@/app/actions/blog/posts';

export default async function BlogHomePage() {
  const user = await getUser();
  const mine = user ? await listMyBlogPosts() : { success: true, posts: [] as Array<{ id: string; title: string; slug: string; status: string; updated_at: string; published_at: string | null }> };

  const supabase = await createClient();
  const { data: published } = await supabase
    .from('blog_posts')
    .select('id,title,slug,excerpt,published_at,user_id')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(20);

  const authorIds = Array.from(new Set((published ?? []).map((p) => p.user_id)));
  const { data: profiles } = authorIds.length > 0
    ? await supabase.from('blog_profiles').select('user_id,username,display_name').in('user_id', authorIds)
    : { data: [] as Array<{ user_id: string; username: string; display_name: string | null }> };
  const profileMap = new Map((profiles ?? []).map((p) => [p.user_id, p]));

  return (
    <main className="max-w-5xl mx-auto px-4 py-10 space-y-8">
      <header className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Tabidea Blog</h1>
        {user && <Link href="/blog/new" className="px-4 py-2 rounded bg-primary text-white">新規投稿</Link>}
      </header>

      {user && (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">自分の記事</h2>
          <ul className="space-y-2">
            {(mine.posts ?? []).map((post) => (
              <li key={post.id} className="rounded border p-3 flex items-center justify-between">
                <div>
                  <div className="font-medium">{post.title}</div>
                  <div className="text-xs text-stone-500">{post.status} / {new Date(post.updated_at).toLocaleString('ja-JP')}</div>
                </div>
                <Link href={`/blog/edit/${post.id}`} className="text-sm underline">編集</Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">公開記事</h2>
        <ul className="space-y-3">
          {(published ?? []).map((post) => {
            const profile = profileMap.get(post.user_id);
            const username = profile?.username ?? `user_${post.user_id.slice(0, 8)}`;
            return (
              <li key={post.id} className="rounded border p-4">
                <Link href={`/blog/@${username}/${post.slug}`} className="text-lg font-medium underline">{post.title}</Link>
                <p className="text-sm text-stone-600">@{username}</p>
                {post.excerpt && <p className="text-sm mt-2">{post.excerpt}</p>}
              </li>
            );
          })}
        </ul>
      </section>
    </main>
  );
}
