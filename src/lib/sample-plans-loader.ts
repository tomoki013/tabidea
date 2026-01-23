import * as fs from "fs";
import * as path from "path";
import { Itinerary, UserInput } from "@/types";
import { SamplePlan, samplePlans } from "@/lib/sample-plans";

/**
 * すべてのサンプルプランを読み込む（静的定義 + JSONファイルからの動的読み込み）
 */
export async function loadAllSamplePlans(): Promise<SamplePlan[]> {
  const staticPlans = [...samplePlans];
  const staticIds = new Set(staticPlans.map((p) => p.id));
  const dynamicPlans: SamplePlan[] = [];

  const dataDir = path.join(process.cwd(), "src/data/itineraries");

  if (!fs.existsSync(dataDir)) {
    return staticPlans;
  }

  try {
    const files = await fs.promises.readdir(dataDir);

    for (const file of files) {
      if (!file.endsWith(".json")) continue;

      const id = file.replace(".json", "");
      if (staticIds.has(id)) continue;

      try {
        const filePath = path.join(dataDir, file);
        const content = await fs.promises.readFile(filePath, "utf-8");
        const itinerary = JSON.parse(content) as Itinerary;

        // UserInputを推論
        const dates = `${Math.max(0, itinerary.days.length - 1)}泊${itinerary.days.length}日`;
        const input: UserInput = {
          destinations: [itinerary.destination],
          dates: dates,
          companions: "その他", // 推論できないため
          theme: [], // 推論できないため
          budget: "",
          pace: "",
          freeText: "",
          isDestinationDecided: true,
          region: inferRegion(itinerary.destination), // 簡易的な推論
        };

        const plan: SamplePlan = {
          id,
          title: itinerary.destination + "の旅", // タイトルがない場合は地名を使用
          description: itinerary.description,
          input,
          createdAt: "2025-01-01", // ダミー日付
          tags: ["AI生成", "自動追加"], // 自動追加タグ
          itinerary,
        };

        // ファイル名からタグを推論（例: fan-xxx -> 推し活）
        if (id.startsWith("fan-")) {
            plan.tags.push("推し活");
        }

        dynamicPlans.push(plan);
      } catch (e) {
        console.error(`Failed to load dynamic plan: ${file}`, e);
      }
    }
  } catch (e) {
    console.error("Failed to read itineraries directory", e);
  }

  return [...staticPlans, ...dynamicPlans];
}

/**
 * IDでサンプルプランを取得（動的読み込み対応）
 */
export async function getSamplePlanByIdDynamic(
  id: string
): Promise<SamplePlan | undefined> {
  // まず静的リストから検索
  const staticPlan = samplePlans.find((p) => p.id === id);
  if (staticPlan) return staticPlan;

  // なければファイルシステムから検索
  try {
    const filePath = path.join(process.cwd(), "src/data/itineraries", `${id}.json`);

    if (!fs.existsSync(filePath)) return undefined;

    const content = await fs.promises.readFile(filePath, "utf-8");
    const itinerary = JSON.parse(content) as Itinerary;

    const dates = `${Math.max(0, itinerary.days.length - 1)}泊${itinerary.days.length}日`;
    const input: UserInput = {
      destinations: [itinerary.destination],
      dates: dates,
      companions: "その他",
      theme: [],
      budget: "",
      pace: "",
      freeText: "",
      isDestinationDecided: true,
      region: inferRegion(itinerary.destination),
    };

    const plan: SamplePlan = {
      id,
      title: itinerary.destination + "の旅",
      description: itinerary.description,
      input,
      createdAt: "2025-01-01",
      tags: ["AI生成", "自動追加"],
      itinerary,
    };

    if (id.startsWith("fan-")) {
        plan.tags.push("推し活");
    }

    return plan;
  } catch (e) {
    console.error(`Failed to load dynamic plan: ${id}`, e);
    return undefined;
  }
}

function inferRegion(destination: string): "domestic" | "overseas" {
  // 簡易的な判定: 日本語の地名リストに含まれるか、あるいは国内の地名っぽいか
  const domesticKeywords = ["日本", "東京", "大阪", "京都", "北海道", "沖縄", "福岡", "名古屋", "神奈川", "千葉", "埼玉", "愛知", "兵庫", "静岡", "広島", "宮城", "石川", "長野", "岐阜", "三重", "熊本", "鹿児島", "長崎", "大分", "岡山", "香川", "愛媛", "高知", "奈良", "滋賀", "和歌山", "群馬", "栃木", "茨城", "山梨", "新潟", "富山", "福井", "山形", "秋田", "岩手", "青森", "福島", "島根", "鳥取", "山口", "徳島", "佐賀", "宮崎", "伊勢", "志摩", "箱根", "日光", "鎌倉", "熱海", "軽井沢", "屋久島", "石垣", "宮古", "別府", "由布院", "道後", "草津", "城崎", "白川郷", "高山"];

  if (domesticKeywords.some(k => destination.includes(k))) {
      return "domestic";
  }

  return "overseas";
}
