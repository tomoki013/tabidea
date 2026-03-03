# Data Format Specification

更新日: 2026-03-03

この文書は、Tabideaで扱う主要データ構造をMarkdownで定義したものです。  
This markdown replaces the former PDF data format note.

## 1. UserInput (`src/types/user-input.ts`)

旅行計画の入力モデル。

| Field | Type | Description |
| --- | --- | --- |
| `destinations` | `string[]` | 目的地配列（複数都市対応） |
| `isDestinationDecided` | `boolean?` | 目的地確定フラグ |
| `region` | `string` | `domestic` / `overseas` / `anywhere` |
| `dates` | `string` | 旅行期間（入力文字列） |
| `companions` | `string` | 同行者 |
| `theme` | `string[]` | テーマ一覧 |
| `budget` | `string` | 予算帯 |
| `pace` | `string` | ペース |
| `freeText` | `string` | 自由要望 |
| `travelVibe` | `string?` | 雰囲気指定 |
| `mustVisitPlaces` | `string[]?` | 必訪問先 |
| `transits` | `Record<number, TransitInfo>?` | 日別移動制約 |
| `preferredTransport` | `string[]?` | 希望移動手段 |
| `fixedSchedule` | `FixedScheduleItem[]?` | 予約済み固定予定 |

## 2. Itinerary (`src/types/itinerary.ts`)

生成された旅程モデル。

| Field | Type | Description |
| --- | --- | --- |
| `id` | `string` | 旅程ID |
| `destination` | `string` | 主目的地 |
| `description` | `string` | 概要説明 |
| `days` | `DayPlan[]` | 日別詳細 |
| `references` | `Reference[]?` | 参考リンク |
| `estimatedBudget` | `BudgetEstimate?` | 予算推定 |
| `modelInfo` | `ModelInfo?` | 使用モデル情報 |

`DayPlan`は `transit`, `activities`, `timelineItems` を持ちます。

## 3. Plan Storage (`src/types/plans.ts`)

| Type | Purpose |
| --- | --- |
| `Plan` | DB保存されるプランエンティティ |
| `CreatePlanParams` | 新規保存時パラメータ |
| `UpdatePlanParams` | 更新時パラメータ |
| `LocalPlan` | ローカル保存形式 |
| `EncryptedPlanData` | 暗号化対象構造 |

## 4. Travel Info (`src/types/travel-info.ts`)

カテゴリベースの統合情報モデル。

### Category

`basic`, `safety`, `climate`, `visa`, `manner`, `transport`, `local_food`, `souvenir`, `events`, `technology`, `healthcare`, `restrooms`, `smoking`, `alcohol`

### Core Response

`TravelInfoResponse`:
- `destination`
- `country`
- `categories: Map<TravelInfoCategory, CategoryDataEntry>`
- `sources`
- `generatedAt`
- `disclaimer`

## 5. API-Oriented Data Shapes (Representative)

### Plan generation result
- Outline phase: `PlanOutline`
- Detail phase: `DayPlan[]`
- Final: `Itinerary`

### Billing / Limits
- User type: `anonymous | free | pro | premium | admin`
- Limit config: `PLAN_GENERATION_LIMITS`, `TRAVEL_INFO_LIMITS`

## 6. Compatibility Rules

1. 既存保存データを壊す変更はmigrationとセットで実施
2. 型変更時は `src/types` と利用箇所を同時更新
3. 公開URLで参照される構造変更は互換性を最優先

## 7. Update Procedure

データ構造を変更したら:

1. `src/types/*` 更新
2. 該当サービス更新
3. テスト更新
4. 本ドキュメント更新
