/**
 * Context Sandwich Prompt Builder
 *
 * 5層構造でプロンプトを構築:
 * 1. System Instruction (Role) — AIの役割定義とKnowledge Hierarchy
 * 2. Context A - "Tomokichi Voice" — RAGブログ記事
 * 3. Context B - "Golden Plans" — 理想的なプラン構造のFew-Shot例
 * 4. Context C - "Reality Grounding" — 外部APIからの基本情報
 * 5. User Instruction — ユーザーの具体的な入力
 */

import type { Article } from './types';
import type { GoldenPlanExample } from '@/data/golden-plans/types';
import type { TravelInfoSnapshot } from './adapters/travel-info-adapter';
import { formatTravelInfoForPrompt } from './adapters/travel-info-adapter';

/** プロンプトバージョン（KPI計測用） */
export const PROMPT_VERSION = 'v2.0-context-sandwich';

export interface PromptLayers {
  systemRole: string;
  tomokichiVoice: string;
  goldenPlans: string;
  realityGrounding: string;
  userInstruction: string;
}

export interface PromptBuilderOptions {
  context: Article[];
  goldenPlanExamples?: GoldenPlanExample[];
  travelInfo?: TravelInfoSnapshot;
  userPrompt: string;
  generationType: 'outline' | 'dayDetails' | 'modify';
}

export interface BuiltPrompt {
  /** Layer 1 + 2 + 3 + 4 を結合したシステム指示 */
  systemInstruction: string;
  /** Layer 5: ユーザーの入力 */
  userPrompt: string;
}

// ============================================
// Layer 1: System Role + Knowledge Hierarchy
// ============================================

function buildSystemRole(generationType: 'outline' | 'dayDetails' | 'modify'): string {
  const knowledgeHierarchy = `
[KNOWLEDGE HIERARCHY]
1. CONTEXT (Tomokichi Blog & Golden Plans): 最高権限。
   トーン、推薦スポット、旅行スタイルはここを最優先。
   CONTEXTに記載されたスポットや体験談は積極的に採用すること。
2. TOOL DATA (Travel Info / 渡航情報): 高権限。
   治安情報、気候、通貨、ビザ情報などの事実確認に使用。
3. MODEL KNOWLEDGE: フォールバック。
   一般的な推論や接続ロジックに使用。CONTEXTやTOOL DATAが不足する場合のみ利用。

[CITATION RULE]
CONTEXTからの推薦を採用した場合、該当アクティビティの
sourceフィールドにブログ情報を必ず記載すること:
- source.type: "blog"
- source.title: 記事タイトル
- source.url: 記事URL
- source.confidence: "high"

AIの一般知識から生成した場合:
- source.type: "ai_knowledge"
- source.confidence: "medium"

Golden Planの例を参考にした場合:
- source.type: "golden_plan"
- source.confidence: "high"`;

  const baseRole = `あなたは「ともきちの旅日記AI」です。
旅行ブロガー「ともきち」の視点で、実体験に基づいた温かみのある旅行プランを生成するAIアシスタントです。

性格特性:
- 旅好きで、特に穴場スポットや地元の人が通うお店を知っている
- 具体的で実用的なアドバイス（「〜がおすすめ」「〜に注意」）を心がける
- 旅行者目線でリアルな時間配分を意識する（移動時間含む）
- 説明は生き生きとした描写を心がけ、ロボット的な羅列を避ける

${knowledgeHierarchy}`;

  if (generationType === 'outline') {
    return `${baseRole}

[CURRENT TASK: OUTLINE GENERATION]
旅行のアウトライン（概要・ルート計画）を生成してください。
出力は日本語で行うこと。`;
  }

  if (generationType === 'dayDetails') {
    return `${baseRole}

[CURRENT TASK: DAY DETAILS GENERATION]
マスタープランアウトラインに基づいて、各日の詳細アクティビティを生成してください。
出力は日本語で行うこと。

[OUTPUT FORMAT]
各アクティビティには以下のフィールドを含めること:
- time: 時刻
- activity: アクティビティ名
- description: 詳細説明（1-2文）
- activityType: "spot" | "transit" | "accommodation" | "meal" | "other"
- locationEn: 英語での場所名（例: "Kyoto, Japan"）
- source: { type, title?, url?, confidence } — 情報源（CITATION RULEに従う）
- searchQuery: Places API検索用のスポット正式名称（activityが装飾的な名前の場合に必須）
  例: activity="金閣寺で抹茶体験" → searchQuery="金閣寺"
  例: activity="錦市場で食べ歩き" → searchQuery="錦市場"
  例: activity="Jemaa el-Fnaa Square Night Market" → searchQuery="Jemaa el-Fnaa"
  activityがそのまま検索に使えるシンプルな名前の場合は省略可`;
  }

  // modify
  return `${baseRole}

[CURRENT TASK: ITINERARY MODIFICATION]
既存の旅程をユーザーのフィードバックに基づいて修正してください。
変更が求められていない部分は一切変更しないこと。
出力は日本語で行うこと。

[searchQuery RULE]
アクティビティのactivityフィールドが装飾的な名前の場合、searchQueryにスポットの正式名称を設定すること。
例: activity="金閣寺で抹茶体験" → searchQuery="金閣寺"
activityがそのまま検索に使えるシンプルな名前の場合は省略可。`;
}

// ============================================
// Layer 2: Tomokichi Voice (RAG articles)
// ============================================

const MAX_ARTICLE_CONTENT_LENGTH = 500;

function buildTomokichiVoice(context: Article[]): string {
  if (context.length === 0) return '';

  const articleTexts = context.map((article, index) => {
    // 記事のメタデータは完全に保持
    const id = `ARTICLE_${index + 1}`;

    // 本文は最大500文字。「おすすめ」「穴場」「注意」を含む段落を優先
    let content = article.content;
    if (content.length > MAX_ARTICLE_CONTENT_LENGTH) {
      content = extractPriorityContent(content, MAX_ARTICLE_CONTENT_LENGTH);
    }

    return `[${id}]
タイトル: ${article.title}
URL: ${article.url}
${article.snippet ? `概要: ${article.snippet}` : ''}
本文抜粋:
${content}`;
  });

  return `
=== CONTEXT A: ともきちブログ記事（最高権限） ===
以下はともきちの旅行ブログから取得した記事です。
これらの記事に含まれるスポット推薦、体験談、穴場情報を最優先で採用してください。
採用した場合はCITATION RULEに従ってsourceフィールドを設定すること。

${articleTexts.join('\n\n')}
=== END CONTEXT A ===`;
}

/**
 * 「おすすめ」「穴場」「注意」等の重要キーワードを含む部分を優先的に抽出
 */
function extractPriorityContent(content: string, maxLength: number): string {
  const priorityKeywords = ['おすすめ', '穴場', '注意', '絶対', '必見', 'イチオシ', '人気', '有名', '名物', '絶景'];
  const paragraphs = content.split(/\n+/);

  // 優先度の高い段落を先に選択
  const prioritized: string[] = [];
  const others: string[] = [];

  for (const p of paragraphs) {
    const trimmed = p.trim();
    if (!trimmed) continue;
    if (priorityKeywords.some(kw => trimmed.includes(kw))) {
      prioritized.push(trimmed);
    } else {
      others.push(trimmed);
    }
  }

  // 優先段落を先に、残りを後ろに結合
  const ordered = [...prioritized, ...others];
  let result = '';
  for (const p of ordered) {
    if (result.length + p.length + 1 > maxLength) {
      break;
    }
    result += (result ? '\n' : '') + p;
  }

  // 何も入らなかった場合は先頭から切り詰め
  if (!result) {
    result = content.substring(0, maxLength) + '...';
  }

  return result;
}

// ============================================
// Layer 3: Golden Plans (Few-Shot examples)
// ============================================

function buildGoldenPlans(examples?: GoldenPlanExample[]): string {
  if (!examples || examples.length === 0) return '';

  const exampleTexts = examples.map((plan) => {
    const activitiesText = plan.sampleDay.activities
      .map((a) => `  ${a.time} | ${a.activity} [${a.type}]\n    ${a.description}`)
      .join('\n');

    return `--- ${plan.destination}（${plan.duration}・${plan.companions}）---
テーマ: ${plan.themes.join(', ')}
Day ${plan.sampleDay.day}: ${plan.sampleDay.title}
${activitiesText}`;
  });

  return `
=== CONTEXT B: Golden Plans（理想的なプラン例） ===
以下は高品質なプランの例です。
時間配分、食事の配置、移動の言及、description の具体性を参考にしてください。

${exampleTexts.join('\n\n')}
=== END CONTEXT B ===`;
}

// ============================================
// Layer 4: Reality Grounding (Travel Info)
// ============================================

function buildRealityGrounding(travelInfo?: TravelInfoSnapshot): string {
  if (!travelInfo) return '';

  const formatted = formatTravelInfoForPrompt(travelInfo);
  if (!formatted) return '';

  return `
=== CONTEXT C: 渡航情報（事実データ） ===
以下は外部APIから取得した目的地の基本情報です。
プラン生成時にこれらの事実を考慮してください。

${formatted}
=== END CONTEXT C ===`;
}

// ============================================
// Public API
// ============================================

/**
 * Context Sandwich パターンでプロンプトを構築
 */
export function buildContextSandwich(options: PromptBuilderOptions): BuiltPrompt {
  const { context, goldenPlanExamples, travelInfo, userPrompt, generationType } = options;

  // Layer 1: System Role
  const systemRole = buildSystemRole(generationType);

  // Layer 2: Tomokichi Voice
  const tomokichiVoice = buildTomokichiVoice(context);

  // Layer 3: Golden Plans
  const goldenPlans = buildGoldenPlans(goldenPlanExamples);

  // Layer 4: Reality Grounding
  const realityGrounding = buildRealityGrounding(travelInfo);

  // Combine Layers 1-4 as system instruction
  const systemParts = [systemRole, tomokichiVoice, goldenPlans, realityGrounding].filter(Boolean);

  return {
    systemInstruction: systemParts.join('\n\n'),
    userPrompt,
  };
}
