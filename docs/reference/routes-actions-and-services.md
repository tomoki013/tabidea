# Routes, Actions, and Services Index

更新日: 2026-03-29

## 1. App Pages (Representative)

| Route | File |
| --- | --- |
| `/` | `src/app/page.tsx` |
| `/plan` | `src/app/(planner)/plan/page.tsx` |
| `/plan/[code]` | `src/app/(planner)/plan/[code]/page.tsx` |
| `/plan/id/[id]` | `src/app/(planner)/plan/id/[id]/page.tsx` |
| `/plan/local/[id]` | `src/app/(planner)/plan/local/[id]/page.tsx` |
| `/samples` | `src/app/(planner)/samples/page.tsx` |
| `/samples/[id]` | `src/app/(planner)/samples/[id]/page.tsx` |
| `/travel-info` | `src/app/(info)/travel-info/page.tsx` |
| `/travel-info/[destination]` | `src/app/(info)/travel-info/[destination]/page.tsx` |
| `/pricing` | `src/app/(marketing)/pricing/page.tsx` |
| `/faq` | `src/app/(marketing)/faq/page.tsx` |
| `/blog` | `src/app/blog/page.tsx` |
| `/blog/new` | `src/app/blog/new/page.tsx` |
| `/blog/edit/[id]` | `src/app/blog/edit/[id]/page.tsx` |
| `/blog/[handle]/[slug]` | `src/app/blog/[handle]/[slug]/page.tsx` |
| `/shiori` | `src/app/shiori/page.tsx` |
| `/shiori/[slug]` | `src/app/shiori/[slug]/page.tsx` |
| `/my-plans` | `src/app/my-plans/page.tsx` |
| `/sync-plans` | `src/app/sync-plans/page.tsx` |
| `/admin/metrics` | `src/app/admin/metrics/page.tsx` |

## 2. API Routes

| Endpoint | File | Purpose |
| --- | --- | --- |
| `POST /api/generate/outline` | `src/app/api/generate/outline/route.ts` | Outline generation stream/response |
| `POST /api/generate/chunk` | `src/app/api/generate/chunk/route.ts` | Chunk detail generation |
| `POST /api/replan` | `src/app/api/replan/route.ts` | Replan suggestions via shared mutation contract |
| `POST /api/chat` | `src/app/api/chat/route.ts` | Planner chat interaction |
| `POST /api/places/search` | `src/app/api/places/search/route.ts` | Places search proxy |
| `POST /api/external/hotels/search` | `src/app/api/external/hotels/search/route.ts` | Hotel candidate search |
| `POST /api/external/flights/search` | `src/app/api/external/flights/search/route.ts` | Flight candidate search |
| `GET /api/og` | `src/app/api/og/route.tsx` | OG image generation |
| `POST /api/webhooks/stripe` | `src/app/api/webhooks/stripe/route.ts` | Stripe webhook handling |
| `POST /api/agent/runs` | `src/app/api/agent/runs/route.ts` | Canonical generation run creation |
| `GET /api/agent/runs/[runId]/stream` | `src/app/api/agent/runs/[runId]/stream/route.ts` | Canonical SSE stream for run progress |
| `GET /api/trips/[tripId]` | `src/app/api/trips/[tripId]/route.ts` | Canonical itinerary read API |
| `POST /api/trips/[tripId]/patch` | `src/app/api/trips/[tripId]/patch/route.ts` | Block-centric itinerary patch and new version creation |
| `POST /api/trips/[tripId]/replan` | `src/app/api/trips/[tripId]/replan/route.ts` | Scope-limited itinerary regeneration |
| `GET /api/users/me/memory` | `src/app/api/users/me/memory/route.ts` | Read opt-in memory profile |
| `POST /api/users/me/memory` | `src/app/api/users/me/memory/route.ts` | Update/enable/disable memory profile |
| `POST /api/evals/runs/[runId]` | `src/app/api/evals/runs/[runId]/route.ts` | Persist run/trip evaluation metrics |
| `POST /api/plan-generation/cleanup` | `src/app/api/plan-generation/cleanup/route.ts` | Cleanup expired canonical runs (CRON_SECRET auth) |
| `POST /api/itinerary/compose` | `src/app/api/itinerary/compose/route.ts` | Deprecated legacy pipeline stub (`410 deprecated_pipeline`) |
| `POST /api/itinerary/plan/*` | `src/app/api/itinerary/plan/*/route.ts` | Deprecated split compose pipeline stubs |

## 3. Server Actions

### Core
- `src/app/actions/travel-planner.ts` — プラン保存系 action と chat 起点の再生成委譲
- `src/app/actions/plan-itinerary.ts`
- `src/app/actions/travel-info.ts`
- `src/app/actions/travel-info/index.ts`
- `src/app/actions/user-settings.ts`

### Product Features
- `src/app/actions/packing-list.ts`
- `src/app/actions/reflection.ts`
- `src/app/actions/feedback.ts`
- `src/app/actions/shiori.ts`
- `src/app/actions/blog.ts`
- `src/app/actions/contact.ts`

### Billing / Limits
- `src/app/actions/billing.ts`
- `src/app/actions/limits.ts`
- `src/app/actions/stripe/checkout.ts`
- `src/app/actions/stripe/portal.ts`

## 4. Service Modules

### AI
- `src/lib/services/ai/*`
- 役割: モデル選択、プロバイダ抽象化、生成戦略、スキーマ

### Plan Generation (Canonical Pipeline)
- `src/lib/services/plan-generation/executor.ts` — パス実行オーケストレーター
- `src/lib/services/plan-generation/state-machine.ts` — 状態遷移・次パス決定
- `src/lib/services/plan-generation/run-store.ts` — `runs` / `run_pass_runs` / `run_checkpoints` 永続化
- `src/lib/services/plan-generation/passes/` — 7パス (normalize, draft-generate, rule-score, local-repair, selective-verify, timeline-construct, narrative-polish)
- `src/lib/services/plan-generation/scoring/` — 9軸ルブリック
- `src/lib/services/plan-generation/transform/` — DraftPlan → Timeline → Itinerary の canonical 変換
- `src/lib/services/plan-generation/renderers/narrative-renderer-v4.ts` — v4 専用 AI narrative renderer
- `src/lib/agent/run-events.ts` — fixed SSE event persistence
- `src/lib/trips/*` — itinerary version persistence / patch / replan helpers
- `src/lib/hooks/usePlanGeneration.ts` — canonical generation hook

### Plan Mutation (Shared)
- `src/types/plan-mutation.ts` — generate / regenerate / replan 共通の成功・失敗契約
- `src/lib/services/plan-mutation/regenerate-itinerary.ts` — チャット起点の全量再生成 orchestration
- `src/lib/services/plan-mutation/replan-plan.ts` — ReplanEngine を API 契約へ接続する bridge
- `src/lib/hooks/usePlanRegeneration.ts` — PlanId / PlanLocal / PlanCode で共有する再生成 state hook

### RAG
- `src/lib/services/rag/*`
- 役割: コンテンツ検索、前処理

### Replan
- `src/lib/services/replan/*`
- 役割: 制約抽出、候補評価、説明生成、itinerary 差分適用

### Travel Info
- `src/lib/services/travel-info/*`
- 役割: カテゴリ統合、キャッシュ、フォールバック

### Validation / Analytics / Google
- `src/lib/services/validation/*`
- `src/lib/services/analytics/*`
- `src/lib/services/google/*`

## 5. Where to Find Full Inventory

全ファイル台帳は `reference/file-catalog.md` を参照してください。
