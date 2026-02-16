import Link from 'next/link';
import { redirect } from 'next/navigation';

import { createClient, getUser } from '@/lib/supabase/server';
import { listMyBlogPosts } from '@/app/actions/blog';

export default async function BlogDashboardPage() {
  const user = await getUser();
  if (!user) {
    redirect('/auth/login?redirect=/blog');
  }

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from('blog_profiles')
    .select('username,display_name,bio')
    .eq('user_id', user.id)
    .maybeSingle();

  const posts = await listMyBlogPosts();

  return (
    <main className="max-w-4xl mx-auto px-4 py-28 space-y-6">
      <div className="rounded-xl border border-stone-200 bg-white p-6 space-y-2">
        <h1 className="text-2xl font-bold text-stone-900">Blog Studio</h1>
        <p className="text-sm text-stone-600">blog.tabide.ai 向けの記事を作成・公開します。</p>
        {profile?.username ? (
          <p className="text-sm">プロフィール: @{profile.username}</p>
        ) : (
          <p className="text-sm text-amber-700">公開前にプロフィールの username 設定が必要です（新規記事画面で設定可）。</p>
        )}
        <Link href="/blog/new" className="inline-block px-4 py-2 rounded bg-primary text-white text-sm">新規記事を作成</Link>
      </div>

      <section className="rounded-xl border border-stone-200 bg-white p-6">
        <h2 className="font-semibold mb-3">Your posts</h2>
        <div className="space-y-2">
          {posts.map((post) => (
            <div key={post.id} className="border border-stone-100 rounded p-3 flex items-center justify-between gap-3">
              <div>
                <p className="font-medium">{post.title}</p>
                <p className="text-xs text-stone-500">/{post.slug} · {post.status}</p>
              </div>
              <Link href={`/blog/edit/${post.id}`} className="text-sm text-primary">編集</Link>
            </div>
          ))}
          {posts.length === 0 && <p className="text-sm text-stone-500">まだ記事がありません。</p>}
        </div>
      </section>
    </main>
  );
}
