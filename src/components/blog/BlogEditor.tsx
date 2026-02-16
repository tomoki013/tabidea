'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { createOrUpdateBlogPost, uploadBlogImage, upsertBlogProfile } from '@/app/actions/blog';

interface Props {
  initial?: {
    id?: string;
    title?: string;
    slug?: string;
    excerpt?: string;
    content_html?: string;
    cover_image_path?: string | null;
  };
  profile?: {
    username?: string;
    display_name?: string | null;
    bio?: string | null;
  } | null;
}

export default function BlogEditor({ initial, profile }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [username, setUsername] = useState(profile?.username ?? '');
  const [displayName, setDisplayName] = useState(profile?.display_name ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');

  const [title, setTitle] = useState(initial?.title ?? '');
  const [slug, setSlug] = useState(initial?.slug ?? '');
  const [excerpt, setExcerpt] = useState(initial?.excerpt ?? '');
  const [contentHtml, setContentHtml] = useState(initial?.content_html ?? '');
  const [coverImagePath, setCoverImagePath] = useState(initial?.cover_image_path ?? '');
  const [message, setMessage] = useState<string>('');

  const previewEmbeds = useMemo(() => {
    const regex = /\[\[tabidea:shiori:([a-z0-9-]+)(?:\?t=([a-zA-Z0-9]+))?\]\]/gi;
    const items: Array<{ slug: string; token?: string }> = [];
    let m: RegExpExecArray | null;
    while ((m = regex.exec(contentHtml)) !== null) {
      items.push({ slug: m[1], token: m[2] ?? undefined });
    }
    return items;
  }, [contentHtml]);

  const handleUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = String(reader.result).split(',')[1] ?? '';
      startTransition(async () => {
        const res = await uploadBlogImage({
          fileName: file.name,
          fileBase64: base64,
          contentType: file.type,
        });
        if (!res.success) {
          setMessage(res.error ?? '画像アップロードに失敗しました');
          return;
        }
        setCoverImagePath(res.path ?? '');
        setMessage(`アップロード完了: ${res.publicUrl}`);
      });
    };
    reader.readAsDataURL(file);
  };

  const save = (status: 'draft' | 'published') => {
    startTransition(async () => {
      if (!username) {
        setMessage('username は必須です');
        return;
      }

      const profileRes = await upsertBlogProfile({
        username,
        displayName,
        bio,
      });
      if (!profileRes.success) {
        setMessage(profileRes.error ?? 'プロフィール保存失敗');
        return;
      }

      const res = await createOrUpdateBlogPost({
        id: initial?.id,
        title,
        slug,
        excerpt,
        contentHtml,
        coverImagePath,
        status,
      });

      if (!res.success) {
        setMessage(res.error ?? '保存に失敗しました');
        return;
      }

      setMessage(status === 'published' ? '公開しました' : '下書きを保存しました');
      router.push(`/blog/edit/${res.id}`);
      router.refresh();
    });
  };

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-stone-200 bg-white p-4 space-y-3">
        <h2 className="font-semibold">Blog Profile</h2>
        <input className="w-full border rounded px-2 py-1 text-sm" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="username (a-z0-9_)" />
        <input className="w-full border rounded px-2 py-1 text-sm" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="display name" />
        <textarea className="w-full border rounded px-2 py-1 text-sm" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="bio" />
      </section>

      <section className="rounded-xl border border-stone-200 bg-white p-4 space-y-3">
        <h2 className="font-semibold">Post Editor</h2>
        <input className="w-full border rounded px-2 py-1 text-sm" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="title" />
        <input className="w-full border rounded px-2 py-1 text-sm" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="slug" />
        <textarea className="w-full border rounded px-2 py-1 text-sm" value={excerpt} onChange={(e) => setExcerpt(e.target.value)} placeholder="excerpt" />

        <div className="text-xs text-stone-600">
          しおり埋め込み: <code>[[tabidea:shiori:slug]]</code> または <code>[[tabidea:shiori:slug?t=token]]</code>
        </div>
        <textarea
          className="w-full border rounded px-2 py-2 text-sm min-h-[260px]"
          value={contentHtml}
          onChange={(e) => setContentHtml(e.target.value)}
          placeholder="HTMLベース本文"
        />

        <div className="space-y-1">
          <label className="text-sm">Cover image</label>
          <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])} />
          {coverImagePath && <p className="text-xs text-stone-600">storage path: {coverImagePath}</p>}
        </div>

        <div className="flex gap-2">
          <button type="button" disabled={isPending} className="px-3 py-1 rounded bg-stone-800 text-white text-sm" onClick={() => save('draft')}>下書き保存</button>
          <button type="button" disabled={isPending} className="px-3 py-1 rounded bg-primary text-white text-sm" onClick={() => save('published')}>公開</button>
        </div>
        {message && <p className="text-sm text-stone-700">{message}</p>}
      </section>

      {previewEmbeds.length > 0 && (
        <section className="rounded-xl border border-stone-200 bg-white p-4 space-y-3">
          <h2 className="font-semibold">Embed Preview</h2>
          {previewEmbeds.map((embed, index) => (
            <iframe
              key={`${embed.slug}-${index}`}
              src={`https://shiori.tabide.ai/${embed.slug}${embed.token ? `?t=${embed.token}` : ''}`}
              className="w-full min-h-[320px] rounded border"
              loading="lazy"
            />
          ))}
        </section>
      )}
    </div>
  );
}
