# 利用制限システム

AI Travel Plannerの利用制限システムの実装ドキュメント。

## 概要

このシステムは、未ログインユーザーと無料ユーザーに対して、プラン生成と渡航情報取得の利用回数を制限します。

## セキュリティ設計

### 不正対策の基本方針

1. **サーバーサイドで全ての検証を行う**
   - クライアントの情報（端末時刻等）を一切信用しない
   - 全ての制限チェックはServer Actions内で実行

2. **DBの時刻を使用する**
   - PostgreSQLの`NOW()`を使用してサーバー時刻で判定
   - クライアントから送信される日時は無視

3. **使用履歴はDBに記録**
   - ローカルストレージの使用履歴は「表示用」のみ
   - 実際の制限判定はDB（未ログインはIPベース）

4. **レートリミットとの併用**
   - 制限チェックに加え、短時間の連続アクセスをブロック

## 制限仕様

### プラン生成制限

| ユーザー種別 | 制限 | リセット | 保存上限 |
|-------------|------|---------|---------|
| 未ログイン | 月1回 | 月初（サーバー時刻） | 1個 |
| ログイン（無料） | 月3回 | 月初（サーバー時刻） | 2個 |
| 課金ユーザー | 後で決定 | - | 後で決定 |
| 管理者 | 無制限 | - | 無制限 |

**カウント対象**:
- ✅ `generatePlanOutline()` → カウント対象
- ❌ `generatePlanChunk()` → カウント対象外
- ❌ `regeneratePlan()` → カウント対象外（制限なし）

### 渡航情報制限

| ユーザー種別 | 取得制限 | リセット | 閲覧可能カテゴリ |
|-------------|---------|---------|-----------------|
| 未ログイン | 月1回 | 月初 | 基本3カテゴリのみ |
| ログイン（無料） | 週1回 | 週初（月曜） | 基本3カテゴリのみ |
| 課金ユーザー | 後で決定 | - | 全14カテゴリ |
| 管理者 | 無制限 | - | 全14カテゴリ |

**基本3カテゴリ（無料で閲覧可能）**:
- `basic` - 基本情報（通貨、言語、時差）
- `safety` - 安全・医療（危険度、緊急連絡先）
- `climate` - 気候・服装

**プレミアムカテゴリ（課金ユーザー/管理者のみ）**:
- `visa`, `manner`, `transport`, `local_food`, `souvenir`, `events`, `technology`, `healthcare`, `restrooms`, `smoking`, `alcohol`

### 制限超過時の動作

| ユーザー種別 | 動作 |
|-------------|------|
| 未ログイン | ログイン促進モーダル表示 |
| ログイン（課金実装前） | 待機メッセージ表示（リセット日時を表示） |
| ログイン（課金実装後） | 課金促進モーダル表示 |

## DB構造

### テーブル

#### `usage_logs` - 使用履歴
```sql
CREATE TABLE usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ip_hash TEXT,  -- SHA256(IP + 月別ソルト) で匿名化
  action_type TEXT NOT NULL,  -- 'plan_generation', 'travel_info'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);
```

#### `ip_salts` - IP匿名化用ソルト
```sql
CREATE TABLE ip_salts (
  month TEXT PRIMARY KEY,  -- 'YYYY-MM' 形式
  salt TEXT NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 主要なDB関数

- `check_and_record_usage()` - アトミックな制限チェック＆記録
- `count_user_usage()` - ユーザーの使用回数カウント
- `count_ip_usage()` - IPの使用回数カウント
- `get_ip_hash()` - IP匿名化
- `get_month_start()` / `get_week_start()` - サーバー時刻基準の期間開始日取得

## 実装構造

### ディレクトリ構成

```
src/lib/limits/
├── config.ts              # 制限設定（一箇所で管理）
├── admin.ts               # 管理者判定
├── user-type.ts           # ユーザー種別判定
├── check.ts               # 制限チェック・記録
└── __tests__/
    ├── check.test.ts
    └── config.test.ts

src/components/ui/
├── LoginPromptModal.tsx        # ログイン促進モーダル
├── LimitExceededModal.tsx      # 制限超過モーダル
└── LockedCategorySection.tsx   # ロックされたカテゴリ表示

supabase/migrations/
└── 20260129064236_usage_limits.sql  # DBスキーマ
```

### Server Actions統合

#### プラン生成 (`src/app/actions/travel-planner.ts`)

```typescript
export async function generatePlanOutline(input: UserInput): Promise<OutlineActionState> {
  // 利用制限チェック（最初に実行）
  const limitResult = await checkAndRecordUsage('plan_generation', {
    destination: input.destinations.join(', ') || input.region,
    isDestinationDecided: input.isDestinationDecided,
  });

  if (!limitResult.allowed) {
    return {
      success: false,
      limitExceeded: true,
      userType: limitResult.userType,
      resetAt: limitResult.resetAt?.toISOString() ?? null,
      remaining: limitResult.remaining,
      message: '利用制限に達しました',
    };
  }

  // ... 既存のロジック
}
```

#### 渡航情報取得 (`src/app/actions/travel-info/index.ts`)

```typescript
export async function getTravelInfo(
  destination: string,
  categories: TravelInfoCategory[],
  options?: TravelInfoActionOptions
): Promise<TravelInfoResult> {
  // 利用制限チェック
  const limitResult = await checkAndRecordUsage('travel_info', {
    destination,
    categories: categories.join(','),
  });

  if (!limitResult.allowed) {
    return {
      success: false,
      limitExceeded: true,
      userType: limitResult.userType,
      resetAt: limitResult.resetAt?.toISOString() ?? null,
      error: '利用制限に達しました',
    };
  }

  // アクセス可能なカテゴリのみにフィルタ
  const userInfo = await getUserInfo();
  const accessibleCategories = getAccessibleCategories(userInfo.type);
  const filteredCategories = categories.filter((cat) =>
    accessibleCategories.includes(cat)
  );

  // ... 既存のロジック（filteredCategoriesを使用）
}
```

## 管理者設定

### 環境変数

`.env.local` に以下を追加：

```env
# 管理者メールアドレス（カンマ区切りで複数指定可能）
ADMIN_EMAILS=admin@example.com,another-admin@example.com
```

### 管理者の権限

- プラン生成: 無制限
- 渡航情報取得: 無制限
- 渡航情報カテゴリ: 全14カテゴリ閲覧可能
- プラン保存数: 無制限

## マイグレーション手順

### 1. DBスキーマの適用

Supabase SQL Editorで以下のマイグレーションファイルを実行：

```bash
supabase/migrations/20260129064236_usage_limits.sql
```

または、Supabase CLIを使用：

```bash
supabase migration up
```

### 2. 環境変数の設定

`.env.local` に `ADMIN_EMAILS` を追加。

### 3. アプリケーションの再起動

環境変数の変更を反映するため、アプリケーションを再起動。

## テスト

### ユニットテスト

```bash
pnpm test src/lib/limits/__tests__
```

### E2Eテスト（Playwright）

```bash
pnpm test:e2e e2e/limits.spec.ts
```

### 手動テスト

#### 未ログインユーザー
1. プラン生成を1回実行 → 成功
2. もう一度プラン生成を実行 → ログイン促進モーダルが表示

#### ログインユーザー
1. プラン生成を3回実行 → すべて成功
2. 4回目を実行 → 制限超過モーダルが表示（リセット日時表示）

#### 管理者
1. `ADMIN_EMAILS` に登録したメールでログイン
2. プラン生成を何度でも実行可能
3. 全カテゴリの渡航情報を閲覧可能

## トラブルシューティング

### 制限チェックが機能しない

1. DBマイグレーションが正しく適用されているか確認
2. `usage_logs` テーブルが存在するか確認
3. Server Actionsのログを確認（`console.log`）

### 管理者として認識されない

1. `.env.local` の `ADMIN_EMAILS` が正しく設定されているか確認
2. メールアドレスが完全一致しているか確認（大文字小文字も区別）
3. アプリケーションを再起動

### IPハッシュエラー

1. `ip_salts` テーブルが存在するか確認
2. `get_ip_hash()` 関数が正しく作成されているか確認

## 課金実装時の追加項目

### 必要な変更

1. **サブスクリプションテーブルの作成**
   - `subscriptions` テーブルを作成
   - ユーザーのサブスク状態を管理

2. **user-type.tsの修正**
   - サブスク状態をチェックして `premium` を返す

3. **制限値の調整**
   - `config.ts` の `premium` の制限値を調整

4. **UIの修正**
   - 制限超過モーダルに「プランを見る」ボタンを追加
   - ロックセクションに「アップグレード」ボタンを追加

## 参考資料

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL Date/Time Functions](https://www.postgresql.org/docs/current/functions-datetime.html)
- [Next.js Server Actions](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions)
