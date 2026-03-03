# Archive: Unused Files

更新日: 2026-03-03

## 1. Purpose

`archive/unused` は、現行実行パスから外れたコードを即削除せず保管するための退避領域です。

- 本番実装に読み込まれない
- 参照・復帰のために保持
- 復帰時は理由を明記

## 2. Current Archived Inventory (Summary)

代表例:

- `scripts/debug_feed.ts`
- `src/components/AIPromotionBanner.tsx`
- `src/components/SamplePlanActions.tsx`
- `src/components/billing/*` の一部
- `src/components/features/planner/ActivityAccordion/*`
- `src/components/ui/LockedCategorySection.tsx`
- `src/context/FavoritesContext.tsx`
- `src/lib/hooks/useOnlineStatus.ts`

詳細な一覧は `reference/file-catalog.md` の `archive/unused/*` 行を参照。

## 3. Rules for Moving Files to Archive

1. 使用箇所検索（`rg`）で参照がないことを確認
2. ビルド・テストに影響しないことを確認
3. 退避理由をPR本文と本ドキュメントに記載

## 4. Rules for Restoring Archived Files

1. 復帰目的（再利用/比較/回帰修正）を明記
2. 現行構成との不整合（型、import、依存）を解消
3. テストを追加または更新
4. ドキュメント更新

## 5. Non-goals

- Archiveは機能フラグの代替ではない
- Archive内コードは品質保証対象外

## 6. Related

- `docs/development/refactoring-rules.md`
- `docs/reference/file-catalog.md`
- 旧記録は本書と`reference/file-catalog.md`へ統合済み
