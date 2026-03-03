# Refactoring Rules

更新日: 2026-03-03

## 1. Goals

リファクタリングの目的は、機能追加の速度と品質を高めることです。  
見た目だけの整理ではなく、以下を満たす変更を優先します。

- 振る舞いを保ったまま複雑性を下げる
- テストしやすい境界を作る
- ドメイン責務を明確にする

## 2. Non-Negotiable Rules

1. 既存仕様を壊さない（破壊的変更は別タスクとして明示）
2. リファクタ対象に対応するテストを先に確認
3. リファクタ後にdocsを更新
4. 性能計測対象コードは計測を維持

## 3. Recommended Process

1. 現状把握（依存、呼び出し元、利用頻度）
2. 変更単位を小さく分割
3. 1段ずつ移行（新旧共存期間を許容）
4. テストと手動確認
5. ドキュメント更新

## 4. Safe Refactor Patterns

- 長い関数の分割（pure function化）
- 型の集約（重複定義の統合）
- APIレスポンス整形の責務分離
- UI表示と業務ロジックの分離
- バレルexportの整理（循環依存を避ける）

## 5. Risky Refactor Patterns

以下は必ず追加確認を行う。

- ルーティング構造変更（`src/app`）
- Server Actionの戻り値変更
- DBスキーマ変更（migrationが必要）
- 環境変数名変更
- Public URL構造変更（共有リンク互換性）

## 6. Archive Policy (`archive/unused`)

- 未使用判定ファイルは即削除せず、`archive/unused`へ退避
- 退避時に理由と移動元を `reference/archive-unused.md` へ記録
- 復帰する場合は「なぜ復帰するか」をPRに記載

## 7. Acceptance Criteria for Refactor PR

- `pnpm lint` が通る
- `pnpm test` が通る
- 影響範囲に応じてE2Eまたは手動確認を実施
- `/docs`更新済み
- 変更理由と境界がPR説明で明確

## 8. Documentation Requirements

リファクタで更新すべき最小対象:

- アーキテクチャに影響 -> `development/architecture.md`
- 規約変更 -> `development/coding-rules.md`
- テスト方針変更 -> `development/testing.md`
- データ形式変更 -> `reference/dataformat.md`
- ファイル移動/新規追加 -> `reference/file-catalog.md`
