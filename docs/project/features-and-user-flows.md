# Features and User Flows

更新日: 2026-03-03  
Last updated: 2026-03-03

## 1. 画面グループ / Screen Groups

### Marketing
- `/` ホーム（プランナー起点）
- `/features`, `/about`, `/faq`, `/pricing`, `/contact` など

### Planner
- `/plan` 生成結果の表示
- `/plan/[code]`, `/plan/id/[id]`, `/plan/local/[id]` 共有コード/DB ID/ローカルIDで表示
- `/samples` サンプルプラン一覧

### Travel Info
- `/travel-info` 渡航情報トップ
- `/travel-info/[destination]` 目的地別詳細

### Publishing / Community
- `/shiori`, `/shiori/[slug]` しおり公開
- `/blog`, `/blog/new`, `/blog/edit/[id]`, `/blog/[handle]/[slug]` ブログ機能

### Account / Admin
- `/auth/login`, `/auth/callback`, `/auth/logout`
- `/my-plans`, `/sync-plans`
- `/admin/metrics`

## 2. 中核ユーザーフロー / Core User Flow

### Flow A: 旅行プランをゼロから作る

1. ユーザーがホーム画面で条件入力
2. `generatePlanOutline`で全体アウトライン生成
3. `generatePlanChunk`で日別詳細生成
4. プラン画面で結果表示
5. 保存・共有・再生成

### Flow B: 生成後に調整する

1. 生成済みプランを開く
2. チャットUIから修正要望を入力
3. サーバー側で再生成
4. 新しい結果を同一画面で確認

### Flow C: 渡航情報を確認する

1. 目的地を入力
2. 必要カテゴリを選択
3. 利用制限/カテゴリ権限を確認
4. 複数ソース統合結果を表示

### Flow D: しおりとして公開する

1. プランを公開設定に変更
2. 公開URL生成
3. 一般公開または限定公開で共有

## 3. バックエンド処理フロー / Backend Flow

### Plan Generation

1. 利用制限チェック
2. キャッシュ確認
3. RAG検索 + ユーザー制約取得（並列）
4. プロンプト構築
5. AI生成
6. 補助データ（例: 画像）取得
7. 結果保存・返却

### Replan

1. 既存行程を解析
2. 制約抽出
3. 代替案スコアリング
4. 説明文生成
5. 推奨案返却

### Travel Info

1. 入力正規化
2. ソースごと取得
3. フォールバック実行
4. 信頼性評価
5. カテゴリ統合して返却

## 4. API / Action マッピング（代表）

### Server Actions
- `src/app/actions/travel-planner.ts`: 生成・再生成
- `src/app/actions/travel-info/index.ts`: 渡航情報
- `src/app/actions/billing.ts`: 請求関連
- `src/app/actions/shiori.ts`: 公開・しおり関連
- `src/app/actions/blog.ts`: ブログ編集

### API Routes
- `/api/generate/outline`
- `/api/generate/chunk`
- `/api/replan`
- `/api/chat`
- `/api/places/search`
- `/api/external/hotels/search`
- `/api/external/flights/search`
- `/api/webhooks/stripe`

## 5. 失敗時の挙動 / Failure Scenarios

- 利用制限超過: UI側で制限モーダルや誘導表示
- APIキー不足: サーバー処理を停止しエラー返却
- 外部API障害: フォールバックや部分結果を返却
- 生成失敗: 再試行導線を表示

## 6. UX上の原則 / UX Principles

- 入力負荷を減らす（段階入力）
- 生成待ち中の状態を明確に見せる
- 「再調整」を前提とした結果表示
- 共有しやすいURLと公開状態管理

## 7. Related Docs

- `project/what-is-tabidea.md`
- `development/architecture.md`
- `reference/routes-actions-and-services.md`
