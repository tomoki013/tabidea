import { createClient } from '@/lib/supabase/server';

import BlogEditorClient from './BlogEditorClient';

export default async function BlogEditorPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let profile = null;
  if (user) {
    const { data } = await supabase
      .from('blog_profiles')
      .select('username,display_name,bio')
      .eq('user_id', user.id)
      .maybeSingle();
    profile = data;
  }

  return <BlogEditorClient profile={profile ?? undefined} />;
}
