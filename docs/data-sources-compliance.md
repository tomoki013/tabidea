# データソース利用規約確認書

このドキュメントは、AI Travel Plannerがアクセスする外部データソースの利用規約と遵守事項を記録します。

## 更新履歴

| 日付 | 更新者 | 内容 |
|------|--------|------|
| 2026-01-15 | AI Travel Planner Team | 初版作成 |

---

## 1. 外務省海外安全ホームページ

### 基本情報
- **URL**: https://www.anzen.mofa.go.jp/
- **確認日**: 2026-01-15
- **サービス種別**: 政府公開情報

### robots.txt
```
（要確認）
直接アクセスして最新のrobots.txtを確認してください：
https://www.anzen.mofa.go.jp/robots.txt
```

### 利用条件
- [x] 公開情報として利用可
- [x] 帰属表示必要
- [ ] API提供あり（※スクレイピングが必要）
- [ ] 商用利用については個別確認が必要

### 遵守事項
1. サーバーへの負荷を考慮し、リクエスト間隔を2秒以上空ける
2. User-Agentを適切に設定し、連絡先を明記する
3. 情報の引用時は出典を明記する
4. 取得データの二次配布は行わない

### 帰属表示例
```
出典：外務省海外安全ホームページ (https://www.anzen.mofa.go.jp/)
```

### 実装での対応
- `scraping-policy.ts`で`minDelayMs: 2000`を設定
- `respectRobotsTxt: true`でrobots.txtを尊重
- 帰属表示を`attribution`フィールドで定義

---

## 2. OpenWeatherMap

### 基本情報
- **URL**: https://openweathermap.org/
- **API URL**: https://api.openweathermap.org/
- **確認日**: 2026-01-15
- **利用規約URL**: https://openweathermap.org/terms
- **サービス種別**: 天気API

### 利用条件
- [x] 商用利用可（プランによる制限あり）
- [x] 帰属表示必要
- [x] API提供あり
- [x] 無料プランあり

### 無料プラン制限
- 60 calls/minute
- 1,000,000 calls/month
- 現在の天気データのみ

### 遵守事項
1. APIキーを適切に管理（環境変数で管理、公開リポジトリに含めない）
2. レート制限を遵守（60回/分）
3. 帰属表示をアプリケーション内に表示

### 帰属表示例
```
Weather data provided by OpenWeatherMap
```

### 実装での対応
- `scraping-policy.ts`で`maxRequestsPerMinute: 60`を設定
- APIキーは`OPENWEATHERMAP_API_KEY`環境変数で管理

---

## 3. REST Countries

### 基本情報
- **URL**: https://restcountries.com/
- **API URL**: https://restcountries.com/v3.1/
- **確認日**: 2026-01-15
- **サービス種別**: 国情報API（オープンソース）

### 利用条件
- [x] 商用利用可
- [ ] 帰属表示不要（推奨）
- [x] API提供あり
- [x] 無料（オープンソース）

### 遵守事項
1. 過度なリクエストを避ける
2. キャッシュを適切に活用

### 実装での対応
- `scraping-policy.ts`で`minDelayMs: 100`を設定
- レスポンスをキャッシュして負荷を軽減

---

## 4. ExchangeRate-API

### 基本情報
- **URL**: https://www.exchangerate-api.com/
- **API URL**: https://api.exchangerate-api.com/
- **確認日**: 2026-01-15
- **利用規約URL**: https://www.exchangerate-api.com/docs/terms-of-service
- **サービス種別**: 為替レートAPI

### 利用条件
- [x] 商用利用可（プランによる）
- [x] 帰属表示必要（無料プラン）
- [x] API提供あり
- [x] 無料プランあり

### 無料プラン制限
- 1,500 API requests per month
- 日次更新のみ

### 遵守事項
1. APIキーを適切に管理
2. 月間リクエスト制限を遵守
3. 帰属表示を表示

### 帰属表示例
```
Exchange rates provided by ExchangeRate-API
```

### 実装での対応
- `scraping-policy.ts`で`maxRequestsPerMinute: 30`を設定
- レスポンスをキャッシュして月間制限を節約

---

## 5. ともきちの旅行日記（自社サイト）

### 基本情報
- **URL**: https://tomokichidiary.com/
- **確認日**: 2026-01-15
- **サービス種別**: 自社運営ブログ

### 利用条件
- [x] 完全利用可（自社所有）
- [ ] 帰属表示不要
- [ ] robots.txt確認不要

### 実装での対応
- `scraping-policy.ts`で`respectRobotsTxt: false`を設定
- `minDelayMs: 500`で適度な間隔を維持

---

## 注意事項

### 定期確認
- 各サービスの利用規約は定期的に変更される可能性があります
- **四半期ごと**に各サービスの利用規約を再確認してください
- 変更があった場合は本ドキュメントと`scraping-policy.ts`を更新してください

### 法的考慮事項
1. **著作権**: スクレイピングしたコンテンツの著作権は元のサイトに帰属します
2. **個人情報**: 個人情報を含むデータの取得・保存は避けてください
3. **利用規約の変更**: 各サービスの利用規約は随時確認してください

### 連絡先情報
スクレイピングに関する問い合わせが来た場合の対応先：
- **User-Agent連絡先**: contact@tomokichidiary.com
- **サービスURL**: https://ai.tomokichidiary.com/

### 技術的実装
本ドキュメントの内容は以下のファイルで実装されています：
- `src/lib/utils/scraping-policy.ts` - ドメイン別ポリシー定義
- `src/lib/utils/robots-checker.ts` - robots.txt解析
- `src/lib/utils/http-client.ts` - 倫理的HTTPクライアント

---

## 確認チェックリスト

新しいデータソースを追加する際は、以下を確認してください：

- [ ] robots.txtの確認
- [ ] 利用規約の確認
- [ ] 商用利用の可否
- [ ] 帰属表示の要件
- [ ] レート制限の確認
- [ ] API提供の有無
- [ ] `ALLOWED_DOMAINS`への追加
- [ ] `DOMAIN_POLICIES`への設定追加
- [ ] 本ドキュメントへの記録
