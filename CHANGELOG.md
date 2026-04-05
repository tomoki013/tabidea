# CHANGELOG

## 運用ルール

- 更新履歴の唯一の正（Single Source of Truth）はこの `CHANGELOG.md` です。
- 変更があるすべてのPR/コミットで、必ず `CHANGELOG.md` を更新してください。
- `src/app/[locale]/(marketing)/updates/page.tsx` は一般ユーザー向けの要約表示であり、正本ではありません。
- `AGENTS.md` と `CLAUDE.md` の更新履歴運用はこのルールに従います。

## 開発者向けコミット履歴（コミット単位）

### 2026-04-05
- `local` fix(plan-run,rpc-random-dependency-and-fallback-claim): 最新ログで `resume` が `claim_execution` 段階で `function gen_random_bytes(integer) does not exist` により即死していた問題を修正。① `claim_plan_run_execution` / `commit_plan_run_slice` の RPC を `gen_random_bytes()` 依存から `gen_random_uuid()` ベースへ差し替える migration `20260405044500_plan_runs_rpc_random_uuid_fix.sql` を追加。② 同 migration は `npx supabase db push --include-all` で適用済み。③ さらに `run-store` は RPC が壊れていても direct DB update/insert で claim/commit を継続できる fallback を追加し、関数不整合だけで `resume` 全体が 500 即死しないよう硬化。④ これにより DB function 依存の単一点障害を減らした。
- `local` fix(plan-run,resume-500-diagnostics-and-modal-classification): `POST /api/v1/plan-runs/[runId]/resume` が 500 になっても原因がサーバーログに出ず、フロントでも generic/banner 扱いになっていた問題を修正。① `PlanRunStoreOperationError` を追加し、`claimPlanRunExecution` / `commitPlanRunSlice` の RPC 失敗や不正レスポンスを stage-aware に検出するよう変更。② `resume` route は `runId/state/stateVersion/nextPassId/stage` を含む構造化 `console.error` を出し、`plan_run_resume_internal_error` の JSON payload (`message/stage/failure/rootCause`) を返すよう更新。③ claim 段階の内部障害時は best-effort で `paused(infrastructure_interrupted)` へ退避する recovery も追加。④ `usePlanGeneration()` は non-2xx の resume payload を捨てずに読み、`plan_run_resume_internal_error` / `internal_error` を modal failure として分類するよう変更。⑤ hook regression test を追加し、structured 500 payload が modal になることを固定。
- `local` refactor(plan-run,snapshot-orchestration-hardening): `/api/v1/plan-runs` 系の実行制御を DB snapshot 主導へ再設計。① `plan_runs.state` を `created | running | paused | completed | failed` の coarse state に整理し、`state_version`, `current_pass_id`, `last_completed_pass_id`, `execution_lease_*`, `resume_hint` を追加。② 新規 `plan_run_slices` append-only テーブルと `claim_plan_run_execution` / `commit_plan_run_slice` RPC を導入し、lease 取得・`running` 遷移・slice commit・lease 解放を原子的に処理するよう変更。③ `pipeline-executor` は pass ごとの多段 DB 書き込みをやめ、1 slice の結果を最後に単一 commit する構造へ変更。④ `POST /api/v1/plan-runs/[runId]/resume`, `GET /api/v1/plan-runs/[runId]`, `GET /result`, `GET /events` は新 snapshot 契約 (`stateVersion`, `currentPassId`, `execution`, `resumeHint`) を返すよう更新し、`/events` は replay/debug 専用として維持。⑤ `usePlanGeneration()` は `running` を status polling で扱い、`paused` の auto/manual 判定を `resumeHint` ベースに寄せて generic error への誤着地を減らした。⑥ 新 migration `20260405050000_plan_runs_snapshot_orchestration.sql` を追加し、`npx supabase db push` まで実行済み。⑦ `usePlanGeneration` の `already_running` 回帰テストを追加。
- `local` refactor(plan-run,explicit-resume-control-flow): 再接続や 30 秒 pause を SSE `GET /events` に依存していた設計を見直し、planner の制御フローを `POST /api/v1/plan-runs` → `POST /api/v1/plan-runs/[runId]/resume` → `GET /api/v1/plan-runs/[runId]` / `result` に再構成。① create route は create-only にして、既存 run の返却は exact `idempotencyKey` 一致のみに限定。② `POST /resume` を新設し、1 slice 実行・paused/completed/failed の状態返却・簡易 lease による二重実行防止を追加。③ `GET /events` は replay/debug 用の副作用なし route に変更し、実行責務を除去。④ `usePlanGeneration()` は SSE reader を使わず、通常の `runtime_budget_exhausted` pause を同じ run の自動継続として扱い、一定回数を超えた時だけ resumable banner を出すよう変更。⑤ top page でも `canRetry=true` の resumable state は強制 modal 化しないよう UI を修正。
- `local` fix(plan-run,paused-reconcile-banner): 最新ログ `dev-20260405-000407.log` 系で backend 側は `paused` なのに frontend が最終的に汎用エラーへ落ちていた問題を修正。`usePlanGeneration()` は `stream.end` 後の run status 再照会で `state=paused` を受けた場合、裏で同じ run を回し続けず、既存の failure surface を使った resumable banner (`canRetry=true`, `resumeRunId` 保持) へ遷移するよう変更。`pauseContext.pauseReason` を使って一時停止理由も表示し、回帰テストを追加。
- `local` fix(plan-run,error-propagation-and-stream-end-reconcile): 旅程生成失敗時にフロントが `旅程生成を完了できませんでした / エラーが発生しました` の汎用表示へ落ちやすかった問題を修正。① `plan_runs` に terminal failure 詳細を保持する `failure_context` を追加する migration を追加。② plan-run executor は `errorCode` / `passId` / `rootCause` / `invalidFieldPath` / `retryable` を `warnings[]` に潰さず保存し、`run.failed` SSE と `/api/v1/plan-runs/[runId]`, `/result` でも同じ詳細を返すよう更新。③ `usePlanGeneration()` は `stream.end` を terminal success と即断せず、run status を再照会して `completed` / `failed` / `paused` を確定するよう変更。④ `/result` が `422 failed` を返した場合も保存済み failure detail を使って planner-specific な文言へ分類し、generic fallback を減らした。⑤ `usePlanGeneration` 回帰テストを追加し、`stream.end` 後に failed/completed を正しく処理するケースを固定。
- `local` fix(plan-run,draft-generate-resilience): `draft_generate` パスの3種類のエラー（タイムアウト/JSON切断/Zod enum不一致）によりプラン生成が完了できなかった問題を修正。① `DRAFT_DAY_TIMEOUT_MS` を15s→20sに拡大し、`MAX_DAY_RETRIES=3` のリトライ上限を導入して無限ループを防止。② `generateObject` 失敗時に `streamText` + JSON salvage によるテキスト fallback パスを追加（`extractFirstJsonObject` / `salvageIncompleteJson` を活用）。③ プロンプトの「meal block は最低1つ含めること (lunch または dinner 必須)」を明確化し、`timeSlot` と `mealKind` の enum 値を明示的に分離。④ `coerceDraftBlock` 正規化レイヤーを追加し、AI が `timeSlot` に "lunch"/"dinner" を出力した場合に "midday"/"evening" へ自動修正。⑤ catch ブロックを3層（timeout→回復可能→終端）に再構成し、JSON パースエラー・Zod検証エラーを `failed_terminal` ではなく fallback/pause に変更。⑥ `PlanRunPauseContext.dayRetryMap` でリトライ回数を pause/resume 間で引き継ぎ、temperature を `0.8 + retryCount * 0.15` で漸増。⑦ `draft-repair-local.ts` にも同じプロンプト修正と `coerceDraftBlock` を適用。

### 2026-04-04
- `local` fix(plan-run,error-modal): エラーモーダルの2ボタンが同じ動作になっていた問題を修正。① `handleRetryFromFailure` を `canRetry===false` 時にも `handleGenerate(isRetry:false)` を呼ぶよう変更（従来は `handleReturnToInput()` を呼びセカンダリボタンと同一動作）。② `PlanGenerationFailureSurface` のプライマリラベルを `canRetry===false` 時に新キー `actions.retryFresh`（「もう一度試す」）へ変更。③ モーダル variant にお問い合わせリンク（`/contact`）を追加。④ `ja`/`en` i18n に `retryFresh` と `contactLink` キーを追加。
- `local` fix(plan-run,build-errors): TypeScript ビルドエラーを一括修正。① `events/route.ts` の `send(event)` で `PlanRunEvent` → `Record<string,unknown>` への non-overlapping cast を `unknown` 経由の二段キャストで解決。② `usePlanGeneration.ts` の `streamFailure` — コールバック内変更が TypeScript に追跡されない問題を `as unknown as StreamFailureShape | null` キャストで回避。③ `usePlanGeneration.ts` の `dayIndex` / `completedDayCount` の `number|null|undefined` エラーを `!` で解消。④ `usePlanGeneration.ts` の `fallbackOriginSurface: null` → `undefined` に修正 (型は `GenerationOriginSurface | undefined`)。⑤ `normalize-request.ts` の `UserInput` 型不一致（`duration` → `dates` パース、`destination` → `destinations`、`themes` → `theme`、`FixedScheduleItem` プロパティ名修正）を修正。⑥ `draft-generate.ts` の `PlannerDraftStop` import 不足と `micro_day_split` 比較型エラーを修正。
- `local` feat(plan-run,pipeline-rebuild): プラン生成パイプラインを設計書 `tabidea_plan_generation_redesign_20260404.md` に従い破壊的刷新。① 新ドメインモデル: `trip → city → day → block` 階層、`BlockType` = spot / meal / intercity_move_placeholder / stay_area_placeholder / free_slot。② 8-pass パイプライン: normalize_request → plan_frame_build → draft_generate → draft_validate → draft_repair_local → timeline_finalize → completion_gate → persist_completed_trip を `src/lib/services/plan-run/` に新設。③ 新型定義 `src/types/plan-run.ts`、定数・エラー・ステートマシン・ストアを追加。④ REST API: `POST /api/v1/plan-runs`、`GET /api/v1/plan-runs/[runId]`、`GET /api/v1/plan-runs/[runId]/events` (SSE)、`GET /api/v1/plan-runs/[runId]/result`、`GET|DELETE /api/v1/trips/[tripId]` を新設。⑤ Supabase マイグレーション `20260404000000_plan_runs_rebuild.sql` で `plan_runs` テーブルを新設 (state constraint / RLS)。⑥ `usePlanGeneration` フックを新 API (/v1/plan-runs) に移行し、SSE イベント形式も新フォーマット対応。⑦ 旧パイプライン: `src/app/api/agent/runs/`、`plan-generation/run-processor.ts`、`plan-generation/finalize-session.ts`、`plan-generation/passes/rule-score.ts`、`plan-generation/scoring/`、`plan-generation/transform/`、`plan-generation/renderers/`、`itinerary/steps/` 各種、`archive/` ディレクトリを削除。⑧ Netlify 30秒制限対応の pause/resume per day-unit、匿名生成 (accessToken) をサポート。

### 2026-04-03
- `local` fix(plan-generation,outline-recovery-contract): 最新ログ `dev-20260403-190817.log` で `draft_generate` の `micro_day_split / day_outline_parse` が `invalidFieldPath=slots` を繰り返し、フロントに「候補スロットの形式が崩れていたため…」が再表示されていた問題を修正。① `structured-json-recovery.ts` に outline 専用の `draft_outline` recovery mode を追加し、compact text recovery が `stops` ではなく `day + slots` 契約を明示するよう修正。② `draft-generate.ts` の outline request は `draft_outline` を使うよう切り替え、partial JSON が `stops` 形式でも `slotIndex` を連番補完して outline salvage できるよう強化。③ outline validation の `insufficient_slots` も `draft_generation_outline_contract_mismatch` / `invalidFieldPath=slots` に統一し、generic `draft_generation_invalid_output` へのぶれを止めた。④ `structured-json-recovery` / `draft-generate` 回帰テストと root の `PLAN_GENERATION_PIPELINE_STATUS.md` を更新。
- `local` fix(plan-generation,fail-fast-and-runtime-pruning): 最新ログ `dev-20260403-182851.log` では state machine 例外自体は解消していた一方、`draft_generate` が `split_day_v5 -> micro_day_split -> constrained_completion` を繰り返した末に毎回 `draft_generation_missing_meal` で止まり、`fallbackHeavy=true` / `draftGeneratePauseCount=7-8` を量産していた問題を是正。① `draft-generate.ts` の active strategy を `split_day_v5 -> micro_day_split` に制限し、same-day recurring quality failure は `constrained_completion` へ昇格させず terminal failure に fail-fast するよう変更。② stale な `constrained_completion` cursor は resume 時に復元しないようにし、旧 strategy loop を active path から外した。③ `POST /api/agent/runs` は cross-run `artifact_reuse` bootstrap を削除し、retry は `same_run_resume` が使える時だけ既存 run を再開、それ以外は fresh run を作るよう整理。④ deprecated な `src/app/api/plan-generation/session/*` runtime stub を削除し、参照用の `archive/unused` だけを残した。⑤ route / draft-generate 回帰テストと root の運用台帳・architecture/reference docs を更新。
- `local` fix(plan-generation,terminal-failure-classification): 最新ログ `dev-20260403-175608.log` で `draft_generate` が `draft_generation_missing_meal` により `failed_terminal` へ落ちた直後、processor がそれを `failed_retryable` に再分類しようとして `Invalid state transition: failed_terminal → failed_retryable` を起こしていた問題を修正。① `run-processor.ts` の terminal failure branch から retryable への再分類を除去し、`failed_terminal` outcome は常に terminal として確定するよう変更。② unexpected processor exception の公開 `errorCode` を固定の `run_processor_unexpected_error` に正規化し、内部例外文字列がそのまま SSE/UI へ漏れないよう更新。③ `usePlanGeneration()` は未知の backend error code を翻訳キーとしてそのまま解決せず、step-level generic message へ安全にフォールバックするよう修正。④ `draft_generation_missing_meal` のような non-retryable な planner terminal failure は banner ではなく modal failure surface で出すよう分類を見直し、ja/en i18n を追加。⑤ `run-processor` / `usePlanGeneration` の回帰テストを追加し、`CHANGELOG.md` と `PLAN_GENERATION_PIPELINE_STATUS.md` を更新。
- `local` refactor(plan-generation,day-atomic-draft-generate): plan-generation の本丸だった `draft_generate` live path を day-atomic に寄せた。① `currentDayExecution` に `dayType` / `outlineArtifact` / `chunkArtifacts` / `candidateStops` を追加し、current day continuation の canonical state を拡張。② `draft-generate.ts` は seed 後に 1 invocation で 1 day 完了までを担当し、day 完了時は completed か next day への checkpoint yield で必ず切るよう変更。これにより giant pass が同一 invocation で複数 day を往復し続ける構造をやめ、processor から見た planner core を day-atomic にした。③ same-run continuation 時の attempt / chunk / outline 復元も `currentDayExecution` 優先へ寄せ、legacy loose cursor は fallback に降格。④ `draft-generate` / processor / stream / resume / hook まで含む regression tests 137 件を更新・通過。
- `local` refactor(plan-generation,failed-state-split): persisted lifecycle でも retryable failure と terminal failure を分離。① `SessionState` に `failed_retryable` / `failed_terminal` / `enrichment_running` を追加し、state machine と lifecycle helper を更新。② executor は `failed_terminal` outcome を `failed_terminal` state に保存し、run processor は retryable な pass failure を `failed_retryable` に正規化して `run.paused` へ流すよう変更。③ same-run continuation の create/resume/stream/run-store も新しい failed state を理解するよう更新し、`failed_retryable` だけが resume 可能、`failed_terminal` は true terminal として扱う。④ `run_not_completed` や unhandled error でも persisted state が `failed_terminal` に揃うようにし、event と保存状態のズレを解消。⑤ state-machine/executor/run-processor/run routes/hook の regression tests を更新し、targeted Vitest 137 件と changed-file ESLint を通過。
- `local` refactor(plan-generation,finalize-fence-and-day-events): root redesign の継続として processor を one-run-one-finalize 前提へ整理。① `run-processor.ts` に finalized trip fence の再利用を追加し、`core_ready` / `completed` + `finalizedTripId/finalizedTripVersion` を持つ run は再 finalize せず `run.core_ready` / `itinerary.updated` / `run.finished` を replay するだけに変更。② `POST /api/agent/runs/[runId]/process` も finalized run では no-op を返すようにし、same-run replay/process 再実行で trip version が増殖しないよう修正。③ `draft_generate` の same-run continuation を day-atomic に観測するため `run.day.started` / `run.day.completed` を shared event contract と processor に追加し、`currentDayExecution` と `plannerDraft.days` の進みを event として残せるようにした。④ `PLAN_GENERATION_PIPELINE_STATUS.md` と architecture docs を finalize fence / day lifecycle 前提へ更新し、run-processor / process route regression tests を追加。
- `local` refactor(plan-generation,current-day-execution): `draft_generate` の loose resume cursor を structured state に寄せ、`PipelineContext.currentDayExecution` を same-run continuation の正本として追加。① `src/types/plan-generation.ts` に current-day execution 型を追加し、strategy / substage / attempt / recurrence / requiredMissingRoles を 1 つの state に集約。② `draft-generate.ts` は pause/terminal patch で `currentDayExecution` を常に保存し、harness 復元時もこの structured state を優先するよう更新。③ `run-processor.ts` の pause payload は `currentDayExecution` を優先して `nextSubstage` / `nextDayIndex` / `currentStrategy` を導出するよう変更。④ `determineResumeState()` は `currentDayExecution` を持つ failed session を `normalized` へ戻すよう更新。⑤ `docs/development/architecture.md` と root の `PLAN_GENERATION_PIPELINE_STATUS.md` を process-route / core_ready / currentDayExecution 前提へ更新。⑥ draft-generate/state-machine regression tests を追加・更新。
- `local` refactor(plan-generation,run-processor-boundary): plan-generation の実行責務を `stream` route から切り出す基盤を追加。① `src/lib/services/plan-generation/lifecycle.ts` を新設し、`core_ready` / terminal state / execution 가능 state / agent run status/phase の判定を共通化。② `src/lib/services/plan-generation/run-processor.ts` を新設し、pass loop・retryable pause・terminal failure・core finalize・eval fire-and-forget を route 外の service に集約。③ `GET /api/agent/runs/[runId]/stream` は replay と SSE 配信に寄せ、実行本体は `processRunUntilYield()` を呼ぶ thin wrapper に変更。④ 新規 `POST /api/agent/runs/[runId]/process` を追加し、将来の worker/job 化に向けた run processing contract を API として切り出した。⑤ `/api/agent/runs` と `/api/agent/runs/[runId]/resume` は `processUrl` を返すよう更新。⑥ ルート/processor/state-machine の回帰テストと root の `PLAN_GENERATION_PIPELINE_STATUS.md` を更新。
- `local` fix(plan-generation,core-ready-state-persistence): `core_ready` を event だけでなく persisted session state としても正式化。① `SessionState` に追加済みの `core_ready` を state machine 側でも有効化し、`getNextPassForState()` と `determineResumeState()` が Core itinerary 完成を正しく扱うよう更新。② `/api/agent/runs/[runId]/stream` は finalize 後の run state を `completed` ではなく `core_ready` に保存し、replay / finalize guard / run-not-completed 判定 / budget pause 判定でも `core_ready` を受理するよう修正。③ finalized run replay test を `core_ready` 前提へ更新し、state machine tests も `timeline_ready -> core_ready`, `core_ready -> completed`, `failed -> core_ready`, finalized trip からの `determineResumeState() => core_ready` を追加。④ `cleanupExpiredRuns()` も terminal cleanup 対象に `core_ready` を含め、event と persisted state の不整合を解消。⑤ root の `PLAN_GENERATION_PIPELINE_STATUS.md` に `FP-010` と修正意図を追記。
- `local` feat(plan-generation,core-ready-and-retryable-events): plan-generation lifecycle を整理し、retryable な一時失敗と Core itinerary 完成を別 event として扱えるよう更新。① shared event contract に `run.retryable_failed` と `run.core_ready` を追加。② `stream/route.ts` は retryable `draft_generate` failure 時に `run.retryable_failed` を emit してから `run.paused` へ進め、terminal failure と混ざらないよう変更。③ finalize 後は `run.core_ready` を emit し、Core itinerary 完成を `run.finished` から分離。④ `PipelineContext` に `coreReadyAt` を追加し、same-run continuation と Core completion をより追跡しやすくした。⑤ `usePlanGeneration()` はこの新 event を failure surface にせず progress/成功境界として扱うよう更新。
- `local` feat(plan-generation,same-run-resume-endpoint): same-run continuation を `POST /api/agent/runs` の `isRetry` 分岐だけに依存させず、`POST /api/agent/runs/:runId/resume` を追加して専用 API として切り出した。これにより retryable pause/failure の再開が fresh retry と分離され、`usePlanGeneration()` は retryable な `run.paused` / transient failure 後に create route ではなく resume endpoint を優先利用するよう更新。resume route test と hook regression を追従し、same-run continuation が `runId` を維持したまま再開されることを固定。
- `local` fix(plan-generation,same-run-day-cursor): 最新ログ `dev-20260403-123108.log` で retryable な `draft_generate` failure を `run.paused` に変えても same-run resume が day 2 の current strategy/substage を失い、`split_day_v5` から同じ失敗を踏み直していた問題を是正。① `draft-generate.ts` の terminal failure builder は retryable day failure でも resume patch を clear せず、planner strategy に応じた `resumeSubstage` と `nextDayIndex` / attempt / strategy state を保持するよう変更。② `stream/route.ts` の retryable failure branch は追加の `persistRunSession()` で pause metadata を上書きせず、executor で既に保存された session の cursor をそのまま `run.paused` payload に使うよう修正。③ root の `PLAN_GENERATION_PIPELINE_STATUS.md` に最新ログ分析と same-run continuation の修正意図を追記。④ `draft-generate` / stream route の regression tests を追加・更新。
- `local` fix(plan-generation,transient-failure-lifecycle-and-finalize-fence): 最新ログ `dev-20260403-120223.log` で day 3 の `draft_generation_missing_meal` により同じ `runId` が一時的に `run_failed` になった後、`same_run_resume` で最終的には成功しているにもかかわらず、フロントには terminal failure copy が出ており、さらに同一 `runId` から複数 `tripId` が生成されていた問題を是正。① `stream/route.ts` は retryable な `draft_generate` failure を `run.failed` ではなく `run.paused` + `pauseReason=recovery_required` に収束させ、同じ run の継続前提で扱うよう変更。② `usePlanGeneration()` は retryable paused failure を自動 resume し、same-run continuation が有効な間は stale error surface を出さず progress を継続するよう修正。③ `PipelineContext` に `finalizedTripId` / `finalizedTripVersion` / `finalizedCompletionLevel` / `finalizedAt` を追加し、completed run の再接続時は finalize を再実行せず既存 trip を replay する finalize fence を導入。④ root の `PLAN_GENERATION_PIPELINE_STATUS.md` に最新ログ分析と「transient failure must not surface as terminal」方針を追記。⑤ hook / stream route の回帰テストを追加。

### 2026-04-02
- `local` fix(plan-generation,top-page-modal-first-and-insufficient-stops-taxonomy): 最新ログ `dev-20260403-113427.log` で same-run resume 後の day 2 が `missing_meal` のあと `insufficient_stops` を返しているにもかかわらず、一部が `draft_generation_provider_error` として記録されていた問題と、トップページ failure が retryable case で banner 扱いのままだった問題を是正。① `draft-generate.ts` に `draft_generation_insufficient_stops` を追加し、`insufficient_stops` を provider failure ではなく planner output invalid として固定分類。② `usePlanGeneration` と ja/en i18n に新しい error code を追加。③ `TravelPlannerSimplified` は top page origin の failure で effective variant を `modal` に強制し、最初は入力フォームを見せず modal のみ表示、`入力に戻る` を押した時だけフォームを再表示するよう更新。④ `stream/route.ts` は `run.progress` persistence timeout を degraded log から除外し、planner failure 分析のノイズを抑制。⑤ `PLAN_GENERATION_PIPELINE_STATUS.md` に最新ログ分析と top-page modal-first 方針を追記し、planner UI / draft-generate tests を更新。
- `local` fix(plan-generation,same-run-replay-and-banner-only-failure): 最新ログ `dev-20260403-002526.log` で same-run resume 後も day 2 の `stops.0.name invalid_type` / `slots` mismatch が再発し、stream replay で `run_events_run_id_seq_key` duplicate が degraded error として記録されていた問題を是正。① `draft-generate.ts` の strategy classification を強化し、`stops.* invalid_type` を `split_day_v5` / `constrained_completion` の contract mismatch として扱うよう変更。② same day の `split_day_v5` で `draft_generation_contract_mismatch` または `draft_generation_missing_meal` が再発した場合は、`micro_day_split` を経由せず `constrained_completion` へ直接昇格する分岐を追加して recurring day loop を短縮。③ `run-events.ts` の `appendEventWithSeq()` を `(run_id, seq)` conflict に対して upsert + existing fetch の idempotent 動作へ変更し、same-run stream replay の duplicate persist を no-op 化。④ `TravelPlannerSimplified` は failure 時に planner input を hidden にし、banner / modal だけを表示、`入力に戻る` を押した時だけ元のフォームを再表示する UX に更新。⑤ `PLAN_GENERATION_PIPELINE_STATUS.md` に最新ログ分析と修正意図を追記し、planner failure surface / simplified planner / draft-generate の回帰テストを更新。
- `local` fix(plan-generation,failure-surface-and-recurring-day2-errors): 最新ログ `dev-20260402-195158.log` で same-run resume 後も day 2 の `missing_meal` / `slots` mismatch / `stops.0.name invalid_type` が再発し、トップページ入力が full-screen error に置き換わっていた問題を是正。① `draft-generate.ts` に `draft_generation_missing_meal` を追加し、meal 欠落を generic `draft_generation_invalid_output` に埋もれさせないよう分類を強化。② `usePlanGeneration` に `failureUi`, `failureKind`, `canRetry`, `resumeRunId`, `originSurface`, `clearFailure` を追加し、retryable error は banner、terminal/repeated error は modal で扱う failure state machine を導入。③ 新しい `PlanGenerationFailureSurface` を追加し、`TravelPlannerSimplified` は full-screen error をやめて入力フォームを維持したまま banner / modal を表示、トップページ origin の失敗時は `planner-input-anchor` へスクロール復帰するよう変更。④ `PlanClient` も shared failure surface を使うよう統一。⑤ ja/en i18n、`PLAN_GENERATION_PIPELINE_STATUS.md`、targeted tests を更新。
- `local` fix(plan-generation,same-run-continuation): user retry が failed run ごとに新 run を作って `artifact_reuse` へ入り、最新ログのように同じ day の同じ failure shape へ戻っていた問題を是正。`POST /api/agent/runs` は `options.isRetry=true` かつ再開可能な failed run がある場合、新 run を作らず既存 run を `determineResumeState()` で再開可能状態へ戻してそのまま返すよう変更。`resumeStrategy` は `same_run_resume` を優先し、`artifact_reuse` は cross-run fallback に降格。route test を更新し、不完全 artifact retry が新 run ではなく同じ failed run を返すことを固定した。
- `local` fix(plan-generation,strategy-contract-mismatch): 最新ログ `dev-20260402-183837.log` で `draft_generate` が `split_day_v5 -> micro_day_split -> constrained_completion` まで進んだ後も `day_parse` の `invalid_structured_output` で 3 連続失敗していた問題を是正。① `draft-generate.ts` の error classification を strategy-aware にし、raw payload shape (`stops` / `slots`) と substage を見て `draft_generation_contract_mismatch` / `draft_generation_outline_contract_mismatch` / `draft_generation_constrained_contract_mismatch` を分離。② harness fingerprint に `invalidFieldPath` を含め、同じ constrained contract mismatch が再発した場合は `constrained_contract_recurrence_exhausted` で fail-closed に収束するよう変更。③ `day_request` / `day_parse` / outline / chunk 系の pause metadata に strategy-specific errorCode/rootCause/invalidFieldPath を保存するよう更新し、generic invalid output に埋もれないようにした。④ ja/en の user-facing error mapping を追加。⑤ root の `PLAN_GENERATION_PIPELINE_STATUS.md` に最新ログ分析、`FP-005`、修正意図、未解決リスクを追記。
- `local` fix(plan-generation,full-day-coverage): 最新成功ログで 3 日旅が `completedStopCount=11` のまま保存され、午後以降の実活動が薄いまま hotel / return flight が前に出る問題を是正。① `draft-generate.ts` の hard minimum を引き上げ、`accommodation` を stop 下限から除外。さらに `activity_only_until_midday` / `missing_afternoon_activity` / `insufficient_day_coverage` を追加し、固定の帰路制約がない限り午後以降の実活動がない day を upstream で reject するよう変更。② day / outline / constrained completion prompt に「昼で終わらせない」「hotel / flight を観光 stop に使わない」制約を追加。③ `timeline-builder.ts` の overflow trimming は最初の afternoon/evening 実活動と唯一の meal を保護し、再計算時も元の gap を尊重して午後 stop が押し出されにくいよう改善。④ `inject-accommodations.ts` は 19:00 未満の早すぎる宿泊注入を抑制。⑤ `timeline-to-itinerary.ts` に finalize 時の midday-only guard を追加し、午後の実活動がない itinerary は `finalize_activity_only_until_midday` で保存停止。⑥ ja/en の error mapping と root の `PLAN_GENERATION_PIPELINE_STATUS.md` を更新し、「fallback なしの一発成功」と「昼までで終わる itinerary は不合格」を正本に明記。⑦ draft-generate / timeline-builder / inject-accommodations / timeline-to-itinerary の regression tests を追加・更新。
- `local` perf(plan-generation,fast-path-first): 最新成功ログで `totalDurationMs=411331ms` と極端に遅く、`draft_generate` が同じ day で `split_day_v5 -> micro_day_split -> constrained_completion` を往復して fallback を主経路化していた問題を是正。① `PipelineContext` に `draftGenerateStrategyDay` / `draftGeneratePauseCount` / `finalDraftStrategySummary` を追加し、draft harness state を day-scoped に変更。② `resolveDraftGenerateHarnessState()` は `constrained_completion` を正しく復元できるよう修正し、同じ day のあいだだけ strategy を sticky に、day 完了時は reset するよう更新。③ `draft-generate.ts` の completion / pause / terminal path は final summary を clear 前に保持し、`run_finished` / `run_failed` で final strategy / escalation count / recovery count / pause count / fallbackHeavy を summary として残せるようにした。④ root の `PLAN_GENERATION_PIPELINE_STATUS.md` に「fallback を当てにせず、基本は一発成功を目標にする」方針と最新成功ログの所見を追記。⑤ targeted `draft-generate` / hook tests と `pnpm lint` を通過。
- `local` fix(plan-generation,completion-harness-ledger): 最新ログで `draft_generate` が `day_outline_parse` の `draft_generation_invalid_output` を同じ day / 同じ micro strategy のまま繰り返し、partial pause を量産していた問題への対策を追加。① root に `PLAN_GENERATION_PIPELINE_STATUS.md` を新設し、plan-generation pipeline 専用の正本として最新ログ分析・既知 failure pattern・修正意図・未解決リスク・次の必須変更を記録する運用を追加。② `PipelineContext` に draft completion harness state (`draftGenerateCurrentStrategy`, `draftGenerateStrategyEscalationCount`, `draftGenerateRecoveryCount`, `draftGenerateSameErrorFingerprint`, `draftGenerateSameErrorRecurrenceCount`) を追加。③ `draft-generate.ts` の harness は repeated failure fingerprint を記録するよう更新し、`micro_day_split` で同じ invalid output が再発した場合は新しい `Strategy C: constrained_completion` へ昇格して別 contract で同じ日を埋め直すよう変更。これでもだめな場合だけ `draft_generation_strategy_exhausted` / `strategy_loop_exhausted` で fail-closed にする。④ `run_finished` / `run_failed` の checkpoint summary に current strategy / escalation count / recovery count / same error recurrence count を追加し、成功 run と失敗 run の両方で harness の動きが追えるようにした。⑤ ja/en の user-facing error mapping に新しい harness error code を追加。⑥ `draft-generate` regression test を追加・更新し、同一 `day_outline_parse` エラーが無限 loop せず constrained completion へ昇格することを検証。

### 2026-04-01
- `local` feat(agent-runtime,canonical-contracts): To-Be の itinerary-first 設計に向けた agent-ready 基盤を追加。① `src/types/agent-runtime.ts` を新設し、Agent role / run status / run phase / fixed SSE event names / canonical replan scopes (`message_rewind`, `block_replan`, `day_replan`, `style_replan`, `weather_fallback_replan`) を共有契約として定義。旧 `block/day/style/weather_fallback` 名は canonical へ正規化する互換ヘルパーも追加。② `run-events.ts` は shared event contract を使用するよう更新し、SSE payload 型を統一。③ trip replan API と client/hook を canonical replan scope に寄せ、route は旧 scope 名も受理しつつ正規化後の scope を永続化・返却するよう変更。④ `Itinerary` 型を To-Be 設計に寄せて拡張し、`core_validated` / `fully_enriched` completion level、`queued/running/core_ready` generation status、block/day の編集・不確実性表現を強化。⑤ `docs/development/agent-runtime-contracts.md` を追加し、chat-first ではなく itinerary-first の共有契約を明文化。⑥ shared contract / replan の回帰テストを追加。
- `local` fix(plan-generation,completeness-gates-and-safe-retry-bootstrap): 最新ログで失敗 run の不完全な成果物を retry が完成済み扱いし、`2泊3日` 入力でも `1泊2日` や `0日` の itinerary が保存されうる問題を修正。① retry bootstrap (`/api/agent/runs`) は `normalizedInput.durationDays` を基準に artifact 完全性を検査し、全日そろっていない `plannerSeed` / `plannerDraft` / `draftPlan` / `timelineState` / verify 以降の成果物は cross-run reuse しないよう変更。`plannerDayOutline` / `plannerDayChunks` / `checkpointCursor` も cross-run retry では持ち越さない。② `determineResumeState()` は存在ベースから completeness ベースに変更し、不完全 `plannerDraft` / `draftPlan` / `timelineState` で `draft_generated` / `draft_formatted` / `timeline_ready` へ進まないようにした。③ `executor.ts` に pass 完了時の completeness gate を追加し、`draft_generate` / `draft_format` / `timeline_construct` が要求日数未満の成果物を返した場合は downstream へ進めず fixed error code (`*_incomplete_day_set`) で fail-closed にするよう修正。④ `sessionToItinerary()` と `finalizeSessionToTrip()` は `normalizedInput.durationDays` を旅程日数の唯一の truth source とし、`draftPlan.days.length` や `timelineState.days.length` が不足する場合は `finalize_empty_itinerary` / `finalize_incomplete_itinerary_days` で保存を拒否するよう変更。⑤ ja/en i18n と hook error mapping を更新し、内部例外ではなく固定コードで UI に表示。⑥ route/state-machine/executor/finalize/transform の回帰テストを追加・更新し、「不完全 run が成功扱いで保存されない」ことを検証。
- `local` fix(plan-generation,fallback-default-and-pause-ux): 最新ログで初回 run から `micro_day_split` が常用され、`day_outline_*` / `day_chunk_*` の partial・pause が多発していた問題を是正。① `draft-generate.ts` の planner strategy 選択を見直し、初回生成の既定経路を `split_day_v5` に戻した。`micro_day_split` は `day_outline_*` / `day_chunk_*` の resume 時、または free runtime 上で同一日の full-day request / parse / validation が連続失敗したときだけに限定。② repeated full-day failure 時は terminal failure ではなく `day_outline_request` へ controlled fallback し、`plannerStrategy`, `pathType`, `fallbackTriggered`, `fallbackReason` を metadata に記録して「成功したが fallback-heavy」な run を追跡しやすくした。③ planner loading overlay は `run.paused` の `pauseReason` を画面に表示するよう改善し、`STREAM_RESUME_BACKOFF_MS` を `250ms → 750ms` に延長して pause/reconnect のちらつきと過剰再接続を抑制。④ ja/en の pause 用 i18n 文言を追加し、同じ日で再調整が続くときは day 単位の具体的な待機文言を表示するよう変更。⑤ `draft-generate` と `usePlanGeneration` の回帰テストを更新し、初回 free preview run が full-day path を使うこと、full-day 連続失敗後だけ micro fallback へ落ちること、pause 状態が overlay に反映されることを検証。
- `local` fix(plan-generation,timeout-first-completion-and-production-logging): タイムアウト最優先で旅程生成の完了条件とログ出力を見直し。① `/api/agent/runs/[runId]/stream` は `timeline_ready` 到達時点で run を `completed` に進め、`finalizeSessionToTrip()` で旅程を保存して `run.finished` を返すよう変更。これにより `narrative_polish` の遅延やタイムアウトで全体が失敗しない設計に切り替え、ユーザーは説明文未完了でも旅程本体を開けるよう改善。② finalize 時の hero image 取得は残余予算が十分なときだけ実行する budget-aware 動作へ変更し、末尾の decorative fetch が request timeout を押し上げないようにした。③ eval 保存は同期 blocking ではなく best-effort の非同期実行に変更し、旅程返却を優先。④ `run-checkpoint-log.ts` は production で allowlist 制御を導入し、`run_created` / `run_finished` / `run_failed` など必要最小限の checkpoint だけを summary フィールド付きで出力するよう制限。`pass_started` / `pass_completed` / `run_event_persist_*` などの詳細ログは development のみとし、`freeText` / `destinations` / stop 名などの個人情報・生入力データが本番ログへ出ないようにした。⑤ logger の production safety test を追加。
- `local` fix(plan-generation,finalize-contract): 最新ログで `timeline_ready` 直後に毎回 `Cannot build itinerary from incomplete run state` が出ていた問題を修正。原因は `stream` 側が `timeline_ready` で finalize する新設計へ移行した一方、`sessionToItinerary()` が `narrativeState` 必須の旧契約のままだったこと。`timeline-to-itinerary.ts` を更新し、finalize に必要な必須条件を `draftPlan + normalizedInput + timelineState` に変更、`narrativeState` が未生成でも `draftPlan.description` / `tripIntentSummary` / `draftStop.rationale` を使って deterministic fallback で旅程を構築できるよう改善した。併せて itinerary に `narrativePending` を追加し、説明文の後追い生成状態を明示。`stream/route.ts` の最終 catch では raw 例外文字列を `finalize_incomplete_session_contract` の固定 error code へ変換し、`usePlanGeneration()` と ja/en i18n も対応して UI に内部例外が露出しないよう修正。transform/hook の回帰テストを追加。
- `local` fix(plan-generation,retry-reuse-and-itinerary-quality): ログ分析に基づいて旅程生成の再試行設計と品質制御を見直し。① `POST /api/agent/runs` は `options.isRetry=true` のとき、同一ユーザー・同一入力ハッシュ・同一 executionMode の最新未完了 run を探索し、`normalizedInput` / `plannerSeed` / `plannerDraft` / `draftPlan` / `evaluationReport` / `verifiedEntities` / `timelineState` など再利用可能な成果物を新 run に継承して `resumeStrategy=artifact_reuse` で再開できるよう変更。これにより途中失敗後のやり直しで完成済み day/pass を再利用し、時間とコストを削減。② `draft-generate.ts` に stop identity 正規化ベースの受理前 validation を追加し、既に確定したスポットとの重複、同一 day 内の重複、中日の stop 数不足を parse 直後に検出して retry/pause へ戻すよう改善。プロンプトにも「既に確定したスポット」一覧と hard minimum stop count を渡し、少スポットや同一スポット再訪の混入を抑制。③ free runtime の day target count は retry 時でも hard floor を下回らないよう調整し、中日は 4 件以上を優先するよう変更。④ `scoreVariety()` の duplicate violation を `plan` スコープから offending day ごとの `day` スコープへ変更し、`local-repair` が実際に重複している日を修復対象にできるよう改善。repair prompt も他日で確定済みのスポット一覧を渡し、重複置換と stop 追加を明示。⑤ draft/executor checkpoint metadata に `completedDayCount`, `completedStopCount`, `duplicateStopCount`, `underfilledDayCount`, `resumeSourceRunId`, `resumeStrategy`, `reusedArtifactKinds`, `repairIterations` を追加し、ログだけで retry 再利用率と underfilled/duplicate 混入箇所を追跡可能にした。⑥ route / draft-generate / rubric / local-repair 周辺の targeted Vitest 110 件と `pnpm lint` を通過（lint は既存 warning 88 件のみ、error なし）。
- `local` chore(dev-logging): `pnpm dev` をログ保存付きに変更。`package.json` の `dev` は `scripts/dev-with-log.ts` を経由して `next dev` を起動するよう更新し、毎回 `logs/dev-YYYYMMDD-HHmmss.log` を自動生成して stdout/stderr を端末表示しながら同時保存するようにした。素の起動が必要な場合のため `dev:raw` も追加。
- `local` fix(plan-generation,narrative-pause-and-warning-ux): 旅程生成の最終段と検証不足の UX/安定性を追加改善。① `narrative-polish.ts` は残余予算が 15 秒未満のとき `failed_terminal` ではなく `partial` を返し、`resumePassId=narrative_polish` を保存して次の stream で再開できるよう変更。`/api/agent/runs/[runId]/stream` も narrative streaming の `partial` を `run.failed` ではなく `run.paused` として扱うよう更新。② `draft-generate.ts` の `calculateChunkTimeoutMs()` を `5.0/6.0/7.0s`（Netlify Free では `4.5/5.5/6.5s`）へ引き上げ、day chunk が salvage 前提になりやすい問題を緩和。③ `stream/route.ts` の run event persistence timeout を `400ms → 1000ms`、slow log 閾値を `100ms → 300ms` に調整して `run_event_persist_degraded` の過剰発火を抑制。④ `usePlanGeneration()` で `high_unverified_ratio` warning をユーザー向け文言へ変換し、warning を重複排除して保持するよう変更。⑤ pass 別の詳細エラーマッピングを追加し、`narrative_polish` の予算不足 timeout を汎用エラーではなく専用文言で表示するよう改善。⑥ `GRADE_THRESHOLDS.marginal` を `50 → 55` に引き上げ、軽微な marginal ケースの repair 乱発を抑制。⑦ narrative/selective-verify/hook の回帰テストを追加・更新。
- `local` fix(pipeline-reliability): 旅程生成パイプラインの安定性・精度・UX を改善する5件の修正。① `narrative-renderer-v4.ts` の `generateObject()` / `streamObject()` に `abortSignal` を追加し、`narrative-polish.ts` から残余予算ベースのタイムアウト (`Math.max(4000, remainingMs - 2000)`) を渡すことで narrative Polish フェーズのハングを防止。② `local-repair.ts` の `AbortSignal.timeout(60_000)` を `Math.min(45_000, Math.max(10_000, remainingMs - 8_000))` に変更し、修復ループが全体タイムアウトを引き起こさないよう制限。`PASS_BUDGET_MS.local_repair` を `15_000 → 45_000` に引き上げ実際の修復時間と合わせた。③ `narrative-polish.ts` の `RAG_TIMEOUT_MS` を `2_000 → 3_500` ms に延長し、`narrativePolishPass()` / `narrativePolishPassStreaming()` の冒頭で `void getRetriever()` を呼んで Pinecone コールドスタートを warm-up するよう変更し RAG 成功率を向上。④ `draft-generate.ts` の `resolveSeedMaxTokens()` / `resolveDayMaxTokens()` に `tripDays` パラメータを追加し、7日以上で ×1.3、10日以上で ×1.5 のトークンキャップスケールを導入。`calculateOutlineMaxTokens()` / `calculateChunkMaxTokens()` も同様に対応し、長期旅行でのトークン切り捨てを軽減。⑤ `selective-verify.ts` で未検証スポット（unverifiable + invalid）の割合が50%超の場合に `high_unverified_ratio` warning を追加し、`lib/plan-generation.json` (ja/en) に該当 i18n メッセージを追加。
- `local` fix(plan-generation,outline-slots-parse): `day_outline_parse` が `invalidFieldPath: "slots"` で全 attempt 失敗する問題を修正。① `structured-json-recovery.ts` の `coerceRecoveredJson()` に `slots` 配列のコーション（`role` / `timeSlotHint` 値を valid enum へ正規化）を追加し、Gemini が無効な列挙値を返した場合でも Zod validation 通過率を向上。② `salvagePlannerOutlineFromExtractedJson()` にフォールバック追加: モデルが `slots` ではなく `stops`（旧フィールド名）を返した場合でも `stops` 配列を slots として解釈し、`slotIndex` が欠如している場合はループカウンタから自動付番するよう変更。③ アウトライン専用の `calculateOutlineMaxTokens()` を追加し、slots スケルトン生成に必要なトークン（targetSlotCount × 50 + 80、最低 400）だけを確保する計算に変更。従来の `calculateDayMaxTokens`（full-day stops 向け 640-1024）より大幅に小さいバジェットでモデルへの出力空間を絞り、過剰な出力（stops 形式の name/rationale 付き詳細）を抑制。

### 2026-03-30
- `local` fix(plan-generation,rls-ttft-token-contract): 4件の性能・正確性修正。① Supabase RLS: `run_events`/`eval_results`/`tool_audit_logs` の SELECT policy を `auth.uid()` 直接呼び出しから `STABLE SECURITY DEFINER` な `auth_uid()` ラッパー関数経由に変更し per-row 評価を排除。`run_events(run_id)` の単列インデックスを追加。`run-store.ts` の `select('*')` を明示的カラムリストに変更して大容量 JSONB の不要な転送を削減。② Narrative TTFT: streaming/batch 両 path で RAG fetch とモデル解決 (`resolveLanguageModel`) を `Promise.all` で並行実行し 26 秒 TTFT の主因である sequential awaiting を解消。③ Token Budget: `day_chunk_request` が `calculateDayMaxTokens` をそのまま流用して attempt-1 が full-day 計算式ベースで chunk サイズ (2 スロット) に対して過不足になっていた問題を修正。専用の `calculateChunkMaxTokens` を追加し floor を 900 tokens に設定。④ Contract Version: seed phase の `logPlannerSubstageStart` / `buildPauseResult` / `buildTerminalFailureResult` に `plannerStrategy` と `plannerContractVersion` を渡し、`micro_day_split` strategy でも seed checkpoint が `semantic_draft_v6` を正しく報告するよう修正。
- `local` fix(plan-generation,planner-model-pinning): free runtime の planner model が run ごとに `gemini-3-flash-preview` と `gemini-2.5-flash` の間で揺れ、ある run では microplanner timeout、別の run では `seed_parse` invalid output に戻る不安定状態を修正。`POST /api/agent/runs` は `runtimeProfile=netlify_free_30s` かつ Gemini planner の場合、env override 未設定時は `plannerModelName` を `gemini-3-flash-preview` へ固定するよう変更し、free planner path を常に同じモデル前提で比較・改善できるよう統一。run route test も追加。
- `local` fix(plan-generation,outline-prefix-salvage): free microplanner の `day_outline_parse` が final retry で短い partial text (`length: 68` など) を受け取っても slot prefix を救えず `draft_generation_invalid_output` で止まる問題を修正。① outline salvage は `JSON.parse()` に失敗した truncated text でも `slotIndex` / `role` / `timeSlotHint` / `areaHint` を正規表現ベースで抽出し、連番 prefix を outline として復元できるよう変更。② `validateOutline()` から `missing_meal` を外し、meal 必須判定で outline salvage を即死させず chunk generation へ進めるよう改善。③ truncated outline prefix から chunk generation へ進める focused `draft-generate` regression test を追加。
- `local` fix(plan-generation,microplanner-resume-state): free runtime の microplanner が `day_chunk_request` まで進んで pause しても、次の stream で `day_outline_request` に巻き戻って同じ day outline を繰り返す問題を修正。① `runs` 永続化層に `planner_day_outline` / `planner_day_chunks` を追加する migration `20260330133000_plan_generation_microplanner_state.sql` を追加。② `run-store.ts` は `plannerDayOutline` / `plannerDayChunks` を `RunPatch` / `rowToRun()` / DB patch に含めるよう更新し、outline/chunk state を pause-resume 間で保存・復元できるよう変更。③ これにより `nextSubstage=day_chunk_request` で pause した run は次 stream で outline を再生成せず、保持済み outline/chunks を使って chunk から再開できるよう改善。
- `local` fix(plan-generation,free-microplanner): `semantic_draft_v5` まで軽量化しても `netlify_free_30s` で `gemini-3-flash-preview` の `day_request` が 4.0s / 4.5s / 5.0s を使い切って day 1 で止まっていた問題を修正。① free runtime かつ slow planner にだけ `plannerStrategy=micro_day_split` を導入し、`semantic_draft_v6` として `day_outline_request -> day_outline_parse -> day_chunk_request -> day_chunk_parse` の microplanner 経路で 1 日を chunk ごとに埋めるよう変更。② outline は slot skeleton (`slotIndex`, `role`, `timeSlotHint`, `areaHint?`) だけを返し、chunk request は最大 2 slot の具体スポットだけを返す contract に分割。③ `searchQuery=name` と `areaHint ||= targetDay.mainArea` の deterministic 補完は維持しつつ、current day の `plannerDayOutline` / `plannerDayChunks` を session に保持して `run.paused` で継続できるよう更新。④ 既存の `gemini-2.5-flash` 系や non-free runtime は従来の `split_day_v5` path を維持し、microplanner は slow free planner にだけ適用。⑤ focused `draft-generate` tests / planner suite / TypeScript / lint を通過。
- `local` fix(plan-generation,day-contract-v5): `day_request` が stop ごとに `searchQuery` と必須 `areaHint` まで毎回生成していたため、free runtime で 3.5s / 4.5s / 5.0s を使い切っても day 1 が返りきらない問題を修正。① planner contract を `semantic_draft_v5` に更新し、day AI output は `name`, `role`, `timeSlotHint`, `areaHint?` のみとし、`searchQuery` は `name` から、欠損 `areaHint` は `targetDay.mainArea` から deterministic に補完するよう変更。② compact / ultra-compact day prompt は full 条件の再掲を減らしつつ target stop count と minimal stop template を明示し、free runtime の retry 時だけ `relaxed 3-4 / balanced 4 / active 4-5` に寄せて完走率を改善。③ day salvage も新 contract 前提に更新し、partial text から valid stop prefix を拾えれば final attempt でも completion / partial pause へ進めるよう整理。④ focused `draft-generate` tests / planner suite / TypeScript / lint を通過。
- `local` fix(plan-generation,seed-day-budget): heavy seed の直後に `day_request` attempt 1 が 2.5 秒台まで痩せて無駄打ちし、その後 `ultra_compact` day output も stop fields を落として `draft_generation_invalid_output` に落ちていた問題を修正。① `seed_parse` 完了後に seed salvage/retry/elapsed/remaining budget を見て `pauseAfterSeedCompletion` を判定し、条件を満たすと day 1 を同じ stream で始めず `run.paused(nextSubstage=day_request, nextDayIndex=1)` へ切るよう変更。② `netlify_free_30s` の `day_request` attempt 1 は minimum 3500ms を確保できない場合は開始せず pause するよう変更し、均等割りで 2592ms のような request を打たないようにした。③ `ultra_compact` day prompt には `searchQuery` / `areaHint` を落としにくい stop mini-template と対象日コンテキストを追加。④ `pauseAfterSeedCompletion`, `seedElapsedMs`, `minimumDayStartBudgetMs` を checkpoint metadata に追加し、seed→day 境界の budget 判断をログだけで追えるよう改善。⑤ focused `draft-generate` tests / planner suite / TypeScript / lint を通過。
- `local` fix(plan-generation,day-boundary): `day_request` の adaptive retry と salvage で day 1 が救えても、その直後に同じ stream request で day 2 を始めて `draft_generate` 全体が 10 秒超まで膨らみ timeout していた問題を修正。① `draft_generate` に post-day completion budget gate を追加し、slow/recovered な day 完了後は `run.paused(nextSubstage=day_request, nextDayIndex=...)` へ切って次 stream で続行するよう変更。② `shouldPauseBeforeNextDay()` を導入し、`dayAttempt>=2`、`usedTextRecovery=true`、長い day timeout、または残予算不足のときは同一 stream で次の日へ進まないよう統一。③ 次の日へ移る際の retry state をリセットし、前日の `dayAttempt=3` が day 2 に漏れて即最終 retry 扱いにならないよう修正。④ `completedDayCount` / `continuedToNextDayInSameStream` / `pauseAfterDayCompletion` を checkpoint metadata に追加し、slow day completion 後の pause がログだけで判別できるよう改善。⑤ focused `draft-generate` Vitest / planner suite / TypeScript / lint を通過。
- `local` fix(plan-generation,day-retry): seed 修正後に `day_request` が同じ条件の retry を 3 回繰り返して day 1 で timeout していた問題を修正。① `draft_generate` の day phase に `standard -> compact -> ultra_compact` の adaptive retry profile を追加し、retry ごとに prompt compaction・timeout (`netlify_free_30s` で 4000ms -> 4500ms -> 5000ms)・maxTokens・temperature を段階的に変更。② `day_parse` には stop prefix 専用の deterministic salvage を追加し、不完全な trailing stop を切り落としても meal を含む valid stop 群が残っていればそのまま day completion まで進めるよう改善。③ `day_request` / `day_parse` の metadata と checkpoint に `dayPromptVariant`, `salvagedStopCount`, `requiredMealRecovered` を追加して、day timeout と partial salvage の切り分けをログだけで追えるようにした。④ `draft_generate` の focused Vitest / planner suite / hook test / TypeScript / lint を通過。
- `local` fix(plan-generation,seed-salvage): split canonical planner の `seed_parse` が 3 日旅でも `seedMaxTokens=320` 相当の低予算と同一条件 retry のため `days[0].mainArea` / `overnightLocation` 欠損で繰り返し失敗していた問題を修正。① seed token budget を `durationDays` ベースの現実的な動的計算へ変更し、`netlify_free_30s` では 3 日旅で `660`、上限 `768` まで使えるよう調整。② seed retry は `standard -> compact -> ultra_compact` の prompt variant と `4000ms -> 4500ms -> 5000ms` の timeout/temperature/maxTokens へ段階的に変える adaptive same-contract retry に更新。③ `seed_parse` では generic JSON salvage の後に seed 専用 prefix salvage を追加し、不完全な trailing day object を切り落として valid day skeleton だけで partial pause できるよう改善。④ `pass_failed` / `run_failed` metadata に `salvagedDayCount`, `expectedDayCount`, `seedPromptVariant` を追加し、structured error のまま原因を追跡しやすくした。⑤ planner invalid-output の ja/en 文言も「候補スポットの骨組み」ベースに更新し、focused Vitest / TypeScript / lint を通過。
- `local` fix(plan-generation,error-contract): `draft_generate` の schema/parse failure を `draft_generation_provider_error` に誤分類していた問題を修正。① `draft_generate` は `seed_request` / `seed_parse` / `day_request` / `day_parse` を別々に扱い、Zod validation や text JSON parse failure は `draft_generation_invalid_output` + `rootCause=invalid_structured_output` に統一。② `days[0].mainArea` のような欠損時は `invalidFieldPath` と `validationIssueCode` を metadata/checkpoint/SSE に含め、`provider_error` は本当の upstream 障害時だけに限定。③ `/api/agent/runs/:runId/stream` の `run.failed` payload に `errorCode`, `rootCause`, `invalidFieldPath` を追加。④ `usePlanGeneration()` は raw エラー文字列ではなく structured `errorCode` 優先で文言を解決し、`draft_generation_provider_error` の生表示をやめて ja/en の専用 i18n 文言を出すよう更新。⑤ focused Vitest / TypeScript / lint を通過。
- `local` refactor(plan-generation,split-canonical-planner): `draft_generate` の monolithic planner request が first-response latency で毎回 timeout していた根本原因に対処。① `draft_generate` を `seed_request` / `seed_parse` / `day_request` / `day_parse` の split canonical planner へ再設計し、seed では day skeleton、day request では 1 日ぶんの minimal stops だけを返す contract `semantic_draft_v4` に更新。② AI repair fallback の `planner_recovery` は live path から撤去し、deterministic parser salvage を先に試した上で、必要なら same-contract retry のため `run.paused(nextSubstage=seed_request|day_request)` を返す execution model に変更。③ `runs` に `planner_seed` を追加する migration `20260330120000_plan_generation_planner_seed.sql` を追加し、`PlanGenerationSession` / executor / stream route は `plannerSeed`, `nextDayIndex`, `seedAttempt`, `dayAttempt`, `plannerRequestAttempt` を永続化・配信するよう更新。④ `/api/agent/runs` は `generationProfile` に planner-specific model/provider を固定保存するよう更新し、run 中の provider fallback を使わない方針を明示。⑤ `draft_generate` / executor / run route / hook のテスト、architecture/performance/setup docs を split planner 前提へ更新し、focused TypeScript / Vitest を通過。
- `local` fix(plan-generation,planner-transport): `draft_generate` の planner request が hard timeout で partial text ごと落ちていた問題を修正。① `structured-json-recovery` の text transport を `generateText()` から `streamText()` ベースへ切り替え、timeout 時も途中まで受信できた text を保持して parser-side salvage / resumable recovery に渡せるよう変更。② compact recovery や text-first planner parse でも `parseTextJsonObjectDetailed()` を通し、partial text から deterministic salvage を優先してから AI recovery へ進めるよう整理。③ `draft_generate` の request timeout は token budget が大きいケースで `netlify_free_30s` でも最大 `6500ms` まで動的に伸ばし、`maxTokens=1536` の 3 日旅で本線 request 自体が先に切れにくいよう調整。④ `draft-generate` テストは `streamText` transport ベースに更新し、focused TypeScript/Vitest を通過。
- `local` fix(plan-generation,incomplete-json): `draft_generate` の incomplete JSON 失敗を canonical pipeline のまま根本側から改善。① `structured-json-recovery` に `parseTextJsonObjectDetailed()` を追加し、`extractFirstJsonObject()` が失敗した場合は deterministic な `salvageIncompleteJson()` を先に適用、その結果 `salvageApplied` / `extractedJson` を保持したまま caller が partial salvage と terminal failure を分岐できるようにした。② `draft_generate` は salvage で day 数が不足しても即 `failed_terminal` にせず、salvaged JSON と raw output を recovery 用コンテキストとして保存して `planner_recovery` へ pause するよう変更。③ planner token budget は固定 `1024` をやめ、`durationDays` と `pace` から算出して `netlify_free_30s` では最大 `1536` まで動的に引き上げるよう変更。④ `netlify_free_30s` の substage timeout は planner request `6000ms -> 5500ms`、planner recovery `2500ms -> 3000ms` に再配分。⑤ `draft_plan` の compact recovery prompt は full planner prompt の再掲をやめ、schema hint + enum constraints + `sourceText(4000 chars cap)` だけの最小修復 prompt に圧縮。⑥ `structured-json-recovery` / `draft-generate` のテストを拡充し、partial salvage・dynamic token budget・compact recovery prompt の回帰を追加。focused TypeScript/Vitest を通過。

### 2026-03-29
- `local` refactor(plan-generation,resumable-run): canonical planner の timeout root cause を resumable execution へ切り替えて修正。① `draft_generate` は monolithic な `generate + parse + compact recovery` をやめ、`planner_request` / `planner_parse` / `planner_recovery` の substage を持つ resumable pass に変更。初回 request では planner raw text を保存して parse まで進め、JSON 崩れ時は `runs.pipeline_context` に `resumePassId`, `resumeSubstage`, `pauseReason`, `plannerRawText` を保存して `partial` を返す。② `/api/agent/runs/:runId/stream` は `partial` や low-budget を `run.failed` ではなく `run.paused` として扱い、`nextPassId` / `nextSubstage` / `pauseReason` を SSE と checkpoint log に出して stream を安全に閉じるよう変更。③ `usePlanGeneration()` は `run.paused` を受けたら `last-event-id` 付きで stream を自動再接続し、progress を維持したまま同じ run を継続するよう更新。④ `structured-json-recovery` は text generation / parse / compact recovery を別関数へ分割し、raw output を使った recovery を別 request で実行できるよう整理。⑤ `draft_generate`, executor, `usePlanGeneration` の回帰テストを追加し、TypeScript / planner 関連 Vitest / lint を通過。
- `local` fix(plan-generation,run-creation): `/api/agent/runs` の quota/billing backend timeout を create flow の blocker にしないよう修正。① run route は auth resolve / usage consume / user settings / memory load に短い timeout を設定し、usage backend の timeout・RPCエラー・接続エラーでは `usageStatus=degraded` / `usageSource` 付きで fail-open するよう変更。② `checkAndRecordUsage()` / `checkAndConsumeQuota()` は resolved user を受け取れるようにして auth 二重解決を避け、匿名 usage RPC (`get_ip_hash`, `check_and_record_usage`) にも短 timeout を追加。③ `run_created` checkpoint と `pipelineContext` に usage 状態を残し、usage backend 劣化時でも canonical run が即開始できるようにした。④ `POST /api/agent/runs` の fail-open / explicit 429 を検証する route test を追加し、匿名 run では `getUserSettings()` / memory load を呼ばないことも固定。
- `local` refactor(plan-generation,semantic-draft-v3): canonical planner を元プラン思想どおりさらに軽量化。① `draft_generate` の planner contract を `semantic_draft_v3` に更新し、AI は `days[].{day, mainArea, overnightLocation, stops[]}` と stop の最小 fields (`name`, `searchQuery`, `role`, `timeSlotHint`, `areaHint`) だけを返すよう縮小。② `draft_format` を `draft_format_v2` へ更新し、plan-level `description` / `tripIntentSummary`、day `title` / `summary`、stop metadata を deterministic に補完する責務を明確化。③ `draft_generate` の transport は text-first のまま、prompt をさらに圧縮し、`netlify_free_30s` では `maxTokens=1024` / `plannerContractVersion=semantic_draft_v3` で動作するよう変更。④ compact JSON recovery prompt も新しい最小 planner contract に合わせて更新。⑤ `draft-generate` / `draft-format` / state machine の tests、architecture/performance/setup docs を新 contract に追従させた。
- `local` refactor(plan-generation,planner-draft): 元プラン思想どおりに Planner と Formatter の責務を明確化。① `draft_generate` は single canonical planner call のまま、AI が返す成果物を軽量 `PlannerDraft` のみに縮小し、`semantic_draft_v2` 契約へ更新。② 新規 pass `draft_format` と formatter `formatPlannerDraft()` を追加し、`PlannerDraft -> DraftPlan` の deterministic 展開を正規機能として切り出し、`destination/themes/orderingPreferences` と stop 内部メタデータをここで補完する構成へ変更。③ session state machine を `draft_generated -> draft_formatted -> draft_scored` に更新し、`runs` には `planner_draft` を保存する migration `20260329153000_plan_generation_draft_format.sql` を追加。④ `draft_generate` の transport は `generateObject()` 依存をやめ、`generateText()` + JSON extraction + schema parse を正系にし、同一 planner contract 内の compact text recovery だけを許可。⑤ stream は `plan.draft.created` を `draft_format` 完了後に emit するよう変更し、フロントの進捗 mapping も `draft_formatted` / `draft_format` を認識するよう更新。⑥ `draft_generate` / `draft_format` / pass registry / rule score などのテスト、architecture/performance/setup docs を新しい canonical planner+formatter 契約に追従させた。
- `local` refactor(plan-generation,canonical-planner): `draft_generate` を元プラン思想どおりの single canonical planner call へ純化。① live create flow から `staged_compact` / `compact_single_pass` / `draftGeneratePassLegacyUnused` を撤去し、off-plan な AI fallback strategy を削除。② `src/lib/services/plan-generation/schemas/draft-plan-schema.ts` に planner 専用の軽量 schema を追加し、AI が返す stop fields を `name/searchQuery/role/timeSlotHint/areaHint` に限定。③ `draft_generate` は 1 回の lightweight semantic draft call だけを行い、`destination/themes/orderingPreferences` や stop の内部メタデータは deterministic enrichment で補完するよう再構成。④ checkpoint / metadata も `plannerContractVersion`, `selectedTimeoutMs`, `promptChars`, `maxTokens`, `usedTextRecovery` ベースに整理し、`strategyAttempt` / `fallbackFromStrategy` を live path から除去。⑤ `draft-generate` の focused tests、architecture/performance docs、typecheck/lint を canonical planner-only 契約へ更新。
- `local` fix(plan-generation,draft-downgrade): `draft_generate` の seed が 4.2 秒 timeout した時点で毎回 terminal fail していた問題を修正。① `draft_generate` を single strategy 実行から AI-only の downgrade 実行へ変更し、`staged_full -> staged_compact -> compact_single_pass` の順に試すよう再構成。② `staged_compact` の compact seed/day は `maxTokens=2048` に圧縮し、compact prompt では must-visit / ranked requests / directives の注入量も削減。③ checkpoint / metadata に `strategyAttempt` と `fallbackFromStrategy` を追加し、どの downgrade 経路を通ったかをサーバーログだけで判定できるよう改善。④ `draft-generate` テストを timeout downgrade 前提へ更新し、`staged_full -> staged_compact` 成功と `compact_single_pass` への最終降格の回帰を追加。⑤ typecheck と focused `draft-generate` Vitest を通過。
- `local` fix(plan-generation,structured-output): `draft_generate` の seed/day が軽量 seed schema と動的 timeout になった後も、`semanticPlan` 用の重い system prompt + 素の `generateObject()` を使っていたため seed が 4.2 秒でも timeout していた問題を修正。① `draft_generate` 専用の軽量 system prompt を導入し、citation rule / golden plans / narrative 向け指示を seed/day/compact all-days から除去。② `src/lib/services/ai/structured-json-recovery.ts` を追加し、structured output の JSON 崩れ時に compact text recovery できる transport helper を実装。③ `draft_generate` の seed/day/compact はこの helper を使うよう変更し、`maxTokens` を seed=3072, day=3072, compact=4096 に固定。④ checkpoint log と pass metadata に `maxTokens`, `recoveryMode`, `usedTextRecovery` を追加し、seed transport の失敗要因をログだけで切り分けられるよう改善。⑤ focused `draft-generate` テストに malformed JSON recovery 回帰を追加し、typecheck を通過。
- `local` fix(plan-generation,draft-seed-timeout): `draft_generate` の seed が `netlify_free_30s` で常に 2500ms 付近で timeout し、3日旅でも `staged_full` が seed 完了前に落ちていた問題を修正。① `staged_full` / `staged_compact` の seed timeout を固定値ではなく draft budget 連動の動的配分へ変更し、`staged_full` では 3.5s〜4.5s、`staged_compact` では 2.2s〜3.2s の範囲で seed に十分な時間を割り当てるよう改善。② staged 経路は seed 実行前に `dayMinBudget * dayCount` を差し引いて自滅しないよう変更し、day budget は seed 完了後の残時間から動的配分する形へ整理。③ seed LLM schema から `destination` / `themes` / `orderingPreferences` を外して day skeleton + `description` / `tripIntentSummary` に軽量化し、対応する prompt も上位制約だけへ圧縮。④ `destination` / `themes` / `orderingPreferences` は normalized input から組み立てるようにして downstream の `DraftPlan` 契約は維持。⑤ executor の checkpoint log に `strategy` と `selectedSeedTimeoutMs` を含め、seed timeout の実測をログだけで追跡できるようにした。⑥ typecheck と focused `draft-generate` Vitest を通過。
- `local` fix(plan-generation,draft-budget): `draft_generate` が 2 日旅でも `seedBudget + dayMinBudget * dayCount` の hard gate で seed 実行前に即死し、`draft_generation_timeout(rootCause=insufficient_runtime_budget)` を返していた問題を修正。① `draft_generate` に `staged_full` / `staged_compact` / `compact_single_pass` の 3 戦略を追加し、残予算に応じて AI-only の compact path へ自動切替するよう変更。② `staged_compact` では seed/day の最小 budget と stops 数を圧縮し、`compact_single_pass` では全日程を 1 回の compact AI call で `DraftPlan` に変換。③ 低予算でも compact AI path が成立する限り即失敗せず、compact path すら不可能なときだけ `insufficient_runtime_budget` へ落とすようにした。④ `draft_generate` の checkpoint / metadata に `strategy` を追加し、サーバーログだけで full/compact/single-pass のどれが選ばれたか判定可能にした。⑤ `draft-generate` の新規回帰テストを追加し、typecheck と focused Vitest を通過。
- `local` fix(plan-generation,supabase-latency): Supabase/Cloudflare 側の遅延で `normalize` 後に `runtime_budget_exhausted` していた正系 run を安定化。① `/api/agent/runs/:runId/stream` の SSE は `run_events` 保存を待たず即時 enqueue する方式へ変更し、`run_events` は explicit `seq` を使った short-timeout best-effort persistence に変更。replay も timeout 時は fail-open で継続し、遅延は `run_event_persist_degraded` checkpoint として JSONL に残す。② executor は `transitionRunState + updateRun + loadRun` の多重往復をやめ、1 pass ごとに `persistRunSession()` で state/data/warnings を一括更新するよう再構成。retry不要 pass では `countRunPasses()` も省略。③ `netlify_free_30s` の stream 実行予算を 18 秒へ調整。④ `/api/itinerary/plan/preflight` は read-only usage check に変更し、開発環境では usage check timeout 時に degraded success を返す fail-open に変更。実際の quota consume は `/api/agent/runs` で authoritative に実施し、idempotency hit では再消費しない順序へ修正。⑤ run/preflight checkpoint ログを拡張し、`kind:"preflight_checkpoint"` と `run_event_persist_*` で遅延箇所をサーバーログだけから切り分け可能にした。⑥ 追加テストを含む targeted Vitest 132 件、`pnpm exec tsc --noEmit`、`pnpm lint` を通過。
- `local` fix(plan-generation,streaming): 正系パイプラインの `draft_generate` timeout と loading progress 停滞を修正。① `draft_generate` は one-shot full draft をやめ、外部 pass 契約は維持したまま seed → per-day stops の 2-stage AI へ変更し、day ごとの substage budget と checkpoint log を導入。② `netlify_free_30s` の stream 実行予算を 22s、`draft_generate` cap を 12s に調整し、seed/day 用の最小 budget を追加。③ stream route は `run.progress` に `phase=pass_started` を追加し、フロントが pass 開始時点で進捗表示を更新できるようにした。④ `usePlanGeneration()` は stale state に依存する step 同期をやめ、純粋関数 + ref ベースで overlay と React state を同じ step 配列から更新するよう修正。⑤ `draft_generate` staged 実装・progress helper・executor を対象に typecheck / generation-related Vitest 133 件 / changed-file ESLint を通過。
- `local` feat(plan-generation,observability): 開発環境でサーバーログだけから正系 run を判定できる compact JSONL checkpoint logging を追加。① `src/lib/agent/run-checkpoint-log.ts` を新設し、`kind: "run_checkpoint"` の 1 行 JSON で `run_created`, `stream_started`, `pass_started`, `pass_completed`, `pass_failed`, `narrative_stream_started`, `trip_persist_started`, `trip_persist_completed`, `eval_completed`, `run_finished`, `run_failed` を統一出力。② `POST /api/agent/runs` は idempotency hit を含む `run_created` を記録。③ executor は各 pass の開始/完了/失敗 checkpoint を `remainingMs`, `warningCodes`, `errorCode`, `rootCause` 付きで記録し、`selective_verify` には summary を付与。④ finalize と eval 完了時に `tripVersion`, `completionLevel`, `metricCount` を含む checkpoint を追加し、成功 run の保存完了をログだけで追跡可能にした。⑤ architecture / setup docs にログ確認手順を追記し、focused typecheck / Vitest / ESLint を通過。
- `local` refactor(plan-generation,archive): 生成基盤を新パイプラインへ完全 cutover。① `runs` / `run_pass_runs` / `run_checkpoints` を正系ストアとして追加し、legacy `generation_sessions` 系から backfill する migration `20260329140000_runs_cutover_phase3.sql` を導入。② v4 の live path から `session-store`, `draft-to-v3`, `session-to-itinerary`, `itinerary/adapter`, `pipeline-orchestrator`, shared deterministic narrative renderer 依存を外し、`run-store`, `transform/draft-to-timeline`, `transform/timeline-to-itinerary`, `narrative-renderer-v4` を新設。③ planner UI は `usePlanGeneration` のみを正系にし、`TravelPlannerLegacy` / `useComposeGeneration` / compose feature flag を廃止。④ `/api/agent/runs`, `/api/agent/runs/:runId/stream`, `/api/trips/:tripId`, patch/replan/memory/eval API を唯一の public interface に確定。⑤ `/api/itinerary/compose`, `/api/itinerary/plan/*`, `/api/plan-generation/session/*` は deprecated stub 化し、本体実装は `archive/unused` へ物理移動。⑥ v4 では deterministic fallback を禁止し、AI-only recovery と explicit `run.failed` error code に統一。⑦ focused lint / targeted Vitest を更新し、旧 pipeline import が live `src/` から消えた状態を前提に整備。
- `local` fix(plan-generation,runtime-budget): v4 run stream を 30 秒制約向けに success-first 化。① `netlify_free_30s` runtime profile では stream の内部実行予算を 18 秒へ引き下げ、`draft_generate` の LLM timeout は 10 秒 cap + finalize reserve を差し引いた安全値に制限。② `draft_generate` は timeout / provider error / 予算不足時に deterministic semantic seed/candidate を再利用した fallback draft を返し、same-request retry を廃止。③ `narrative_polish` も低予算時や streaming timeout 時に deterministic fallback summary を返して `trip_version` 保存まで完走できるよう変更。④ stream の残り予算が 4 秒未満になっても、`draftPlan` が存在すれば scoring / verify を打ち切って `timeline_construct` を即実行し、fallback summary へ流す emergency finalize 経路を追加。⑤ `/api/agent/runs/:runId/stream` は raw `runtime_budget_exhausted` を表に出さず `generation_timed_out` + rootCause を保存し、`run.progress` に runtime budget を含める。⑥ planner フロントは内部エラーコードを generic i18n エラーへマップし、focused lint + plan-generation Vitest 152 件を通過。
- `local` feat(planner-ui,trip-editor): planner フロントエンドを新しい run/trip API に接続。① `usePlanGeneration()` は旧 `session -> run -> stream -> finalize` 直列呼び出しをやめ、`POST /api/agent/runs` + `GET /api/agent/runs/:runId/stream` + `GET /api/trips/:tripId` の flow へ移行。② saved plan の再生成は `tripId/version` がある場合に `POST /api/trips/:tripId/replan` を優先し、古い/ローカル plan のみ既存 server action へフォールバック。③ `/plan/id/[id]` の手編集と recovery apply は `POST /api/trips/:tripId/patch` を通して新 `trip_version` を発行しつつ、`plans` のスナップショットも同期。④ `updatePlanItinerary()` は legacy plan 更新時でも `trip_version` を自動同期するよう変更し、既存保存済みプランの gradual migration を可能にした。⑤ unowned trip は匿名ユーザーでも `GET /api/trips/:tripId` で読み出せるようにし、未ログイン生成でも新 run フローの完走を維持。関連 targeted lint と Vitest を通過。
- `local` feat(agent-runtime,trips,memory,evals): itinerary-centric 基盤を Phase 2 まで拡張。① `run_events`, `user_preferences`, `eval_results`, `tool_audit_logs` テーブルと RLS を追加。② `/api/agent/runs` と `/api/agent/runs/:runId/stream` を新設し、既存 `generation_sessions` を physical run store としながら fixed SSE event 名の logical run façade を導入。③ 既存 v4 `session` / `run` / `stream` / `finalize` も `run_events` にイベントを append するよう更新。④ `POST /api/trips/:tripId/patch` を追加し、block-centric patch 適用後に `activities` / `timelineItems` を再同期して新 `trip_version` を発行。⑤ `POST /api/trips/:tripId/replan` を追加し、`block` / `day` / `style` / `weather_fallback` scope の itinerary 再計画を実装。⑥ `GET/POST /api/users/me/memory` を追加し、default off・schema version 付き memory envelope を専用テーブルへ保存。⑦ `POST /api/evals/runs/:runId` と rule-based evaluator を追加し、finalize / patch / replan 後に評価メトリクスを保存。⑧ `finalizeSessionToTrip`, trip patch/replan helpers, eval helpers のテストを拡充し、関連 targeted Vitest 46 件を通過。
- `local` feat(trips,plan-generation): itinerary-centric persistence Phase 1 を着手。① `trips` / `trip_versions` テーブルと RLS を追加し、旅程 JSON の append-only 履歴保存基盤を導入。② `Itinerary` 型に `tripId`, `version`, `completionLevel`, `generationStatus`, `memoryApplied`, `generatedConstraints`, `verificationSummary` と activity 単位の `verificationStatus` / `needsConfirmation` / `sourceOfTruth` などの運用メタデータを後方互換で追加。③ `composedToItinerary()` と `sessionToItinerary()` で Phase 1 メタデータを自動付与。④ v4 `finalize` で `trip_version` をサーバー保存してから itinerary を返すよう変更し、クライアント保存成否に依存しない履歴発行を開始。⑤ `savePlanOnServer()` は既存 `plans` 保存と共存しつつ、未保存 itinerary には trip version を発行し、既存 trip には所有権を引き継ぐよう更新。⑥ 新規 API `GET /api/trips/:tripId` を追加。⑦ metadata helper / adapter / bridge / save path のテストを追加・更新。
- `local` refactor(plan-mutation,replan): プラン生成系の責務境界を整理。① `src/types/plan-mutation.ts` と `src/lib/services/plan-mutation/*` を追加し、新規生成・チャット再生成・旅行中リプランで共通の success/error/meta 契約を導入。② `regeneratePlan()` の本体ロジックを `regenerate-itinerary.ts` へ移し、user constraints 注入・no-op 判定・retry・Unsplash hero image 更新・PerformanceTimer 計測を service 層へ集約。③ `/api/replan` は `replan-plan.ts` 経由で共通 mutation 契約を返すよう変更し、`ReplanEngine` に step 計測を追加。④ `applyRecoveryOption()` を service 化し、`useReplan` は API state 管理に集中。⑤ `usePlanRegeneration()` を追加して `PlanIdClient` / `PlanLocalClient` / `PlanCodeClient` の再生成状態管理と chat history / resolved summary / overlay 遷移を共通化。⑥ 生成系回帰テストを追加し、関連 Vitest 26 件を通過。

### 2026-03-28
- `local` fix(places,plan-ui): Google Places API の日次 quota 枯渇時の劣化挙動を改善。① `OVER_QUERY_LIMIT` を再試行対象から外し、単一スポット内の多段フォールバック検索と複数候補の一括照合を quota 到達時点で即打ち切るよう変更して無駄な API 呼び出しを削減。② selective verify は quota 枯渇時に全体失敗させず `unverifiable` へ安全に劣化しつつ、planner 生成画面に「一部スポット確認をスキップした」警告を表示。③ SpotCard の lazy details 取得でも quota 枯渇を構造化レスポンスで受け取り、英日 i18n 対応の警告文を表示して「スポット未発見」と区別するよう改善。④ Places / selective-verify の回帰テストを追加。
- `local` fix(chat-ui): プラン再生成成功後もチャット欄に再生成ボタンが残る問題を修正。再生成成功時はチャットを成功後状態へ切り替え、反映済みサマリーを表示しつつ直前の会話を折りたたむよう改善。次の通常チャット送信で新しい会話として再開される。
- `local` fix(plan-ui): トップページ直下とプラン作成モーダルの両方で、`プランを生成する` 押下直後から全画面の生成オーバーレイを表示するよう統一。生成完了後は成功表示から更新中表示へ遷移し、詳細ページへのルート遷移が実際に反映されるまでオーバーレイを維持するよう改善。あわせて、ルート変更時にプラン作成モーダルが残留しないよう自動クローズを追加。
- `local` fix(plan-ui): 初日の往路フライトが旅程UIの末尾に落ちる問題を修正。`buildTimeline()` のソート規則を調整し、時刻未設定でも Day 1 の注入フライトは先頭、最終日の復路フライトは末尾に維持されるよう改善。回帰テストを追加。
- `local` fix(booking-links): 海外航空券検索で出発地が都市名のまま使われる問題を修正。京都・大阪・東京などの主要都市から海外へ検索する際は、関西国際空港や羽田空港など対応する主要国際空港へ補正して検索し、UI上でも「どの空港経由として案内しているか」を表示するよう改善。
- `local` fix(plan-generation): Phase 7 — UX パリティ修正 (7 件)。① heroImage 取得 — finalize ルートで Unsplash ヒーロー画像を取得しプランページに表示 (3s タイムアウト、失敗時はスキップ)。② isRetry パススルー — preflight に `options.isRetry` を送信し、リトライ時のクォータ誤消費を防止。③ homeBaseCity 解決 — セッション作成時にユーザー設定から homeBaseCity を解決し、normalize パス→AdapterContext→フライト注入まで伝播。④ SSE ハートビート — stream ルートに 4s 間隔のハートビートコメントを追加し、プロキシ/CDN によるタイムアウトを防止。⑤ ローカライズエラーメッセージ — v3 と同じ i18n キー (`errors.stepFailed.*`) を使用してステップ別のエラーメッセージを表示。⑥ 警告フィルタ — narrative_polish と timeline_construct のみのユーザー向け警告に絞り、中間パスのノイズを除去。⑦ ステップマッピング修正 — `created` 状態を `normalize` にマッピングし、usage_check→normalize の UI スキップを解消。テスト 148 件全パス。
- `local` feat(plan-generation): Phase 6 実装 — 品質仕上げ。① 408 resume ハンドリング — usePlanGeneration フックが run ルートから 408 (PassBudgetExceededError) を受けた際に `/resume` を呼び出してセッションを最後の成功状態に復元し、自動でパスループを再開。② Auth ガード — 全 v4 API ルートに `assertSessionAccess()` によるセッション所有権チェックを追加 (匿名セッションはガードなし、認証セッションは userId 一致を検証、403 返却)。セッション作成ルートを `getUser()` からの実 userId 取得に変更。③ 未使用 import 削除 — rule-score.ts の QualityThresholdError import を削除。④ テスト拡充 — passes/index レジストリ (8 件)、normalize パス (3 件)、rule-score パス (5 件: qualityThresholdBreached 分岐含む) を追加。テスト 148 件全パス (既存 132 + 新規 16)。
- `local` feat(plan-generation): Phase 5 実装 — 運用強化。① セッションクリーンアップ — `cleanupExpiredSessions()` で TTL (デフォルト 7 日) 超過の completed/failed/cancelled セッションと関連 pass_runs/checkpoints を一括削除。`POST /api/plan-generation/cleanup` (CRON_SECRET 認証) で cron 呼び出し可能。② チェックポイント再開 — `POST /api/plan-generation/session/[id]/resume` で failed セッションを最後の成功状態に復元。`determineResumeState()` がセッション蓄積データから再開地点を自動判定。VALID_TRANSITIONS に `failed` → 中間状態の遷移を追加。③ エラー型活用 — executor で予算超過時に `PassBudgetExceededError` を throw (run ルートで 408 返却)、rule-score パスで error レベル違反+低スコア時に `qualityThresholdBreached` メタデータを付与。テスト 132 件全パス (既存 119 + 新規 13)。
- `local` feat(plan-generation): Phase 4 実装 — 本番ハードニング。① PerformanceTimer 統合 — v4 パス別目標時間 (Flash/Pro) を `performance-timer.ts` に追加し、executor の各パス実行を `timer.measure()` で計測・ログ出力 (CLAUDE.md 必須要件)。② EventLogger 統合 — finalize ルートで `generation_logs` テーブルに v4 メタデータ (pipeline='v4', sessionId, passCount, repairIterations) を記録し v3 パリティを実現。③ PlanGenerationLogger 拡張 — `logRunSummary()` / `logCompletedSession()` で実行全体のサマリを EventLogger 経由で書き込み。④ stream ルートにも PerformanceTimer を追加し、narrative_polish の実行時間を計測。テスト 119 件全パス (既存 114 + 新規 5)。

### 2026-03-27
- `local` feat(plan-generation): Phase 3 実装 — v4 パイプラインを本番投入可能に。① RAG 統合 — narrative-polish パスに PineconeRetriever を統合し、目的地・テーマに基づく記事検索結果をナラティブ生成のコンテキストとして注入 (2000ms タイムアウト、失敗時は空配列フォールバック)。② ストリーミング対応 — `narrativePolishPassStreaming()` を追加し、日ごとの SSE ストリーミング (`day_complete` イベント) でプログレッシブ UI 更新を実現。③ SSE ストリームルート — `POST /api/plan-generation/session/[id]/stream` で narrative-polish の SSE 配信。④ Finalize ルート — `POST /api/plan-generation/session/[id]/finalize` で完了セッションから Itinerary を生成。⑤ フィーチャーフラグ — `NEXT_PUBLIC_ENABLE_V4_PIPELINE` で v3/v4 切替 (デフォルト v3)。⑥ クライアントフック — `usePlanGeneration` が `UseComposeGenerationReturn` 互換インターフェースを返し、既存 UI コンポーネント (ComposeLoadingAnimation, StreamingResultView) をそのまま利用。⑦ UI 統合 — PlanClient.tsx でフィーチャーフラグに基づき v3/v4 フックを切替。テスト 114 件全パス (既存 109 + 新規 5)。
- `local` feat(plan-generation): Phase 2 実装 — パイプラインをエンドツーエンドで動作可能に。① Pass D: Local Repair — 評価で検出された違反を AI で部分修復 (repair loop: score→repair→re-score, 最大3回)。② Pass E: Selective Verify — Google Places API で全ストップを検証し VerifiedEntity[] を生成 (budget-aware、must_visit 優先)。③ Pass F: Timeline Construct — v3 の optimizeRoutes() + buildTimeline() を直接呼び出してタイムスロット配置。④ Pass G: Narrative Polish — v3 の runNarrativeRenderer() で AI 説明文を一括生成。⑤ Bridge Layer — DraftStop ↔ v3 型 (SemanticCandidate, SelectedStop, DayStructure) の変換アダプター。⑥ Final Adapter — Session → Itinerary 変換 (v3 の composedToItinerary() を再利用)。⑦ Executor 拡張 — session-aware な repair-or-advance 判定 (passGrade + repairHistory で分岐)。⑧ 型進化 — TimelineState, NarrativeState を stub から正式型に。テスト 95 件全パス (Phase 1 の 78 + 新規 17)。

### 2026-03-26
- `local` feat(plan-generation): LM-First / Harness-Controlled 旅程生成パイプライン Phase 1 を新規実装。現行 compose pipeline (v3) と並行稼働する新パイプライン基盤。① `PlanGenerationSession` 状態マシン (11 states, pass contract) + 型定義 (`src/types/plan-generation.ts`)。② Pass Executor — executor-agnostic なパス実行フレームワーク (checkpoint/retry/budget 対応)。③ Pass A: Normalize — 既存 `normalizeRequest()` の薄いラッパー。④ Pass B: Full Draft Generation — AI に旅程ドラフト全体を一括生成させる新パス (Zod schema + `generateObject`)。⑤ Pass C: Rule-Based Scoring — 9 カテゴリ (constraint_fit, preference_fit, destination_authenticity, day_flow_quality, temporal_realism, spatial_coherence, variety, editability, verification_risk) の純粋 TS ルブリック採点。⑥ Session 永続化 (Supabase: `generation_sessions`, `generation_pass_runs`, `generation_checkpoints`)。⑦ API: `POST /api/plan-generation/session`, `GET /api/plan-generation/session/:id`, `POST /api/plan-generation/session/:id/run`。⑧ テスト 57 件 (state machine 42, executor 7, rubric 8) 全パス。
- `local` docs(updates): ユーザー向け更新履歴ページに 2026-03-08 以降の主要変更を追加。entry101〜105（生成エンジン刷新・飛行機/宿泊/移動手段表示・旅のプロ知識反映・生成速度改善・AI安定性向上）を新規追加。entry051（旅行中のメモ機能）を実装済みに、entry053（ホテル/飛行機プラン提案）を実装済みに更新。ja/en 翻訳を追加。
- `local` fix(semantic-planner,recitation): Gemini の RECITATION（著作権フィルタ）で有名観光地のプラン生成が失敗する問題への多層対策。① RECITATION 専用検出関数 `isRecitationError()` を追加し、通常の JSON パースエラーと分離。② RECITATION 検出時に `gemini-2.5-flash` へモデルフォールバックする 2 段構えリトライを `generateStructuredJsonWithRecovery` に追加。③ seed / day / recovery プロンプトに著作権回避指示（オリジナル文章で書く・旅行ガイド常套句を避ける）を常設。④ outline temperature を 0.3→0.5 に引き上げ（Gemini 3 系は高 temperature 推奨、出力固定化→RECITATION を軽減）。⑤ テキストリカバリタイムアウトを seed 2.5s→5s / day 2s→4s / plan 4s→6s に延長。⑥ `regeneratePlan` の isTimeout 判定に日本語「タイムアウト」パターンを追加。⑦ seed タイムアウトキャップを 17s→19s に緩和。⑧ modify タイムアウトを 20s→25s に拡大。
- `local` fix(semantic-planner,gemini): semantic planner の `resolveLanguageModel()` が API キーなしで `google(modelName)` を呼んでいたため全プラン生成が deterministic fallback に落ちる問題を修正。`createGoogleGenerativeAI({ apiKey })` パターンに変更し、`model-provider.ts` と同じ方式で API キーを明示渡しに統一。併せて `modifyItinerary` のエラーハンドリングでタイムアウト情報が握りつぶされ `regeneratePlan` 側でタイムアウト判定できない問題を修正。元エラーメッセージを検査し、タイムアウト時は「タイムアウト」を含むメッセージで再 throw するよう変更。

### 2026-03-25
- `local` revert(semantic-planner): broad-area fallback（「パリ 朝の散策」等の汎用候補生成）を撤回。AI が失敗した場合は汎用コンテンツでごまかさずパイプラインを失敗させる方針に変更。「AI 生成品質ルール」を CLAUDE.md・coding-rules.md・architecture.md に明文化。

### 2026-03-21
- `local` fix(semantic-planner,recovery): semantic seed/day planner が Gemini structured output の途中切断で `Unterminated string in JSON` を返したあとも、同じ大きさの JSON を再要求して再度壊れる設計を見直した。① `generateStructuredJsonWithRecovery()` に phase-aware な 2 段階 text repair（compact → minimal）を追加し、1 回目の repair が再び途中切れでも 2 回目は optional fields を極力省いた最小 JSON を再送させて seed/day/plan を救済するよう変更。② repair 専用 maxTokens を phase ごとに縮小し、`orderingPreferences` / `fallbackHints` / `destinationHighlights` / `anchorMoments` / `tags` の件数上限を prompt + sanitize の両方で強制して、巨大 payload 自体を出しにくい設計へ変更。③ LLM 向け文字列上限も 800→500 に縮小して JSON 切断と semantic timeout を起こしにくくした。④ 「1 回目の repair が途中切れでも 2 回目の compact retry で回復する」回帰テストを追加し、設計意図を architecture docs に追記。
- `claude/fix-ai-response-parsing-vY2pE` fix(semantic-planner,json-recovery): Gemini構造化出力の3種のパース失敗を根本修正。① トークン枯渇によるJSON切断（`Unterminated string in JSON`）対策として、LLMスキーマの文字列上限を2000→800に縮小し、maxTokensを8192→12288に拡大。プロンプトにフィールド簡潔化の指示を強化。② テキストリカバリ時のenum違反（`timeSlotHint`に時刻範囲、`role`に`regular`等）対策として、Zod検証前にenum値を自動補正する`coerceRecoveredJson()`を追加。リカバリプロンプトにもenum制約を明示。③ Geminiの`RECITATION`空レスポンス対策として、`isMalformedStructuredOutputError()`のパターンに`recitation`/空content検出を追加し、テキストリカバリへフォールバック。
- `local` fix(feasibility-scorer,assemble): Places 照合に成功しているのに assemble フェーズで `No viable spots found after filtering` になって全落ちする根本原因を修正。① feasibility scorer が Places Resolver の `matchScore` を捨てて独自の文字列比較だけで `nameMatch` を再計算していたため、日本語候補名 ↔ 英語/ローマ字 place 名や `searchQuery + destination` 形式で誤って低得点化し、全候補が threshold 未満へ落ちていた設計不整合を解消。② `nameMatch` は resolver の `matchScore` を下限として採用し、`searchQuery` の分割トークンも比較対象に含めるよう再設計。③ Google Places の営業時間 `0900` 形式も正しく解釈するよう修正。④ それでも全件が threshold 未満になった場合は「全落ちで 500」にせず、最上位候補群を warning 付きで救済採用する緩和フォールバックを追加。⑤ cross-locale 名称照合と全件フィルタ時の救済に対する回帰テストを追加。
- `local` fix(semantic-planner,json-recovery): semantic seed/day planner が Gemini の structured output で巨大 JSON を途中切断されると `SyntaxError: Unterminated string in JSON ...` がそのまま失敗要因になっていた問題を再設計で修正。① semantic planner 共通の `generateStructuredJsonWithRecovery()` を追加し、まず `generateObject()` を使い、JSON parse 系エラー時だけ `generateText()` へ自動フォールバックして「JSONのみ再送」を要求する2段構えに変更。② text fallback では code fence / 前置き文付きでも最初の完全な JSON object を抽出し、LLM 向け relaxed schema で再検証するため、structured output transport の乱れを planner ロジックから切り離した。③ sanitize 後に strict schema (`semanticPlanSchema` / `semanticSeedSchema`) で再検証し、「緩い受信 → 正規化 → 厳格採用」の境界を明確化。④ seed pipeline で unrecoverable な JSON parse error が来ても deterministic seed fallback に落ちる回帰テスト、recovery 成功/失敗テストを追加。
- `claude/fix-summary-length-validation-FK2Hx` fix(semantic-planner,validation): `tripIntentSummary` が Zod `.max(300)` を超えて `generateObject()` 内部でバリデーション失敗 → semantic plan 全体が deterministic fallback に落ちる問題を3層防御で根本修正。① LLM 向け relaxed スキーマ（`semanticPlanLlmSchema` / `semanticSeedLlmSchema`）を新設し、`generateObject()` に渡すスキーマの `.max()` を 2000 に緩和。`.describe()` に文字数制限を明記して LLM に目標長を伝達。② `sanitizeSemanticPlanFields()` を追加し、`tripIntentSummary`（300字）・`description`（500字）・`orderingPreferences`（200字）・`fallbackHints`（200字）・`candidates[].rationale`（300字）・`destinationHighlights[].rationale`（300字）を `truncateRepetitive()` で事後サニタイズ。③ seed/full semantic planner の両プロンプトに `tripIntentSummary は300文字以内の1文`・`description は500文字以内` 等の明示的な文字数制限を追加。④ 回帰テスト7件を追加（全パス）。

### 2026-03-20
- `claude/fix-itinerary-generation-loop-yn986` fix(semantic-planner,ai-safety): Gemini AIモデルが旅程生成時に同一フレーズを無限繰り返しするループ（`dayStructure[].startArea` に73,000文字超の反復テキスト）で `AI_JSONParseError` → パイプライン全体がタイムアウトする問題を4層防御で根本修正。① Zodスキーマの全string型フィールドに `.max()` 制約を追加し、LLMへの出力長シグナルを明示。② semantic planner の全4箇所の `generateObject()` に `maxTokens`（4096〜8192）を追加（他の全AI呼び出しには既に設定済みだった）。③ プロンプトに `startArea`/`endArea` はエリア名のみ・同一フレーズ繰り返し禁止のルールを追加。④ 生成後サニタイゼーション（`truncateRepetitive` + `sanitizeDayStructureFields`）で反復テキストを検出・切り詰め、Zod検証前にデータを正規化。⑤ `truncateRepetitive` の回帰テスト6件を追加。
- `claude/add-flights-hotels-plan-pxkiH` feat(itinerary,transit): プラン生成に飛行機・宿泊・移動手段カードを追加。① `homeBaseCity`（ユーザー出発都市）をパイプラインに伝搬し、Day 1に往路フライト、最終日に復路フライトを`TimelineItem`として自動注入（`inject-flights.ts`）。将来のopen-jaw（出発・帰着都市が異なる）にも対応可能な設計。② 各日の末尾（最終日除く）に宿泊カードを自動注入（`inject-accommodations.ts`）、`overnightLocation`を使用。③ アクティビティ間の移動手段を距離ベースで徒歩/バス/電車/新幹線に分類する`inferTransitType`を追加（`distance-estimator.ts`）。④ `TransitType`に`bullet_train`/`taxi`/`walking`を追加し、`TransitCard`/`TransitListItem`に対応するアイコン・カラーテーマを設定。⑤ 4つのAPIルートで`homeBaseCity`をサーバーサイドで解決しパイプラインに渡す。⑥ ja/en i18n対応済み。⑦ 新規テスト52件（inject-flights 7件, inject-accommodations 8件, inferTransitType 11件 + 既存26件）全パス。
- `claude/fix-plan-generation-timeout-1vZpG` fix(compose-pipeline,timeout): プラン生成タイムアウトを設計レベルから修正。① スポット生成の並列化 — フロントエンドの逐次day-by-day fetch ループ（O(days)）を `mapWithConcurrency` による最大3並列実行（O(1)）に変更し、5日間の旅行で従来最大105秒→最大21秒に短縮。② Seed ルートの SSE ストリーミング化 — `/api/itinerary/plan/seed` を JSON POST から SSE に変換し、AI生成中の部分結果（normalizedRequest）を先行送信。プラットフォームkillでもクライアントが中間データを保持可能に。③ ナラティブ生成のチャンク分割 — 全日分を1回のAI呼び出しで処理していた `runNarratePipeline` を2日ずつのチャンクに分割。各チャンクが独自の時間予算（18秒）を持ち、Proモデルの長期旅行でも21秒制限内に収まるよう改善。④ 事後重複排除 — 並列スポット生成で発生しうる候補重複を `deduplicateCandidates` で排除。⑤ 新規ユーティリティ: `concurrency.ts`（並列実行）、`sse-reader.ts`（SSE読み取り共通化）、`dedup-candidates.ts`（候補重複排除）を追加。⑥ 関連テスト21件（全パス）とアーキテクチャ文書を更新。
- `local` fix(itinerary-planner,spot-selection): AIスポット抽出を「ユーザー希望を軸にしつつ、その地域らしさも自然に入る」設計へ改善。① seed/day の semantic planner プロンプトに、最適化優先順位を「絶対条件 → ユーザー希望の満足度最大化 → 地域らしさ → 移動負荷」に固定し、代表スポットと希望スポットを同時に満たすよう明示。② 有名観光地では定番名所の羅列に寄らず、無名寄りの地域では generic な候補名で誤魔化さず商店街・市場・展望台・資料館・温泉街などの具体固有名詞を優先するルールを追加。③ deterministic fallback でも must-visit / free text / ranked requests / day anchor から具体スポット名を抽出して使うようにし、タイムアウト時でも精度を落としにくくした。④ semantic planner の回帰テストと architecture docs を更新。
- `claude/enhance-travel-planning-uR2dJ` feat(ai-prompts,golden-plans): 旅行プラン生成の品質を「旅を分かっているAI」レベルへ引き上げ。① 旅のプロの暗黙知を体系化した Travel Expertise Layer（`travel-expertise.ts`）を新設し、時間帯の黄金ルール（寺社は朝イチ、美術館は午後イチ等）・1日のエネルギー設計・旅行日タイプ別パターン（到着日/フル観光日/出発日）・食事配置ルール・天候季節配慮をシステムプロンプトに注入。② Context Sandwich の Layer 1（`prompt-builder.ts`）に expertise rules を統合し、全生成タイプ（outline/dayDetails/semanticPlan/narrativeRender/modify）で旅行知識が有効に。③ Semantic Planner の seed/day プロンプトに「なぜこの時間にこの場所なのか」の理由付け、到着日/出発日の設計パターン、具体的な料理名・体験の要求を追加。④ Golden Plan を2例→6例に拡充（既存: 京都カップル・バンコクソロ / 新規: 東京家族到着日・沖縄カップルフル観光日・パリソロフル観光日・北海道グループ最終日）。各例の description を「なぜこの時間にここなのか」が伝わる記述に改善。⑤ Narrative Renderer に五感描写・スポット間のつなぎ・旅のストーリー描写のルールを追加。⑥ `system-prompts.ts` の QUALITY_STANDARDS に1日の設計品質基準を追加。

### 2026-03-19
- `local` fix(compose-pipeline,runtime-budget): split compose の seed / spots が 24 秒台まで AI 実行を引っ張り、Netlify 側のレスポンス flush 前に request kill → クライアントでは空レスポンス扱いとなって legacy compose fallback に落ち、さらに `semantic_plan timed out before platform deadline` で失敗しうる不具合を修正。① split pipeline の内部 deadline を route 上限 25 秒そのものではなく「platform headroom を 4 秒残したアプリ内 deadline」へ変更。② seed / spots の response reserve も拡張し、deterministic fallback を返し切る余白を確保。③ 長期旅行で day-by-day spots 生成が線形に遅くなる点について、将来的に multi-day batch / bounded concurrency へ移行する TODO コメントを orchestrator に追加。④ アーキテクチャ文書と回帰テストを更新。
- `local` fix(proxy,netlify): Netlify Edge Middleware が毎リクエストで Supabase `auth.getUser()` / `users` metadata 読み出しを待ってしまい、匿名アクセスでも platform timeout → `AbortError` でサイト全体が開けなくなる不具合を修正。① middleware では Supabase auth cookie が存在する場合だけ session refresh / i18n preference 読み出しを行うよう変更。② Edge 上の Supabase 呼び出しには 1.5 秒の fail-open deadline を追加し、遅延時は検出言語へ安全にフォールバック。③ proxy 全体も fail-open で `next-intl` のみ返す保護を追加し、Netlify 側 abort でサイト全体が落ちないよう改善。④ 回帰防止テストを追加。
- `local` fix(compose-pipeline,runtime-budget): timeout 設計を再整理。① 「8.5秒は短すぎないか？」という観点に対し、seed/spots のアプリ内 deadline を固定値ではなく 9 秒 route budget に連動する shared runtime budget へ変更。② 9秒自体は Netlify free plan の 10 秒制限を安全に踏まえるため維持しつつ、seed は `9_000ms - 200ms reserve`、spots は `9_000ms - 500ms reserve` まで使えるようにして、不要に早い打ち切りをなくした。③ Next.js の segment config 制約で route の `maxDuration` は literal のまま残し、共通化は orchestrator 側の budget 計算に限定した。④ あわせて `/api/itinerary/plan/assemble` の request body 型に `timeoutMitigationUsed` を反映し、Netlify build で落ちていた型不整合を修正。
- `local` fix(compose-pipeline,loading-ui): seed フェーズの根本障害とローディング表現を改善。① split compose の seed API は `semantic_plan` を単一 LLM 呼び出しに全面依存しており、`maxDuration=9` 環境で約 8.3 秒付近まで伸びると platform kill 前にアプリ側 deadline が先に発火し、その時点で全体が 500 失敗していた。② `runSeedPipeline()` に deterministic seed fallback を追加し、AI seed が timeout / provider error でも `buildDeterministicSemanticSeedPlan()` が dayStructure・ordering・must-visit highlights を TypeScript で再構成して day-by-day spots 生成を継続できるよう修正。③ seed metadata / warnings に timeout mitigation を残し、観測しやすくした。④ `ComposeLoadingAnimation` の空プレビューを、雲のレイヤー・光のにじみ・飛行機のコントレイルを持つ、よりリアルな空の演出へ更新。⑤ seed pipeline / loading UI 関連テストと architecture docs を更新。
- `local` fix(compose-pipeline,loading-ui): プラン生成が毎回タイムアウトする問題を根本修正し、ローディングアニメーションを刷新。① `checkAndRecordUsage` が `checkAndConsumeQuota` + `checkBillingAccess` で二重 Supabase 呼び出ししていたのを、`checkAndConsumeQuota` から `userType`/`userId` を直接返すよう修正し、usage_check を ~1s→~500ms に短縮。② 新しいプリフライトAPI（`/api/itinerary/plan/preflight`）を追加し、usage_check をシード生成前に分離。seed パイプラインは usage_check 済みの結果を受け取り、AI生成に ~8.3s（従来 ~6.5s）を確保。③ `SEED_DEADLINE_MS` を 8000→8500ms に、レスポンスリザーブを 500→200ms に緩和。④ レガシー compose の内部デッドラインを `maxDuration=9` に合わせて修正。⑤ ローディングアニメーションのプレースホルダーを空と飛行機のアニメーションに変更（雲が流れる空のグラデーション背景 + 飛行機が左から右に飛ぶモーション）。⑥ 関連テストを更新。
- `local` fix(compose-pipeline,loading-ui): パイプラインタイムアウトとローディングUIを改善。① compose route の無駄なインリクエストリトライを削除（プラットフォーム制限内でリトライが完了しない問題の根本修正）。② `SEMANTIC_STEP_RESERVE_MS` を 6s→3s に緩和し、`semantic_plan` の実行可能時間を ~18.5s→~21.5s に拡張（後続ステップは全て deterministic fallback あり）。③ seed/spots パイプラインに `Promise.race` によるデッドライン保護を追加し、プラットフォーム kill の代わりに graceful な `PipelineStepError` を返すよう改善。④ `useComposeGeneration` のレガシー compose フォールバックで、タイムアウトエラー時はフォールバックをスキップし即座にエラー表示するよう変更（二重タイムアウト待ちの解消）。⑤ `ComposeLoadingAnimation` を簡素化 — 2カラムの詳細ダッシュボードから、1カラムの「目的地プレビュー＋プログレスバー＋3ステージ横並びインジケーター＋現在ステップ名」に刷新。⑥ 不要な i18n キーを整理し、テストを更新。
- `local` fix(compose-pipeline,fallback): プラン生成が毎回失敗しうる回帰を修正。原因は、最新の split compose 経路（`seed → spots → assemble → narrate`）のどこかで空レスポンス・非JSON・途中失敗・SSE終端欠落が起きると、クライアントがその場で失敗確定してしまい、旧 compose SSE 経路へ戻れなかったこと。`useComposeGeneration` に legacy `/api/itinerary/compose` 自動フォールバックを復活させ、split route が壊れても生成を継続できるよう修正。保存処理は共通化し、legacy SSE の `day_complete` 分岐で `event.day` が `number | undefined` 扱いになって Netlify build が落ちる箇所も型安全に修正。split seed 欠落時・day route 失敗時の回帰テストとアーキテクチャ文書も更新。
- `local` fix(compose-pipeline,loading-ui): 分割プラン生成の障害切り分けとローディング体験を改善。① `/api/itinerary/plan/seed|spots|assemble|narrate` の各 route で request parse 失敗・パイプライン失敗・想定外例外を構造化レスポンス + 明示的な `console.error` に統一し、サーバーログに失敗箇所が残るよう修正。② `useComposeGeneration` は split route の non-JSON / 空レスポンス / SSE 事前失敗でもエラーメッセージを回収できるようにし、従来の汎用エラー化を減らした。③ `ComposeLoadingAnimation` を旅の進行ダッシュボードUIへ刷新し、旅先プレビュー・現在工程・次に進む工程・ステージ別進捗を1画面で把握しやすくした。④ ja/en 文言と compose hook / loading UI テストを更新。

- `local` fix(itinerary-pipeline,loading-ui): 旅程生成を「観光スポット紹介」から「その順で回れる1日の流れ」中心へ再設計。① `dayStructure` に `startArea` / `endArea` / `flowSummary` / `anchorMoments` を追加し、seed 段階で朝→昼→夕方の回遊骨格を持たせた。② semantic seed/day/narrative 各プロンプトを更新し、単なる名所の羅列ではなく itinerary の導線としてスポットを選ぶよう強化した。③ PR434 レビュー対応として、must-visit の deterministic 配分ロジックを追加し、日数より多い必訪問スポットがあっても各日に配布されて取りこぼさないよう修正。④ must-visit / 候補 / destination highlights の重複判定は共通の place key 正規化で統一し、日別候補との重複追加も防止。⑤ `ComposeLoadingAnimation` は既存の進捗構成を保ちつつ、旅の要約・現在工程・残ステップをカード化して視認性を改善。⑥ 関連テスト、アーキテクチャ文書、CHANGELOG を更新。

### 2026-03-18 (3回目)

- `local` fix(deploy,itinerary): `destination-highlights.ts` の重複除外キー生成で `filter(Boolean)` 後も `string | undefined` 扱いが残り、`pnpm build` の TypeScript チェックが落ちる問題を修正。`mergeDestinationHighlightCandidates()` の key 配列生成を型ガード付き filter に置き換え、Netlify/CI の本番ビルドが通るよう改善。

- `local` fix(compose-pipeline,loading-ui): 旅行プラン生成の根本品質とローディングUIを改善。① 地域ごとの static 名所リストはやめ、seed 段階で AI 自身に `destinationHighlights`（その街らしさを担保する具体的代表スポット群）を宣言させ、day-by-day のスポット生成で引き継いで落としにくくする方式へ変更。② `semantic-planner.ts` / compose schema / itinerary pipeline 型を更新し、代表スポットを `name + areaHint + dayHint + rationale` で保持して日別候補へ deterministic に再注入できるようにした。③ `adapter.ts` の表示名 grounding は維持しつつ、ローディング中UIは grid ベースで再配置し、進捗・現在工程・全体チェックリストが見やすい構成に整理。④ ローディング文言は「{day}日目のスポットを作成中...」のようなユーザー向け表現に寄せ、タイムアウト回避などの裏側事情を表示しないよう変更。⑤ highlights helper / adapter のテスト、アーキテクチャ文書、CHANGELOG を更新。

### 2026-03-18 (2回目)

- `local` refactor(compose-pipeline,loading-ui): AIスポット生成のタイムアウト対策を設計から刷新。① メイン導線を従来の 2 フェーズ（structure / narrate）から「seed（旅の骨格）→ day-by-day spots（各日ごとのスポット生成）→ assemble（実在スポット照合とタイムライン構築）→ narrate」へ再分割し、最も重かった `semantic_plan` を日単位の小さな LLM 呼び出しへシャーディング。② `/api/itinerary/plan/seed` / `/api/itinerary/plan/spots` / `/api/itinerary/plan/assemble` を追加し、クライアント `useComposeGeneration` は段階的に API を進めながら目的地プレビューと日別進捗を即時反映する方式へ変更。③ `semantic-planner.ts` に旅程骨格専用 seed planner と日別スポット planner を追加し、曖昧な汎用スポット名の除外・重複除外を各日バッチ単位で適用。④ `runAssemblePipeline()` を新設し、place resolve / feasibility / route / timeline を seed + candidates から再構成する形へ整理。⑤ `ComposeLoadingAnimation` / `ComposeLoadingTips` を AI 感のないモダンな“旅の搭乗準備”UIへ刷新し、進行ステージ・現在工程・全体進捗を分かりやすく表示。⑥ ja/en 文言、関連 hook テスト、planner テストモックを更新。
- `claude/remove-ai-spots-optimize-cOHOd` refactor(compose-pipeline,planner): Netlifyバックグラウンドジョブシステムを廃止し、クライアント主導の2フェーズパイプラインに刷新。① Netlify Background Function（`compose-background.ts`、`experimental-background`）と関連する compose-jobs API（`/api/itinerary/compose-jobs` / `[jobId]`）・`ComposeJobStore` ・`processComposeJob` を完全削除。② プラン生成を「Structureフェーズ（`/api/itinerary/plan/structure`、≤9s）」と「Narrateフェーズ（`/api/itinerary/plan/narrate`、SSEストリーム、≤9s）」に分割し、各関数エンドポイントがNetlify無料プランの10秒制限内に完結するよう設計。③ `pipeline-orchestrator.ts` に `runStructurePipeline()`（steps 0-6、deadline 9s）と `runNarratePipeline()`（step 7、deadline 8.5s）を追加。Structureフェーズは常にfast mode・候補数上限10件でsemantic plannerを実行し、place resolveは残時間不足時はスキップ。Narrateフェーズはタイムアウト時に `buildFallbackNarrativeOutput` で確定的ナレーション生成にフォールバック。④ `useComposeGeneration` から compose-jobs ポーリングロジックと legacy SSE フォールバックを除去し、新2フェーズAPIを直列呼び出しするシンプルな実装に刷新。クライアントが中間データ（timeline + normalizedRequest）を保持するためサーバー側ストレージ不要。⑤ `/api/itinerary/compose`（レガシーSSEエンドポイント）の `maxDuration` を28s→9sに引き下げ。⑥ `ComposeLoadingAnimation` をAI感のないトラベルルートビジュアルに刷新。水平ルートライン・チェックポイントドット・目的地テキストが順に出現するアニメーションに変更（絵文字・軌道回転・パルス円廃止）。目的地名と旅行日数を確定後即座に表示。

### 2026-03-18 (1回目)

- `local` fix(compose-pipeline,streaming-ui): プラン生成のスポット品質とSSEストリーミングUIを改善。① deterministic fallback（`${destination}の人気ランチ店` 等の汎用スポット名）を廃止し、AIがタイムアウトした場合はプラン生成を失敗として返すよう変更。② semantic planner のプロンプトに具体的スポット名の必須ルールを追加し、生成後に汎用名パターンを検出・除外するバリデーションを導入。③ COMPOSE_DEADLINE_MS を 22s→26s に拡張し、maxDuration を 28s に設定してタイムアウト回避を強化。④ `ComposeLoadingAnimation` を洗練されたミニマルデザインに刷新（絵文字ステップリスト廃止、軌道アニメーション＋ドットインジケーター化）。⑤ `ComposeStreamingView` にローディングアニメーションを追加し、旅の豆知識をSSEストリーミングコンテンツの下・ローディングアニメーションの上に配置。⑥ StreamingDayCard のダークモード対応を強化。
- `local` fix(compose): レビュー修正 — maxDuration(28s) と COMPOSE_DEADLINE_MS(26s) の不整合を解消、semantic planner の fastMode プロンプトルール番号重複を修正、narrative render の最終フォールバック（buildFallbackNarrativeOutput）を復元（スポット名はセマンティックプラン段階で検証済みのため品質に影響なし）。テストモックを NarrativeRendererOutput の正しい構造に修正。

### 2026-03-13

- `local` perf(planner,compose-ui): 生成完了後に希望入力画面へ戻って見える挙動を解消し、成功ステータス画面を表示したまま詳細ページへ遷移するよう改善。あわせて保存完了後の遷移を先行させ、`refreshPlans` は非同期で後続実行にして体感遷移速度を短縮。

### 2026-03-12

- `local` fix(compose,streaming-ui,timeout): プラン生成のタイムアウト耐性とSSEストリーミング体験を再設計。① `semantic_plan` の実行予算に専用 reserve を設け、後続ステップ用の時間を確保。② `route_optimize` / `timeline_build` は残時間不足または timeout 時に deterministic fallback（回遊順・タイムライン簡略化）へ自動切替し、全体失敗ではなく完走優先に変更。③ compose background job は timeout 失敗時の再試行を 1 回→最大3回（短い backoff 付き）へ強化。④ `ComposeLoadingAnimation` / `StreamingResultView` / `DayPlaceholder` / `ComposeLoadingTips` を旅の高揚感を出すビジュアルへ刷新（ライト/ダーク両対応、既存i18n準拠）。⑤ pipeline / process-compose-job のテストを追加・更新。
- `local` fix(compose-pipeline,planner): プラン生成タイムアウトと日程解釈の不整合を修正。① `runWithDeadline()` の残り時間計算を見直し、残時間がごく僅かでも 0ms タイマーになって即 `route_optimize` が失敗しないよう最小実行猶予を確保。② `normalize-request` に日付レンジ解析（`YYYY-MM-DD~YYYY-MM-DD` / `2026年3月17日〜18日` など）を追加し、`3/17~3/18` 相当が `0泊1日` と誤認されるケースを防止。③ 結果画面とストリーミング結果画面の滞在日数表示は 1日旅行時に `0泊1日` ではなく `日帰り`（en: `Day trip`）を表示。④ 対応テストを追加・更新。
- `local` fix(compose-jobs,planner): 非同期ジョブ経路の障害時にプラン生成が連続失敗する問題を修正。① `POST /api/itinerary/compose-jobs` で `getUser()` / `ComposeJobStore` 初期化例外を構造化 JSON エラーへ変換し、`compose_job_backend_unavailable` などの安定した error code を返すよう変更。② Netlify Background Function 起動は fetch reject だけでなく non-2xx も失敗扱いにし、Netlify 以外の環境では最初から `processComposeJob()` の in-process fallback を使うよう修正。③ `useComposeGeneration` は compose-jobs backend 不可時に旧 `/api/itinerary/compose` SSE へ自動フォールバックし、ユーザー操作を止めずに生成継続するよう改善。④ polling 中の通信例外は raw `Failed to fetch` ではなくローカライズ済みネットワークエラーへ統一。⑤ compose-jobs route / compose hook テストと ja/en 文言を更新。
- `local` feat(compose-jobs,planner,netlify): プラン生成のタイムアウト回避を非同期ジョブ化で実装。① 新規 API `POST /api/itinerary/compose-jobs` / `GET /api/itinerary/compose-jobs/[jobId]` を追加し、compose 実行をジョブ作成 + polling 方式へ変更。② `compose_runs` をジョブ台帳として拡張し、`current_step` / `current_message` / `progress_payload` / `result_payload` / `error_payload` / `access_token_hash` などを保存する migration `20260312030000_compose_jobs_async.sql` を追加。③ Netlify Background Function `compose-background` と `processComposeJob()` を追加し、長時間の `runComposePipeline()` を App Router route から切り離した。④ `useComposeGeneration` を SSE reader から polling ベースに更新し、`partialDays` を job progress から復元するよう変更。⑤ `GenerationRunLogger` は compose job と共存できるよう `compose_runs` へ upsert する形に調整。⑥ ローディング画面では「AIが最適な旅程を組み立てています...」の footer を外し、カード内に `旅の豆知識` を埋め込むレイアウトへ変更。⑦ architecture / performance docs と compose hook / compose jobs API テストを更新。

### 2026-03-11

- `local` fix(planner,compose,constraints): 希望入力が多いときの compose 生成を軽くしつつ、絶対条件の遵守を強化。① `normalize-request.ts` で入力を hard constraints / soft preferences に分離し、テーマと自由記述の希望を決定論的に圧縮して `NormalizedRequest` に保持するよう変更。② 絶対条件は目的地・日程・必訪問スポット・予約済みホテル・予約済み交通として構造化し、soft なテーマ/雰囲気/任意希望は上限付きで要約。③ `semantic-planner.ts` のプロンプトを「必ず守る条件」と「参考にする希望」に分離し、soft 条件は全部盛りせず全体のまとまり優先で反映するルールを追加。④ 予約済みホテルは day structure の宿泊地へ反映し、予約済み交通は `timeline-builder.ts` で日内の開始・終了可能時刻の hard anchor として扱うよう改善。⑤ timeline の overflow trimming では `must_visit` と fixed schedule に紐づくノードを削除対象から除外。⑥ compose metadata に `compactionApplied` / `hardConstraintCount` / `softPreferenceCount` / `suppressedSoftPreferenceCount` を追加。⑦ normalize / timeline / pipeline のテストを拡充。
- `local` fix(compose-sse,timeout): プラン生成のタイムアウト耐性をさらに強化。① `/api/itinerary/compose` に `ack` / `heartbeat` SSE を追加し、接続直後と重い LLM ステップ中も定期的にイベントを返すよう改善。② `useComposeGeneration` は heartbeat-aware に更新し、heartbeat 後の切断を `streamUnexpectedEnd` ではなく timeout として扱うよう修正。③ compose pipeline のモデル解決を phase-aware 化し、`AI_MODEL_OUTLINE_*` / `AI_MODEL_CHUNK_*` 設定を使って semantic / narrative を別々に低遅延モデルへ寄せられるよう変更。④ `semantic-planner.ts` のプロンプトと retry を圧縮し、fast mode 時は候補数も抑制。⑤ narrative は残時間が少ない場合に即 fallback へ切り替え、Netlify の 30 秒上限前に graceful に収束しやすくした。⑥ compose route / hook / orchestrator のテストを追加・更新。⑦ `docs/development/architecture.md` を現行の `maxDuration=25` と SSE heartbeat 仕様に更新。
- `local` fix(deploy,netlify): Netlify の Next.js デプロイが `@netlify/plugin-nextjs` の site extensions 取得 (`504`) で落ちる問題を修正。Netlify Docs の zero-configuration / OpenNext 運用に合わせて、repo で pin していた legacy plugin dependency `@netlify/plugin-nextjs` を削除し、Netlify 側の自動アダプタに委譲する構成へ整理。
- `local` fix(planner,server-actions,deploy): デプロイ切替後にプラン生成完了時の保存で `Failed to find Server Action` が出る問題を修正。① クライアントが直接 `savePlan` Server Action を呼んでいた経路を整理し、保存本体を `src/lib/plans/save-plan.ts` の共有サーバー関数へ抽出。② 新規 API route `POST /api/plans/save` を追加し、クライアント保存は `savePlanViaApi()` 経由の `fetch` に統一。③ `useComposeGeneration`、ローカルプラン同期、サンプル再生成、`/sync-plans`、`MyPlansClient` など保存呼び出しを API 経由へ差し替え、古い Action ID を握ったタブでも保存で壊れにくい構成へ変更。④ 共有保存ロジックと API route のテストを追加。
- `local` fix(compose-sse,deploy): プラン生成 SSE が「候補スポットを選定中...」で途切れる問題を修正。① `/api/itinerary/compose` の `maxDuration` を 25 秒に合わせ、アプリ側でも 25 秒 deadline を導入して配信基盤の 30 秒 kill より先に graceful に終了するよう変更。② `pipeline-orchestrator.ts` に残時間監視を追加し、時間不足時は hero image を省略、Places 照合をスキップまたは候補数制限付きで縮退するよう改善。③ semantic/narrative/places 各重いステップはアプリ側 timeout 付きで実行し、失敗時に `failedStep` を SSE error で返すよう強化。④ SSE route に `done` イベントを追加し、クライアント `useComposeGeneration.ts` は最終バッファ flush と終端イベント追跡で `streamUnexpectedEnd` の誤検知を防止。⑤ root `app/layout.tsx` を `force-dynamic` 化して `DYNAMIC_SERVER_USAGE` ログの発生を抑制。⑥ compose pipeline テストに deadline 縮退ケースを追加。
- `local` fix(db,migrations): 既存Supabase DB を CLI migration 管理へ移行しやすいよう補強。① duplicate version だった migration 名を一意な timestamp に正規化 (`20250224090000_add_analytics_tables.sql`, `20250224100000_add_reflections_table.sql`, `20260206090000_generation_metrics.sql`, `20260206100000_plan_feedback.sql`)。② `docs/development/database-and-migrations.md` と `supabase/README.md` に、`supabase_migrations.schema_migrations` が無い既存DBでは `db push` 前に `migration repair --status applied` で履歴を揃える運用を追記。
- `local` fix(db,migrations): fresh DB を migration 順序適用だけで bootstrap できるよう修正。① `20250101000000_baseline_core_schema.sql` を追加し、`schema.sql` の基礎テーブル群（users, plans, billing, entitlements など）を migration 管理へ取り込んだ。② baseline は `CREATE TABLE/INDEX IF NOT EXISTS`、seed `ON CONFLICT DO NOTHING`、policy/trigger の存在確認付き `DO $$` により既存環境でも再実行可能。③ `20260310000000_compose_pipeline_v3.sql` の `places_cache` 拡張を `ALTER TABLE IF EXISTS` 化し、route cache / policy 作成も idempotent 化。④ `docs/development/database-and-migrations.md` と `supabase/README.md` を baseline migration 前提の運用へ更新。
- `local` feat(itinerary-pipeline): Legacy 削除 + Compose Pipeline デフォルト化 + streamObject ストリーミング。① Legacy 生成フロー完全削除: `generate-outline.ts`, `generate-sample-itinerary.ts`, `usePlanGeneration.ts`, `useGenerationProgress.ts`, `outline-cache.ts`, `redis.ts`, `self-correction.ts`, `OutlineLoadingAnimation`, `OutlineReview`, `LoadingView`, `GeneratingOverlay (planner)`, outline/chunk API routes, 関連テスト。② Feature flag `NEXT_PUBLIC_ENABLE_COMPOSE_PIPELINE` 撤去 — Compose Pipeline がデフォルト。③ `TravelPlannerSimplified` を compose-only に簡素化 (legacy 分岐・outline state 全削除)。④ `PlanClient` を compose pipeline に完全移行 (sample 生成も compose 経由)。⑤ `TravelPlannerLegacy` を `useComposeGeneration` に移行。⑥ `narrative-renderer.ts` に `streamNarrativeRenderer()` async generator 追加 — `streamObject` で日ごとに部分 JSON を yield。⑦ `pipeline-orchestrator.ts` で streaming narrative を統合し `day_complete` イベントを emit。⑧ SSE route に `day_complete` イベント追加。⑨ `useComposeGeneration` に `partialDays` / `totalDays` state 追加。⑩ `StreamingResultView` に compose streaming view 追加 (narrative_render 中に日ごとカード段階表示)。⑪ `ComposeLoadingTips` を各言語22件に拡充 (Tabidea 使い方 Tips 含む)。⑫ `travel-planner.ts` action から `generatePlanOutline`, `generatePlanChunk`, `autoVerifyItinerary` 削除、`getUserConstraintPrompt` をインライン化。⑬ barrel export 整理 (`hooks/index.ts`, `planner/index.tsx`)。

### 2026-03-10

- `local` feat(itinerary-pipeline): Compose Pipeline v3 — 構造化データ中心の旅程生成エンジン。① `compose-pipeline/` → `itinerary/` にディレクトリ移動、`types/compose-pipeline.ts` → `types/itinerary-pipeline.ts` にリネーム。② `semanticId` (UUID) を全パイプラインステップで候補追跡キーとして導入。③ `SemanticCandidate` に `rationale`, `areaHint`, `indoorOutdoor`, `tags` フィールド追加。④ `SemanticPlan` に `tripIntentSummary`, `orderingPreferences`, `fallbackHints` 追加。⑤ Place Resolver を top-1 → top-3 に拡張。⑥ Feasibility Scorer を 5 軸 → 8 軸 (nameMatch, areaHintMatch, openHoursMatch, ratingQuality, budgetMatch, categoryRelevance, distanceFromPrev, lowReviewPenalty) に再設計、must_visit/高 priority 候補は threshold 免除。⑦ Route Optimizer を固定→must→最小増分挿入→2-opt 近傍改善アルゴリズムに再構築、ペナルティ関数 (mealTimingPenalty, areaBacktrackPenalty) 追加。⑧ Timeline Builder に startTime/endTime 尊重、meal window 調整、nodeId/semanticId 付与を追加。⑨ Node/Leg を ID ベースモデル (nodeId/legId/semanticId) に拡張 (replan 対応準備)。⑩ `NormalizedRequest` に optional fields (startTime, endTime, durationMinutes, locale 等) 追加。⑪ `GenerationRunLogger` 新規作成 — compose_runs / compose_run_steps テーブルにステップ別 success/failure/fallback を記録。⑫ `RoutesClient` interface stub 新規作成 (Phase 2 で Google Routes API 実装予定)。⑬ `constants.ts` / `errors.ts` に定数・エラークラスを集約。⑭ Pipeline Orchestrator を v3 に更新 (pipelineVersion='v3', GenerationRunLogger 統合)。⑮ Adapter に nodeId/semanticId → Activity.metadata 変換追加。⑯ DB migration `20260310000000_compose_pipeline_v3.sql` (compose_runs, compose_run_steps, route_matrix_cache テーブル)。⑰ Zod スキーマ更新 (rationale, areaHint, indoorOutdoor, tags, tripIntentSummary, orderingPreferences, fallbackHints)。⑱ 全テスト更新・追加 (119 tests pass)。

- `local` fix(compose-pipeline): チケット二重消費 & 生成失敗バグ修正。① `TravelPlannerSimplified` のリトライボタンで `{ isRetry: true }` を渡すよう修正し、チケット二重消費を防止。② Zod スキーマの `stayDurationMinutes.min(15)` → `.min(5)`、`priority.min(1)` → `.min(0)`、`dayHint.min(1)` → `.min(0)` に緩和し LLM 出力の validation failure を削減。③ `semantic-planner.ts` に温度を上げたフォールバックリトライと `PipelineStepError` 分類を追加。④ `narrative-renderer.ts` の `maxRetries` を 1→2 に増加。⑤ `pipeline-orchestrator.ts` に `PipelineStepError` クラスを追加し `ComposeResult.failedStep` でステップ別エラー分類を実装。⑥ `route.ts` の `maxDuration` を 120→300 に拡大、SSE error イベントに `failedStep` を含む。⑦ `useComposeGeneration.ts` で `failedStep` に基づくユーザーフレンドリーなエラーメッセージを表示。⑧ ja/en i18n に `compose.errors.timeout` / `compose.errors.stepFailed.*` キーを追加。

### 2026-03-09

- `local` feat(compose-pipeline): 旅程生成エンジン再設計 Phase 1 MVP — 7ステップ Compose Pipeline を新規実装。LLM が「意味」を作り、Google Maps が「現実」を返し、アプリケーションコードが「制約を解く」3層分離アーキテクチャ。① 型定義 `compose-pipeline.ts` + Zod スキーマ `compose-schemas.ts`。② 7 step パイプライン: Request Normalizer (pure TS)、Semantic Planner (Gemini generateObject)、Place Resolver (Places API, feature flag)、Feasibility Scorer (5軸100点)、Route Optimizer (greedy + 2-opt)、Timeline Builder (時刻確定)、Narrative Renderer (Gemini prose)。③ `ComposedItinerary → Itinerary` 後方互換アダプター。④ ハバーサイン距離推定 `distance-estimator.ts`。⑤ SSE API `/api/itinerary/compose`。⑥ `useComposeGeneration` フック + `ComposeLoadingAnimation` + `ComposeLoadingTips` UI (dark mode対応)。⑦ `TravelPlannerSimplified` に feature flag 分岐 (`NEXT_PUBLIC_ENABLE_COMPOSE_PIPELINE`)。⑧ `performance-timer.ts` に `COMPOSE_TARGETS` + `createComposeTimer()`。⑨ `prompt-builder.ts` に `semanticPlan`/`narrativeRender` generationType 追加。⑩ `places.ts` に `searchPlaceMulti()` 追加。⑪ DB migration `20260309000000_compose_pipeline_metadata.sql`。⑫ metrics collector + types にv2フィールド追加。⑬ ja/en i18n キー追加。⑭ 130 unit/integration tests (全 pass)。

### 2026-03-08

- `local` feat(shiori,planner,ui,db): 旅のしおり UX 改善 — メモ・予算・スクロールヘッダー。① journalタブの各アイテムカードに「旅メモ（note）」「実際の出費（actual_cost / actual_currency）」入力欄を追加し `updatePlanItemDetails` アクションで保存。② `plan_publications` に `overall_budget` / `overall_budget_currency` カラムを追加し、`get_public_shiori` RPC を更新（`user_id`・`overall_budget`・`overall_budget_currency` を返却）。しおり個別ページに `ShioriBudgetSummary` コンポーネント（全体予算目標・推定合計・実績合計の3列カード、オーナーはインライン編集可）を追加。③ `Header.tsx` に shiori ページ検出を追加し、ヒーロー画像の2/3スクロール後にフェードインするスクロール連動ヘッダーを実装。`ShioriScrollWrapper` を新規作成。新規 server action `shiori-edit.ts`。ja/en i18n キーを全件追加。

### 2026-03-07 (continued, shiori improvements)

- `local` feat(shiori,ui,db): 旅のしおり機能の総合改善。DB に `plan_publications.conditions_snapshot JSONB` カラムを追加し、`get_public_shiori` RPC に `conditions_snapshot` と `thumbnail_url` を追加。`fork_public_shiori` RPC を新規作成（`plan_days`/`plan_items` をコピー、`note`・`date_value`・日記は除外）。`PublicConditionsSnapshot` 型と `buildConditionsSnapshot`/`conditionsSnapshotToUserInput` ユーティリティを追加。`upsertPlanPublication` に `conditionsSnapshot` パラメータを追加し既存の `publish_journal`/`publish_budget` を保持するよう改善。`PublicToggle` にパブリック化時の conditions_snapshot 保存ロジックを追加。しおり詳細ページをヒーロー画像・アクションバー・`ConditionsCard`・タイムラインスタイル旅程・関連しおりセクション構成に全面刷新。フィードページにスティッキーフィルターバー（目的地・テーマ・同行者・並び順）を追加。新規コンポーネント: `ConditionsCard`, `ForkButton`, `CreateWithConditionsButton`, `ShareButton`, `RelatedShioriSection`, `ShioriFeedFilters`。`PublicPlanCard` にテーマチップ・同行者バッジ・ダークモード対応を追加。ja/en i18n キーを全件追加。

### 2026-03-07 (continued)

- `local` feat(ai,api,planner): チャンク生成タイムアウト対策を2段階で実施。Fix A: Golden Plan Examples をチャンク生成プロンプトから除外（Outline生成で活用済みのため不要、プロンプトトークン削減で生成高速化）。Fix G: `/api/generate/chunk` を `streamObject` ベースの SSE ストリーミングに変換し、タイムアウト問題を構造的に解消。`gemini.ts` に `streamDayDetails()` async generator メソッドと `buildDayDetailsPromptSingle()` を追加、`normalizeDayPlan` をエクスポート。`PlanClient.tsx` を server action から fetch SSE 消費に変換し `partialDays` state を追加。`StreamingDayCard.tsx` を新規作成（タイトル→Transit→アクティビティの段階的 Framer Motion アニメーション）。`PartialDayData` 型を `@/types` に追加。ja/en `streamingDayCard` i18n キーを追加。

### 2026-03-07

- `local` fix(ui,planner,i18n): 希望入力フォームのUI改善。「希望する移動手段」セクションを削除（AI プロンプト側は維持）。予約済み交通手段カードに便名・出発日・出発時刻のラベルを追加し、ホテルカードにもホテル名ラベルを追加して視認性を向上。モバイル最適化としてコンテナ padding・ヘッダーフォントサイズ・セクション間スペース・同行者カード padding・ペース/予算グリッド gap・生成ボタン下余白を縮小し、sm/md ブレークポイントで段階的に拡大するよう変更。`phase3.reservations.timeLabel` を ja/en に追加し、`phase3.transport` / `transport.options` キーを削除。
- `local` fix(planner,ui,i18n): プランナーUIと生成処理を多方面改善。チャンク生成を完全並列化（Day 1 の await 順次待ちを廃止し全チャンクを Promise.all で同時生成）。設定モーダルのアカウントタブに保存ボタンを追加し homeBaseCity 等の変更を単独保存できるよう修正。フライト予約に出発地・到着地フィールド、ホテル予約にチェックアウト日フィールドを追加し、AI プロンプトにも反映。生成ボタンにホバーアニメーション（scale + shadow）を追加。生成ボタン押下時にフォーム先頭へのスムーズスクロールを実装。ローディング画面を旅行手帳テイストに刷新（手書きフォント + 波状バウンスドット + 浮遊スタンプ演出）。アウトラインローディングのフォールバックアニメーションをパスポートスタンプ風デザインに変更。
- `local` feat(ui,planner,i18n): 希望入力フォームの同行者カテゴリとこだわりテーマを大幅拡張し、各選択肢に「どんな雰囲気の旅になるか」の短い説明を追加。旅のペースと予算感の説明文も雰囲気ベースに更新し、予算はプリセットに加えて単一金額スライダーから詳細金額帯を指定できるよう改善。あわせてリクエストサマリー、予算レベル判定、同行者推定、関連テストを新カテゴリと `range:min:max` 予算入力へ対応
- `local` fix(ui,planner,i18n): 希望入力フォームの上部余白を圧縮し、目的地追加ボタンをラベル付きで視認しやすく調整。こだわり条件内に「絶対に行きたい場所」と予約済みの交通手段・ホテル入力を追加し、固定予定として `fixedSchedule` / `mustVisitPlaces` に保持するよう更新。あわせて `LanguageSwitcher` とヘッダー・フッター・モバイルサイドバー周辺の見た目を微修正し、URL復元とリクエストサマリーでも新規入力を保持・表示できるようにした。
- `local` fix(ui,planner): 現行の希望入力フォーム `SimplifiedInputFlow` の視認性を微調整。選択式UIの灰色ベースの丸表現を廃止し、オレンジ地+白チェックの選択インジケータへ統一。あわせて同行者・テーマ・旅のペース・予算プリセットの未選択状態の文字色/境界線、入力欄プレースホルダ、フォーカスリングを調整し、ライトモードで白背景に白文字が出る箇所を解消。ヘッダーとセクション間の上余白も詰めて全体の密度を改善

### 2026-03-06

- `local` feat(samples,i18n,ai): サンプル旅程再生成フローを新方式（outline + chunk）に更新し、`src/scripts/generate-sample-itineraries.ts` を `ja/en` 生成対応へ刷新。サンプル専用APIキー（`SAMPLE_GOOGLE_GENERATIVE_AI_API_KEY` / `SAMPLE_OPENAI_API_KEY`）の優先利用を追加し、`/samples` ではロケール別旅程JSON（`src/data/itineraries/{locale}`）優先読込に対応。あわせてサンプルカード/フィルタのタグ・エリア表示をロケールに応じて出し分け
- `local` feat(i18n,settings): アカウント設定の言語・地域をAI出力専用へ分離し、表示言語はヘッダー言語切替（`uiLanguage`）で独立管理するよう変更。`proxy` の言語解決は `preferredLanguage` 依存を廃止して `uiLanguage`/URL優先に移行し、言語・地域Cookieに永続期限（1年）を付与。`LanguageSwitcher` 変更時はログインユーザーの表示言語をDBへ保存し、地域・出発帰着都市（`homeBaseCity`）を含む出力設定の永続化と責務分離を強化
- `local` fix(i18n,ui): `src` 配下のユーザー表示ハードコード文言を `t()` 参照へ追加移行。`blog` ダッシュボード見出し、`ResultView` / `StreamingResultView` / `OutlineReview` / `DayPlaceholder` / `ShioriJournalEditor` / `TransitForm` の `Day`・ラベル系固定文言、`LoginPromptModal` のパス表示文言、Landing/Samples のバッジ文言、`ItineraryPDF` / `TravelInfoPDF` のヘッダー・フッター文言を翻訳キー化し、`src/messages/{ja,en}` の `planner-and-blog.json`・`features-ui.json`・`extra-ui.json` に対応キーを追加
- `local` fix(i18n,components): `src/components` の未翻訳文言を追加移行。`MapErrorBoundary`、`LoginPromptModal`、`LoginPrompt`、`ShareButton`、`ShioriPromotionSection`、`landing` の `About/Hero/TravelInfo/v2 Concept`、`travel-info` 各 section、`BlogEditor`、`ItineraryPDF`、`TravelPlannerLegacy`、`DayPlaceholder`、`SamplePlanCard`/`SamplePlanList` の表示文言を `t()` 参照へ統一し、`src/messages/{ja,en}/components/extra-ui.json` を新設
- `local` fix(i18n,pdf): PDF出力のカテゴリラベル・ビザ要否・注意文・持ち物リスト見出しを翻訳キー化し、`ja/en` ロケールで同一キー運用へ統一
- `local` feat(i18n,samples): サンプル一覧の検索・絞り込みUI文言（タブ、モーダル、空状態、件数、もっと見る等）を翻訳キー化
- `local` fix(i18n,faq): FAQ本文データを `src/lib/data/faq.ts` の日本語固定文言参照から `t()` ベースへ移行。`src/messages/{ja,en}/components/faq-data.json` を新設し、`FAQContent`・`FAQCategoryList`・`landing/FAQSection` の質問/回答を `ja/en` で表示できるよう統一
- `local` fix(i18n,about/planner): `AboutContent` の `language === "en"` 分岐を廃止し、`t()` 参照へ一本化。`src/messages/{ja,en}/components/about-content.json` を追加。`SimplifiedInputFlow` も英語専用分岐と日本語直書きを撤去し、`components.features.planner.simplifiedInputFlow` 名前空間（`src/messages/{ja,en}/components/simplified-input-flow.json`）へ移行
- `local` fix(i18n,landing/pdf): `landing/v2/ConceptSection` の説明文を `t.rich()` 化して接続語の直書きを撤去。`landing/TravelInfoSection` の為替説明・モック通貨/パスポート文言を `t()` 化。`ItineraryPDF` の `日` サフィックス、Travel Info サブタイトル、メモ見出し、持ち物カテゴリ名を翻訳キー参照へ統一

### 2026-03-05

- `local` fix(i18n,lib): `src/lib`/`src/types` の実行時ハードコード文言を `t` ベースへ移行。`useGenerationProgress`・`usePlanGeneration`・`generate-outline`・`rate-limit`・`replan`（説明文/判定語彙）を翻訳キー参照化し、`messages/{ja,en}/lib/*` を新設。`travel-info` のカテゴリ/危険度ラベル定数は `getCategoryLabels` / `getDangerLevelDescriptions` を追加して翻訳生成へ統一
- `local` fix(i18n): `src/app` 起点の英語対応を強化し、`contact` 送信フローをサーバー文字列返却からコード返却 + UI側 `t(...)` マッピングへ統一。`ContactForm` / `TravelPlannerChat` / `plan` 系クライアントでハードコード文言を翻訳キー管理へ移行し、`travel-info` 人気目的地リスト・`travel-info/[destination]` エラー文言・`sync-plans` エラー表示を辞書管理へ統一。再生成指示文は `app.planner.plan.regenerateInstruction` で共通化し、`/api/og` の画像内テキストも `messages/{ja,en}/api/og.json` ベースのロケール分岐へ変更
- `local` fix(settings,ui): 設定モーダルの出発・帰着都市が保存後の再表示で地域代表都市へ戻る不具合を修正。読み込み時は保存済み `homeBaseCity` を保持し、地域変更時のみ代表都市を自動補完するように調整。同一地域の再選択や地域不変の操作ではユーザー明示値を上書きしない挙動へ変更
- `local` fix(i18n): 言語切り替えボタン押下後に `preferredLanguage`（例: `ja`）で再リダイレクトされ、`/en/*` から日本語へ戻ってしまう不具合を修正。`proxy` の言語解決を「URLプレフィックス最優先」に変更し、明示的に選択したルート言語を保持するよう調整。あわせて優先順位ロジックを `src/lib/i18n/proxy-language.ts` に切り出し、回帰防止テストを追加
- `local` feat(i18n): ロケール定義を翻訳ディレクトリ連動に自動化。`scripts/i18n/generate-locales.ts` を追加し、`src/messages/*` から `src/lib/i18n/generated-locales.ts` を生成する運用へ変更。`predev` / `prebuild` / `pretest` / `prei18n:check` で自動同期し、`src/lib/i18n/locales.ts`・`src/lib/i18n/messages.ts` の言語固定定義を解消
- `local` feat(i18n,locale): 言語・地域の自動判定を強化。`proxy` で `Accept-Language` と geo ヘッダー（`x-vercel-ip-country` / `cf-ipcountry`）を初回判定に使用し、`tabidea-language` / `tabidea-region` cookie と `x-tabidea-language` / `x-tabidea-region` ヘッダーを同期。ログイン時は `public.users.metadata` の `preferredLanguage` / `preferredRegion` を優先し、未設定時のみ自動保存してクロスデバイスでも設定を維持。併せて `scripts/i18n/check-messages.ts` をロケール自動検出化し、`SettingsModal` の主要固定文言を `settings` 辞書キーへ移行
- `local` feat(ui,i18n): 設定モーダルの「出発・帰着都市」を自由入力から国地域連動の検索付きプルダウンへ変更。選択中の国地域に属する都市のみ表示し、日本は47都道府県相当、米国は50州+DC相当で1都市ずつ収録。その他地域は初期は1都市（首都ベース/暫定値）を表示し、候補にない都市はお問い合わせフォームへ追加依頼できる導線（常設+検索0件時）を追加。`src/lib/i18n/home-base-cities.ts` / `src/lib/i18n/home-base-city-search.ts` / `src/components/common/HomeBaseCitySearchSelect.tsx` を新設し、`SettingsModal` と関連テスト・ja/en辞書を更新
- `local` perf(ui,i18n): 設定モーダルの「地域」選択を検索可能な軽量コンボボックスへ刷新。`src/lib/i18n/region-search.ts` を追加し、前方一致優先 + 部分一致のスコアリング、言語別インデックスキャッシュ、初期20件/検索40件の表示上限で描画負荷を抑制。`ja/en` の settings 辞書に検索UI文言を追加し、`SettingsModal` テストと地域検索ユーティリティテストを拡充
- `local` fix(i18n,ui): 言語切り替えドロップダウンのモバイル表示で、左端にはみ出すケースをビューポート内クランプで修正。`src/lib/i18n/regions.ts` を新設し、外務省オープンデータ国コード準拠の国・地域リスト（設定画面向け208件: `JP` + MOFA 207）を導入。設定画面の地域選択は新マスタ参照に切り替え、地域変更時の `homeBaseCity` 自動入力を全地域対応（首都オーバーライド + フォールバック）へ拡張
- `local` feat(ui,ai): ダークモード配色をブラウン基調へ再設計（グローバルトークン+互換レイヤー更新）。言語スイッチをドロップダウンUIへ刷新し、設定に出発/帰着都市（`homeBaseCity`）を追加。AIプラン生成は設定言語で出力し、指定都市を起点に往復する制約をプロンプトへ適用
- `local` feat(i18n): 翻訳メッセージ管理を `src/messages/{ja,en}/**.json` の分割構成へ移行し、`src/lib/i18n/load-messages.ts` による再帰マージ読み込みを導入。`pnpm i18n:check`（`scripts/i18n/check-messages.ts`）を追加して ja/en キー不整合をCIで失敗させる運用へ変更
- `local` feat(i18n): 主要ページ（ルートエラー系、ホーム、FAQ、Contact、Blog Guide、Samples、Shiori、Travel Info、Pricing関連、ログイン/マイプラン等）の文言とメタデータを `next-intl` の `t()` / `getTranslations()` ベースへ段階移行し、`language === "ja"` 直書き分岐の削減を開始
- `local` feat(i18n): 追加ページ（`/admin/metrics`、`/sync-plans`、`/test/api-response`、`/shiori/[slug]`、`/samples/[id]`、`/updates`）を `t()` / `getTranslations()` ベースへ移行し、専用辞書 `src/messages/{ja,en}/pages/admin-tools-shiori.json` を追加
- `local` fix(i18n): 法務ページ（利用規約・プライバシー・Cookie・特商法・AIポリシー）の英語ロケールで、日本語本文の代わりに `t()` 管理の英語サマリーを表示する分岐を追加。`/updates` は英語ロケール時に英語案内カードを表示するよう調整
- `local` fix(i18n): `next-intl` の設定解決を公式構成へ統一。`next.config.ts` に `next-intl/plugin` を追加し、`src/i18n/request.ts` / `src/i18n/routing.ts` を導入して、開発サーバーの `Couldn't find next-intl config file` エラーを解消
- `local` fix(i18n): `proxy` を `next-intl` ミドルウェア連携に更新し、言語プレフィックスURL（`/ja` `/en`）のリダイレクトと `LANGUAGE_COOKIE` / `LANGUAGE_HEADER` の同期を安定化
- `local` fix(route): App Router のUIルートを `src/app/[locale]/*` へ移行し、`/ja` アクセスが 404 になる問題を解消。`/` や `/pricing` は `localePrefix: "always"` に従って `/ja` / `/ja/pricing` へリダイレクト
- `local` feat(i18n): `app/components/errors` 名前空間を追加し、`LoginClient`・`MyPlansClient`・`PlanClient`・`PricingCard`・`SuccessPageClient`・`travel-info/[destination]` loading/error・`app/layout` metadata を `next-intl` 参照へ移行。`src/messages/{ja,en}/{app,components,errors}` に新規辞書を追加
- `local` feat(i18n): 追加コンポーネント群（`TierComparisonTable`、`FeaturesHeroSection`、`FeaturesDetailSection`、`HowToUseSection`、`FAQSection`、`SampleCollectionPromotionSection`、`TravelInfoDisplay`、`CategorySelector`、`CategoryCard`、`MobileSidebar`、`PublicPlanCard`）と動的ページメタ（`/blog/[handle]/[slug]`、`/shiori/[slug]`）を翻訳キー/ロケールヘルパーへ移行し、`language === "ja"` 分岐をさらに削減。`src/messages/{ja,en}/components/features-ui.json` を追加

### 2026-03-04

- `local` feat(i18n): 多言語対応の基盤を実装。言語プレフィックスURL（`/ja`, `/en`）の導入、`next-intl` による辞書配信、共通ナビ（Header/Footer/Sidebar）のロケール対応、設定画面での言語・地域（`ja-JP`/`en-US`）保存を追加
- `local` feat(i18n): 主要ページと主要UIの多言語対応を拡張。`/updates`・`/blog/guide`・`/public/view`・`/shiori/[slug]`・`/travel-info`・料金関連UIを `ja`/`en` で表示切替し、メタデータ・リンク・エラーメッセージ・地域ロケール整合（`ja-JP`/`en-US`）を強化
- `local` feat(ui): 全ページでダークモード（ライト/ダーク/システム）を実装。設定モーダルからテーマ切替可能にし、固定16進色クラスを含む既存UI全体をダーク配色へ自動変換する互換レイヤーを追加
- `local` fix(ui): プランページのタブ状態をURLクエリ（`tab`）で保持し、`/my-plans` の三点メニューがカード外にはみ出しても表示されるよう修正
- `local` fix(shiori): マイページの公開切替を `updatePlanVisibility` 経由に統一し、`plans.is_public` と `plan_publications` の同期ずれで旅のしおり公開が反映されない問題を修正（`/my-plans` 再検証と公開トグル同期改善を含む）
- `local` perf(ui): プラン概要表示中のUIを詳細ページ寄りに統一し、詳細生成完了後はローカル詳細ページへ即時遷移することで体感待ち時間を短縮。遷移中トースト表示で「まもなく詳細ページへ移動」を明示
- `local` fix(ui): ダークモードの基調色を「旅の高揚感」を意識した夜景トーン（ネイビー×サンセットオレンジ×シーグリーン）へ再設計し、`stone/gray/zinc/neutral/slate` 系の背景・文字・境界色を補正して暗すぎる表示と低コントラスト箇所を改善

### 2026-02-25

- `0078bde` feat(map): implement 3-way map split for all map components (PR-E)
- `5deeb95` feat: wire orphaned PR modules into existing views

### 2026-02-24

- `6e017f1` Merge branch 'main' into pr-e/map-3way-split
- `6f1bfb6` feat(feedback): add post-trip reflection survey (PR-N)
- `ff7424e` feat(analytics): add KPI query functions (PR-M)
- `ae59338` feat(analytics): add event measurement infrastructure (PR-L)
- `6bcf5a8` feat(replan): add In-trip UI with one-tap triggers & suggestion cards (PR-K)
- `a5fdd2f` feat(replan): add Replan API engine with 3-second timeout (PR-J)
- `f04d3c7` feat(replan): implement Human Resolution Scoring system (PR-I)
- `948b998` feat(replan): add domain model types, slot extractor & constraint detector (PR-H)
- `f1fa606` feat(billing): add 3-column tier comparison table (PR-G)
- `c65fe68` feat: add multi-provider AI system with phase×tier model resolution
- `c625535` feat: implement 3-way map provider split (static/leaflet/google_maps)

### 2026-02-23

- `f133073` feat: implement 4-tier billing system (guest|free|pro|premium)

### 2026-02-19

- `2deebfe` Merge pull request #366 from tomoki013/update-changelog-02-18-8543465630747702466
- `4800f01` chore: Update changelog for 2026.02.18 release

## 既存ユーザー向け履歴（`/updates` から初回移植）

> 注: このセクションは既存 `updates` 履歴を機能単位で移植したものです。今後の追記は上記「開発者向けコミット履歴」を基準に更新してください。

### 2025.12.13

- [pre_release] α版サービス公開: Tabideaのα版を公開しました。Gemini AIを活用した旅行プラン生成が可能です。

### 2025.12.23

- [pre_release] β版サービス公開: UIとUXの修正、および本格的なサービス開始に伴うページ整理を行いました。

### 2025.01.08

- [patch] よくある質問および機能紹介・使い方ページを設置: よくある質問ページと使い方ページを設置し、多くの人が利用しやすいサービスとするための改修を行いました。

### 2026.01.09

- [patch] プラン生成精度の向上: AIによるプラン生成の精度を向上させました。より具体的で実現性の高いプランが提案されるようになりました。

### 2026.01.10

- [patch] 日程が長い場合のスケジュール生成改善: 日程が長くなると1日あたりの予定が少なくなる問題を修正しました。

### 2026.01.10

- [patch] PDF出力機能の実装: 生成された旅行プランをPDF形式でダウンロードできるようになりました。オフラインでの閲覧や印刷に便利です。

### 2026.01.11

- [patch] プランの手動修正機能: プラン生成後に手動でプランの修正ができるようになりました。

### 2026.01.13

- [patch] 旅程サンプル集の公開: 様々な旅行プランのサンプルを閲覧できる旅程サンプル集を公開しました。プラン作成の参考にご活用ください。

### 2026.01.14

- [patch] サンプルの大幅追加と検索・絞り込み機能の実装: 旅程サンプルを大幅に追加し、地域やキーワードでプランを探せる検索・絞り込み機能を実装しました。よりスムーズに理想の旅程を見つけられるようになりました。

### 2026.01.14

- [patch] 日程の並び替えや時間の調整: 日程の並び替えや時間の調整ができるようになりました。

### 2026.01.15

- [patch] 渡航情報のAI検索機能を追加: 渡航情報・安全ガイド詳細ページにて、AIが最新の渡航情報を調べてくれる機能を追加しました。より詳細でリアルタイムな情報を確認できるようになりました。

### 2026.01.16

- [patch] 渡航情報のAI検索機能の精度向上とカテゴリー追加: AIによる情報の検索精度を改善しました。また、より多角的な情報を取得できるよう、検索可能なカテゴリーを追加しました。

### 2026.01.16

- [patch] 渡航情報のPDF出力機能: 渡航情報をPDFとしてダウンロードできる機能を追加しました。オフラインでの閲覧や印刷に便利です。

### 2026.01.17

- [patch] 渡航情報・安全ガイドで、外部APIを使用: 渡航情報・安全ガイドで、外部APIを使用して情報を取得するようになりました。より正確でリアルタイムな情報を確認できるようになりました。

### 2026.01.19

- [patch] ブランドイメージとTabideaへの想いをTabideaについてページに追加: ブランドイメージとTabideaへの想いをTabideaについてページに追加しました。

### 2026.01.19

- [patch] 渡航情報・安全ガイドのカテゴリを追加: 渡航情報・安全ガイドのカテゴリを追加しました。より多くの情報を検索できます。

### 2026.01.20

- [patch] ブランドイメージに合わせて一部ページのUIを修正: ブランドイメージに合わせて一部ページのUIを修正しました。

### 2026.01.21

- [patch] 旅程生成後のチャットでよく使われる文章をボタン一つで追加できるように: 旅程生成後のチャットでよく使われる文章をボタン一つで追加できるようになりました。

### 2026.01.22

- [patch] 渡航情報・安全ガイドのデザインを更新: 渡航情報・安全ガイドのデザインを更新し、見やすくてすぐに理解できるような見た目にしました。

### 2026.01.23

- [patch] 複数地域を周遊する旅程プラン生成に対応: 複数地域を周遊する旅程プランを生成できるようになりました。

### 2026.01.23

- [patch] プランページで渡航情報・安全ガイドを確認できるように: プランページで生成された旅程の地域の渡航情報・安全ガイドをボタン一つで確認できるようにしました。

### 2026.01.24

- [patch] サンプルプラン集の絞り込み画面の更新: サンプルプラン集の絞り込み画面をタブ形式にして、カテゴリごとに分けて絞り込みやすくしました。

### 2026.01.26

- [minor] ユーザーアカウント機能: ログインすることで、複数のデバイスでプランを同期したり、過去の履歴を管理できるようになりました。

### 2026.01.26

- [patch] プランの保存機能: 生成した旅行プランを保存し、後から確認できるようになりました。

### 2026.01.27

- [patch] ユーザーアカウント機能の追加に伴う法務関連文書の更新: ユーザーアカウント機能の追加に伴い、利用規約およびプライバシーポリシーを改定しました。

### 2026.01.27

- [patch] サイドーで保存したプランを確認できるように: サイドバーで保存したプランを確認できるようになりました。

### 2026.01.28

- [patch] アイコンを選択したときにマイページモーダルを表示: アイコンを選択したときにマイページモーダルを表示し、アカウント設定を変更できるようになりました。

### 2026.01.28

- [patch] 飛行機等の移動手段の入力方法を簡略化: 飛行機等の移動手段の入力を希望入力の際に簡単に入力できるようにしました。

### 2026.01.29

- [patch] AIに考慮してほしい要望の設定機能: ユーザーごとに、AI生成時に常に考慮してほしい要望（例：朝食あり、カフェ巡り多め、ホテルの星数など）を設定・保存できるようになりました。

### 2026.01.30

- [patch] 個人の旅のスタイルを設定可能に: どんなスタイルで旅をするのかを設定して、よりパーソナライズドされたプラン生成が可能になりました。

### 2026.01.30

- [patch] 保存済みプランにフラグを立てれるように: 保存済みプランにフラグを立てることができ、フラグを立てたプランは一番上に表示されます。

### 2026.02.01

- [minor] 有料プラン（Proプラン）の提供開始: 旅のスタイル設定やプラン生成数・保存数の無制限化など、より快適にサービスをご利用いただける有料プランの提供を開始しました。

### 2026.02.02

- [patch] 希望入力フォームのUI変更: 希望入力が簡単かつ見やすくなりました。

### 2026.02.02

- [patch] プラン画面のUI変更: プラン画面で移動の独自UIを実装しました。

### 2026.02.02

- [patch] 動的OGP作成: SNSシェア時に、プラン名と写真が入った魅力的なカード画像を自動生成するようになりました。

### 2026.02.03

- [patch] サブスクリプションユーザーの複雑な旅程生成時にProモデルを使用: サブスクリプションプランに加入しているユーザーが複雑なプランを生成する際に、Proモデルを使用するようになりました。

### 2026.02.03

- [patch] 希望入力を3フェーズ化: 希望入力のステップが多く、また分かりにくかったのをまとめ、簡単にプラン生成に移行できるようにしました。

### 2026.02.03

- [patch] 生成待ち時間の減少: プランの概要生成後にプランを見ることができるようにし、体感的な待ち時間を減少しました。

### 2026.02.03

- [patch] プラン保存数を全ログインユーザーが無制限に: 作成したプランをログインするだけで制限なく保存できるようになりました。

### 2026.02.04

- [patch] 信頼性バッジ表示: 生成されたスポットに対して、検証済み、AI生成、要確認のバッジを表示するようにしました。

### 2026.02.05

- [patch] Google Map連携: 提案されたスポットをGoogle Mapですぐに確認できるようになりました。

### 2026.02.05

- [patch] 詳細プランの生成失敗問題の修正: 1,2日目の詳細プラン生成が失敗する問題を修正しました。

### 2026.02.05

- [patch] ホテル・航空券予約のリンクを設置: AIが生成した旅程プランにホテルや航空券が含まれている場合、リンクをクリックすることで直接予約サイトを訪問できるようになりました。

### 2026.02.05

- [patch] スポットの詳細を表示: 生成されたスポットの詳細をカードを開くことで表示されるようにしました。

### 2026.02.05

- [patch] 旅程カードのUI更新: プランページの旅程カードを、旅程・旅のしおりらしいデザインを目指し、何をするのかがわかりやすいUIに変更しました。

### 2026.02.06

- [patch] コスト表示機能の追加: 生成されたプランからAIがコストの概算を計算し表示する機能を追加しました。

### 2026.02.06

- [patch] カレンダー連携: Google CalendarおよびiCalenderにエクスポートする機能を追加しました。

### 2026.02.07

- [patch] 予約リンクの精度向上: 予約リンクの精度を向上させ、より正確なページに遷移するようになりました。

### 2026.02.07

- [patch] スポット詳細情報の精度向上: スポットの詳細情報の精度を向上させ、より正確な情報を表示するようになりました。

### 2026.02.07

- [patch] 予算精度の向上: AIによる予算見積もりの精度を向上させ、より実態に近い費用を算出できるようになりました。

### 2026.02.08

- [patch] サイト全体のUI修正: サイト全体のUIを見直し、より使いやすく見やすいデザインに修正しました。

### 2026.02.08

- [patch] 持ち物リスト生成の追加: 旅行の目的地や期間に合わせて、必要な持ち物リストを自動で生成する機能を追加しました。

### 2026.02.08

- [patch] フィードバックシステムの実装: サービス改善のため、ユーザーからのフィードバックを送信できるシステムを実装しました。

### 2026.02.09

- [patch] PDF出力機能の拡充: PDF出力に旅程、渡航情報、持ち物リストを含められるようになりました。

### 2026.02.09

- [patch] AI生成精度の向上: AIによるプラン生成の精度をさらに向上させ、より満足度の高いプランが提案されるようになりました。

### 2026.02.09

- [patch] GoogleMapによるルート表示: 生成されたプランのルートをGoogle Map上で表示できるようになりました。

### 2026.02.10

- [patch] UI/UXの大幅改善とマップ機能強化: プラン作成画面をカードベースのモダンなデザインに刷新し、手書き風デザインを整理して視認性を向上させました。また、マップのルート表示を改善しました。

### 2026.02.11

- [patch] 不具合修正と国際対応: Google Maps API連携の安定性を向上させ、海外スポットの検索精度を改善しました。タイムラインの表示順序も修正されました。

### 2026.02.13

- [patch] モバイル体験の向上と検索精度改善: モバイルでのスクロール動作を滑らかにし、スポット検索（Places API）の精度をさらに強化しました。AIモデルのバッジ表示も改善されました。

### 2026.02.14

- [patch] AI生成エンジンの進化: AIモデルの抽象化レイヤーを導入し、複数のAIプロバイダーを柔軟に切り替えられるマルチプロバイダー戦略を実装しました。

### 2026.02.15

- [patch] パフォーマンスと安定性の向上: プラン生成時のタイムアウトエラーを削減し、システム全体のパフォーマンス監視を強化しました。ビルドやテストの安定性も向上しました。

### 2026.02.16

- [patch] 外部旅行サービスの検索連携: 外部の旅行プロバイダー情報を検索・参照できる機能を追加しました。より広範な旅行情報を確認できるようになります。

### 2026.02.16

- [patch] ブログ機能（β版）の追加: 旅行の体験や情報を発信・閲覧できるブログ機能を追加しました。

### 2026.02.16

- [patch] プラン詳細画面のジャーナルスタイル化: プラン詳細画面を、旅の記録を綴るノートのような「ジャーナルスタイル」に刷新しました。

### 2026.02.16

- [patch] サイト内ナビゲーションの改善: ブログや新機能へスムーズにアクセスできるよう、サイト内の導線を整理・改善しました。

### 2026.02.17

- [patch] 「旅のしおり」公開機能のリリース: 作成した旅行プランを「旅のしおり」として公開し、他のユーザーに共有できる機能を追加しました。

### 2026.02.17

- [patch] 公開・非公開の切り替え設定: プランごとに公開・非公開をワンクリックで切り替えられるスイッチを実装しました。

### 2026.02.17

- [patch] 公開プラン一覧ページ: 他のユーザーが作成・公開したプラン（旅のしおり）を探して閲覧できる一覧ページを公開しました。

### 2026.02.17

- [patch] プラン詳細画面の地図追従レイアウト: PC表示時に地図がスクロールに追従するようにし、プランと地図を対照しやすくしました。

### 2026.02.17

- [patch] コミュニティセクションの追加: ユーザーコミュニティの活性化に向け、トップページおよびフッターにコミュニティセクションを追加しました。

### 2026.02.17

- [patch] モバイル版地図表示の切り替え機能: スマートフォン表示時に、プラン詳細と地図をボタン一つで切り替えられる機能を追加しました。

### 2026.02.18

- [patch] トップページのデザインリニューアル: 「Tabi x Idea x Deai」をコンセプトに、スクラップブックをイメージした新しいトップページデザインを公開しました。

### 2026.02.18

- [patch] プラン作成ウィザードの刷新: 旅行の条件入力をよりスムーズに行えるよう、ステップ形式の入力フォーム（ウィザードUI）を刷新しました。

### 2026.02.18

- [patch] 公開設定の同期修正: プランの公開状態変更が即座に反映されない問題を修正し、同期精度を向上させました。

### 2026.02.18

- [patch] 決済システムの安定化: 決済処理時に発生していた一部のエラーを修正し、処理の安定性を向上させました。

### 2026.03.03

- [patch] FAQ・料金・法務ページの情報整合を更新: FAQ、料金、使い方、Tabideaについて、利用規約・プライバシーポリシー等の記載を最新仕様に合わせて見直しました。

### 2026.03.05

- [patch] 多言語対応の拡張（法務・更新履歴のi18n化）: 利用規約・プライバシーポリシー・更新履歴ページの本文/履歴データを翻訳キー管理へ移行し、`src/app/[locale]/(marketing)` 配下のユーザー向けハードコード文言を解消しました。
- [patch] 多言語対応の拡張（チャット・持ち物生成）: `/api/chat` の同意判定・行き先変更案内文言と、持ち物リスト生成 action のスキーマ説明/生成プロンプトを翻訳キー管理に移行し、locale に応じた出力を可能にしました。
- [patch] 多言語対応の拡張（渡航情報 action）: `travel-info` helper のソース表示名・免責文を翻訳キー管理へ移行し、action 層でも locale 指定で文言切替できるようにしました。
- [patch] 多言語対応の拡張（国抽出辞書の外部化）: `country-extractor` の都市→国マッピングおよび国名リストを messages 管理へ移行し、action 内の辞書ハードコードを撤去しました。
- [patch] 多言語対応の拡張（src/app 文字列リテラル整理）: `PlanCodeClient` の日付解析トークンを翻訳キー管理へ移行し、`src/app` 内の日本語文字列リテラルを解消しました。
- [patch] 多言語対応の拡張（components 共通UI）: `AuthButton` / `SyncPrompt` / `PublishingSection` の文言を翻訳キー管理へ移行し、コンポーネント層のハードコードを削減しました。

### 2026.03.12

- [patch] プラン生成の中断時に途中プランが残る問題を修正: 生成失敗時にジョブ進捗の部分日程をクリアし、失敗状態で途中結果が表示されにくいよう改善しました。
- [patch] 旅程ナラティブ生成プロンプトを改善: 説明文が文途中で終わる出力（「...」「…」）を避けるルールを追加しました。
- [patch] タイムアウト安全域を調整: プラットフォーム制限に先行して終了判定できるよう、compose パイプライン内部の締切を短縮しました。
- [patch] 生成失敗時の再試行を追加: タイムアウト系の失敗は compose を自動で1回リトライし、失敗確率を低減しました。
- [patch] SSE 異常終了時の途中表示を解消: 終端イベントなしでストリームが閉じた場合に部分日程を即時クリアするよう修正しました。
- [patch] タイムアウト耐性を強化: semantic/narrative で時間不足時に決定的フォールバックへ切り替え、生成失敗ではなく低遅延プラン継続を優先しました。
- [patch] ヒーロー画像取得を先行実行: 旅程後段で待たないよう事前フェッチを導入し、総処理時間のテールレイテンシを削減しました。


### 2026.03.14

- [patch] タイムアウト時フォールバックのプラン具体性を改善: 目的地ごとの代表スポット候補（例: 大阪城天守閣・黒門市場・道頓堀）を使う決定的プラン生成に変更し、位置が曖昧な候補名のみになるケースを抑制しました。
- `local` fix(semantic-planner,timeout): malformed structured output recovery が platform budget を食い潰し、seed / compose の deterministic fallback まで遅延する問題を最小修正で安定化。① `generateStructuredJsonWithRecovery()` の text recovery を 1 回の compact JSON 再送に限定し、semantic seed/day/full planner ごとに短い recovery budget を設定。② recovery 呼び出し自体にも timeout を掛け、壊れた JSON を深追いせず deterministic fallback へ早く戻るよう変更。③ malformed JSON ログは巨大な生テキスト全量ではなく、messages / rawTextLength / 安全な sample を出す観測ログへ置き換え。④ 回帰テストを更新し、「途中切れ JSON は 1 回だけ recovery を試して失敗なら即 fallback」方針を固定。
