import { UserInput } from "./types";

export interface SamplePlan {
  id: string;
  title: string;
  description: string;
  tags: string[];
  userInput: UserInput;
  color: string;
  rotate: string;
}

export const samplePlans: SamplePlan[] = [
  {
    id: "kyoto-history",
    title: "京都で歴史と静寂を巡る旅",
    description: "古都京都で寺社仏閣を巡り、日本の伝統文化に触れる2泊3日の旅。朝一番の清水寺から始まり、嵐山の竹林で深呼吸。夜は先斗町で京料理を堪能します。",
    tags: ["歴史", "寺社仏閣", "京料理", "カップル"],
    userInput: {
      destination: "京都",
      isDestinationDecided: true,
      region: "domestic",
      dates: "2泊3日",
      companions: "カップル",
      theme: ["歴史・文化", "グルメ"],
      budget: "普通",
      pace: "ゆったり",
      freeText: "朝早くから観光したい。夜は美味しい京料理を楽しみたい。",
      hasMustVisitPlaces: true,
      mustVisitPlaces: ["清水寺", "嵐山"],
    },
    color: "bg-[#e8f5e9] border-[#a5d6a7]",
    rotate: "rotate-1",
  },
  {
    id: "okinawa-beach",
    title: "沖縄リゾートでリフレッシュ",
    description: "青い海と白い砂浜で過ごす至福のリゾート旅行。レンタカーで古宇利島へドライブし、美ら海水族館を楽しみ、サンセットビーチで波の音を聴く3泊4日。",
    tags: ["ビーチ", "リゾート", "ドライブ", "家族"],
    userInput: {
      destination: "沖縄",
      isDestinationDecided: true,
      region: "domestic",
      dates: "3泊4日",
      companions: "家族",
      theme: ["自然・絶景", "リゾート"],
      budget: "贅沢に",
      pace: "のんびり",
      freeText: "レンタカーで島を巡りたい。子供も楽しめるスポットを入れてほしい。",
      hasMustVisitPlaces: true,
      mustVisitPlaces: ["美ら海水族館", "古宇利島"],
    },
    color: "bg-[#e3f2fd] border-[#90caf9]",
    rotate: "-rotate-1",
  },
  {
    id: "kanazawa-art",
    title: "金沢でアートと海鮮を満喫",
    description: "21世紀美術館で現代アートに触れ、近江町市場で新鮮な海鮮丼を堪能。兼六園や茶屋街も巡る、文化とグルメが融合した1泊2日の旅。",
    tags: ["アート", "海鮮", "美術館", "友達"],
    userInput: {
      destination: "金沢",
      isDestinationDecided: true,
      region: "domestic",
      dates: "1泊2日",
      companions: "友達",
      theme: ["アート・建築", "グルメ"],
      budget: "普通",
      pace: "普通",
      freeText: "美術館めぐりと美味しいものを楽しみたい。",
      hasMustVisitPlaces: true,
      mustVisitPlaces: ["21世紀美術館", "近江町市場"],
    },
    color: "bg-[#fff3e0] border-[#ffcc80]",
    rotate: "rotate-2",
  },
  {
    id: "hokkaido-nature",
    title: "北海道大自然アドベンチャー",
    description: "広大な北海道の大自然を満喫する4泊5日の旅。富良野のラベンダー畑、美瑛の丘、旭山動物園を巡り、新鮮な海の幸とジンギスカンを楽しむ。",
    tags: ["自然", "グルメ", "ドライブ", "友達"],
    userInput: {
      destination: "北海道（富良野・美瑛エリア）",
      isDestinationDecided: true,
      region: "domestic",
      dates: "4泊5日",
      companions: "友達",
      theme: ["自然・絶景", "グルメ"],
      budget: "普通",
      pace: "普通",
      freeText: "レンタカーで大自然を巡りたい。北海道グルメも楽しみたい。",
      hasMustVisitPlaces: true,
      mustVisitPlaces: ["富良野", "美瑛", "旭山動物園"],
    },
    color: "bg-[#f3e5f5] border-[#ce93d8]",
    rotate: "-rotate-2",
  },
  {
    id: "tokyo-solo",
    title: "東京ひとり旅で自分を見つめる",
    description: "下町の風情と最新カルチャーが混在する東京で、自分だけの時間を過ごすひとり旅。浅草の朝散歩から渋谷のカフェ巡り、夜は新宿の思い出横丁へ。",
    tags: ["ひとり旅", "カフェ", "街歩き", "グルメ"],
    userInput: {
      destination: "東京",
      isDestinationDecided: true,
      region: "domestic",
      dates: "2泊3日",
      companions: "ひとり",
      theme: ["グルメ", "街歩き"],
      budget: "節約",
      pace: "普通",
      freeText: "のんびりカフェ巡りしながら、東京の街を歩きたい。",
      hasMustVisitPlaces: false,
      mustVisitPlaces: [],
    },
    color: "bg-[#fce4ec] border-[#f48fb1]",
    rotate: "rotate-1",
  },
  {
    id: "undecided-resort",
    title: "どこか南の島でリゾート気分",
    description: "行き先は未定だけど、とにかく南国リゾートでのんびりしたい！AIがあなたにぴったりの行き先を提案します。",
    tags: ["リゾート", "行き先未定", "癒し", "カップル"],
    userInput: {
      destination: "",
      isDestinationDecided: false,
      region: "anywhere",
      dates: "3泊4日",
      companions: "カップル",
      theme: ["リゾート", "自然・絶景"],
      budget: "贅沢に",
      pace: "のんびり",
      freeText: "とにかくリラックスしたい。海が見えるホテルに泊まりたい。",
      travelVibe: "南国、ビーチリゾート、のんびり",
      hasMustVisitPlaces: false,
      mustVisitPlaces: [],
    },
    color: "bg-[#e0f7fa] border-[#80deea]",
    rotate: "-rotate-1",
  },
];

export function getSamplePlanById(id: string): SamplePlan | undefined {
  return samplePlans.find((plan) => plan.id === id);
}

export function getAllSamplePlanIds(): string[] {
  return samplePlans.map((plan) => plan.id);
}
