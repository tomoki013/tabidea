'use client';

import { useState, useTransition } from 'react';

import { saveBlogPost, upsertBlogProfile } from '@/app/actions/blog';

interface Props {
  initial?: {
    id?: string;
    title?: string;
    slug?: string;
    excerpt?: string;
    content_html?: string;
    status?: 'draft' | 'published';
    cover_image_path?: string | null;
    embeds?: Array<{ ref_slug: string; ref_token: string | null }>;
  };
  profile?: {
    username?: string;
    display_name?: string | null;
    bio?: string | null;
  };
}

export default function BlogEditorClient({ initial, profile }: Props) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [slug, setSlug] = useState(initial?.slug ?? '');
  const [excerpt, setExcerpt] = useState(initial?.excerpt ?? '');
  const [contentHtml, setContentHtml] = useState(initial?.content_html ?? '<p>旅の記録を書いてみましょう。</p>');
  const [username, setUsername] = useState(profile?.username ?? '');
  const [displayName, setDisplayName] = useState(profile?.display_name ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [coverImagePath, setCoverImagePath] = useState<string | null>(initial?.cover_image_path ?? null);
  const [embedSlug, setEmbedSlug] = useState(initial?.embeds?.[0]?.ref_slug ?? '');
  const [embedToken, setEmbedToken] = useState(initial?.embeds?.[0]?.ref_token ?? '');
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState('');

  const wrap = (tag: 'strong' | 'em' | 'h2') => {
    document.execCommand(tag === 'h2' ? 'formatBlock' : tag, false, tag === 'h2' ? 'h2' : undefined);
  };

  const onUploadCover: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    startTransition(async () => {
      const form = new FormData();
      form.set('file', file);
      const res = await fetch('/api/blog/upload-image', { method: 'POST', body: form });
      const json = await res.json();
      if (!res.ok) {
        setMessage(json.error ?? '画像アップロードに失敗しました。');
        return;
      }
      setCoverImagePath(json.path);
      setMessage('画像をアップロードしました。');
    });
  };

  const save = (status: 'draft' | 'published') => {
    startTransition(async () => {
      if (!username) {
        setMessage('先にユーザー名を設定してください。');
        return;
      }

      const profileResult = await upsertBlogProfile({ username, displayName, bio });
      if (!profileResult.success) {
        setMessage(profileResult.error ?? 'プロフィール更新に失敗しました。');
        return;
      }

      const result = await saveBlogPost({
        id: initial?.id,
        title,
        slug,
        excerpt,
        contentHtml,
        status,
        coverImagePath,
        embeds: embedSlug ? [{ type: 'shiori', refSlug: embedSlug, refToken: embedToken || null }] : [],
      });

      setMessage(result.success ? `保存しました（${status}）` : (result.error ?? '保存に失敗しました。'));
    });
  };

  return (
    <main className="mx-auto max-w-4xl p-6 space-y-4">
      <h1 className="text-2xl font-bold">Blog Editor</h1>
      <div className="grid md:grid-cols-3 gap-2">
        <input className="border rounded px-2 py-1 text-sm" placeholder="username" value={username} onChange={(e) => setUsername(e.target.value)} />
        <input className="border rounded px-2 py-1 text-sm" placeholder="display name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
        <input className="border rounded px-2 py-1 text-sm" placeholder="bio" value={bio} onChange={(e) => setBio(e.target.value)} />
      </div>
      <input className="w-full border rounded px-3 py-2" placeholder="記事タイトル" value={title} onChange={(e) => setTitle(e.target.value)} />
      <div className="grid md:grid-cols-2 gap-2">
        <input className="border rounded px-2 py-1 text-sm" placeholder="slug" value={slug} onChange={(e) => setSlug(e.target.value)} />
        <input className="border rounded px-2 py-1 text-sm" placeholder="excerpt" value={excerpt} onChange={(e) => setExcerpt(e.target.value)} />
      </div>
      <div className="rounded border p-2 flex gap-2">
        <button type="button" className="px-2 py-1 border rounded text-xs" onClick={() => wrap('strong')}>B</button>
        <button type="button" className="px-2 py-1 border rounded text-xs" onClick={() => wrap('em')}>I</button>
        <button type="button" className="px-2 py-1 border rounded text-xs" onClick={() => wrap('h2')}>H2</button>
      </div>
      <div
        contentEditable
        suppressContentEditableWarning
        className="min-h-60 rounded border p-3 prose max-w-none"
        dangerouslySetInnerHTML={{ __html: contentHtml }}
        onInput={(e) => setContentHtml((e.currentTarget as HTMLDivElement).innerHTML)}
      />
      <div className="rounded border p-3 space-y-2">
        <p className="text-sm font-medium">Embed Tabidea Plan (しおり埋め込み)</p>
        <div className="grid md:grid-cols-2 gap-2">
          <input className="border rounded px-2 py-1 text-sm" placeholder="slug" value={embedSlug} onChange={(e) => setEmbedSlug(e.target.value)} />
          <input className="border rounded px-2 py-1 text-sm" placeholder="token(optional)" value={embedToken} onChange={(e) => setEmbedToken(e.target.value)} />
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-sm block">カバー画像</label>
        <input type="file" accept="image/*" onChange={onUploadCover} />
      </div>
      <div className="flex gap-2">
        <button type="button" className="px-4 py-2 rounded border" onClick={() => save('draft')}>下書き保存</button>
        <button type="button" className="px-4 py-2 rounded bg-primary text-white" onClick={() => save('published')}>公開</button>
      </div>
      {isPending && <p className="text-xs text-stone-600">保存中...</p>}
      {message && <p className="text-sm">{message}</p>}
    </main>
  );
}
