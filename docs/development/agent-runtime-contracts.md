# Agent Runtime Contracts

更新日: 2026-04-02

## 目的

Tabidea の旅程生成を chat-first ではなく itinerary-first で進化させるための共有契約を定義する。

このドキュメントの主眼は以下。

- `run` は生成プロセス
- `trip_version` は正規成果物
- イベント名は固定し、UI とバックエンドで共有する
- 再生成 scope は block/day/style/weather/message rewind を canonical にする

## 共有契約

### Agent roles

- `planner`
- `verifier`
- `formatter`
- `system`

### Run status

- `queued`
- `running`
- `core_ready`
- `completed`
- `failed`
- `cancelled`

### Run phases

- `session_resolve`
- `planning`
- `verification`
- `formatting`
- `persisting`
- `completed`

### Fixed SSE event names

- `run.started`
- `run.progress`
- `run.paused`
- `assistant.delta`
- `tool.call.started`
- `tool.call.finished`
- `tool.call.failed`
- `plan.draft.created`
- `plan.block.verified`
- `plan.block.flagged`
- `itinerary.updated`
- `run.finished`
- `run.failed`

### Canonical replan scopes

- `message_rewind`
- `block_replan`
- `day_replan`
- `style_replan`
- `weather_fallback_replan`

互換方針:

- 旧 `block/day/style/weather_fallback` は受理して canonical へ正規化する
- 新規 UI/API 実装は canonical 名を使う

## 実装メモ

- 共有型は `src/types/agent-runtime.ts`
- SSE event 保存は `src/lib/agent/run-events.ts`
- trip replan 契約は `src/lib/trips/replan.ts` と `/api/trips/:tripId/replan`

## 今後の拡張

- Planner / Verifier / Formatter ごとの event payload schema 強化
- `core_ready` を明示的に UI 表示へ反映
- `message_rewind` の server-side 実装
- run summary / evaluation schema の共有型追加
