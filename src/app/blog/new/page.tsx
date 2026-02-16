import { redirect } from 'next/navigation';

import { createClient, getUser } from '@/lib/supabase/server';
import BlogEditor from '@/components/blog/BlogEditor';

export default async function NewBlogPostPage() {
  const user = await getUser();
  if (!user) redirect('/auth/login?redirect=/blog/new');

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from('blog_profiles')
    .select('username,display_name,bio')
    .eq('user_id', user.id)
    .maybeSingle();

  return (
    <main className="max-w-4xl mx-auto px-4 py-28">
      <BlogEditor profile={profile} />
    </main>
  );
}
