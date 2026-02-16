[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/tomoki013/ai-travel-planner)

# Tabidea (Powered by ともきちの旅行日記)

AIと一緒に、あなただけの旅の計画を。
「ともきちの旅行日記」が提供する、AIを活用した旅行プラン作成サービスです。

## Documentation

- [Setup Guide](docs/setup.md) - How to install and run the project.
- [Architecture](docs/architecture.md) - System overview and directory structure.
- [Testing Strategy](docs/testing.md) - How to run and write tests.
- [Supabase Migration Guide](supabase/README.md) - How to apply SQL migrations safely.

## 概要

Tabideaは、Google Gemini AIを活用して、あなたの希望に合わせたパーソナライズされた旅行プランを提案するWebアプリケーションです。

## 特徴

*   **AIによるプラン提案**
*   **柔軟な計画フロー**
*   **共有機能**
*   **直感的なUI**

## 技術スタック

*   **Framework**: [Next.js 16](https://nextjs.org/) (App Router)
*   **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
*   **AI**: [Google Gemini API](https://ai.google.dev/)
*   **Database (Vector)**: [Pinecone](https://www.pinecone.io/) (RAG用)
*   **Testing**: [Vitest](https://vitest.dev/), [Playwright](https://playwright.dev/)
*   **Deployment**: [Netlify](https://www.netlify.com/)

## Phase 0-3 実装メモ（旅程正規化 / 予算 / Journal / Shiori公開）

### 追加した主な機能
- 正規化テーブル: `plan_days`, `plan_items`, `item_bookings`, `journal_entries`, `plan_publications`
- RLS: 各テーブルで owner(`auth.uid() = user_id`) のCRUDのみ許可
- 公開Read model: `get_public_shiori(slug, token)` を `SECURITY DEFINER` で提供
- 予算管理UI: 概算合計 vs 実費合計、カテゴリ別集計
- 予約情報入力: itemごとの予約URL/予約メモ
- Journal: ローカル下書き（localStorage）→ blur時同期
- Shiori公開: private / unlisted / public と公開URL生成
- サブドメイン: `shiori.tabide.ai` から `/shiori/*` へ proxy rewrite

### 運用メモ
- migration を適用してから動作確認してください（Supabase SQL Editor / CLI）
- 公開URLは `visibility=unlisted` の場合 `?t=<token>` が必須です
- テスト実行
  - Unit: `pnpm test`

## Phase 4-5 実装メモ（外部API提案 / Blog）

### Phase 4: 外部API連動提案
- API: `POST /api/external/conditions`（AIで検索条件JSONのみ生成）
- API: `POST /api/external/hotels/search`, `POST /api/external/flights/search`
- Provider抽象化: `src/lib/external/providers.ts`
- キャッシュ: `external_search_requests` + `external_search_results`（request hash + TTL）
- 採用フロー: `plan_item_external_selections` へ保存し、`item_bookings` へ予約URLを反映
- 失敗時: 「条件を調整して再実行」を返却

### Phase 5: Blog
- サブドメイン rewrite: `blog.tabide.ai` → `/blog/*`
- 記事: 下書き/公開、一覧、編集、公開URL `/blog/@{username}/{slug}`
- 画像: `blog-images` バケット（Supabase Storage）へアップロード
- 埋め込み: `blog_post_embeds` で `shiori` 参照を保持し、記事内 iframe 表示
- SEO: 記事ページ `generateMetadata` で title/description/og:image を設定

### リトライ時レート制限について
- 生成失敗時に再試行をしやすくするため、プラン概要生成の利用消費は「成功時のみ」実施。
