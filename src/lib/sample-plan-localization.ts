import type { LanguageCode } from "@/lib/i18n/locales";
import type { SamplePlan } from "@/lib/sample-plans";

const JA_TO_EN_LABELS: Record<string, string> = {
  // Core
  "国内": "Domestic",
  "海外": "International",
  "その他": "Other",
  "AI生成": "AI generated",
  "自動追加": "Auto added",
  "推し活": "Fan travel",
  "家族旅行": "Family trip",
  "家族（子供あり）": "Family with kids",
  "家族（大人のみ）": "Family (adults)",
  "カップル": "Couple",
  "カップル・夫婦": "Couple",
  "友人": "Friends",
  "友人旅行": "Friends trip",
  "一人旅": "Solo trip",
  "子供": "Kids",
  "春": "Spring",
  "夏": "Summer",
  "秋": "Autumn",
  "冬": "Winter",
  "初夏": "Early summer",
  "通年": "All seasons",
  "グルメ": "Food",
  "文化・歴史": "Culture & history",
  "文化体験": "Cultural experience",
  "世界遺産": "World heritage",
  "寺社仏閣": "Temples & shrines",
  "自然": "Nature",
  "自然・絶景": "Nature & views",
  "絶景": "Scenic views",
  "ショッピング": "Shopping",
  "アート": "Art",
  "アート・美術館": "Art & museums",
  "温泉": "Onsen",
  "リゾート": "Resort",
  "リラックス": "Relax",
  "癒し": "Healing",
  "ビーチ": "Beach",
  "ビーチ・海": "Beach & sea",
  "離島": "Islands",
  "都市観光": "City sightseeing",
  "街歩き": "City walk",
  "夜景": "Night view",
  "テーマパーク": "Theme park",
  "アクティビティ": "Activities",
  "スポーツ": "Sports",
  "ダイビング": "Diving",
  "ハイキング": "Hiking",
  "ドライブ": "Road trip",
  "鉄道": "Train travel",
  "クルーズ": "Cruise",
  "冒険": "Adventure",
  "秘境": "Hidden gems",
  "動物": "Animals",
  "体験": "Hands-on",
  "レトロ": "Retro",
  "ラグジュアリー": "Luxury",
  "平和学習": "Peace learning",
  "屋台": "Street food",
  "カフェ巡り": "Cafe hopping",
  "雑貨": "Goods",
  "おしゃれ": "Stylish",
  "フォトジェニック": "Photogenic",
  "音楽": "Music",
  "ジャズ": "Jazz",
  "クラシック音楽": "Classical music",
  "建築": "Architecture",
  "城めぐり": "Castle tour",
  "お酒": "Drinks",
  // Budget / pace
  "安め": "Budget",
  "中程度": "Mid-range",
  "高め": "High-end",
  "ゆっくり": "Relaxed",
  "普通": "Balanced",
  "アクティブ": "Active",
  // Regions
  "北海道": "Hokkaido",
  "東京": "Tokyo",
  "神奈川": "Kanagawa",
  "栃木": "Tochigi",
  "山梨": "Yamanashi",
  "石川": "Ishikawa",
  "京都": "Kyoto",
  "奈良": "Nara",
  "広島": "Hiroshima",
  "沖縄": "Okinawa",
  "ハワイ": "Hawaii",
  "アメリカ": "United States",
  "カナダ": "Canada",
  "メキシコ": "Mexico",
  "フランス": "France",
  "イギリス": "United Kingdom",
  "ドイツ": "Germany",
  "イタリア": "Italy",
  "スペイン": "Spain",
  "オーストリア": "Austria",
  "オランダ": "Netherlands",
  "スイス": "Switzerland",
  "ポルトガル": "Portugal",
  "クロアチア": "Croatia",
  "フィンランド": "Finland",
  "ギリシャ": "Greece",
  "トルコ": "Turkey",
  "台湾": "Taiwan",
  "韓国": "South Korea",
  "香港": "Hong Kong",
  "中国": "China",
  "タイ": "Thailand",
  "ベトナム": "Vietnam",
  "フィリピン": "Philippines",
  "マレーシア": "Malaysia",
  "シンガポール": "Singapore",
  "インドネシア": "Indonesia",
  "モルディブ": "Maldives",
  "カンボジア": "Cambodia",
  "インド": "India",
  "ネパール": "Nepal",
  "ラオス": "Laos",
  "ミャンマー": "Myanmar",
  "スリランカ": "Sri Lanka",
  "オーストラリア": "Australia",
  "ニュージーランド": "New Zealand",
  "フィジー": "Fiji",
  "タヒチ": "Tahiti",
  "ニューカレドニア": "New Caledonia",
  "パラオ": "Palau",
  "ヨルダン": "Jordan",
  "エジプト": "Egypt",
  "モロッコ": "Morocco",
  "南アフリカ": "South Africa",
  "ケニア": "Kenya",
  "マダガスカル": "Madagascar",
  "ペルー": "Peru",
  "ボリビア": "Bolivia",
  "ブラジル": "Brazil",
  "アルゼンチン": "Argentina",
  "チリ": "Chile",
  "キューバ": "Cuba",
  "ジャマイカ": "Jamaica",
  "チェコ": "Czech Republic",
  "ハンガリー": "Hungary",
  "ベルギー": "Belgium",
  "マルタ": "Malta",
  "アイスランド": "Iceland",
  "ノルウェー": "Norway",
  "スウェーデン": "Sweden",
  "デンマーク": "Denmark",
  "アイルランド": "Ireland",
  "ポーランド": "Poland",
  "岐阜": "Gifu",
  "香川": "Kagawa",
  "長崎": "Nagasaki",
  "鹿児島": "Kagoshima",
  "島根": "Shimane",
  "東北": "Tohoku",
  "関東": "Kanto",
  "甲信越": "Koshinetsu",
  "北陸": "Hokuriku",
  "東海": "Tokai",
  "関西": "Kansai",
  "中国地方": "Chugoku",
  "四国": "Shikoku",
  "九州": "Kyushu",
};

const AREA_JA_TO_EN: Record<string, string> = {
  "北海道": "Hokkaido",
  "東北": "Tohoku",
  "関東": "Kanto",
  "甲信越": "Koshinetsu",
  "北陸": "Hokuriku",
  "東海": "Tokai",
  "関西": "Kansai",
  "中国": "Chugoku",
  "四国": "Shikoku",
  "九州": "Kyushu",
  "沖縄": "Okinawa",
  "アジア": "Asia",
  "北米": "North America",
  "中南米": "Latin America",
  "ヨーロッパ": "Europe",
  "オセアニア": "Oceania",
  "中東": "Middle East",
  "アフリカ": "Africa",
};

const MANUAL_TITLE_TRANSLATIONS: Record<string, string> = {
  "sapporo-otaru-family": "Sapporo & Otaru Family 2 Nights / 3 Days",
  "kyoto-nara-history": "Kyoto & Nara History Trip 3 Nights / 4 Days",
  "okinawa-islands-resort": "Okinawa Islands Resort 4 Nights / 5 Days",
  "tokyo-weekend-solo": "Tokyo Weekend Solo Refresh 1 Night / 2 Days",
  "kanazawa-gourmet": "Kanazawa Food & Craft Trip 2 Nights / 3 Days",
  "hakone-onsen-relax": "Hakone Onsen Relax 1 Night / 2 Days",
  "hiroshima-miyajima-peace": "Hiroshima & Miyajima Heritage Trip 3 Nights / 4 Days",
  "fukuoka-gourmet": "Fukuoka Food Trip 1 Night / 2 Days",
  "osaka-usj-family": "Osaka USJ Family Trip 2 Nights / 3 Days",
  "nagoya-ghibli-family": "Nagoya Ghibli Park Family Trip 2 Nights / 3 Days",
};

const MANUAL_DESCRIPTION_TRANSLATIONS: Record<string, string> = {
  "sapporo-otaru-family":
    "A classic Hokkaido route for families, from Sapporo landmarks to Otaru canal with food and sightseeing for both kids and adults.",
  "kyoto-nara-history":
    "A classic route through Kyoto and Nara, visiting major heritage temples and local favorites.",
  "okinawa-islands-resort":
    "A relaxing island trip around Ishigaki and Taketomi with marine activities and night sky views.",
  "tokyo-weekend-solo":
    "A quiet solo weekend around Tokyo with museums, cafes, and city views.",
  "kanazawa-gourmet":
    "A food-focused Kanazawa trip with markets, local cuisine, gardens, and art spots.",
  "hakone-onsen-relax":
    "A short Hakone getaway with onsen, art museums, and lake views.",
  "hiroshima-miyajima-peace":
    "A heritage-focused Hiroshima and Miyajima itinerary with history and Setouchi scenery.",
  "fukuoka-gourmet":
    "A compact Fukuoka food trip featuring yatai stalls and local specialties.",
  "osaka-usj-family":
    "A family-friendly Osaka plan combining USJ and classic Dotonbori food experiences.",
  "nagoya-ghibli-family":
    "A family itinerary centered on Ghibli Park and Nagoya local food.",
};

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function translateDates(value: string): string {
  const match = value.match(/(\d+)泊(\d+)日/);
  if (!match) return value;
  const nights = Number.parseInt(match[1], 10);
  const days = Number.parseInt(match[2], 10);
  return `${nights} night${nights > 1 ? "s" : ""} / ${days} day${days > 1 ? "s" : ""}`;
}

function replaceByDictionary(text: string): string {
  const entries = Object.entries(JA_TO_EN_LABELS).sort((a, b) => b[0].length - a[0].length);
  let translated = text;
  for (const [ja, en] of entries) {
    translated = translated.replace(new RegExp(escapeRegExp(ja), "g"), en);
  }
  return translated;
}

function translateTitle(planId: string, title: string): string {
  if (MANUAL_TITLE_TRANSLATIONS[planId]) {
    return MANUAL_TITLE_TRANSLATIONS[planId];
  }

  const fanPattern = title.match(/^【推し活】(.+)の聖地を巡る (.+)への旅$/);
  if (fanPattern) {
    const topic = fanPattern[1];
    const spot = fanPattern[2];
    return `Fan Pilgrimage Trip: ${topic} in ${spot}`;
  }

  const generalPattern = title.match(/^(.+?) (.+)と(.+)の旅$/);
  if (generalPattern) {
    const destination = generalPattern[1];
    const theme1 = replaceByDictionary(generalPattern[2]);
    const theme2 = replaceByDictionary(generalPattern[3]);
    return `${destination} Trip: ${theme1} & ${theme2}`;
  }

  return replaceByDictionary(title);
}

function translateDescription(planId: string, description: string): string {
  if (MANUAL_DESCRIPTION_TRANSLATIONS[planId]) {
    return MANUAL_DESCRIPTION_TRANSLATIONS[planId];
  }

  const fanPattern = description.match(/^(.+)ファン必見！(.+)で聖地巡礼を楽しむ(\d+)日間の旅。ファンのための特別プランです。$/);
  if (fanPattern) {
    const topic = fanPattern[1];
    const spot = fanPattern[2];
    const days = fanPattern[3];
    return `A must for ${topic} fans: enjoy a ${days}-day pilgrimage trip in ${spot}.`;
  }

  const generalPattern = description.match(/^(.+)で(.+)を満喫する(\d+)日間。(.+)におすすめの定番コース。$/);
  if (generalPattern) {
    const destination = generalPattern[1];
    const themes = replaceByDictionary(generalPattern[2]);
    const days = generalPattern[3];
    const companions = replaceByDictionary(generalPattern[4]);
    return `A classic ${days}-day route in ${destination} focused on ${themes}. Great for ${companions}.`;
  }

  return replaceByDictionary(description);
}

function translateFreeText(text: string): string {
  if (!text) return text;

  const fanPattern = text.match(/^(.+)の関連スポットを巡りたい！ファングッズも買いたいです。$/);
  if (fanPattern) {
    return `I want to visit ${fanPattern[1]} related spots and buy fan merchandise.`;
  }

  return replaceByDictionary(text);
}

function normalizeLanguage(language?: string): LanguageCode {
  return language === "en" ? "en" : "ja";
}

export function localizeTagLabel(tag: string, language?: string): string {
  if (normalizeLanguage(language) === "ja") return tag;
  return JA_TO_EN_LABELS[tag] || tag;
}

export function localizeAreaLabel(area: string, language?: string): string {
  if (normalizeLanguage(language) === "ja") return area;
  return AREA_JA_TO_EN[area] || area;
}

export function localizeSamplePlan(plan: SamplePlan, language?: string): SamplePlan {
  const normalized = normalizeLanguage(language);
  if (normalized === "ja") return plan;

  return {
    ...plan,
    title: translateTitle(plan.id, plan.title),
    description: translateDescription(plan.id, plan.description),
    input: {
      ...plan.input,
      dates: translateDates(plan.input.dates),
      companions: localizeTagLabel(plan.input.companions, normalized),
      theme: plan.input.theme.map((theme) => localizeTagLabel(theme, normalized)),
      budget: localizeTagLabel(plan.input.budget, normalized),
      pace: localizeTagLabel(plan.input.pace, normalized),
      freeText: translateFreeText(plan.input.freeText),
    },
  };
}
