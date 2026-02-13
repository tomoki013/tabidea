"use server";

import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";
import type { PackingList } from "@/types/packing-list";

// ============================================
// Schema
// ============================================

const PackingItemSchema = z.object({
  id: z.string().describe("ユニークID（例: doc-1, cloth-2）"),
  name: z.string().describe("アイテム名（日本語）"),
  category: z.enum([
    "documents",
    "clothing",
    "electronics",
    "toiletries",
    "medicine",
    "theme",
    "other",
  ]).describe("カテゴリ"),
  quantity: z.number().optional().describe("数量"),
  note: z.string().optional().describe("補足メモ（変換プラグの型など）"),
  priority: z.enum(["essential", "recommended", "optional"]).describe("優先度"),
});

const PackingListSchema = z.object({
  items: z.array(PackingItemSchema).min(1).describe("持ち物アイテム一覧"),
});

// ============================================
// Types
// ============================================

export interface GeneratePackingListParams {
  destination: string;
  days: number;
  themes: string[];
  companions: string;
  budget: string;
  region: string;
}

export interface PackingListResult {
  success: boolean;
  data?: PackingList;
  error?: string;
  modelName?: string;
}

// ============================================
// Action
// ============================================

export async function generatePackingList(
  params: GeneratePackingListParams
): Promise<PackingListResult> {
  // Pro entitlement check
  try {
    const { checkBillingAccess } = await import("@/lib/billing/billing-checker");
    const billing = await checkBillingAccess();
    if (!billing.isPremium) {
      return { success: false, error: "pro_required" };
    }
  } catch {
    // If billing check fails, allow generation (graceful degradation)
  }

  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    return { success: false, error: "API Key missing" };
  }

  try {
    const google = createGoogleGenerativeAI({ apiKey });
    const modelName = process.env.GOOGLE_MODEL_NAME || "gemini-2.5-flash";
    const model = google(modelName, {
      structuredOutputs: true,
    });

    const isOverseas = params.region !== "domestic";
    const prompt = `
あなたは旅行準備のエキスパートです。以下の旅行条件に基づいて、カテゴリ分けされた持ち物リストを生成してください。

旅行条件:
- 目的地: ${params.destination}
- 日数: ${params.days}日間
- テーマ: ${params.themes.join(", ")}
- 同行者: ${params.companions}
- 予算: ${params.budget}
- ${isOverseas ? "海外旅行" : "国内旅行"}

ルール:
1. カテゴリごとにアイテムを分類してください
2. documents（書類・貴重品）: パスポート${isOverseas ? "（必須）" : "（不要）"}、航空券、財布、クレジットカード、海外旅行保険証、現地通貨 等
3. clothing（衣類）: ${params.days}日分の服を提案。気候に応じて。
4. electronics（電子機器）: 充電器、モバイルバッテリー${isOverseas ? "、変換プラグ（目的地に合った型をnoteに記載）" : ""} 等
5. toiletries（衛生用品）: 歯ブラシ、日焼け止め 等
6. medicine（医薬品）: 常備薬、酔い止め 等
7. theme（テーマ別）: テーマに合わせたアイテム（ビーチ→水着・サングラス、寒冷地→防寒具 等）
8. other（その他）: 折りたたみ傘、エコバッグ 等

9. 各アイテムにpriorityを設定:
   - essential: なくては困るもの
   - recommended: あったほうが良いもの
   - optional: あると便利なもの

10. idは "カテゴリ名の先頭3文字-連番" の形式で（例: doc-1, clo-2, ele-3）
11. 同行者が子連れなら子供用アイテムも追加
12. 全体で25〜40アイテム程度
`;

    const { object } = await generateObject({
      model,
      schema: PackingListSchema,
      prompt,
      temperature: 0.5,
    });

    return {
      success: true,
      data: {
        items: object.items as PackingList["items"],
        generatedAt: new Date().toISOString(),
        basedOn: {
          destination: params.destination,
          days: params.days,
          themes: params.themes,
        },
      },
      modelName,
    };
  } catch (error) {
    console.error("[packing-list] Generation failed:", error);
    return {
      success: false,
      error: "持ち物リストの生成に失敗しました。",
    };
  }
}
