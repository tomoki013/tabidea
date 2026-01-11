[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/tomoki013/ai-travel-planner)

# Tabidea (Powered by ともきちの旅行日記)

AIと一緒に、あなただけの旅の計画を。
「ともきちの旅行日記」が提供する、AIを活用した旅行プラン作成サービスです。

## 概要

Tabideaは、Google Gemini AIを活用して、あなたの希望に合わせたパーソナライズされた旅行プランを提案するWebアプリケーションです。
「旅行日記」のような温かみのあるデザインと、ワクワクするようなユーザー体験を目指しています。

## 特徴

*   **AIによるプラン提案**: 行き先、日数、同行者、予算などの条件から、Google Geminiが最適な旅行プランを生成します。
*   **柔軟な計画フロー**:
    *   **行き先が決まっている場合**: 具体的な都市や地域を指定してプランを作成。
    *   **行き先が決まっていない場合**: 「温泉でのんびりしたい」「美味しいものを食べたい」といった気分（Travel Vibe）からおすすめの地域を提案。
*   **共有機能**: 作成したプランはURLで簡単に友人とシェアできます。
*   **直感的なUI**: ステップバイステップのウィザード形式で、誰でも簡単に操作できます。

## 技術スタック

*   **Framework**: [Next.js 16](https://nextjs.org/) (App Router)
*   **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
*   **AI**: [Google Gemini API](https://ai.google.dev/)
*   **Database (Vector)**: [Pinecone](https://www.pinecone.io/) (RAG用)
*   **Testing**: [Vitest](https://vitest.dev/), [Playwright](https://playwright.dev/)
*   **Deployment**: [Netlify](https://www.netlify.com/)

## 開発環境のセットアップ

このプロジェクトはパッケージマネージャーとして `pnpm` を使用しています。

### 必要条件

*   Node.js v20以上
*   pnpm

### インストール

```bash
pnpm install
```

### 環境変数

ルートディレクトリに `.env.local` ファイルを作成し、以下の環境変数を設定してください。

```env
GOOGLE_GENERATIVE_API_KEY=your_google_api_key
UNSPLASH_ACCESS_KEY=your_unsplash_access_key
# PINECONE_API_KEY=your_pinecone_api_key (必要に応じて)
```

### 開発サーバーの起動

```bash
pnpm dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開いて確認してください。
