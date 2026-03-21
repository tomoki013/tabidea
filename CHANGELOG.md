# CHANGELOG

## 運用ルール

- 更新履歴の唯一の正（Single Source of Truth）はこの `CHANGELOG.md` です。
- 変更があるすべてのPR/コミットで、必ず `CHANGELOG.md` を更新してください。
- `src/app/[locale]/(marketing)/updates/page.tsx` は一般ユーザー向けの要約表示であり、正本ではありません。
- `AGENTS.md` と `CLAUDE.md` の更新履歴運用はこのルールに従います。

## 開発者向けコミット履歴（コミット単位）

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
