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

## Phase 4-5 (External Search / Blog)

### External API Search (Hotels / Flights)
- New API routes:
  - `POST /api/external/hotels/search`
  - `POST /api/external/flights/search`
- AI must output only search-condition JSON; server validates with Zod and calls provider.
- Provider abstraction is implemented under `src/lib/external/providers`.
- Results are cached in Supabase tables (`external_search_requests`, `external_search_results`) with TTL.
- Adopted candidate is stored in `plan_item_external_selections`.

### Blog (blog.tabide.ai)
- `blog.tabide.ai` is rewritten to `/blog` in `src/proxy.ts`.
- Blog supports draft/publish, image upload (`blog-images` bucket), and shiori embed iframe.
- Public article route: `/blog/@{username}/{slug}`.
