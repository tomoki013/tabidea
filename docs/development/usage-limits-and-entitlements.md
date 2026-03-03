# Usage Limits and Entitlements

更新日: 2026-03-03

## 1. Purpose

利用制限は、サービス品質と不正利用対策のためにサーバー側で一元管理します。

## 2. User Types

- `anonymous`
- `free`
- `pro`
- `premium`
- `admin`

定義元: `src/lib/limits/config.ts`

## 3. Plan Generation Limits

| User type | Limit | Period |
| --- | ---: | --- |
| anonymous | 1 | month |
| free | 3 | month |
| pro | 30 | month |
| premium | 100 | month |
| admin | unlimited | unlimited |

## 4. Travel Info Limits

| User type | Limit | Period |
| --- | ---: | --- |
| anonymous | 1 | month |
| free | 1 | week |
| pro | 10 | month |
| premium | unlimited | unlimited |
| admin | unlimited | unlimited |

## 5. Category Access

無料系ユーザー（anonymous/free/pro）で標準閲覧可能:
- `basic`
- `safety`
- `climate`

`premium/admin` は全カテゴリにアクセス可能。

## 6. Additional Feature Limits

- Places詳細件数/plan
- マッププロバイダー
- 航空券/ホテル候補数
- チケット有効期限

いずれも `src/lib/limits/config.ts` を正本とする。

## 7. Security Design

- クライアント状態に依存しない
- DB時刻基準で判定
- 未ログインはIPハッシュで識別
- 記録と判定を可能な限りアトミックに処理

## 8. Related Components

- `src/lib/limits/*`
- `src/app/actions/limits.ts`
- `src/app/actions/travel-planner.ts`
- `src/app/actions/travel-info/index.ts`
- `supabase/migrations/20260129064236_usage_limits.sql`

## 9. Operational Notes

制限仕様を変更した場合は:

1. `src/lib/limits/config.ts` 更新
2. 必要なDB変更をmigration化
3. UI表示と文言を更新
4. 本ドキュメントと関連docsを更新
