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

### Phase 4: 外部API提案（ホテル・航空券）
- 追加API:
  - `POST /api/external/hotels/search`
  - `POST /api/external/flights/search`
- AIは検索条件JSONのみを扱い、外部検索はサーバー側（Amadeus provider）で実行
- Zodで入力バリデーション（limit 1..5, date/価格/人数など）
- キャッシュ:
  - `external_search_requests` + `external_search_results` に request hash ベースで保存
  - 30分TTLで再利用
- プラン管理画面で候補カードを表示し、「採用」で `plan_item_external_selections` に保存
- 採用時に予約URL（deeplink）・メモが `item_bookings` / `plan_items` に同期される

### Phase 5: Blog（blog.tabide.ai）
- 追加テーブル:
  - `blog_profiles`, `blog_posts`, `blog_post_embeds`
- 公開URL:
  - `blog.tabide.ai/@{username}/{slug}`（内部 `/blog/@{username}/{slug}`）
- 作成・編集:
  - `/blog`, `/blog/new`, `/blog/edit/[id]`
- 画像アップロード:
  - Supabase Storage bucket `blog-images`
- しおり埋め込み:
  - 本文内記法 `[[tabidea:shiori:slug]]` / `[[tabidea:shiori:slug?t=token]]`
  - iframe埋め込みで表示
- Host rewrite:
  - `blog.tabide.ai` は `/blog/*` に rewrite
  - 既存 `shiori.tabide.ai` rewrite も共通処理へ統合

### 追加環境変数（サーバー側のみ）
- `AMADEUS_CLIENT_ID`
- `AMADEUS_CLIENT_SECRET`
- `AMADEUS_BASE_URL` (任意。未設定時: test API)

### 追加要件（再チャレンジ時のレート制限）
- プラン生成失敗後の再チャレンジは `skipConsume` で消費しない実装に変更
