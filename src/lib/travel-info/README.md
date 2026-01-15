# 渡航情報モジュール (Travel Info Module)

海外渡航に必要な情報（安全情報、気候、ビザ、マナー等）を複数のソースから収集・統合して提供するモジュールです。

## 機能概要

- **複数ソースからのデータ取得**: 公式API、Web検索、AI生成など
- **フォールバックチェーン**: ソース障害時の自動フォールバック
- **サーキットブレーカー**: 連続失敗時の自動遮断
- **カテゴリ別キャッシュTTL**: 情報の種類に応じた適切なキャッシュ期間
- **信頼性スコアリング**: 情報源の信頼性を数値化

## クイックスタート

```typescript
import {
  createDefaultTravelInfoService,
  ALL_TRAVEL_INFO_CATEGORIES,
} from '@/lib/travel-info';

// デフォルト設定でサービスを作成
const service = createDefaultTravelInfoService();

// 渡航情報を取得
const response = await service.getInfo('パリ', ['safety', 'climate', 'basic']);

// レスポンスを使用
console.log(`目的地: ${response.destination}`);
console.log(`国: ${response.country}`);

for (const [category, entry] of response.categories) {
  console.log(`${category}: `, entry.data);
}
```

## カテゴリ

| カテゴリ | 説明 | TTL |
|----------|------|-----|
| `basic` | 基本情報（通貨、言語、時差） | 24時間 |
| `safety` | 安全・医療情報（危険度、緊急連絡先） | 6時間 |
| `climate` | 気候・服装 | 30分 |
| `visa` | ビザ・入国手続き | 7日 |
| `manner` | 現地マナー・チップ | 30日 |
| `transport` | 交通事情 | 24時間 |

## キャッシュ戦略

### 利用可能な戦略

```typescript
import { createCacheManager } from '@/lib/travel-info';

// メモリキャッシュ（デフォルト）
const memoryCache = createCacheManager({ strategy: 'memory' });

// ファイルキャッシュ（開発用）
const fileCache = createCacheManager({
  strategy: 'file',
  fileConfig: { cacheDir: '.cache/travel-info' },
});

// Redisキャッシュ（本番用、要Redis設定）
const redisCache = createCacheManager({
  strategy: 'redis',
  redisConfig: { url: process.env.REDIS_URL },
});

// 自動選択（Redis > Memory）
const autoCache = createCacheManager({ strategy: 'auto' });
```

### カテゴリ別キャッシュ

```typescript
import { createCacheManager, getCategoryTtlSeconds } from '@/lib/travel-info';

const cache = createCacheManager({ useCategoryTtl: true });

// カテゴリ別に保存（自動TTL適用）
await cache.setWithCategory('paris', 'safety', safetyData);

// 取得
const cached = await cache.getWithCategory('paris', 'safety');
```

### キャッシュキー

```typescript
import { generateCacheKey, generateCacheKeyPattern } from '@/lib/travel-info';

// 単一キー
const key = generateCacheKey('paris', 'safety');
// => "travel-info:paris:safety"

// パターンマッチ用
const pattern = generateCacheKeyPattern('paris', '*');
// => "travel-info:paris:*"
```

## 信頼性スコアリング

### スコアの計算

```typescript
import { createReliabilityScorer } from '@/lib/travel-info';

const scorer = createReliabilityScorer();

// ソースの信頼性スコアを計算
const score = scorer.calculateScore({
  sourceType: 'official_api',
  retrievedAt: new Date(),
});
// => 95 (公式APIは高スコア)

// 追加要因を考慮
const adjustedScore = scorer.calculateScore(source, {
  freshness: 0.8,        // 情報の新しさ
  crossValidation: 0.9,  // 他ソースとの一致度
});
```

### 信頼性レベル

```typescript
const level = scorer.getReliabilityLevel(85);
// => 'high'

const display = scorer.getReliabilityDisplay(85);
// => {
//   label: '信頼性: 高',
//   color: 'green',
//   icon: 'CheckCircle',
//   description: '公式情報源から取得'
// }
```

### スコア閾値

| スコア範囲 | レベル | 説明 |
|-----------|--------|------|
| 80-100 | `high` | 高信頼性（公式情報源） |
| 60-79 | `medium` | 中信頼性（複数ソースで確認済み） |
| 40-59 | `low` | 低信頼性（参考情報） |
| 0-39 | `uncertain` | 要確認（公式情報での確認推奨） |

## ソースタイプと基本スコア

| ソースタイプ | 説明 | 基本スコア |
|-------------|------|-----------|
| `official_api` | 公的機関API | 95 |
| `official_web` | 公的機関Webサイト | 90 |
| `commercial` | 商用サービス | 75 |
| `news` | ニュースメディア | 70 |
| `web_search` | 一般Web検索 | 60 |
| `ai_generated` | AI生成 | 50 |
| `blog` | 個人ブログ | 40 |
| `unknown` | ソース不明 | 30 |

## サーキットブレーカー

連続失敗時にソースへのアクセスを一時停止します。

```typescript
import { createTravelInfoService, createCacheManager, createCategoryMapper } from '@/lib/travel-info';

const service = createTravelInfoService({
  cacheManager: createCacheManager(),
  categoryMapper: createCategoryMapper(),
  circuitBreakerConfig: {
    failureThreshold: 3,      // 3回連続失敗でオープン
    resetTimeoutMs: 60000,    // 1分後にハーフオープン
    halfOpenAttempts: 1,      // 1回成功でクローズ
  },
});

// サーキットブレーカーをリセット
service.resetCircuitBreaker('sourceName');
```

## フォールバックチェーン

```typescript
import { executeFallbackChain } from '@/lib/travel-info';

const result = await executeFallbackChain(
  sources,
  async (source) => await source.fetch(destination),
  {
    maxAttempts: 3,
    timeoutMs: 10000,
    onFailure: (source, error) => {
      console.log(`${source.sourceName} failed: ${error.message}`);
    },
  }
);
```

## 環境変数

### 必須

```bash
# Gemini AI（フォールバック用）
GOOGLE_GENERATIVE_AI_API_KEY=your-api-key
```

### オプション

```bash
# Redis（本番用キャッシュ）
REDIS_URL=redis://localhost:6379

# 外部API
OPENWEATHER_API_KEY=your-api-key
EXCHANGE_RATE_API_KEY=your-api-key
```

## ディレクトリ構造

```
src/lib/travel-info/
├── index.ts                 # メインエクスポート
├── interfaces.ts            # インターフェース定義
├── travel-info-service.ts   # メインサービス
├── cache/
│   ├── index.ts
│   ├── cache-config.ts      # キャッシュ設定
│   ├── cache-manager.ts     # キャッシュマネージャー
│   └── strategies/
│       ├── memory-cache.ts  # メモリキャッシュ（LRU）
│       ├── file-cache.ts    # ファイルキャッシュ
│       └── redis-cache.ts   # Redisキャッシュ（スタブ）
├── sources/
│   ├── mofa-api.ts          # 外務省API
│   ├── weather-api.ts       # 天気API
│   ├── exchange-api.ts      # 為替API
│   ├── country-api.ts       # 国情報API
│   └── gemini-fallback.ts   # Geminiフォールバック
├── utils/
│   ├── reliability-scorer.ts # 信頼性スコアリング
│   ├── source-ranker.ts      # ソースランキング
│   └── category-mapper.ts    # カテゴリマッパー
└── __tests__/               # テスト
```

## 使用例

### カスタムサービスの作成

```typescript
import {
  createTravelInfoService,
  createCacheManager,
  createCategoryMapper,
} from '@/lib/travel-info';

const service = createTravelInfoService({
  cacheManager: createCacheManager({
    strategy: 'memory',
    memoryConfig: {
      maxEntries: 500,
      defaultTtlMs: 3600000,
    },
  }),
  categoryMapper: createCategoryMapper(),
  defaultTimeout: 30000,
  defaultLanguage: 'ja',
  categoryTimeout: 10000,
  debug: true,
});
```

### 特定カテゴリの取得

```typescript
const safetyInfo = await service.getCategoryInfo('Tokyo', 'safety');

if (safetyInfo.success) {
  console.log('危険度:', safetyInfo.data.dangerLevel);
  console.log('警告:', safetyInfo.data.warnings);
}
```

### キャッシュ操作

```typescript
// キャッシュされた情報を取得
const cached = await service.getCachedInfo('Tokyo');

// キャッシュを無効化
await service.invalidateCache('Tokyo');
```

## テスト

```bash
# 全テストを実行
pnpm test src/lib/travel-info

# 特定のテストファイルを実行
pnpm vitest src/lib/travel-info/__tests__/cache-manager.test.ts
```

## 注意事項

- 本番環境ではRedisキャッシュの使用を推奨
- 為替レートは頻繁に変動するため1時間TTLを使用
- AI生成情報は必ず公式情報での確認を推奨
- サーキットブレーカーは連続失敗時にソースを一時的にスキップ
