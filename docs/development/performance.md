# Performance Guide

更新日: 2026-03-03

## 1. Scope

サーバーアクションとAI生成処理は、`PerformanceTimer`による計測を必須とします。

対象例:
- Outline generation
- Chunk generation
- 外部API呼び出しを含む重い処理

## 2. Required Rules

1. `createOutlineTimer` / `createChunkTimer` などのファクトリを使う
2. 主要ステップを `timer.measure()` で囲む
3. 終了時に `timer.log()` を呼ぶ
4. 目標時間を定義し、必要に応じて tier別に切り替える

## 3. Representative Targets

| Step | Flash target (ms) | Pro target (ms) |
| --- | ---: | ---: |
| usage_check | 500 | 500 |
| cache_check | 300 | 300 |
| rag_search | 2000 | 2000 |
| prompt_build | 100 | 100 |
| ai_generation (outline) | 15000 | 30000 |
| ai_generation (chunk) | 20000 | 35000 |
| hero_image | 2000 | 2000 |
| outline total | 20000 | 35000 |
| chunk total | 22000 | 37000 |

## 4. Instrumentation Pattern

```ts
const timer = createOutlineTimer();
const result = await timer.measure("ai_generation", () => service.generate());
timer.log();
```

## 5. Optimization Playbook

- I/Oを`Promise.all`で並列化
- キャッシュヒット経路を先に評価
- モデル出力上限（token）を明示
- 長いプロンプトの重複を削除
- 失敗時リトライ設定を現実的な値へ調整

## 6. PR Checklist

- [ ] 計測が追加/維持されている
- [ ] 目標値が妥当
- [ ] ログが運用で読める形式
- [ ] docs更新済み
