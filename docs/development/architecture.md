# Architecture

更新日: 2026-03-03

## 1. System Overview

TabideaはNext.js App Routerを中心としたMonolith構成です。主要責務は以下に分かれます。

- `src/app`: ルーティング、ページ、API Route、Server Action
- `src/components`: UI表示
- `src/lib/services`: ドメインロジック（AI/RAG/Replan/Travel Info/Validation等）
- `src/lib`: 共通ライブラリ、制限、キャッシュ、外部連携
- `supabase`: DBスキーマ・マイグレーション

## 2. Runtime Components

### Frontend
- React 19 + Next.js 16
- App Router
- Tailwind CSS v4

### Backend Logic
- Server Actions (`src/app/actions/*`)
- API Routes (`src/app/api/*`)

### External Integrations
- AI: Gemini / OpenAI
- DB/Auth/Storage: Supabase
- Vector retrieval: Pinecone
- Payments: Stripe
- Optional: Google Maps / Amadeus / Redis / Unsplash

## 3. Main Data Flows

### 3.1 Plan Generation

1. UI入力 (`UserInput`)
2. `generatePlanOutline` 実行
3. 利用制限確認 (`checkAndRecordUsage`)
4. キャッシュ確認
5. RAG検索 (`PineconeRetriever`) + ユーザー制約取得（出力言語、出発/帰着都市を含む）
6. AIでアウトライン生成
7. チャンク単位の詳細生成 (`generatePlanChunk`)
8. 必要に応じて自己修正・検証
9. 保存/表示/共有

### 3.2 Travel Info

1. 目的地とカテゴリを入力
2. カテゴリ権限制御
3. 複数ソース取得（外務省、国情報、天候、為替、AI fallback）
4. 信頼性スコア付与
5. カテゴリMapに統合して返却

### 3.3 Replan

1. 既存旅程と制約を受け取る
2. 制約検出・スロット抽出
3. 候補作成とシグナル評価
4. 説明可能性付きで候補提示

## 4. App Router Structure

### Route Groups

- `(marketing)` マーケティング・ポリシーページ
- `(planner)` プラン生成・サンプル
- `(info)` 渡航情報

### Other Major Routes

- `/api/*` API endpoints
- `/auth/*` 認証導線
- `/blog/*` ブログ
- `/shiori/*` 公開プラン
- `/admin/metrics` 管理指標

## 5. Domain Layer Mapping

- `lib/services/ai`: モデル選択・生成戦略・プロンプト処理
- `lib/services/plan-generation`: 生成オーケストレーション
- `lib/services/rag`: 記事取得・検索
- `lib/services/travel-info`: 渡航情報統合
- `lib/services/replan`: 再計画ロジック
- `lib/services/validation`: スポット検証

## 6. Data and Persistence

### Supabase
- 認証
- プラン保存
- 公開・いいね・ジャーナル
- 課金関連状態
- 利用制限ログ・分析ログ

### Cache
- Outlineキャッシュ
- Travel infoキャッシュ（memory/file/redis戦略）

## 7. Performance and Observability

- `PerformanceTimer`で段階計測
- 主要処理: usage check / cache / rag / prompt / ai generation
- モデルtierに応じて目標時間を切替
- `MetricsCollector`経由で運用指標を記録

## 8. Security and Control Points

- 利用制限: サーバー側で検証
- Stripe webhook署名検証
- Supabase RLS前提のデータアクセス
- robots/スクレイピングポリシー準拠

## 9. Architectural Constraints

- 主要な業務ロジックは`src/lib/services`へ集約
- UIコンポーネントにDBアクセスや外部API呼び出しを直接置かない
- 実装変更時は対応ドキュメントを同時更新

## 10. Related Docs

- `development/coding-rules.md`
- `development/testing.md`
- `development/database-and-migrations.md`
- `reference/routes-actions-and-services.md`
