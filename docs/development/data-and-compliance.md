# Data Sources and Compliance

更新日: 2026-03-03

## 1. Purpose

この文書は、Tabideaで利用する外部データソースの利用方針、遵守事項、運用ルールをまとめたものです。

## 2. Compliance Principles

1. 公開情報の利用条件を確認してから実装する
2. robots.txt とレート制限を尊重する
3. 出典表示が必要な情報はUIまたはドキュメントで明示する
4. 情報鮮度と信頼性を利用者に伝える
5. 規約変更を定期点検する（四半期）

## 3. Main Sources

### 3.1 外務省 海外安全ホームページ

- URL: `https://www.anzen.mofa.go.jp/`
- 用途: 安全情報、危険レベル関連
- 注意点:
  - スクレイピング負荷を抑える
  - robots方針を確認する
  - 出典明記を維持する

### 3.2 REST Countries

- URL: `https://restcountries.com/`
- 用途: 基本国情報（通貨、言語、時差）
- 注意点:
  - キャッシュを活用して過剰リクエストを避ける

### 3.3 Weather API

- 用途: 気候・天候関連
- 実装参照: `src/lib/services/travel-info/sources/weather-api.ts`
- 注意点:
  - API key管理
  - レート制限順守

### 3.4 Exchange API

- 用途: 為替情報
- 実装参照: `src/lib/services/travel-info/sources/exchange-api.ts`

### 3.5 自社コンテンツ / Blog

- `posts` サブモジュール由来データ
- RAG文脈に利用

## 4. Technical Enforcement Points

- `src/lib/utils/scraping-policy.ts`: ドメイン別ポリシー
- `src/lib/utils/robots-checker.ts`: robots判定
- `src/lib/utils/http-client.ts`: 取得制御
- `src/lib/services/travel-info/*`: ソース統合

## 5. Attribution Rule

- 必要なソースは、表示またはレスポンスメタデータで出典を保持
- 再配布制限があるデータは保存・公開範囲を制限する

## 6. Security and Privacy

- 個人情報を含むデータを取得・保存しない
- APIキーは公開リポジトリに含めない
- ログに機密情報を含めない

## 7. Operations

四半期ごとに以下を実施:

1. 利用規約変更確認
2. robots挙動確認
3. 実装側のポリシー値見直し
4. docs更新（本ファイル + 関連実装）

## 8. Adding a New Source Checklist

- [ ] Terms of serviceを確認
- [ ] 商用利用可否を確認
- [ ] robotsを確認
- [ ] レート制限設定
- [ ] 帰属表示要件の反映
- [ ] キャッシュ戦略の決定
- [ ] エラーハンドリングとフォールバック追加
- [ ] 本ドキュメント更新
