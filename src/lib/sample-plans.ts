import { UserInput, Itinerary } from "./types";

export interface SamplePlan {
  id: string;
  title: string;
  description: string;
  input: UserInput;
  createdAt: string;
  tags: string[];
  /** 事前生成済みの旅程データ（オプション） */
  itinerary?: Itinerary;
}

/**
 * 日程から泊数を計算するヘルパー関数
 */
export function getNights(dates: string): number {
  const match = dates.match(/(\d+)泊(\d+)日/);
  if (match) {
    return parseInt(match[1], 10);
  }
  return 0;
}

/**
 * 日程から日数を計算するヘルパー関数
 */
export function getDays(dates: string): number {
  const match = dates.match(/(\d+)泊(\d+)日/);
  if (match) {
    return parseInt(match[2], 10);
  }
  return 1;
}

export const samplePlans: SamplePlan[] = [
  {
    id: "sapporo-otaru-family",
    title: "札幌・小樽 家族で楽しむ2泊3日",
    description:
      "北海道の王道ルート！札幌の時計台から小樽運河まで、子供も大人も楽しめるグルメと観光スポットを巡る旅。新鮮な海鮮丼やラーメン、スイーツも堪能できます。",
    input: {
      destination: "札幌・小樽",
      isDestinationDecided: true,
      region: "domestic",
      dates: "2泊3日",
      companions: "家族（子供あり）",
      theme: ["グルメ", "自然・絶景", "ショッピング"],
      budget: "中程度",
      pace: "ゆっくり",
      freeText:
        "子供が楽しめるスポットを中心に、北海道グルメも満喫したいです。移動は公共交通機関メインで。",
    },
    createdAt: "2025-06-15",
    tags: ["家族旅行", "2泊3日", "北海道", "夏", "グルメ"],
  },
  {
    id: "kyoto-nara-history",
    title: "京都・奈良 歴史巡り3泊4日",
    description:
      "世界遺産と古都の魅力を堪能する王道コース。金閣寺、清水寺、東大寺など定番スポットから、穴場の古寺まで。春の桜や秋の紅葉シーズンに特におすすめ。",
    input: {
      destination: "京都・奈良",
      isDestinationDecided: true,
      region: "domestic",
      dates: "3泊4日",
      companions: "友人",
      theme: ["文化・歴史", "寺社仏閣", "グルメ"],
      budget: "中程度",
      pace: "普通",
      freeText:
        "友人と京都・奈良を巡りたいです。有名な神社仏閣はもちろん、地元の人が行くようなお店も訪れたいです。",
    },
    createdAt: "2025-04-01",
    tags: ["友人旅行", "3泊4日", "京都", "奈良", "春", "文化体験"],
  },
  {
    id: "okinawa-islands-resort",
    title: "沖縄離島 リゾート満喫4泊5日",
    description:
      "石垣島と竹富島を巡るリゾートトリップ。エメラルドグリーンの海でシュノーケリング、赤瓦の街並み散策、満天の星空を楽しむ大人の癒し旅。",
    input: {
      destination: "石垣島・竹富島",
      isDestinationDecided: true,
      region: "domestic",
      dates: "4泊5日",
      companions: "カップル・夫婦",
      theme: ["ビーチ・海", "自然・絶景", "リラックス"],
      budget: "高め",
      pace: "ゆっくり",
      freeText:
        "カップルで南国リゾートを満喫したいです。マリンアクティビティと星空観察を楽しみたい。",
    },
    createdAt: "2025-07-20",
    tags: ["カップル", "4泊5日", "沖縄", "夏", "ビーチ", "リゾート"],
  },
  {
    id: "tokyo-weekend-solo",
    title: "東京近郊 週末リフレッシュ1泊2日",
    description:
      "一人でゆっくり過ごす東京アート旅。美術館巡りからおしゃれなカフェ、夜景スポットまで。週末だけで気軽にリフレッシュできるプラン。",
    input: {
      destination: "東京（六本木・渋谷・表参道）",
      isDestinationDecided: true,
      region: "domestic",
      dates: "1泊2日",
      companions: "一人旅",
      theme: ["アート・美術館", "カフェ巡り", "ショッピング"],
      budget: "中程度",
      pace: "ゆっくり",
      freeText:
        "一人でアート鑑賞とカフェ巡りを楽しみたいです。人混みを避けて静かに過ごせる場所が好きです。",
    },
    createdAt: "2025-10-05",
    tags: ["一人旅", "1泊2日", "東京", "通年", "アート"],
  },
  {
    id: "kanazawa-gourmet",
    title: "金沢 美食と伝統工芸2泊3日",
    description:
      "北陸新幹線で行く金沢グルメ旅。近江町市場の海鮮、金沢おでん、加賀料理を堪能。兼六園、ひがし茶屋街、21世紀美術館も巡る充実の旅。",
    input: {
      destination: "金沢",
      isDestinationDecided: true,
      region: "domestic",
      dates: "2泊3日",
      companions: "カップル・夫婦",
      theme: ["グルメ", "文化・歴史", "アート・美術館"],
      budget: "中程度",
      pace: "普通",
      freeText:
        "金沢の美味しいものを食べ尽くしたいです。伝統工芸の体験もしてみたい。",
    },
    createdAt: "2025-11-10",
    tags: ["カップル", "2泊3日", "石川", "秋", "グルメ", "アート"],
  },
  {
    id: "hakone-onsen-relax",
    title: "箱根温泉 癒しの1泊2日",
    description:
      "東京から気軽に行ける温泉リゾート。露天風呂付き客室でゆったり、美術館巡りや芦ノ湖クルーズも。日頃の疲れを癒す大人の週末旅。",
    input: {
      destination: "箱根",
      isDestinationDecided: true,
      region: "domestic",
      dates: "1泊2日",
      companions: "カップル・夫婦",
      theme: ["温泉", "リラックス", "自然・絶景"],
      budget: "高め",
      pace: "ゆっくり",
      freeText:
        "温泉でゆっくり癒されたいです。露天風呂付きの部屋に泊まりたい。",
    },
    createdAt: "2025-01-15",
    tags: ["カップル", "1泊2日", "神奈川", "通年", "温泉", "リラックス"],
  },
  {
    id: "hiroshima-miyajima-peace",
    title: "広島・宮島 平和と世界遺産3泊4日",
    description:
      "原爆ドームと厳島神社、2つの世界遺産を巡る旅。平和への祈りを捧げ、瀬戸内海の絶景と広島グルメを満喫。お好み焼き、牡蠣、もみじ饅頭も。",
    input: {
      destination: "広島・宮島",
      isDestinationDecided: true,
      region: "domestic",
      dates: "3泊4日",
      companions: "家族（大人のみ）",
      theme: ["文化・歴史", "世界遺産", "グルメ"],
      budget: "中程度",
      pace: "普通",
      freeText:
        "世界遺産を巡りながら、広島の歴史と食文化を学びたいです。宮島では鹿とも触れ合いたい。",
    },
    createdAt: "2025-05-08",
    tags: ["家族旅行", "3泊4日", "広島", "春", "世界遺産", "文化体験"],
  },
];

/**
 * IDでサンプルプランを取得
 */
export function getSamplePlanById(id: string): SamplePlan | undefined {
  return samplePlans.find((plan) => plan.id === id);
}

/**
 * タグでサンプルプランをフィルタリング
 */
export function filterSamplePlansByTags(tags: string[]): SamplePlan[] {
  if (tags.length === 0) return samplePlans;
  return samplePlans.filter((plan) =>
    tags.some((tag) => plan.tags.includes(tag))
  );
}

/**
 * 日数でサンプルプランをフィルタリング
 */
export function filterSamplePlansByDays(days: number | null): SamplePlan[] {
  if (days === null) return samplePlans;
  return samplePlans.filter((plan) => getDays(plan.input.dates) === days);
}

/**
 * 地域タグのリスト（都道府県・地域名）
 */
export const regionTags = [
  "北海道",
  "東京",
  "神奈川",
  "石川",
  "京都",
  "奈良",
  "広島",
  "沖縄",
];

/**
 * 全てのユニークなタグを取得（地域タグを除く）
 */
export function getAllTags(): string[] {
  const tagSet = new Set<string>();
  samplePlans.forEach((plan) => {
    plan.tags.forEach((tag) => {
      if (!regionTags.includes(tag)) {
        tagSet.add(tag);
      }
    });
  });
  return Array.from(tagSet).sort();
}

/**
 * プランに含まれる地域タグを取得
 */
export function getAllRegions(): string[] {
  const regionSet = new Set<string>();
  samplePlans.forEach((plan) => {
    plan.tags.forEach((tag) => {
      if (regionTags.includes(tag)) {
        regionSet.add(tag);
      }
    });
  });
  return Array.from(regionSet);
}

/**
 * 地域からエリア名を取得（グルーピング用）
 */
export function getAreaFromRegion(region: string): string {
  const areaMap: Record<string, string> = {
    北海道: "北海道",
    東京: "関東",
    神奈川: "関東",
    石川: "北陸",
    京都: "関西",
    奈良: "関西",
    広島: "中国",
    沖縄: "沖縄",
  };
  return areaMap[region] || region;
}
