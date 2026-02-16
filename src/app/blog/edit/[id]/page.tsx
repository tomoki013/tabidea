import { notFound, redirect } from 'next/navigation';

import { createClient, getUser } from '@/lib/supabase/server';
import BlogEditor from '@/components/blog/BlogEditor';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditBlogPostPage({ params }: Props) {
  const user = await getUser();
  if (!user) redirect('/auth/login?redirect=/blog');

  const { id } = await params;
  const supabase = await createClient();

  const [{ data: post }, { data: profile }] = await Promise.all([
    supabase
      .from('blog_posts')
      .select('id,title,slug,excerpt,content_html,cover_image_path')
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle(),
    supabase
      .from('blog_profiles')
      .select('username,display_name,bio')
      .eq('user_id', user.id)
      .maybeSingle(),
  ]);

  if (!post) notFound();

  return (
    <main className="max-w-4xl mx-auto px-4 py-28">
      <BlogEditor initial={post} profile={profile} />
    </main>
  );
}
