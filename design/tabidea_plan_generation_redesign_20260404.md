# Tabidea プラン生成と周辺機能の再設計書

**対象範囲:** 初回プラン生成 / 完成後チャット編集 / リプラン / フレーム調整 / API / 認証認可 / 保存削除 / セキュリティ  
**文書種別:** 実装前の最終設計書（破壊的刷新前提）  
**目的:** 誰が読んでも同じ解釈になる粒度で、プラン生成とその周辺機能の正系設計を固定する  
**優先順位:** ① 生成成功率 ② 生成品質 ③ 責務分離  
**前提:** Netlify 無料プランの 30 秒制限 / Gemini 必須 / Places API は限定利用 / 匿名体験を許容

---

本書は会話で確定した要件・制約・運用方針をすべて織り込んだ、実装判断の基準文書である。

## 0. 本書の使い方

本書は『作るべきもの』だけでなく、『作ってはいけないもの』『曖昧にしてはいけない境界』『適用時の拒否条件』まで固定するための設計書である。  
この設計に反する実装上の都合は、実装で吸収するのではなく、設計レビューを通して変更可否を判断する。  
本書の対象はプラン生成本体と、その前後にある実行管理・保存・認証認可・チャット編集・リプラン・セキュリティである。宿泊具体化と都市間移動具体化は別パイプラインとする。

### 0.1 章構成

- **1章:** 目的・非目的・成功条件
- **2章:** 前提条件と制約
- **3章:** ドメインモデルと正本データ
- **4章:** 初回プラン生成パイプライン
- **5章:** 完成後チャット編集とリプラン
- **6章:** Places API / RAG / 補助パイプライン
- **7章:** REST API 設計
- **8章:** 認証・認可・匿名体験
- **9章:** セキュリティ設計
- **10章:** DB 保存・削除・個人情報保護
- **11章:** UX / 進捗表示 / エラー設計
- **12章:** 実装ポリシー・将来拡張の扱い

---

## 1. 目的・非目的・成功条件

### 1.1 目的

- ユーザーが短時間で『旅行として成立している』旅程を得られるようにする。
- 完成後にチャットで相談しながら、旅程の同一性を壊さない範囲で微修正できるようにする。
- AI には提案だけをさせ、保存可否・適用可否・公開可否は deterministic なサーバー側ルールで決定する。
- Netlify 無料プランの 30 秒制限の中でも成功率を最大化する。

### 1.2 非目的

- 全旅程を自由に何度でも再生成できる高度編集を、現時点の標準機能として提供すること。
- 宿泊施設や都市間移動の具体予約候補までを、初回プラン生成の正系に含めること。
- RAG を初回プラン生成の必須要素にすること。
- 未完成または整合性未達の旅程を、とりあえずユーザーに見せること。

### 1.3 成功条件（最重要）

| 優先度 | 項目       | 定義                                                                                                             |
| ------ | ---------- | ---------------------------------------------------------------------------------------------------------------- |
| 1      | 生成成功率 | completed に到達する run の割合を最優先で改善する。成立しない旅程は失敗として扱い、表示しない。                  |
| 2      | 生成品質   | completed に達した旅程が、要求日数・都市順・固定制約・must_visit・食事配置・基本移動負荷の観点で自然であること。 |
| 3      | 責務分離   | 生成、編集、具体化、保存、公開、検証、認可が明確に分離され、AI の責務が提案に限定されること。                    |

### 1.4 completed の定義

- **completed** は『構造化 itinerary 正本が成立し、必須の hard rule をすべて満たし、保存可能な canonical plan ができた状態』を指す。
- **narrative**（説明文・日ごとの紹介文・スポット説明文）は completed 条件に含めない。これは presentation 層の補助生成であり、旅程正本とは分離する。
- Places API の検証は completed 条件に含めない。must_visit の存在確認は best-effort で後段に行ってよいが、失敗しても旅程そのものが成立していれば completed になれる。

---

## 2. 前提条件と固定制約

### 2.1 実行環境前提

- 正系は **Netlify 無料プランの 30 秒制限** を前提にする。
- そのため、長時間一括実行ではなく、短い pass の連続実行と checkpoint / pause / resume を設計の前提にする。
- worker 前提にはしない。将来移行可能性は残せるが、本設計の正系は short-lived serverless である。

### 2.2 モデル・外部依存前提

- LLM は **Gemini** を必須とする。
- Places API は必須依存ではなく、限定的な後段利用に留める。
- RAG は初回正系には入れない。必要なら将来の optional enrichment とする。

### 2.3 対象旅行の前提

- 単一都市前提ではなく、**複数都市・周遊前提** で設計する。
- 深夜出発・早朝帰着など、日付境界と運用上の旅行境界がずれるケースを正規に扱う。
- 旅行の start/end は単純なカレンダー日付ではなく、**operational travel window** として扱う。

### 2.4 表示方針

- 未完成 run では進捗のみ表示し、旅程本体は表示しない。
- completed した canonical trip のみを正式表示対象にする。
- failed run の途中成果物はユーザー向け正式旅程としては表示しない。

### 2.5 宿泊・都市間移動の扱い

- 初回プラン生成の正系では、宿泊は具体ホテルではなく **stay_area_placeholder** までとする。
- 都市間移動も具体便・列車番号ではなく **intercity_move_placeholder** までとする。
- 宿泊具体化パイプライン、都市間移動具体化パイプラインは本設計の対象外だが、接続境界だけ定義する。

---

## 3. ドメインモデルと正本データ

### 3.1 正本（canonical plan）の基本原則

- 正本は言語依存の文章ではなく、言語非依存の構造データとする。
- AI の生テキストや説明文は正本に直接保存しない。
- 正本へ保存できるのは、deterministic layer が schema 検証と hard rule 検証を通したデータのみとする。

### 3.2 block 種別

| block_type                 | 意味               | 初回正系での扱い                       |
| -------------------------- | ------------------ | -------------------------------------- |
| spot                       | 観光・体験スポット | 生成対象                               |
| meal                       | 食事ブロック       | 生成対象                               |
| intercity_move_placeholder | 都市間移動の枠     | 生成対象。詳細具体化は別パイプライン   |
| stay_area_placeholder      | 宿泊エリアの枠     | 生成対象。ホテル候補化は別パイプライン |
| free_slot                  | 余白・予備時間     | 必要時のみ生成対象                     |

### 3.3 trip / city / day / block の階層

- **trip** は全体骨格と運用境界を持つ集約ルートである。
- **city** は都市順を保持する最小の周遊単位である。
- **day** は city 配下の1日単位のスケジュール単位である。
- **block** は day 内の最小編集単位であり、replan・chat edit が触れる単位でもある。

### 3.4 immutable zone と mutable zone

| immutable zone（変更禁止）      | mutable zone（変更許可候補）        |
| ------------------------------- | ----------------------------------- |
| 日数枠（frame edit を除く）     | 同一 day の spot / meal / free_slot |
| 都市順                          | 同一 day 内の順序調整               |
| 都市間移動 placeholder          | 滞在時間微調整                      |
| 宿泊エリア placeholder          | recommended / filler 差し替え       |
| fixed booking / fixed transport | 状況変化に伴う後続 block 再構成     |
| user hard constraints           |                                     |
| preserved must_visit            |                                     |

---

## 4. 初回プラン生成パイプライン

### 4.1 パイプラインの責務

- 初回プラン生成は『旅行として成立する骨格 itinerary を作ること』だけに集中する。
- 宿泊具体化・交通具体化・RAG・豊かな説明文生成は正系から外す。
- AI は semantic draft を提案するが、最終的な completed 判定はサーバー側が行う。

### 4.2 推奨 pass 構成

| 順  | pass                   | 役割                                          | 備考                                                                |
| --- | ---------------------- | --------------------------------------------- | ------------------------------------------------------------------- |
| 1   | normalize_request      | 入力正規化・hard/soft 制約抽出                | 日付、都市列、must_visit、fixed transport、free text をフィールド化 |
| 2   | plan_frame_build       | trip/city/day の骨格生成                      | 深夜出発・早朝帰着を operational travel window に変換               |
| 3   | draft_generate         | city/day/block の semantic draft 生成         | day 単位、必要なら chunk 単位で pause/resume                        |
| 4   | draft_validate         | schema / 必須構造 / 差分なし / ルール違反検査 | AI 出力をそのまま通さない                                           |
| 5   | draft_repair_local     | 局所修復                                      | 失敗部位だけ修復し再評価                                            |
| 6   | timeline_finalize      | 順序・滞在時間・バッファ確定                  | canonical itinerary へ整形                                          |
| 7   | completion_gate        | completed 可否の最終判定                      | 通らなければ failed                                                 |
| 8   | persist_completed_trip | 正本保存                                      | completed 時のみ保存                                                |

### 4.3 pause / resume の原則

- pause / resume は serverless 30 秒制限のために必須とする。
- 基本粒度は day 単位とし、長い日だけ chunk 単位を許可する。
- resume 可能なのは未 completed の run のみである。
- completed 後に旧 checkpoint から再開して trip を書き換えることは許可しない。

### 4.4 hard fail 条件

- itinerary JSON が成立しない。
- 日数・都市数・都市順が要求と一致しない。
- fixed transport / fixed date / fixed booking と整合しない。
- 1日が空になる、または最低限の構造を満たさない。
- 周遊順序が崩れる。
- 必須 block（特に食事や preserved must_visit）が欠落する。

### 4.5 completed 直前の completion gate

- 生成 run が completed になる前に、deterministic な completion gate を必ず通す。
- ここでは AI の自己申告や confidence は使わない。
- gate を通過できない場合は completed ではなく failed とする。
- trip frame が成立している
- city/day/block の必須フィールドが揃っている
- 都市順が壊れていない
- immutable zone に未解決矛盾がない
- meal block が必要数を満たしている
- preserved must_visit が残っている
- 正本 schema に落とし込める

### 4.6 narrative の扱い

**narrative** は『旅行説明文・各日説明文・スポット説明文』の総称であり、旅程正本そのものではない。したがって、narrative は completed 条件から除外し、presentation 層で後段生成してよい。

---

## 5. 完成後チャット編集とリプラン

### 5.1 コア機能としての位置づけ

- 完成後チャット編集は本アプリのコア機能の一つである。
- ただし chat は自然言語インターフェースであり、実際の旅程変更は replan engine が行う。
- AI は会話を通じて意図を整理できるが、変更範囲の最終決定権は deterministic rule engine が持つ。

### 5.2 chat と replan の分離

| レイヤ        | 責務                                                | 禁止事項                                       |
| ------------- | --------------------------------------------------- | ---------------------------------------------- |
| chat layer    | 相談、意図分類、必要な確認質問、proposal 要求の生成 | 自分で編集範囲を決めて旅程正本を直接変更しない |
| replan engine | 許可範囲内の変更候補生成、差分計算、validation      | scope 外の変更を提案しても適用しない           |
| apply layer   | user confirm 後の適用、新しい trip_version 発行     | 無確認で正本を上書きしない                     |

### 5.3 リプランの原則

- replan は『完成済み itinerary の局所修正』であり、再生成ではない。
- 旅程の同一性を壊してはいけない。
- scope 外の変更、都市順変更、全旅程ドリフトは reject する。
- 候補提示後に user confirm した場合のみ適用する。
- apply のたびに新しい trip_version を発行する。

### 5.4 変更起点ごとの許可範囲

| 変更起点               | 例                           | 許可範囲                                                     | 上限             |
| ---------------------- | ---------------------------- | ------------------------------------------------------------ | ---------------- |
| 会話由来の微修正       | 『このカフェを別のにしたい』 | 同一 day 内の spot / meal / free_slot の差し替え、順序微調整 | 最大2 block      |
| 状況由来の再調整       | 雨、疲労、遅延、休館         | 同一 day の後続 block のみ再構成                             | 1日の40%まで     |
| chat-driven frame edit | 前日深夜出発、翌日03:00帰国  | arrival/departure 周辺 day のみ再構成                        | 中間日は変更不可 |
| スタイル変更           | もう少しゆるく、食事多め     | 同一 city 内の tone / density 調整                           | 1 city のみ      |

### 5.5 frame edit ルール

- 出発日が前日深夜であっても、運用上は transport day と local day を分けて扱う。
- 帰国便が翌日早朝 03:00 発などの場合は、前日の夜 block に departure buffer を強制確保する。
- frame edit は chat からのみ起動できる。通常 replan API から直接呼ばない。
- frame edit でも都市順・中間日の骨格は維持する。

### 5.6 replan の hard rule

- trip 全体の日数枠（frame edit を除く）は変更不可。
- 都市順、都市間移動 placeholder、宿泊エリア placeholder は変更不可。
- fixed booking / fixed transport / user hard constraints は変更不可。
- preserved must_visit の削除は禁止。
- 変更対象外 day の block を変えてはいけない。
- 同一性を壊すほどの差分率超過は禁止。

### 5.7 replan の reject 条件

- immutable zone に触れている。
- 別都市へ飛んでいる、または都市順を崩している。
- preserved must_visit を消している。
- meal block が消える。
- 予約済み / fixed transport と衝突している。
- 差分率上限を超えている。
- no-op である。
- 予定全体の成立性を悪化させる。

### 5.8 将来の高度編集

将来のサブスク機能として、高度編集（より大きな scope の変更許可）を設計上は reserved capability として置く。ただし本設計時点では実装対象外であり、通常プランでは局所修正のみを正式サポートする。

---

## 6. Places API・RAG・補助パイプライン

### 6.1 Places API の役割

- Places API は初回プラン生成の critical path に入れない。
- API 使用量抑制のため、全スポット検証は行わない。
- must_visit に対してのみ、completed 後に best-effort の existence 確認を行ってよい。
- Places 検証に失敗しても、旅程そのものが成立していれば completed を阻害しない。

### 6.2 Places API のコストガードレール

- 初回生成時には Places を呼ばない。
- must_visit の確認時も、同一 query の結果は必ずキャッシュする。
- 1 スポットにつき 1 回の軽量 existence 確認を基本とし、opening hours / route / photo 取得は初回正系から外す。
- replan 正系では Places を呼ばず、必要なら既存の cache 済み facts のみ使う。

### 6.3 RAG の扱い

- RAG は初回正系プラン生成には入れない。
- 理由は、成功率最優先の方針と、依存追加による失敗点増加を避けるためである。
- 将来利用するなら、spot 説明や旅のヒントなど presentation 層の enrichment に限定する。

### 6.4 別パイプラインとして切り出すもの

- 宿泊具体化（stay pipeline）
- 都市間移動具体化（transport pipeline）
- narrative / 説明文生成（presentation pipeline）
- Places best-effort verification

---

## 7. REST API 設計

### 7.1 設計原則

- resource と command を分ける。
- chat と mutation を分ける。
- 匿名 generate とログイン後の編集を区別する。
- completed 前は進捗 API と completed result API を分ける。

### 7.2 初回生成 API

| endpoint                        | method | 認証     | 用途                                   |
| ------------------------------- | ------ | -------- | -------------------------------------- |
| `/v1/plan-runs`                 | POST   | 任意     | 初回生成開始。匿名・認証済み双方を許可 |
| `/v1/plan-runs/{run_id}`        | GET    | 条件付き | run 状態取得                           |
| `/v1/plan-runs/{run_id}/events` | GET    | 条件付き | SSE / replay。completed 前は進捗のみ   |
| `/v1/plan-runs/{run_id}/result` | GET    | 条件付き | completed 後の結果取得                 |

### 7.3 trip / version API

- `GET /v1/trips/{trip_id}` — completed の正本取得
- `GET /v1/trips/{trip_id}/versions` — version 一覧
- `DELETE /v1/trips/{trip_id}` — trip と関連データ完全削除

### 7.4 chat edit / replan API

- `POST /v1/trips/{trip_id}/edit-sessions` — 編集会話セッション作成（ログイン必須）
- `POST /v1/trips/{trip_id}/edit-sessions/{session_id}/messages` — 会話メッセージ追加。相談・意図分類用
- `POST /v1/trips/{trip_id}/edit-sessions/{session_id}:propose` — proposal 作成。許可 scope はサーバーが決定
- `POST /v1/trips/{trip_id}/edit-proposals/{proposal_id}:apply` — user confirm 後に適用し、新 version 発行
- `GET /v1/trips/{trip_id}/editable-scope` — 現在の trip に対して変更可能範囲を返す

### 7.5 public share API

- `POST /v1/trips/{trip_id}/shares` — 共有リンク作成
- `GET /v1/public/trips/{share_id}` — 読み取り専用閲覧

share は read only とし、edit session 作成・proposal apply・run event 参照には使用できない。

---

## 8. 認証・認可・匿名体験

### 8.1 認証方針

- 認証基盤は **Supabase Auth** を前提とする。
- 初回プラン生成のみ匿名を許可する。
- チャット編集、replan、proposal apply、trip 保存後の管理操作はログイン必須とする。

### 8.2 匿名体験の扱い

- 匿名 run は体験専用モードである。
- 匿名でも初回生成と completed result 閲覧は可能にする。
- 匿名 run の閲覧保護のため、run_id に加えて run_access_token を発行する。
- 匿名 trip は後からログイン後に claim できるようにする。

### 8.3 ログイン必須操作

- edit session 作成
- chat message 追加
- proposal 作成
- proposal apply
- trip 削除
- share 作成

### 8.4 認可原則

| 主体           | できること                                           | できないこと                                 |
| -------------- | ---------------------------------------------------- | -------------------------------------------- |
| anonymous      | 自身の匿名 run の進捗・結果閲覧                      | 編集、share 作成、他人 run 閲覧              |
| trip owner     | 閲覧、チャット編集、proposal apply、削除、share 作成 | 他人 trip 編集                               |
| trip viewer    | 共有 link による閲覧                                 | 編集、proposal 作成、apply                   |
| internal admin | 内部運用上必要な限定操作                             | ユーザー向け API で owner check を飛ばすこと |

### 8.5 object-level authorization

- 認可は route 単位ではなく object 単位で行う。
- trip_id, run_id, version_id, session_id, proposal_id, share_id を経由するたびに owner / viewer を再評価する。
- service role client を使う場合でも、API 層で owner check を省略してはいけない。

---

## 9. セキュリティ設計

### 9.1 信頼境界（trust boundary）

- **Layer 1:** user input — 信用しない。destination, must_visit, free text, edit 指示はすべて untrusted。
- **Layer 2:** AI output — さらに信用しない。structured JSON でも提案に過ぎない。
- **Layer 3:** deterministic planner harness — 唯一、保存可否・completed 可否・apply 可否を決めてよい層。
- **Layer 4:** external facts — Places など。参考にできるが絶対真実ではない。
- **Layer 5:** persisted canonical plan — 正式データ。AI 生出力を直接入れない。

### 9.2 AI の権限制限

- AI は提案者であり、保証者・認可者・保存判定者ではない。
- AI は編集範囲を最終決定してはいけない。scope は必ずサーバー側が決定する。
- AI の self-confidence、説明のもっともらしさ、自然言語の説得力は採用根拠にしない。

### 9.3 prompt injection / instruction injection 対策

- user free text は instruction と data を分離して prompt に埋め込む。
- user text を system prompt 相当の位置に置かない。
- user text は引用ブロックまたは構造化フィールドとして扱う。
- 出力 schema を厳格化し、schema 不一致は失敗とする。
- AI 出力中に『前の制約を無視せよ』等の文言があっても無視し、canonical plan へ保存しない。

### 9.4 SQL injection 対策

- SQL 文字列連結を禁止する。
- 動的 sort / filter / column 指定は allowlist に限定する。
- raw SQL は migration と厳格レビュー対象のみ許可する。
- chat 文面や user text を order by / table / column 名に使わない。
- search API でも全文検索用フィールド以外に user text を直接差し込まない。

### 9.5 認証・セッション保護

- 匿名 run の取得には run_access_token を必須にする。
- write 系 endpoint は CSRF 対策を前提にする。
- session fixation を避け、ログイン状態変更時にはセッションを更新する。
- cookie は host-only を基本とし、不要な親ドメイン共有を避ける。

### 9.6 idempotency / lock / replay safety

- 初回生成開始は idempotency_key を必須にする。
- proposal apply も idempotency_key を持つ。
- 同一 run に並列 executor を入れないための lock を設ける。
- completed 後に旧 checkpoint から resume して trip を変更してはならない。
- SSE replay は読み取り専用とし、状態遷移を発生させない。

### 9.7 abuse / cost abuse 対策

- 同一入力ハッシュでの短時間連続 generate を制限またはキャッシュする。
- 同一 trip に対する短時間の連続 replan apply を制限する。
- 同一 scope の repeated proposal を cooldown する。
- no-op edit と過大差分 edit を reject する。
- 1 回の replan request での AI call 数を制限する。

### 9.8 削除と監査

- trip 本体、chat 本体、proposal 本体は削除時に完全削除する。
- 削除後も PII を含まない最小監査ログだけを残す。
- 残してよい監査情報は operation type, timestamp, actor id など最小限に限定する。

---

## 10. DB 保存・削除・個人情報保護

### 10.1 保存区分

| 区分       | 保存対象                                                                     | 方針                  |
| ---------- | ---------------------------------------------------------------------------- | --------------------- |
| 長期保存   | completed trip canonical, trip_versions, 最小 share metadata                 | 正本として保持        |
| 短期保存   | plan_runs, checkpoints, edit_sessions, edit_proposals, 匿名 completed result | TTL 付き              |
| 保存しない | raw prompt, raw model text, provider secrets, 不要な precise logs            | 収集しない / 即時破棄 |

### 10.2 個人情報保護の原則

- **データ最小化:** 必要なデータのみ収集する。
- **目的限定:** 旅程生成・保存・編集・共有に必要な範囲に限定する。
- **保持期間限定:** 匿名 run、chat、proposal には TTL を設ける。
- **ユーザー削除可能:** trip と chat は削除操作で完全削除できるようにする。
- **completed 前データの公開禁止:** 未完成データは public 化しない。

### 10.3 削除ポリシー

- ユーザーが trip を削除した場合、trip 本体・trip_versions・chat・proposal・share を完全削除する。
- 匿名 run / 匿名 completed result は TTL 到達で自動削除する。
- 削除後は、PII を持たない最小監査ログのみ残す。

### 10.4 claim（匿名からログインへの引き取り）

- 匿名 completed trip は、ログイン後に claim できるようにする。
- claim 時には匿名 token とログインユーザーを照合し、新 owner に紐付ける。
- claim 後は通常の trip owner モデルに移行し、chat edit / proposal apply を許可する。

---

## 11. UX / 進捗表示 / エラー設計

### 11.1 進捗表示

- completed 前は中間旅程を見せず、進捗のみを見せる。
- 進捗表示は pass 名ではなく、ユーザーに分かる粒度（例: 条件整理中 / 旅程組み立て中 / 最終確認中）に翻訳する。
- UX は『途中を見せる』のではなく、『応答速度』で補う。

### 11.2 failed 時の扱い

- failed run では incomplete data を旅程として見せない。
- ユーザーには『成立する旅程を作れなかった』ことを明示する。
- 必要なら再入力のヒントや制約緩和提案を返すが、失敗した partial plan は表示しない。

### 11.3 chat edit UX

- chat では会話と提案候補提示を行う。
- 実際の変更は proposal として提示し、ユーザー確認後にのみ適用する。
- 適用結果は新 trip_version として扱い、以前の version と比較できるようにする。

---

## 12. 実装ポリシーと将来拡張の扱い

### 12.1 実装ポリシー

- 現行実装との互換性は維持しない。破壊的刷新を前提にする。
- 設計上の境界を崩してまで既存コードを温存しない。
- 曖昧な判断は実装コード内に埋め込まず、設計ルールに昇格させる。

### 12.2 reserved capability

- 高度編集は将来の有料機能候補として reserved capability に留める。
- 本設計時点では、高度編集の API や拡張性フックを作り込みすぎない。
- 今は初回生成・局所編集・安全な適用に集中する。

### 12.3 最終決定事項一覧

- 初回 generate は匿名でも許可する。
- replan / chat edit / proposal apply はログイン必須。
- 完成条件は canonical itinerary の成立であり、narrative は含めない。
- Places API は must_visit の best-effort 検証に限定し、completed 条件にはしない。
- RAG は初回正系には入れない。
- completed 前は進捗のみ表示する。
- trip と chat は削除時に完全削除する。監査ログは PII を持たない最小限のみ残す。
- apply のたびに新 trip_version を発行する。

---

## 付録A. 用語集

| 用語           | 定義                                                         |
| -------------- | ------------------------------------------------------------ |
| canonical plan | 正本として保存可能な、構造化済み旅程データ。                 |
| completed      | 正本保存可能な itinerary が成立した状態。                    |
| narrative      | 説明文や紹介文など、旅程正本ではない presentation 層の文章。 |
| replan         | 完成済み旅程の局所修正。再生成ではない。                     |
| frame edit     | arrival / departure 境界に関する時刻・日付調整。             |
| immutable zone | リプランで触れてはいけない領域。                             |
| proposal       | chat edit に対する変更候補。適用前の提案物。                 |
