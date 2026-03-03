# Testing Guide

更新日: 2026-03-03

## 1. Testing Strategy

Tabideaは以下の3層で検証します。

- Unit/Component tests (Vitest)
- Integration-style unit tests (service modules)
- E2E tests (Playwright)

## 2. Unit Test Policy (Colocation)

原則:
- テストは対象ファイルと同じディレクトリに配置
- 命名は `*.test.ts` / `*.test.tsx`
- 新規で `__tests__` ディレクトリは作らない

実行:

```bash
pnpm test
```

## 3. E2E Policy

- E2Eは `tests/` 配下
- 命名は `*.spec.ts`

実行:

```bash
pnpm exec playwright test
```

## 4. Current Coverage Focus

優先対象:
- `src/lib/services/*`
- `src/lib/utils/*`
- 主要UI（プラン生成、再調整、公開導線）
- Stripe webhookのサーバー処理

## 5. Test Writing Rules

- Arrange / Act / Assert を明確化
- 1テスト1責務
- 失敗メッセージが意図を説明できること
- 外部依存（AI/API/DB）はモックまたはスタブを使う

## 6. CI/PR Expectations

最低限:
- `pnpm test`
- 変更箇所に応じて `pnpm exec playwright test` または重点手動確認

## 7. Legacy Note

`src/lib/limits/__tests__/admin.test.ts` は旧構成の例外です。  
新規テストはcolocationで追加し、既存例外は将来移行対象とします。

## 8. Related Files

- `vitest.config.ts`
- `src/test/setup.ts`
- `tests/*.spec.ts`
