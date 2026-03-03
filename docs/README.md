# Tabidea Documentation

この`docs/`は、Tabideaプロジェクトの一次情報を集約した公式ドキュメントです。
This `docs/` directory is the source of truth for Tabidea documentation.

## 読者別の入口 / Entry by Audience

### 一般ユーザー向け / For End Users
- `project/what-is-tabidea.md`  
  サービスの概要、できること、使い方、料金と制限の考え方を詳しく説明します。
- `project/features-and-user-flows.md`  
  主要機能と実際の利用フローを画面遷移ベースで説明します。

### 開発者向け / For Developers
- `development/setup-and-operations.md`  
  開発環境構築、実行コマンド、日常運用手順。
- `development/architecture.md`  
  システム構成、責務分割、主要データフロー。
- `development/performance.md`  
  計測ルールと目標時間。
- `development/coding-rules.md`  
  コーディング規約とレビュー基準。
- `development/refactoring-rules.md`  
  リファクタリング時の判断基準と安全な進め方。
- `development/testing.md`  
  テスト戦略、配置ルール、実行方法。
- `development/usage-limits-and-entitlements.md`  
  利用制限と権限モデル。
- `development/env-vars.md`  
  環境変数の定義と用途。
- `development/data-and-compliance.md`  
  外部データソースの利用方針と遵守事項。
- `development/database-and-migrations.md`  
  Supabaseスキーマとマイグレーション運用。

### リファレンス / Reference
- `reference/routes-actions-and-services.md`  
  主要Route/Action/Serviceの索引。
- `reference/file-catalog.md`  
  リポジトリ内ファイル台帳（自動生成）。
- `reference/archive-unused.md`  
  `archive/unused`配下の扱い。
- `reference/dataformat.md`  
  本プロジェクトで使う主要データ構造の仕様。

## ドキュメント運用ルール / Documentation Maintenance

1. 機能変更、設計変更、テスト方針変更、DB変更がある場合は、同一PRで`/docs`を更新します。  
   Update docs in the same PR when behavior, architecture, tests, or schema changes.
2. コードとドキュメントが矛盾する場合は、コードを正として速やかに docs を修正します。  
   If code and docs diverge, fix docs immediately.
3. `reference/file-catalog.md`は`pnpm docs:catalog`で再生成して更新します。  
   Regenerate file catalog with `pnpm docs:catalog`.

## 変更履歴の扱い / Versioning Note

- 大きな変更は、関連ドキュメントの先頭に「更新日」と「変更概要」を追記してください。
- 仕様の意図が変わる変更は、実装理由（Why）も残してください。
