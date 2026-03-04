import { redirect } from 'next/navigation';

import { createClient, getUser } from '@/lib/supabase/server';
import { localizePath } from '@/lib/i18n/locales';
import { getRequestLanguage } from '@/lib/i18n/server';
import BlogEditor from '@/components/blog/BlogEditor';

export default async function NewBlogPostPage() {
  const language = await getRequestLanguage();
  const user = await getUser();
  if (!user) redirect(`${localizePath('/auth/login', language)}?redirect=${encodeURIComponent(localizePath('/blog/new', language))}`);

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
