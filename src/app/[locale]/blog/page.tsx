import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getTranslations } from "next-intl/server";

import { createClient, getUser } from '@/lib/supabase/server';
import { listMyBlogPosts } from '@/app/actions/blog';
import { localizePath } from '@/lib/i18n/locales';
import { getRequestLanguage } from '@/lib/i18n/server';

export default async function BlogDashboardPage() {
  const language = await getRequestLanguage();
  const t = await getTranslations("pages.blog.dashboard");
  const user = await getUser();
  if (!user) {
    redirect(`${localizePath('/auth/login', language)}?redirect=${encodeURIComponent(localizePath('/blog', language))}`);
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
        <h1 className="text-2xl font-bold text-stone-900">{t("title")}</h1>
        <p className="text-sm text-stone-600">
          {t("description")}
        </p>
        {profile?.username ? (
          <p className="text-sm">{t("profile", { username: profile.username })}</p>
        ) : (
          <p className="text-sm text-amber-700">
            {t("profileMissing")}
          </p>
        )}
        <Link href={localizePath("/blog/new", language)} className="inline-block px-4 py-2 rounded bg-primary text-white text-sm">
          {t("createPost")}
        </Link>
      </div>

      <section className="rounded-xl border border-stone-200 bg-white p-6">
        <h2 className="font-semibold mb-3">{t("postsHeading")}</h2>
        <div className="space-y-2">
          {posts.map((post) => (
            <div key={post.id} className="border border-stone-100 rounded p-3 flex items-center justify-between gap-3">
              <div>
                <p className="font-medium">{post.title}</p>
                <p className="text-xs text-stone-500">/{post.slug} · {post.status}</p>
              </div>
              <Link href={localizePath(`/blog/edit/${post.id}`, language)} className="text-sm text-primary">
                {t("edit")}
              </Link>
            </div>
          ))}
          {posts.length === 0 && <p className="text-sm text-stone-500">{t("empty")}</p>}
        </div>
      </section>
    </main>
  );
}
