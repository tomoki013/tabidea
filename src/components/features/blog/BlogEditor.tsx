'use client';

import { useMemo, useState, useTransition } from 'react';

import { createClient } from '@/lib/supabase/client';
import { publishBlogPost, saveBlogPost } from '@/app/actions/blog';

interface Props {
  initialPosts: Array<{ id: string; title: string; slug: string; status: 'draft' | 'published'; updated_at: string }>;
}

export default function BlogEditor({ initialPosts }: Props) {
  const [posts, setPosts] = useState(initialPosts);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(initialPosts[0]?.id ?? null);
  const [title, setTitle] = useState(initialPosts[0]?.title ?? '');
  const [slug, setSlug] = useState(initialPosts[0]?.slug ?? '');
  const [excerpt, setExcerpt] = useState('');
  const [contentHtml, setContentHtml] = useState('<p>旅の記録を書きましょう...</p>');
  const [coverImagePath, setCoverImagePath] = useState<string | null>(null);
  const [embedSlug, setEmbedSlug] = useState('');
  const [embedToken, setEmbedToken] = useState('');
  const [isPending, startTransition] = useTransition();

  const selectedPost = useMemo(() => posts.find((x) => x.id === selectedPostId), [posts, selectedPostId]);

  const addEmbed = () => {
    if (!embedSlug.trim()) return;
    const src = `https://shiori.tabide.ai/${embedSlug.trim()}${embedToken.trim() ? `?t=${embedToken.trim()}` : ''}`;
    setContentHtml((prev) => `${prev}\n<div class="shiori-embed"><iframe src="${src}" width="100%" height="460" loading="lazy"></iframe></div>`);
  };

  const onUploadImage = async (file: File) => {
    const supabase = createClient();
    const filePath = `${Date.now()}-${file.name.replace(/\s+/g, '-')}`;
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth.user?.id;
    if (!userId) return;

    const path = `${userId}/${filePath}`;
    const { error } = await supabase.storage.from('blog-images').upload(path, file, { upsert: true });
    if (error) {
      alert(error.message);
      return;
    }

    const { data } = supabase.storage.from('blog-images').getPublicUrl(path);
    setCoverImagePath(path);
    setContentHtml((prev) => `${prev}\n<p><img src="${data.publicUrl}" alt="" /></p>`);
  };

  const onSave = () => {
    startTransition(async () => {
      const result = await saveBlogPost({
        id: selectedPostId ?? undefined,
        title,
        slug,
        excerpt,
        contentHtml,
        coverImagePath,
        embeds: embedSlug.trim() ? [{ type: 'shiori', refSlug: embedSlug.trim(), refToken: embedToken.trim() || null }] : [],
      });

      if (!result.success) {
        alert(result.error ?? '保存に失敗しました');
        return;
      }

      setSelectedPostId(result.id ?? null);
      setPosts((prev) => {
        const next = [...prev.filter((p) => p.id !== result.id), {
          id: result.id ?? crypto.randomUUID(),
          title,
          slug: result.slug ?? slug,
          status: selectedPost?.status ?? 'draft',
          updated_at: new Date().toISOString(),
        }];
        return next.sort((a, b) => +new Date(b.updated_at) - +new Date(a.updated_at));
      });
    });
  };

  const onPublish = () => {
    if (!selectedPostId) return;
    startTransition(async () => {
      const result = await publishBlogPost(selectedPostId);
      if (!result.success) {
        alert(result.error ?? '公開に失敗しました');
        return;
      }
      setPosts((prev) => prev.map((p) => p.id === selectedPostId ? { ...p, status: 'published' } : p));
    });
  };

  return (
    <div className="grid md:grid-cols-[260px_1fr] gap-4">
      <aside className="border rounded p-3 bg-white space-y-2">
        <button className="w-full px-3 py-2 rounded bg-primary text-white text-sm" onClick={() => {
          setSelectedPostId(null);
          setTitle('');
          setSlug('');
          setContentHtml('<p></p>');
        }}>+ 新規記事</button>
        {posts.map((post) => (
          <button key={post.id} className={`w-full text-left px-2 py-2 rounded text-sm border ${selectedPostId === post.id ? 'bg-stone-100' : ''}`} onClick={() => {
            setSelectedPostId(post.id);
            setTitle(post.title);
            setSlug(post.slug);
          }}>
            <div className="font-medium line-clamp-1">{post.title}</div>
            <div className="text-xs text-stone-500">{post.status}</div>
          </button>
        ))}
      </aside>

      <section className="border rounded p-4 bg-white space-y-3">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="タイトル" className="w-full border rounded px-3 py-2" />
        <input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="slug" className="w-full border rounded px-3 py-2" />
        <textarea value={excerpt} onChange={(e) => setExcerpt(e.target.value)} placeholder="概要" className="w-full border rounded px-3 py-2 min-h-16" />

        <div className="flex flex-wrap gap-2 text-xs">
          <button type="button" className="px-2 py-1 border rounded" onClick={() => setContentHtml((prev) => `${prev}<p><strong>太字</strong></p>`)}>太字</button>
          <button type="button" className="px-2 py-1 border rounded" onClick={() => setContentHtml((prev) => `${prev}<p><em>斜体</em></p>`)}>斜体</button>
          <label className="px-2 py-1 border rounded cursor-pointer">画像アップロード
            <input type="file" accept="image/*" className="hidden" onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void onUploadImage(file);
            }} />
          </label>
        </div>

        <div className="grid md:grid-cols-3 gap-2">
          <input value={embedSlug} onChange={(e) => setEmbedSlug(e.target.value)} placeholder="Embed Tabidea Plan slug" className="border rounded px-2 py-1" />
          <input value={embedToken} onChange={(e) => setEmbedToken(e.target.value)} placeholder="token (unlistedのみ)" className="border rounded px-2 py-1" />
          <button type="button" className="px-2 py-1 rounded border" onClick={addEmbed}>Embed Tabidea Plan</button>
        </div>

        <textarea value={contentHtml} onChange={(e) => setContentHtml(e.target.value)} className="w-full border rounded px-3 py-2 min-h-[320px] font-mono text-sm" />

        <div className="flex gap-2">
          <button className="px-4 py-2 rounded bg-primary text-white" onClick={onSave} disabled={isPending}>下書き保存</button>
          <button className="px-4 py-2 rounded border" onClick={onPublish} disabled={isPending || !selectedPostId}>公開</button>
        </div>
      </section>
    </div>
  );
}
