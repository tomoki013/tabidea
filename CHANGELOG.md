# CHANGELOG

## 運用ルール

- 更新履歴の唯一の正（Single Source of Truth）はこの `CHANGELOG.md` です。
- 変更があるすべてのPR/コミットで、必ず `CHANGELOG.md` を更新してください。
- `src/app/[locale]/(marketing)/updates/page.tsx` は一般ユーザー向けの要約表示であり、正本ではありません。
- `AGENTS.md` と `CLAUDE.md` の更新履歴運用はこのルールに従います。

## 開発者向けコミット履歴（コミット単位）

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
