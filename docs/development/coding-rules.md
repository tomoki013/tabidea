# Coding Rules

更新日: 2026-03-03

## 1. Core Principles

- 可読性優先: 命名と責務分離で意図を明確にする
- 変更容易性: 1ファイル1責務を意識する
- 検証可能性: 新規ロジックにはテスト追加を基本とする
- 一貫性: 既存パターンに合わせる

## 2. Directory Ownership

- `src/app`: ルート、ページ、API、Server Action
- `src/components/ui`: 汎用UI（ビジネスロジックを持たない）
- `src/components/common`: アプリ横断で使う部品
- `src/components/features`: 機能専用UI
- `src/lib/services`: 業務ロジック
- `src/lib/utils`: 再利用ユーティリティ
- `src/types`: 複数モジュールで共有する型

## 3. Naming Conventions

- Component: `PascalCase.tsx`
- Hook: `useXxx.ts`
- Utility/Module: `kebab-case.ts`
- Test: 元ファイル名 + `.test.ts` / `.test.tsx`
- E2E: `tests/*.spec.ts`

## 4. Import Order

1. React/Next
2. External libraries
3. `import type`
4. `@/lib` and constants
5. hooks
6. components
7. relative imports

グループ間は空行で分離する。

## 5. Type Rules

- 共通型は `src/types` へ配置
- 機能限定型は同一ディレクトリの `types.ts` へ
- `any`は原則禁止。必要時は理由をコメントで明示
- 外部入出力はschemaでバリデーション（Zod等）

## 6. UI Component Rules

- `ui`: 再利用特化、状態依存を最小化
- `common`: 認証やレイアウトなど横断ロジック可
- `features`: 画面機能ごとの組み立て

## 7. Server Action / API Rules

- 認証・認可・制限はサーバー側で検証
- 失敗系は構造化レスポンスで返す
- 重要処理は計測ログを残す

## 8. Performance Instrumentation (Required)

サーバーアクションとAI生成処理には `PerformanceTimer` を使用する。

必須項目:
- `timer.measure()`で主要ステップを計測
- 処理終了時に`timer.log()`
- 目標時間を定義して逸脱を検知

## 9. Documentation Rule (Required)

- 仕様変更・振る舞い変更・DB変更・テスト方針変更のPRでは、`/docs`を同一PRで更新すること。
- docs更新漏れはレビューで差し戻し対象。

## 10. Prohibited Changes

- 無断で既存の公開挙動を変更しない
- 影響範囲の説明なしに大規模リネームしない
- 計測必須領域から計測コードを削除しない

## 11. Legacy Exception

テスト配置はcolocationが原則だが、現状 `src/lib/limits/__tests__/` にレガシー構成が残っています。  
新規追加はcolocationを遵守し、既存`__tests__`は段階的に移行します。
