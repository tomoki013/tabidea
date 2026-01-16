[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/tomoki013/ai-travel-planner)

# Tabidea (Powered by ともきちの旅行日記)

AIと一緒に、あなただけの旅の計画を。
「ともきちの旅行日記」が提供する、AIを活用した旅行プラン作成サービスです。

## Documentation

- [Setup Guide](docs/setup.md) - How to install and run the project.
- [Architecture](docs/architecture.md) - System overview and directory structure.
- [Testing Strategy](docs/testing.md) - How to run and write tests.

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
