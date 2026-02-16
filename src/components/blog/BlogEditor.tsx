'use client';

import { useState, useTransition } from 'react';

import { saveBlogPost } from '@/app/actions/blog/posts';

interface Props {
  initial?: {
    id?: string;
    title?: string;
    slug?: string;
    excerpt?: string;
    status?: 'draft' | 'published';
    contentHtml?: string;
    coverImagePath?: string | null;
    embeds?: Array<{ type: 'shiori'; refSlug: string; refToken?: string | null }>;
  };
}

export default function BlogEditor({ initial }: Props) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [slug, setSlug] = useState(initial?.slug ?? '');
  const [excerpt, setExcerpt] = useState(initial?.excerpt ?? '');
  const [contentHtml, setContentHtml] = useState(initial?.contentHtml ?? '');
  const [coverImagePath, setCoverImagePath] = useState<string | null>(initial?.coverImagePath ?? null);
  const [embeds, setEmbeds] = useState<Array<{ type: 'shiori'; refSlug: string; refToken?: string | null }>>(initial?.embeds ?? []);
  const [embedSlug, setEmbedSlug] = useState('');
  const [embedToken, setEmbedToken] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const uploadCover = async (file: File) => {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch('/api/blog/upload-image', { method: 'POST', body: form });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? 'upload failed');
    setCoverImagePath(data.path);
  };

  const save = (status: 'draft' | 'published') => {
    startTransition(async () => {
      const result = await saveBlogPost({
        postId: initial?.id,
        title,
        slug,
        excerpt,
        contentJson: { html: contentHtml },
        contentHtml,
        status,
        coverImagePath,
        embeds,
      });
      setStatusMessage(result.success ? `保存しました (${status})` : result.error ?? '保存に失敗');
    });
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold">Blog Editor</h1>
      <input className="w-full border rounded px-3 py-2" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
      <input className="w-full border rounded px-3 py-2" placeholder="Slug" value={slug} onChange={(e) => setSlug(e.target.value)} />
      <textarea className="w-full border rounded px-3 py-2" placeholder="Excerpt" value={excerpt} onChange={(e) => setExcerpt(e.target.value)} />
      <textarea className="w-full border rounded px-3 py-2 min-h-64" placeholder="HTML content" value={contentHtml} onChange={(e) => setContentHtml(e.target.value)} />

      <div className="space-y-2 rounded border p-3">
        <div className="text-sm font-semibold">Embed Tabidea Plan</div>
        <div className="grid md:grid-cols-3 gap-2">
          <input className="border rounded px-2 py-1" placeholder="slug" value={embedSlug} onChange={(e) => setEmbedSlug(e.target.value)} />
          <input className="border rounded px-2 py-1" placeholder="token(optional)" value={embedToken} onChange={(e) => setEmbedToken(e.target.value)} />
          <button type="button" className="rounded bg-primary text-white px-3 py-1" onClick={() => {
            if (!embedSlug) return;
            setEmbeds((prev) => [...prev, { type: 'shiori', refSlug: embedSlug, refToken: embedToken || null }]);
            setEmbedSlug('');
            setEmbedToken('');
          }}>埋め込み追加</button>
        </div>
        <ul className="text-xs text-stone-600 list-disc pl-4">
          {embeds.map((embed, idx) => (
            <li key={`${embed.refSlug}-${idx}`}>{embed.refSlug}{embed.refToken ? `?t=${embed.refToken}` : ''}</li>
          ))}
        </ul>
      </div>

      <div className="space-y-2 rounded border p-3">
        <div className="text-sm font-semibold">Cover Image</div>
        <input type="file" accept="image/*" onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) uploadCover(file).catch((err) => setStatusMessage(err.message));
        }} />
        {coverImagePath && <p className="text-xs text-stone-600">uploaded: {coverImagePath}</p>}
      </div>

      <div className="flex gap-2">
        <button type="button" className="px-4 py-2 rounded border" onClick={() => save('draft')}>下書き保存</button>
        <button type="button" className="px-4 py-2 rounded bg-primary text-white" onClick={() => save('published')}>公開</button>
      </div>
      {statusMessage && <p className="text-sm">{statusMessage}</p>}
      {isPending && <p className="text-xs text-stone-500">保存中...</p>}
    </div>
  );
}
