"use server";

import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";

interface TravelInfo {
  country: string;
  visa: string;
  power: {
    voltage: string;
    frequency: string;
    plugType: string;
  };
  tipping: string;
  safety: {
    overview: string;
    warnings: string[];
  };
  generalInfo: string;
}

export type TravelInfoState = {
  success: boolean;
  error?: string;
  data?: TravelInfo;
};

export async function getTravelInfo(country: string): Promise<TravelInfoState> {
  const startTime = Date.now();
  console.log(`[travel-info] getTravelInfo started for country: ${country}`);

  const apiKey = process.env.GOOGLE_GENERATIVE_API_KEY;
  if (!apiKey) {
    console.error("[travel-info] API Key is missing in environment variables");
    return {
      success: false,
      error: "システムエラー: APIキーが設定されていません。",
    };
  }

  try {
    const google = createGoogleGenerativeAI({ apiKey });
    const modelName = process.env.GOOGLE_MODEL_NAME || "gemini-2.5-flash";

    const prompt = `
あなたは旅行者向けに渡航情報を提供する専門アシスタントです。

ユーザーが指定した国・地域について、以下の情報を正確に提供してください：

対象国: ${country}

回答は必ず以下のJSON形式で返してください：

{
  "country": "国名（日本語）",
  "visa": "ビザ情報の詳細。日本国籍の場合のビザ免除期間、必要な手続き、注意点など。具体的に記載。",
  "power": {
    "voltage": "電圧（例: 220V）",
    "frequency": "周波数（例: 50Hz）",
    "plugType": "プラグタイプ（例: Aタイプ、Cタイプなど）。必要に応じて変換プラグの必要性も記載。"
  },
  "tipping": "チップの習慣について。チップが必要か、相場はいくらか、どのような場面で渡すかなど具体的に記載。",
  "safety": {
    "overview": "一般的な治安状況の概要。観光地の安全性、夜間の外出、交通機関の安全性など。",
    "warnings": ["注意点1", "注意点2", "注意点3"]  // 具体的な注意事項を配列で返す（3-5項目程度）
  },
  "generalInfo": "その他の役立つ情報。通貨、言語、時差、ベストシーズン、文化的マナーなど。"
}

重要な注意事項：
1. 情報は2024-2025年時点の一般的な情報を基にしてください
2. 必ず日本語で回答してください
3. JSONフォーマット以外の余計なテキストは含めないでください
4. 情報が不明な場合は「情報が限定的です」と記載してください
5. ビザ情報は必ず「日本国籍の場合」を前提としてください
6. 具体的で実用的な情報を提供してください
`;

    console.log(`[travel-info] Sending request to Vercel AI SDK...`);
    const { text } = await generateText({
      model: google(modelName, { structuredOutputs: true }),
      prompt,
      temperature: 0.3,
    });

    const endTime = Date.now();
    console.log(`[travel-info] Response received in ${endTime - startTime}ms`);

    // Clean up response
    const cleanedText = text
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    try {
      const data = JSON.parse(cleanedText) as TravelInfo;
      console.log(`[travel-info] Successfully parsed travel info for ${data.country}`);

      return {
        success: true,
        data,
      };
    } catch (jsonError) {
      console.error(`[travel-info] JSON Parse Error:`, jsonError);
      console.error(`[travel-info] Raw Response text:`, cleanedText);
      return {
        success: false,
        error: "AI応答の解析に失敗しました。",
      };
    }
  } catch (error) {
    console.error("[travel-info] Generation failed:", error);
    return {
      success: false,
      error: "情報の取得中にエラーが発生しました。もう一度お試しください。",
    };
  }
}
