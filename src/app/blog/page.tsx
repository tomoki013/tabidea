import Link from 'next/link';

import { createClient } from '@/lib/supabase/server';

export default async function BlogIndexPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('blog_posts')
    .select('id,title,slug,excerpt,published_at,user_id,cover_image_path')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(30);

  const userIds = Array.from(new Set((data ?? []).map((post) => post.user_id)));
  const { data: profiles } = userIds.length > 0
    ? await supabase.from('blog_profiles').select('user_id,username,display_name').in('user_id', userIds)
    : { data: [] };

  const profileMap = new Map((profiles ?? []).map((profile) => [profile.user_id, profile]));

  return (
    <main className="min-h-screen bg-[#fcfbf9] px-4 py-10">
      <div className="mx-auto max-w-4xl space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-stone-800">Tabidea Blog</h1>
          <Link className="text-sm underline" href="/blog/editor">記事を書く</Link>
        </div>
        <div className="grid gap-3">
          {(data ?? []).map((post) => {
            const profile = profileMap.get(post.user_id);
            const username = profile?.username ?? 'unknown';
            return (
              <article key={post.id} className="rounded-lg border border-stone-200 bg-white p-4">
                <p className="text-xs text-stone-500">@{username} ・ {post.published_at ? new Date(post.published_at).toLocaleDateString() : '-'}</p>
                <h2 className="text-lg font-semibold mt-1">{post.title}</h2>
                {post.excerpt && <p className="text-sm text-stone-600 mt-1">{post.excerpt}</p>}
                <Link className="inline-block mt-2 text-sm underline" href={`/blog/@${username}/${post.slug}`}>読む</Link>
              </article>
            );
          })}
        </div>
      </div>
    </main>
  );
}
