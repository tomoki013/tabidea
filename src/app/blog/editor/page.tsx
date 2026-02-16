import { redirect } from 'next/navigation';

import BlogEditor from '@/components/features/blog/BlogEditor';
import { ensureBlogProfile, listMyBlogPosts } from '@/app/actions/blog';
import { getUser } from '@/lib/supabase/server';

export default async function BlogEditorPage() {
  const user = await getUser();
  if (!user) redirect('/auth/login?redirect=/blog/editor');

  await ensureBlogProfile();
  const posts = await listMyBlogPosts();

  return (
    <main className="min-h-screen bg-[#fcfbf9] px-4 py-10">
      <div className="mx-auto max-w-6xl space-y-4">
        <h1 className="text-2xl font-bold text-stone-800">ブログエディタ</h1>
        <p className="text-sm text-stone-600">下書き保存・公開・Tabideaしおり埋め込みに対応。</p>
        <BlogEditor initialPosts={posts as Array<{ id: string; title: string; slug: string; status: 'draft' | 'published'; updated_at: string }>} />
      </div>
    </main>
  );
}
