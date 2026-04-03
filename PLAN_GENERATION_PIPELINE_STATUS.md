# Plan Generation Pipeline Status

このファイルは plan-generation pipeline 専用の正本です。`CHANGELOG.md` が全体の更新履歴、ここは「何が壊れていて、何を意図して直し、次に何を直すか」を追うための運用台帳です。

更新ルール:
- plan-generation pipeline に関わる挙動変更時は `CHANGELOG.md` に加えて必ずこのファイルも更新する
- 同じ `errorCode` が再発した場合は新しい失敗として散らさず、既存の failure pattern に recurrence を追記する
- 最新ログを根拠に書く。推測だけで確定事項を書かない

## Current Goal

- fallback はあくまで escape hatch とし、基本は fallback なしで一発成功することを目標にする
- fallback は保険であり成功条件ではない。`one_shot_full_day_success_rate` を主 KPI とし、fallback-heavy success も是正対象として扱う
- successful itinerary でも昼までで終わる構成は不合格とし、午後以降の実活動があることを Core 品質の必須条件にする
- `draft_generate` の repeated fallback loop を止める
- incomplete artifact を downstream に流さない
- `core_ready` までの完走率を安定させる
- 同じ失敗が再発した時に、何を意図してどこを直したかを root で追えるようにする
- failure 時は入力フォームを隠し、失敗面だけを見せる。フォーム再表示は user が `入力に戻る` を押した時だけにする
- top page の failure は retryable でも modal-first とし、最初は入力フォームを見せない
- retryable な day failure は terminal failure UI に落とさず、same-run continuation で current day/current strategy/current substage から継続させる
- one run で retryable failure が起きても、resume cursor を失って同じ day を full-day から踏み直さない
- Core itinerary の完成は enrichment と切り分けて `core_ready` として明示し、user-facing 完了の判断を narrative/verify に引きずられないようにする
- finalize 後の保存状態も `core_ready` を正として扱い、replay・cleanup・resume 判定が `completed` 前提で分岐しないようにする
- `stream` route は replay/配信に寄せ、pass 実行と finalize は `run processor` service に集約する
- 将来の worker/job 化に備えて、SSE とは独立した run processing contract を維持する
- `draft_generate` の loose cursor (`resumeSubstage`, `nextDayIndex`, `dayChunkIndex`) を正本にせず、`currentDayExecution` を same-run continuation の唯一の実行位置として育てる
- same-run replay / process 再実行で同じ run を再 finalize しない。`one run => one finalized trip version` を厳守する
- `draft_generate` の進行は day 単位で観測できるようにし、`run.day.started` / `run.day.completed` を基準に current day の進みを追う
- persisted lifecycle でも retryable failure と terminal failure を分け、`failed_retryable` は same-run continuation の一時停止、`failed_terminal` だけを user-facing failure とする
- `draft_generate` の live path は 1 invocation = 1 day completion を守り、same-run continuation の正本は `currentDayExecution` に固定する

## Known Failure Patterns

### FP-000: retryable `draft_generate` failure が resume cursor を失い、same-run resume が同じ day を最初からやり直す

- First seen: `2026-04-03`
- Latest recurrence:
  - [dev-20260403-123108.log](/C:/Users/tomoki_ttttt/Next.js/Tabidea/tabidea/logs/dev-20260403-123108.log)
- Typical signature:
  - `same_run_resume` 自体は使われる
  - しかし retryable な `draft_generate` failure 後の `run.paused` に `nextSubstage` / `nextDayIndex` / strategy cursor が残らない
  - 次回 resume で current day が `split_day_v5` から再開始され、同じ failure shape に戻る

### FP-001: finalized run の process/replay が再 finalize を起こし、同じ run から複数の completion を出しうる

- First seen: `2026-04-03`
- Latest recurrence:
  - [dev-20260403-120223.log](/C:/Users/tomoki_ttttt/Next.js/Tabidea/tabidea/logs/dev-20260403-120223.log)
- Typical signature:
  - same-run resume 後に最終的には成功している
  - しかし同じ `runId` から `trip_persist_completed` と `run_finished` が複数回出る
  - replay/process 再実行が finalize fence を通らず、同じ run が再保存される
- Why this is bad:
  - same-run continuation が「続きから」ではなく「同じ失敗の再挑戦」になる
  - partial recovery と strategy escalation の意味が薄れ、時間だけ伸びる

### FP-010: `core_ready` が event だけで persisted session state に反映されず、replay / cleanup / finalize が `completed` 前提で分岐する

- First seen: `2026-04-03`
- Latest recurrence:
  - [dev-20260403-123108.log](/C:/Users/tomoki_ttttt/Next.js/Tabidea/tabidea/logs/dev-20260403-123108.log)
- Typical signature:
  - `run.core_ready` は emit される
  - しかし persisted state は `completed` で保存される
  - replay branch / cleanupExpiredRuns / resume 判定が `completed` と `core_ready` で二重化しやすい
- Why this is bad:
  - Core itinerary 完成と最終 completion の境界がコード上で曖昧になる
  - finalize replay や terminal-state cleanup が state/event 不整合を起こしやすい

### FP-011: `stream` route が replay・実行・pause・finalize を同時に持ち、同じ修正を何度も route へ積み直す

- First seen: `2026-04-03`
- Latest recurrence:
  - [dev-20260403-123108.log](/C:/Users/tomoki_ttttt/Next.js/Tabidea/tabidea/logs/dev-20260403-123108.log)
- Typical signature:
  - replay / pass loop / pause / finalize / failure classification が 1 route に集中
  - recurring bug 修正が毎回 `stream/route.ts` に集まり、resume/finalize/replay の境界で regression が起きやすい
- Why this is bad:
  - 実行責務と配信責務が分離されていない
  - job/worker 化への移行点がなく、SSE route が planner engine そのものになってしまう

### FP-001: `draft_generation_invalid_output` が `day_outline_parse` で再発する

- First seen: `2026-04-02`
- Latest recurrence:
  - [dev-20260403-190817.log](/C:/Users/tomoki_ttttt/Next.js/Tabidea/tabidea/logs/dev-20260403-190817.log)
  - [dev-20260402-153545.log](/C:/Users/tomoki_ttttt/Next.js/Tabidea/tabidea/logs/dev-20260402-153545.log)
  - [dev-20260402-050231.log](/C:/Users/tomoki_ttttt/Next.js/Tabidea/tabidea/logs/dev-20260402-050231.log)
- Typical signature:
  - `passId=draft_generate`
  - `errorCode=draft_generation_invalid_output`
  - `rootCause=invalid_structured_output`
  - `substage=day_outline_parse`
  - `pauseReason=recovery_required` が複数回続いたあと失敗
- Why this is bad:
  - 同じ contract の parse failure を繰り返しても strategy が変わらず、run が pause を量産して終わる
  - UX が悪いだけでなく、free runtime では時間とコストを消費し続ける

### FP-002: incomplete artifact reuse による短縮旅程/空旅程の保存リスク

- First seen: `2026-04-02`
- Latest recurrence:
  - [dev-20260402-042238.log](/C:/Users/tomoki_ttttt/Next.js/Tabidea/tabidea/logs/dev-20260402-042238.log)
  - [dev-20260402-050231.log](/C:/Users/tomoki_ttttt/Next.js/Tabidea/tabidea/logs/dev-20260402-050231.log)
- Typical signature:
  - failed run の retry が `plannerDraft` / `draftPlan` を過信
  - requested day count と itinerary day count が一致しないまま finalize に進む
- Current status:
  - completeness gate と finalize guard で保存自体は止めた
  - ただし upstream の `draft_generate` 不安定さは引き続きボトルネック

### FP-003: success しても fallback-heavy で時間がかかりすぎる

- First seen: `2026-04-02`
- Latest recurrence:
  - [dev-20260402-165302.log](/C:/Users/tomoki_ttttt/Next.js/Tabidea/tabidea/logs/dev-20260402-165302.log)
- Typical signature:
  - `run_finished` は出る
  - `totalDurationMs` が数分単位まで伸びる
  - `draft_generate` が同じ day で `split_day_v5 -> micro_day_split -> constrained_completion` を何度も往復する
- Why this is bad:
  - fallback が救済ではなく主経路になっている
  - 体感速度、コスト、安定性のすべてを悪化させる

### FP-004: success しても昼までで終わり、その後 hotel / return transit が前に出る

- First seen: `2026-04-02`
- Latest recurrence:
  - [dev-20260402-172327.log](/C:/Users/tomoki_ttttt/Next.js/Tabidea/tabidea/logs/dev-20260402-172327.log)
- Typical signature:
  - `run_finished` は出る
  - `completedStopCount` が requested days に対して少ない
  - itinerary 上は昼食後に hotel や return flight が見え、午後以降の実活動が不足している
- Why this is bad:
  - 旅程本体が未完成なのに成功扱いになっている
  - hotel / flight injection が不足した午後プランを隠してしまう

### FP-005: `constrained_completion` が day payload ではなく slot payload を返し、同じ parse failure を再発する

- First seen: `2026-04-02`
- Latest recurrence:
  - [dev-20260402-183837.log](/C:/Users/tomoki_ttttt/Next.js/Tabidea/tabidea/logs/dev-20260402-183837.log)
- Typical signature:
  - `passId=draft_generate`
  - `plannerStrategy=constrained_completion`
  - `substage=day_parse`
  - `errorCode=draft_generation_invalid_output`
  - `rootCause=invalid_structured_output`
  - 実際の返却 shape は `stops[]` ではなく `slots[]` 側に寄っている
- Why this is bad:
  - strategy を切り替えても contract が切り替わっておらず、同じ parse failure を別 strategy で再生産している
  - `artifact_reuse` で新 run を切っても同じ day の同じ failure shape に戻る

### FP-006: same-run resume 後も day 2 で `missing_meal` と contract mismatch が再発し、UX が full-screen error で分断される

- First seen: `2026-04-02`
- Latest recurrence:
  - [dev-20260402-195158.log](/C:/Users/tomoki_ttttt/Next.js/Tabidea/tabidea/logs/dev-20260402-195158.log)
- Typical signature:
  - `resumeStrategy=same_run_resume`
  - `passId=draft_generate`
  - day 2 で `missing_meal` → `slots` mismatch → `stops.0.name invalid_type` が再発
  - UI ではトップページ入力が full-screen error に置き換わり、入力位置へ戻れない
- Why this is bad:
  - same-run resume 自体は動いても recurring error が generic invalid output に埋もれている
  - 失敗時に入力フォームへ戻れず、再試行の UX が悪い

### FP-007: same-run resume の stream replay で `run_events` persist が duplicate key になり、ノイズを出す

- First seen: `2026-04-03`
- Latest recurrence:
  - [dev-20260403-002526.log](/C:/Users/tomoki_ttttt/Next.js/Tabidea/tabidea/logs/dev-20260403-002526.log)
- Typical signature:
  - `checkpoint=run_event_persist_degraded`
  - `duplicate key value violates unique constraint "run_events_run_id_seq_key"`
  - same-run stream replay 時の同一 `run_id + seq` 再保存
- Why this is bad:
  - planner failure ではないのに degraded error としてログを汚す
  - same-run resume の正常 replay と真の persist failure の区別がつかない

### FP-008: `constrained_completion` の `insufficient_stops` が provider error 扱いになり、失敗理由が崩れる

- First seen: `2026-04-03`
- Latest recurrence:
  - [dev-20260403-113427.log](/C:/Users/tomoki_ttttt/Next.js/Tabidea/tabidea/logs/dev-20260403-113427.log)
- Typical signature:
  - day 2 の `constrained_completion`
  - ログ出力上は `insufficient_stops`
  - final checkpoint では `draft_generation_provider_error`
- Why this is bad:
  - planner output invalid と LLM transport failure が混ざり、原因分析と UX が崩れる

### FP-009: top-page failure で retryable error が banner 扱いのまま残る

- First seen: `2026-04-03`
- Latest recurrence:
  - [dev-20260403-113427.log](/C:/Users/tomoki_ttttt/Next.js/Tabidea/tabidea/logs/dev-20260403-113427.log)
- Typical signature:
  - `originSurface=top_page`
  - retryable failure
  - planner input は hidden だが failure variant 自体は `banner`
- Why this is bad:
  - top page では失敗後の landing surface を modal に統一したいのに、表示ポリシーが hook 側分類に引っ張られる

### FP-012: terminal `draft_generate` failure が `failed_retryable` へ再分類され、state machine 例外で上書きされる

- First seen: `2026-04-03`
- Latest recurrence:
  - [dev-20260403-175608.log](/C:/Users/tomoki_ttttt/Next.js/Tabidea/tabidea/logs/dev-20260403-175608.log)
- Typical signature:
  - `pass_failed` では `state=failed_terminal`
  - 直後の `run_failed.errorCode` が planner code ではなく `Invalid state transition: failed_terminal → failed_retryable`
  - ブラウザ側では `MISSING_MESSAGE` が出て、`lib.planGeneration.compose.errors.generationCodes.Invalid state transition ...` を解決しようとする
- Why this is bad:
  - 本来の失敗理由 `draft_generation_missing_meal` が internal lifecycle error に上書きされ、原因分析が崩れる
  - terminal failure contract と `run.failed.errorCode` が壊れ、failure surface が正しく出ない

## Latest Log Analysis

### 2026-04-03 / `dev-20260403-182851.log`

#### Run `76a0ed6d-b941-4ea6-97a3-a7aaf5389abb`
- Requested days: 3
- Failure stage: `draft_generate / day_parse`
- Planner error: `draft_generation_missing_meal`
- Root cause: `invalid_structured_output`
- Completed day count: 0
- Why this failed:
  - `failed_terminal -> failed_retryable` の lifecycle bug 自体は再発しておらず、`run_failed.errorCode=draft_generation_missing_meal retryable=false` まで到達している
  - ただし day 1 が `split_day_v5 -> micro_day_split -> constrained_completion` を辿り、`sameErrorRecurrenceCount=2`, `fallbackHeavy=true`, `draftGeneratePauseCount=8` まで膨らんだうえで同じ `missing_meal` に戻っていた
  - ここで残っていた本質的な問題は lifecycle ではなく strategy loop で、active path から `constrained_completion` を外して fail-fast しない限り同じ入力で同じ停止を繰り返す

#### Run `731530a9-2600-43f7-97b9-655e21e76f48`
- Requested days: 3
- Failure stage: `draft_generate / day_parse`
- Planner error: `draft_generation_missing_meal`
- Root cause: `invalid_structured_output`
- Completed day count: 1
- Why this failed:
  - day 1 は一部進んだが、day 2 が再び `micro_day_split -> constrained_completion` に入り、`sameErrorRecurrenceCount=2`, `fallbackHeavy=true`, `draftGeneratePauseCount=7` で同じ terminal failure に戻った
  - retry path も route 上に `artifact_reuse` bootstrap が残っており、same-run continuation が使えない場合に cross-run で同形失敗を再生産する余地が残っていた
  - 対策として active retry contract を `same_run_resume` のみに寄せ、deprecated session runtime と `artifact_reuse` を active path から除去する

### 2026-04-03 / `dev-20260403-175608.log`

#### Run `84742621-d653-494f-90e2-5ccd9278fb88`
- Requested days: 3
- Failure stage: `draft_generate / day_parse`
- Planner error: `draft_generation_missing_meal`
- Root cause: `invalid_structured_output`
- Completed day count: 0
- Why this failed:
  - day 1 の生成が `split_day_v5 -> micro_day_split -> constrained_completion` まで段階的に escalte したあと、`constrained_completion` の `day_parse` で `missing_meal` により `failed_terminal` へ到達している
  - しかし processor の terminal branch が `errorCode !== runtime_budget_exhausted` という広すぎる条件で retryable failure 扱いへ入り、`persistRunSession(..., failed_retryable)` を呼んで state machine に弾かれていた
  - その結果、`run_failed.errorCode` が planner code ではなく internal exception `Invalid state transition: failed_terminal → failed_retryable` に置き換わり、ブラウザでは i18n key 解決失敗まで連鎖した
  - ここで直すべきは planner output そのものより先に、terminal failure を terminal のまま公開 contract に流す lifecycle の整合性
  - フロント側も unknown `errorCode` を翻訳キーとしてそのまま解決しない guard が必要

### 2026-04-03 / `dev-20260403-123108.log`

#### Run `44fbb38f-9803-4c2c-a87a-88f5e0f34aea`
- Requested days: 3
- Failure stage: `draft_generate / day_parse`
- Error: `draft_generation_missing_meal`
- Root cause: `invalid_structured_output`
- Completed day count: 1
- Completed stop count: 4
- Why this failed:
  - day 2 が `split_day_v5 -> micro_day_split -> constrained_completion` まで進んだあと `draft_generation_missing_meal` で stop
  - retryable failure 後の `run.paused` に current day/current strategy/current substage の resume cursor が残らず、same-run resume が day 2 を `split_day_v5` から踏み直していた
  - その結果、`resume` が continuation ではなく同じ failure shape の再実行になっていた
  - さらに finalize 後の `core_ready` は event としてしか扱われず persisted state が `completed` のままだったため、replay / cleanup / resume の境界が曖昧だった

### 2026-04-02 / `dev-20260402-165302.log`

#### Run `7868f671-b45d-4633-877b-2ebdcb8eb859`
- Requested days: 3
- Result: success
- Total duration: `411331ms`
- Completion level: `partial_verified`
- Why this is too slow:
  - `draft_generate` は pass 単体では 3〜8 秒で収まるが、`run_paused` と stream 再接続を大量に繰り返している
  - day 1 から day 3 まで同じ day で strategy oscillation が起き、fallback が主経路化している
  - `run_finished` 時点では strategy summary が `null` で、fallback-heavy success を集計しにくい

### 2026-04-02 / `dev-20260402-172327.log`

#### Run `97137d8a-5c30-4798-821b-eb414a7cf00f`
- Requested days: 3
- Result: success
- Total duration: `102058ms`
- Completion level: `partial_verified`
- Why this is still not acceptable:
  - 完走はしたが `fallbackHeavy=true`, `currentStrategy=constrained_completion`, `recoveryCount=5`, `draftGeneratePauseCount=6` で fast path 成功ではない
  - `completedStopCount=11` で 3 日旅に対して stop 密度が低く、午後の実活動が薄い旅程を通しやすい
  - 成功基準に午後カバレッジがなかったため、昼で終わる日を downstream の hotel / flight injection が見えにくくしていた

### 2026-04-02 / `dev-20260402-153545.log`

#### Run `16f5b6fb-4162-4a12-9d58-67802984ed3b`
- Requested days: 3
- Failure stage: `draft_generate / day_outline_parse`
- Error: `draft_generation_invalid_output`
- Root cause: `invalid_structured_output`
- Completed day count: 1
- Completed stop count: 4
- Why this failed:
  - `full_day -> micro_day_split` fallback 後も outline parse が成立せず、同じ recovery loop を継続した

#### Run `ef4b0baa-92e5-4d9b-995b-c77be8084a18`
- Requested days: 3
- Failure stage: `draft_generate / day_outline_parse`
- Error: `draft_generation_invalid_output`
- Root cause: `invalid_structured_output`
- Completed day count: 1
- Completed stop count: 4
- Why this failed:
  - retry 後も同一 day・同一 strategy・同一 parse failure が再発した

#### Run `53f2c831-bd40-4b60-8893-2bea6b941d78`
- Requested days: 3
- Failure stage: `draft_generate / day_outline_parse`
- Error: `draft_generation_invalid_output`
- Root cause: `invalid_structured_output`
- Completed day count: 2
- Completed stop count: 9
- Why this failed:
  - day 3 まで進んでも同じ outline parse 契約で詰まり、completion harness がなかったため停止判断が遅れた

### 2026-04-02 / `dev-20260402-183837.log`

#### Run `cd662595-89c0-4c91-8940-2c176b2e4cfd`
- Requested days: 3
- Failure stage: `draft_generate / day_parse`
- Error: `draft_generation_invalid_output`
- Root cause: `invalid_structured_output`
- Completed day count: 0
- Completed stop count: 0
- Why this failed:
  - `split_day_v5 -> micro_day_split -> constrained_completion` まで進んでも、最終 day contract が `stops[]` で安定せず day 1 で停止した

#### Run `35294aaf-0841-4a70-a0aa-4134006ab0bf`
- Requested days: 3
- Failure stage: `draft_generate / day_parse`
- Error: `draft_generation_invalid_output`
- Root cause: `invalid_structured_output`
- Completed day count: 0
- Completed stop count: 0
- Why this failed:
  - `artifact_reuse` は `normalizedInput` と `plannerSeed` の再利用に留まり、day 1 の contract mismatch を止められなかった

#### Run `029e734d-8775-4a3e-a889-f0c9d1aff6ff`
- Requested days: 3
- Failure stage: `draft_generate / day_parse`
- Error: `draft_generation_invalid_output`
- Root cause: `invalid_structured_output`
- Completed day count: 1
- Completed stop count: 4
- Why this failed:
  - day 1 を通しても day 2 で同じ constrained failure shape が再発し、strategy 固有の contract mismatch が generic invalid output に埋もれていた

### 2026-04-02 / `dev-20260402-195158.log`

#### Run `c5f7ca08-3ec9-4ae7-8744-8d6a167fe1a5`
- Requested days: 3
- Result: failed after repeated same-run resumes
- Failure stage: `draft_generate / day_parse`
- Why this failed:
  - same-run continuation は効いているが、day 2 で `missing_meal`、`invalidFieldPath=slots`、`invalidFieldPath=stops.0.name` が同じ failure shape として再発した
  - `draft_generate` terminal path が一部 generic `draft_generation_invalid_output` に落ち続け、ユーザーには recurring cause が見えにくかった
  - トップページの planner UI は error 時に full-screen fallback へ切り替わり、入力位置から継続しづらかった

### 2026-04-03 / `dev-20260403-002526.log`

#### Run `4822a1f0-3793-4d8c-a0c0-92d088994c18`
- Requested days: 3
- Result: failed after same-run resume
- Failure stage: `draft_generate / day_parse`
- Why this failed:
  - day 1 は `stops.0.name invalid_type` から `micro_day_split`、さらに `slots` mismatch を経て `constrained_completion` で通った
  - day 2 で同じ `stops.0.name` → `slots` failure shape が再発し、strategy ごとの contract invalid がまだ十分に収束しなかった

#### Run `0bbe069d-fc55-47ed-9f1a-0af6c6982034`
- Requested days: 3
- Result: failed after same-run resume
- Failure stage: `draft_generate / day_parse`
- Why this failed:
  - `resumeStrategy=same_run_resume` 自体は動いているが、day 2 の recurring contract mismatch が deterministic に止まり切らず、同じ day の別 strategy に入り直した
  - 併せて stream replay で `run_events_run_id_seq_key` duplicate が複数回出ており、same-run replay の idempotency 不足が露出した

### 2026-04-03 / `dev-20260403-113427.log`

#### Run `f3ef8a0d-7385-4192-8eda-a099ae2cd60b`
- Requested days: 3
- Result: failed after same-run resumes
- Failure stage: `draft_generate / day_parse`
- Why this failed:
  - day 1 は `split_day_v5 -> micro_day_split -> constrained_completion` を経て完成
  - day 2 は `missing_meal` で一度止まり、その後 `constrained_completion` の再試行で `insufficient_stops` が出ている
  - しかし final failure は一部 `draft_generation_provider_error` として記録され、planner invalid と transport failure の境界が崩れていた
  - 先頭 run では `run.progress persistence timed out after 1000ms` も複数回出ており、planner core failure と event durability ノイズが混ざっていた

## Fix Ledger

### 2026-04-03 / preserve retryable day cursor for same-run continuation
- Problem:
  - 最新ログで retryable な `draft_generate` failure を `run.paused` に変えても、resume cursor が失われて same-run resume が current day を最初からやり直していた
- Intent:
  - retryable day failure は same-run continuation の素材として扱い、`resumePassId` / `resumeSubstage` / `nextDayIndex` / strategy state を保持したまま次の stream へ渡す
- Change:
  - `draft-generate.ts` の terminal failure builder は retryable day failure でも resume patch を clear せず、strategy-aware な `resumeSubstage` と current day cursor を保存するよう更新
  - `stream/route.ts` の retryable failure branch は追加の `persistRunSession()` で pause metadata を上書きせず、pass 実行後の persisted session をそのまま `run.paused` として扱うよう変更
  - `POST /api/agent/runs/:runId/resume` を追加し、same-run continuation を fresh retry と別 API 契約へ切り出した
  - `usePlanGeneration()` は retryable pause/failure の再開で create route ではなく resume endpoint を優先使用するよう更新
  - SSE event 契約に `run.retryable_failed` と `run.core_ready` を追加し、一時失敗と Core itinerary 完成を `run.failed` / `run.finished` から切り分けた
  - route / draft-generate tests を追加し、retryable failure で `nextSubstage` / `nextDayIndex` が保持されることを固定
- Expected outcome:
  - same-run resume が current day/current strategy/current substage から本当に継続し、day 2 を `split_day_v5` から踏み直さない
- Verification:
  - `src/lib/services/plan-generation/passes/draft-generate.test.ts`
  - `src/app/api/agent/runs/[runId]/stream/route.test.ts`
- Status:
  - implemented

### 2026-04-03 / structured current-day execution as canonical resume state
- Problem:
  - `draft_generate` の resume 位置が `resumeSubstage` / `nextDayIndex` / `dayChunkIndex` / strategy counters に分散し、processor / state machine / logs がそれぞれ別の loose field を見ていた
- Intent:
  - current day / strategy / substage / attempt / recurrence を 1 つの structured state として保持し、same-run continuation の正本にする
- Change:
  - `PipelineContext.currentDayExecution` を追加し、`draft_generate` の pause/terminal patch が structured current day execution を常に保存するよう更新
  - harness state は `currentDayExecution` を優先して復元し、`resolvePausePayload()` も `currentDayExecution` から `nextSubstage` / `nextDayIndex` / `currentStrategy` を導出するよう変更
  - `determineResumeState()` は `currentDayExecution` がある failed session を `normalized` へ戻し、same-run continuation を正しく再開できるようにした
  - architecture doc を `process` route + `core_ready` + `currentDayExecution` 前提へ更新
- Expected outcome:
  - resume source が loose cursor ではなく current-day execution に統一され、same-run continuation の regression が起きにくくなる
- Verification:
  - `draft-generate` / `state-machine` regression tests
- Status:
  - implemented

### 2026-04-02 / completion harness ledger + repeated-error stop
- Problem:
  - 同じ `draft_generation_invalid_output` が `micro_day_split` の同一 day / 同一 substage で再発しても、partial pause を繰り返していた
- Intent:
  - 同じ failure fingerprint を検知したら、同一 micro strategy に留まらず `Strategy C` へ昇格させ、それでも無理な場合だけ固定 taxonomy で止める
- Change:
  - `draft_generate` に harness state を追加
  - `currentStrategy`
  - `strategyEscalationCount`
  - `recoveryCount`
  - `sameErrorRecurrenceCount`
  - `Strategy C: constrained_completion` を追加
  - `draft_generation_strategy_exhausted` / `strategy_loop_exhausted` を taxonomy に追加
  - `run_finished` / `run_failed` に harness summary を出すよう更新
  - root のこの台帳を追加
- Expected outcome:
  - repeated invalid output loop が `micro_day_split` から constrained completion へ昇格し、それでも失敗した場合だけ terminal failure に収束する
- Verification:
  - `draft-generate` regression test で同一 `day_outline_parse` 再発が `constrained_completion` へ昇格することを確認
- Status:
  - implemented

### 2026-04-03 / same-run replay idempotency + banner-only failure surface
- Problem:
  - 最新ログで day 2 の `stops.0.name invalid_type` / `slots` mismatch が same-run resume 後も再発し、stream replay では `run_events_run_id_seq_key` duplicate が degraded error として記録されていた
  - トップページでは failure 時にも入力フォームが見え続け、失敗面の状態が曖昧だった
- Intent:
  - split-day contract mismatch を constrained completion へ早めに昇格させ、同じ recurring shape を generic invalid output に戻さない
  - same-run replay の event persist は idempotent no-op にし、planner failure と混ぜない
  - failure 時は入力フォームを隠し、user が `入力に戻る` を押したときだけ再表示する
- Change:
  - `draft-generate.ts` で `split_day_v5` の `draft_generation_contract_mismatch` / `draft_generation_missing_meal` 再発時に `constrained_completion` へ直接昇格する分岐を追加
  - `specializeDraftGenerateClassification()` で `stops.* invalid_type` を split/constrained の contract mismatch として分類強化
  - `run-events.ts` の `(run_id, seq)` append を upsert + existing fetch に変更し、same-run replay を idempotent にした
  - `TravelPlannerSimplified` は failure 時に input flow を hidden にし、banner/modal だけを表示するよう更新
- Expected outcome:
  - day 2 の recurring contract failure がより早く `constrained_completion` か terminal failure に収束する
  - same-run replay で duplicate persist ノイズが出ない
  - top page failure 時は入力フォームが隠れ、`入力に戻る` でだけ復帰する
- Verification:
  - `draft-generate` / planner failure surface / simplified planner tests を更新
- Status:
  - implemented

### 2026-04-03 / top-page modal-first + insufficient-stops taxonomy
- Problem:
  - 最新ログで `insufficient_stops` が provider error に崩れ、失敗理由が正しく出ていなかった
  - top page failure は planner input を hidden にしても、retryable case では banner variant が残っていた
  - `run.progress` persist timeout が failure analysis のノイズになっていた
- Intent:
  - `insufficient_stops` を planner invalid として固定 code へ分離する
  - top page failure は retryable/terminal を問わず modal-first に統一する
  - `run.progress` persist timeout は degraded flood として扱わない
- Change:
  - `draft-generate.ts` に `draft_generation_insufficient_stops` を追加し、`provider_error` への誤分類を防止
  - `usePlanGeneration` と ja/en i18n に新しい error code を追加
  - `TravelPlannerSimplified` は top page origin の failure で effective variant を `modal` に強制
  - `stream/route.ts` は `run.progress` persistence timeout を degraded log から除外
- Expected outcome:
  - day 2 recurring failure の reason が `missing_meal` / `insufficient_stops` / contract mismatch として安定する
  - top page failure では最初から modal だけが見え、入力フォームは `入力に戻る` を押すまで hidden
  - event persist timeout ノイズが planner failure と混ざらない
- Verification:
  - targeted planner UI / hook / draft-generate tests と lint
- Status:
  - implemented

### 2026-04-03 / transient failure must not surface as terminal + same-run finalize fence
- Problem:
  - 最新ログ `dev-20260403-120223.log` では day 3 の `draft_generation_missing_meal` で同じ `runId` が 2 回 `run_failed` になった後、`same_run_resume` で最終的には成功していた
  - その一方で同じ `runId` から `trip_persist_completed` / `run_finished` が 3 回ずつ出ており、異なる `tripId` が作られていた
  - フロントには `食事枠が不足していたため...` と `旅程生成を完了できませんでした` が出るが、ログ上はそれが最終結果ではなく一時失敗だった
- Intent:
  - retryable な plan-generation failure を最終失敗として UI に出さない
  - same-run resume が有効な間は progress 継続を優先し、terminal failure だけを modal/banner に出す
  - 同じ run の finalize は 1 回に固定し、再接続時は既存の `tripId/tripVersion` を replay する
- Change:
  - stream route は retryable な `draft_generate` failure を `run.failed` ではなく `run.paused` + `pauseReason=recovery_required` に収束させる
  - `usePlanGeneration` は retryable paused failure を自動で resume し、同じ run が後で成功するケースで stale failure UI を出さない
  - `pipelineContext` に `finalizedTripId` / `finalizedTripVersion` / `finalizedCompletionLevel` / `finalizedAt` を保存し、completed run の再接続時は finalize を再実行せず completion event を replay する
- Expected outcome:
  - `draft_generation_missing_meal` のような retryable failure は、最終的に same-run success する限り UI failure surface に出ない
  - 同一 `runId` から複数 `tripId` が作られない
  - 最新ログのような `run_finished` 多重記録は replay に変わり、trip persistence は 1 回に収束する
- Verification:
  - `usePlanGeneration` の retryable auto-resume test
  - stream route の completed replay / no-refinalize test
  - targeted lint
- Status:
  - implemented

### 2026-04-02 / fallback-last policy + day-scoped strategy
- Problem:
  - 成功 run でも fallback-heavy で、同じ day の strategy が oscillation していた
- Intent:
  - fallback を当てにせず、day ごとに fast path を優先し、fallback は一方向の救済経路に限定する
- Change:
  - `draft_generate` の harness state を day-scoped に更新
  - `draftGenerateStrategyDay` を追加し、同じ day の間だけ current strategy を sticky にする
  - day 完了時は harness state を reset して次 day を再び fast path から始める
  - `finalDraftStrategySummary` を保持し、`run_finished` / `run_failed` で summary が消えないようにした
- Expected outcome:
  - 同じ day で `constrained_completion` に入った後に `split_day_v5` へ戻らない
  - success run でも fallback-heavy だったかを summary で判定できる
- Verification:
  - targeted tests と lint を通す
- Status:
  - implemented

### 2026-04-02 / no-midday-only acceptance + hotel/flight must not mask missing afternoon
- Problem:
  - successful run でも昼までしか実活動がなく、午後以降は hotel や return transit が前に出ていた
- Intent:
  - 午後以降の実活動がない itinerary は success 扱いにしない
  - hotel / flight injection は補助表示に留め、旅程本体不足を隠す用途に使わせない
- Change:
  - `draft_generate` に午後カバレッジの hard gate を追加
  - `accommodation` を hard minimum stop count から除外
  - `timeline-builder` の trim で最初の afternoon/evening 実活動を保護
  - `inject-accommodations` に 19:00 未満の早すぎる宿泊注入抑止を追加
  - `timeline-to-itinerary` finalize に midday-only itinerary を reject する最終ガードを追加
- Expected outcome:
  - 平日でも arrival/departure 制約がない限り、昼で終わる旅程は保存されない
  - hotel / flight が午後の実活動不足を隠すことがなくなる
- Verification:
  - draft / timeline / finalize regression tests を追加
- Status:
  - implemented

### 2026-04-02 / strategy-specific contract mismatch detection
- Problem:
  - `constrained_completion` や `micro_day_split` の失敗が generic `draft_generation_invalid_output` に畳まれ、strategy ごとの contract mismatch が見えなかった
- Intent:
  - strategy-specific な output shape mismatch を taxonomy で分離し、同じ constrained mismatch を 2 回以上繰り返したらその日の生成を fail-closed にする
- Change:
  - `draft_generate` に `draft_generation_contract_mismatch` / `draft_generation_outline_contract_mismatch` / `draft_generation_constrained_contract_mismatch` を追加
  - raw payload shape (`stops` / `slots`) と strategy / substage を見て classification を specialize
  - constrained mismatch が同じ fingerprint で再発したら `constrained_contract_recurrence_exhausted` で terminal failure に収束
  - ja/en error message と hook mapping を追加
- Expected outcome:
  - 最新ログの `constrained_completion` 契約違反が generic invalid output に埋もれず、同じ day で無駄にループしない
- Verification:
  - `draft-generate` regression test で constrained payload mismatch の 1 回目が専用 error になり、2 回目で terminal failure になることを確認
- Status:
  - implemented

### 2026-04-02 / failure surface + top-page return + recurring day-2 fix
- Problem:
  - 最新ログで same-run resume 後も day 2 の `missing_meal` / contract mismatch が再発し、トップページ入力は full-screen error に置き換わっていた
- Intent:
  - recurring error を固定 taxonomy で見える化し、失敗時は banner / modal を使い分けつつ、トップページ入力から始めた場合は同じ位置へ戻して継続できるようにする
- Change:
  - `draft_generate` に `draft_generation_missing_meal` を追加
  - `usePlanGeneration` に failure state (`failureUi`, `failureKind`, `canRetry`, `resumeRunId`, `originSurface`) を追加
  - shared `PlanGenerationFailureSurface` を新設し、トップページは full-screen error を廃止して input flow 上に banner / modal を表示
  - トップページ origin の失敗時は `planner-input-anchor` へ scroll 復帰
  - plan page も shared failure surface を使うよう統一
- Expected outcome:
  - same recurring failure が generic invalid output に埋もれない
  - retryable error は inline banner、terminal error は modal で出し分けられる
  - トップページ入力から始めた場合でも、失敗後にその位置へ戻って条件を見直せる
- Verification:
  - targeted hook / planner component / draft-generate tests
- Status:
  - implemented

### 2026-04-02 / same-run continuation as the default retry path
- Problem:
  - failed run の retry が新 run を作って `artifact_reuse` に入り、結局同じ day の同じ failure shape に戻っていた
- Intent:
  - retry の正系を same-run continuation に変え、completed day と current strategy state を持ったまま同じ run を再開する
- Change:
  - `POST /api/agent/runs` は `isRetry=true` かつ再開可能な failed run がある場合、新 run を作らず既存 run の state を `determineResumeState()` で巻き戻して返す
  - `resumeStrategy` は `same_run_resume` を優先し、`artifact_reuse` は cross-run fallback に降格
- Expected outcome:
  - user retry で新 run を量産せず、同じ run / 同じ stream URL のまま再開できる
  - latest log のような `artifact_reuse` 後の同形失敗を減らせる
- Verification:
  - route test で incomplete artifact retry が `run_01` ではなく `old_run` を返すことを確認
- Status:
  - implemented

### 2026-04-03 / day-atomic planner live path
- Problem:
  - `draft_generate` が同一 invocation で複数 day をまたぐ giant loop を持ち続け、same-run continuation や strategy summary が day 単位で安定しなかった
- Intent:
  - live path を `1 invocation = 1 day completion` に寄せ、resume source を `currentDayExecution` へ固定する
- Change:
  - `DraftGenerateCurrentDayExecution` に `dayType`, `outlineArtifact`, `chunkArtifacts`, `candidateStops` を追加
  - `draft_generate` は day 完了後に completed か next day checkpoint yield で必ず戻るよう変更し、同一 invocation で複数 day をまたがない day-atomic 実行へ寄せた
  - attempt / outline / chunk 復元は `currentDayExecution` を優先し、legacy loose cursor は fallback に降格
- Expected outcome:
  - planner core の進行が day 単位で安定し、same-run continuation が current day の canonical state だけで継続できる
  - giant pass が同一 request 内で複数 day を往復して膨らみ続ける挙動を減らせる
- Verification:
  - `draft-generate`, `run-processor`, `process/stream/resume routes`, `hook` を含む targeted Vitest 137 件を通過
- Status:
  - implemented

### 2026-04-03 / fail-fast planner path + runtime pruning
- Problem:
  - 最新ログでは lifecycle bug 解消後も `draft_generate` が `constrained_completion` まで進んで同じ `draft_generation_missing_meal` を再発し続け、cross-run `artifact_reuse` と旧 session route も active tree に残っていた
- Intent:
  - planner の active path を `split_day_v5 -> micro_day_split` までに制限し、same-day recurring failure は短く terminal に収束させる
  - retry contract は `same_run_resume` だけを正系にし、deprecated runtime branch を active tree から除去する
- Change:
  - `draft-generate.ts` は split recurrence を `micro_day_split` までに留め、micro recurrence は `micro_strategy_exhausted` で terminal failure に fail-fast するよう変更
  - stale `constrained_completion` cursor は resume 時に復元せず、旧 strategy が active path に戻らないよう更新
  - `POST /api/agent/runs` は `artifact_reuse` bootstrap と関連 metadata を削除し、retry は resumable run がある時だけ `same_run_resume` を使うよう整理
  - active `src/app/api/plan-generation/session/*` stubs を削除し、参照用の `archive/unused` のみ残した
- Expected outcome:
  - 最新ログのような `fallbackHeavy=true` / pause 7-8 回の same-day loop を止め、`draft_generation_missing_meal` が短く terminal failure へ収束する
  - retry で旧 artifact path や deprecated route を踏まず、active runtime の経路が `/api/agent/runs/*` に揃う
- Verification:
  - targeted `draft-generate` / `agent-runs route` tests
- Status:
  - implemented

### 2026-04-03 / outline recovery contract alignment
- Problem:
  - 最新ログ `dev-20260403-190817.log` では `micro_day_split / day_outline_parse` が `invalidFieldPath=slots` を繰り返し、3 回目で `draft_generation_outline_contract_mismatch` に落ちていた
  - outline path は `day + slots` 契約なのに、compact text recovery は `draft_day` mode を使って `stops` 契約の修復指示を返していた
- Intent:
  - outline recovery 自体を `slots` 契約へ揃え、partial / malformed response でも outline salvage を成立させやすくする
  - `insufficient_slots` を generic invalid output に落とさず、`slots` 契約違反として一貫分類する
- Change:
  - `structured-json-recovery.ts` に `draft_outline` mode を追加し、compact text recovery prompt を `day + slots` 専用にした
  - `draft_generate.day_outline_*` は `recoveryMode: 'draft_outline'` を使うよう変更
  - outline partial salvage は `slots` だけでなく `stops` 形式や `slotIndex` 欠落も受けて連番 `slots` へ復元するよう強化
  - `validateOutline()` 起点の `insufficient_slots` も `invalidFieldPath=slots` / `draft_generation_outline_contract_mismatch` に統一
- Expected outcome:
  - outline recovery が day stop 契約へ誤誘導されず、`slots` 骨格の再構成率が上がる
  - `day_outline_parse` の terminal failure が generic `draft_generation_invalid_output` にぶれない
- Verification:
  - `structured-json-recovery` と `draft-generate` の targeted regression tests
- Status:
  - implemented

## Open Risks

- `micro_day_split` 自体の contract が free runtime とまだ相性悪い可能性がある
- repeated error を止めても、根本的に outline/chunk contract の成立率が低ければ完走率は上がり切らない
- `core_ready` までの正式な completion harness はまだ `draft_generate` 中心で、pipeline 全体へは未展開
- fallback-heavy success は見えるようになったが、fast path 一発成功率を直接 KPI 化するところまでは未実装
- 午後カバレッジを厳格化したことで、短いが通っていた run は failure に寄るため、draft fast path の成立率改善が引き続き必要
- stream の retryable failure は hidden progress 継続へ寄せたが、terminal failure と transient failure の event taxonomy はまだ整理余地がある

## Next Required Changes

1. `core_ready` と `fully_enriched` を pipeline の正式な完了概念として分離する
2. `split_day_v5` / `micro_day_split` の one-shot success rate を run summary から定点観測する
3. `fallbackHeavy` / `coreReadyMs` を正式な summary metric にする
4. `one_shot_full_day_success_rate` と `midday_only_day_count` を KPI として追加する
5. retryable failure 専用 event (`run.retryable_failed`) を導入するか、現行 `run.paused` ベースを正式仕様として文書化する
6. `currentDayExecution` を loose resume fields の互換レイヤに留めず、processor / executor / client 全体の canonical contract に寄せていく
