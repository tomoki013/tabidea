import { getDefaultHomeBaseCityForRegion, type RegionCode, type UiLanguage } from "@/lib/i18n/regions";

export interface HomeBaseCityRecord {
  id: string;
  nameJa: string;
  nameEn: string;
  areaJa?: string;
  areaEn?: string;
  aliasesJa?: readonly string[];
  aliasesEn?: readonly string[];
}

export interface HomeBaseCityOption {
  value: string;
  label: string;
}

const JAPAN_PREFECTURE_CITIES: readonly HomeBaseCityRecord[] = [
  { id: "jp-tokyo", nameJa: "東京", nameEn: "Tokyo", areaJa: "東京都", areaEn: "Tokyo Metropolis" },
  { id: "jp-hokkaido", nameJa: "札幌", nameEn: "Sapporo", areaJa: "北海道", areaEn: "Hokkaido" },
  { id: "jp-aomori", nameJa: "青森", nameEn: "Aomori", areaJa: "青森県", areaEn: "Aomori Prefecture" },
  { id: "jp-iwate", nameJa: "盛岡", nameEn: "Morioka", areaJa: "岩手県", areaEn: "Iwate Prefecture" },
  { id: "jp-miyagi", nameJa: "仙台", nameEn: "Sendai", areaJa: "宮城県", areaEn: "Miyagi Prefecture" },
  { id: "jp-akita", nameJa: "秋田", nameEn: "Akita", areaJa: "秋田県", areaEn: "Akita Prefecture" },
  { id: "jp-yamagata", nameJa: "山形", nameEn: "Yamagata", areaJa: "山形県", areaEn: "Yamagata Prefecture" },
  { id: "jp-fukushima", nameJa: "福島", nameEn: "Fukushima", areaJa: "福島県", areaEn: "Fukushima Prefecture" },
  { id: "jp-ibaraki", nameJa: "水戸", nameEn: "Mito", areaJa: "茨城県", areaEn: "Ibaraki Prefecture" },
  { id: "jp-tochigi", nameJa: "宇都宮", nameEn: "Utsunomiya", areaJa: "栃木県", areaEn: "Tochigi Prefecture" },
  { id: "jp-gunma", nameJa: "前橋", nameEn: "Maebashi", areaJa: "群馬県", areaEn: "Gunma Prefecture" },
  { id: "jp-saitama", nameJa: "さいたま", nameEn: "Saitama", areaJa: "埼玉県", areaEn: "Saitama Prefecture" },
  { id: "jp-chiba", nameJa: "千葉", nameEn: "Chiba", areaJa: "千葉県", areaEn: "Chiba Prefecture" },
  { id: "jp-kanagawa", nameJa: "横浜", nameEn: "Yokohama", areaJa: "神奈川県", areaEn: "Kanagawa Prefecture" },
  { id: "jp-niigata", nameJa: "新潟", nameEn: "Niigata", areaJa: "新潟県", areaEn: "Niigata Prefecture" },
  { id: "jp-toyama", nameJa: "富山", nameEn: "Toyama", areaJa: "富山県", areaEn: "Toyama Prefecture" },
  { id: "jp-ishikawa", nameJa: "金沢", nameEn: "Kanazawa", areaJa: "石川県", areaEn: "Ishikawa Prefecture" },
  { id: "jp-fukui", nameJa: "福井", nameEn: "Fukui", areaJa: "福井県", areaEn: "Fukui Prefecture" },
  { id: "jp-yamanashi", nameJa: "甲府", nameEn: "Kofu", areaJa: "山梨県", areaEn: "Yamanashi Prefecture" },
  { id: "jp-nagano", nameJa: "長野", nameEn: "Nagano", areaJa: "長野県", areaEn: "Nagano Prefecture" },
  { id: "jp-gifu", nameJa: "岐阜", nameEn: "Gifu", areaJa: "岐阜県", areaEn: "Gifu Prefecture" },
  { id: "jp-shizuoka", nameJa: "静岡", nameEn: "Shizuoka", areaJa: "静岡県", areaEn: "Shizuoka Prefecture" },
  { id: "jp-aichi", nameJa: "名古屋", nameEn: "Nagoya", areaJa: "愛知県", areaEn: "Aichi Prefecture" },
  { id: "jp-mie", nameJa: "津", nameEn: "Tsu", areaJa: "三重県", areaEn: "Mie Prefecture" },
  { id: "jp-shiga", nameJa: "大津", nameEn: "Otsu", areaJa: "滋賀県", areaEn: "Shiga Prefecture" },
  { id: "jp-kyoto", nameJa: "京都", nameEn: "Kyoto", areaJa: "京都府", areaEn: "Kyoto Prefecture" },
  { id: "jp-osaka", nameJa: "大阪", nameEn: "Osaka", areaJa: "大阪府", areaEn: "Osaka Prefecture" },
  { id: "jp-hyogo", nameJa: "神戸", nameEn: "Kobe", areaJa: "兵庫県", areaEn: "Hyogo Prefecture" },
  { id: "jp-nara", nameJa: "奈良", nameEn: "Nara", areaJa: "奈良県", areaEn: "Nara Prefecture" },
  { id: "jp-wakayama", nameJa: "和歌山", nameEn: "Wakayama", areaJa: "和歌山県", areaEn: "Wakayama Prefecture" },
  { id: "jp-tottori", nameJa: "鳥取", nameEn: "Tottori", areaJa: "鳥取県", areaEn: "Tottori Prefecture" },
  { id: "jp-shimane", nameJa: "松江", nameEn: "Matsue", areaJa: "島根県", areaEn: "Shimane Prefecture" },
  { id: "jp-okayama", nameJa: "岡山", nameEn: "Okayama", areaJa: "岡山県", areaEn: "Okayama Prefecture" },
  { id: "jp-hiroshima", nameJa: "広島", nameEn: "Hiroshima", areaJa: "広島県", areaEn: "Hiroshima Prefecture" },
  { id: "jp-yamaguchi", nameJa: "山口", nameEn: "Yamaguchi", areaJa: "山口県", areaEn: "Yamaguchi Prefecture" },
  { id: "jp-tokushima", nameJa: "徳島", nameEn: "Tokushima", areaJa: "徳島県", areaEn: "Tokushima Prefecture" },
  { id: "jp-kagawa", nameJa: "高松", nameEn: "Takamatsu", areaJa: "香川県", areaEn: "Kagawa Prefecture" },
  { id: "jp-ehime", nameJa: "松山", nameEn: "Matsuyama", areaJa: "愛媛県", areaEn: "Ehime Prefecture" },
  { id: "jp-kochi", nameJa: "高知", nameEn: "Kochi", areaJa: "高知県", areaEn: "Kochi Prefecture" },
  { id: "jp-fukuoka", nameJa: "福岡", nameEn: "Fukuoka", areaJa: "福岡県", areaEn: "Fukuoka Prefecture" },
  { id: "jp-saga", nameJa: "佐賀", nameEn: "Saga", areaJa: "佐賀県", areaEn: "Saga Prefecture" },
  { id: "jp-nagasaki", nameJa: "長崎", nameEn: "Nagasaki", areaJa: "長崎県", areaEn: "Nagasaki Prefecture" },
  { id: "jp-kumamoto", nameJa: "熊本", nameEn: "Kumamoto", areaJa: "熊本県", areaEn: "Kumamoto Prefecture" },
  { id: "jp-oita", nameJa: "大分", nameEn: "Oita", areaJa: "大分県", areaEn: "Oita Prefecture" },
  { id: "jp-miyazaki", nameJa: "宮崎", nameEn: "Miyazaki", areaJa: "宮崎県", areaEn: "Miyazaki Prefecture" },
  { id: "jp-kagoshima", nameJa: "鹿児島", nameEn: "Kagoshima", areaJa: "鹿児島県", areaEn: "Kagoshima Prefecture" },
  { id: "jp-okinawa", nameJa: "那覇", nameEn: "Naha", areaJa: "沖縄県", areaEn: "Okinawa Prefecture" },
] as const;

const UNITED_STATES_STATE_CITIES: readonly HomeBaseCityRecord[] = [
  {
    id: "us-dc",
    nameJa: "ワシントンD.C.",
    nameEn: "Washington, D.C.",
    areaJa: "コロンビア特別区",
    areaEn: "District of Columbia",
    aliasesEn: ["Washington DC", "Washington D.C."],
  },
  { id: "us-al", nameJa: "モンゴメリー", nameEn: "Montgomery", areaJa: "アラバマ州", areaEn: "Alabama" },
  { id: "us-ak", nameJa: "ジュノー", nameEn: "Juneau", areaJa: "アラスカ州", areaEn: "Alaska" },
  { id: "us-az", nameJa: "フェニックス", nameEn: "Phoenix", areaJa: "アリゾナ州", areaEn: "Arizona" },
  { id: "us-ar", nameJa: "リトルロック", nameEn: "Little Rock", areaJa: "アーカンソー州", areaEn: "Arkansas" },
  { id: "us-ca", nameJa: "サクラメント", nameEn: "Sacramento", areaJa: "カリフォルニア州", areaEn: "California" },
  { id: "us-co", nameJa: "デンバー", nameEn: "Denver", areaJa: "コロラド州", areaEn: "Colorado" },
  { id: "us-ct", nameJa: "ハートフォード", nameEn: "Hartford", areaJa: "コネチカット州", areaEn: "Connecticut" },
  { id: "us-de", nameJa: "ドーバー", nameEn: "Dover", areaJa: "デラウェア州", areaEn: "Delaware" },
  { id: "us-fl", nameJa: "タラハシー", nameEn: "Tallahassee", areaJa: "フロリダ州", areaEn: "Florida" },
  { id: "us-ga", nameJa: "アトランタ", nameEn: "Atlanta", areaJa: "ジョージア州", areaEn: "Georgia" },
  { id: "us-hi", nameJa: "ホノルル", nameEn: "Honolulu", areaJa: "ハワイ州", areaEn: "Hawaii" },
  { id: "us-id", nameJa: "ボイシ", nameEn: "Boise", areaJa: "アイダホ州", areaEn: "Idaho" },
  { id: "us-il", nameJa: "スプリングフィールド", nameEn: "Springfield", areaJa: "イリノイ州", areaEn: "Illinois" },
  { id: "us-in", nameJa: "インディアナポリス", nameEn: "Indianapolis", areaJa: "インディアナ州", areaEn: "Indiana" },
  { id: "us-ia", nameJa: "デモイン", nameEn: "Des Moines", areaJa: "アイオワ州", areaEn: "Iowa" },
  { id: "us-ks", nameJa: "トピカ", nameEn: "Topeka", areaJa: "カンザス州", areaEn: "Kansas" },
  { id: "us-ky", nameJa: "フランクフォート", nameEn: "Frankfort", areaJa: "ケンタッキー州", areaEn: "Kentucky" },
  { id: "us-la", nameJa: "バトンルージュ", nameEn: "Baton Rouge", areaJa: "ルイジアナ州", areaEn: "Louisiana" },
  { id: "us-me", nameJa: "オーガスタ", nameEn: "Augusta", areaJa: "メイン州", areaEn: "Maine" },
  { id: "us-md", nameJa: "アナポリス", nameEn: "Annapolis", areaJa: "メリーランド州", areaEn: "Maryland" },
  { id: "us-ma", nameJa: "ボストン", nameEn: "Boston", areaJa: "マサチューセッツ州", areaEn: "Massachusetts" },
  { id: "us-mi", nameJa: "ランシング", nameEn: "Lansing", areaJa: "ミシガン州", areaEn: "Michigan" },
  { id: "us-mn", nameJa: "セントポール", nameEn: "Saint Paul", areaJa: "ミネソタ州", areaEn: "Minnesota" },
  { id: "us-ms", nameJa: "ジャクソン", nameEn: "Jackson", areaJa: "ミシシッピ州", areaEn: "Mississippi" },
  { id: "us-mo", nameJa: "ジェファーソンシティ", nameEn: "Jefferson City", areaJa: "ミズーリ州", areaEn: "Missouri" },
  { id: "us-mt", nameJa: "ヘレナ", nameEn: "Helena", areaJa: "モンタナ州", areaEn: "Montana" },
  { id: "us-ne", nameJa: "リンカーン", nameEn: "Lincoln", areaJa: "ネブラスカ州", areaEn: "Nebraska" },
  { id: "us-nv", nameJa: "カーソンシティ", nameEn: "Carson City", areaJa: "ネバダ州", areaEn: "Nevada" },
  { id: "us-nh", nameJa: "コンコード", nameEn: "Concord", areaJa: "ニューハンプシャー州", areaEn: "New Hampshire" },
  { id: "us-nj", nameJa: "トレントン", nameEn: "Trenton", areaJa: "ニュージャージー州", areaEn: "New Jersey" },
  { id: "us-nm", nameJa: "サンタフェ", nameEn: "Santa Fe", areaJa: "ニューメキシコ州", areaEn: "New Mexico" },
  {
    id: "us-ny",
    nameJa: "ニューヨーク",
    nameEn: "New York",
    areaJa: "ニューヨーク州",
    areaEn: "New York",
    aliasesEn: ["NYC", "New York City"],
  },
  { id: "us-nc", nameJa: "ローリー", nameEn: "Raleigh", areaJa: "ノースカロライナ州", areaEn: "North Carolina" },
  { id: "us-nd", nameJa: "ビスマーク", nameEn: "Bismarck", areaJa: "ノースダコタ州", areaEn: "North Dakota" },
  { id: "us-oh", nameJa: "コロンバス", nameEn: "Columbus", areaJa: "オハイオ州", areaEn: "Ohio" },
  { id: "us-ok", nameJa: "オクラホマシティ", nameEn: "Oklahoma City", areaJa: "オクラホマ州", areaEn: "Oklahoma" },
  { id: "us-or", nameJa: "セーラム", nameEn: "Salem", areaJa: "オレゴン州", areaEn: "Oregon" },
  { id: "us-pa", nameJa: "ハリスバーグ", nameEn: "Harrisburg", areaJa: "ペンシルベニア州", areaEn: "Pennsylvania" },
  { id: "us-ri", nameJa: "プロビデンス", nameEn: "Providence", areaJa: "ロードアイランド州", areaEn: "Rhode Island" },
  { id: "us-sc", nameJa: "コロンビア", nameEn: "Columbia", areaJa: "サウスカロライナ州", areaEn: "South Carolina" },
  { id: "us-sd", nameJa: "ピア", nameEn: "Pierre", areaJa: "サウスダコタ州", areaEn: "South Dakota" },
  { id: "us-tn", nameJa: "ナッシュビル", nameEn: "Nashville", areaJa: "テネシー州", areaEn: "Tennessee" },
  { id: "us-tx", nameJa: "オースティン", nameEn: "Austin", areaJa: "テキサス州", areaEn: "Texas" },
  { id: "us-ut", nameJa: "ソルトレイクシティ", nameEn: "Salt Lake City", areaJa: "ユタ州", areaEn: "Utah" },
  { id: "us-vt", nameJa: "モントピリア", nameEn: "Montpelier", areaJa: "バーモント州", areaEn: "Vermont" },
  { id: "us-va", nameJa: "リッチモンド", nameEn: "Richmond", areaJa: "バージニア州", areaEn: "Virginia" },
  { id: "us-wa", nameJa: "オリンピア", nameEn: "Olympia", areaJa: "ワシントン州", areaEn: "Washington" },
  { id: "us-wv", nameJa: "チャールストン", nameEn: "Charleston", areaJa: "ウェストバージニア州", areaEn: "West Virginia" },
  { id: "us-wi", nameJa: "マディソン", nameEn: "Madison", areaJa: "ウィスコンシン州", areaEn: "Wisconsin" },
  { id: "us-wy", nameJa: "シャイアン", nameEn: "Cheyenne", areaJa: "ワイオミング州", areaEn: "Wyoming" },
] as const;

const CITIES_BY_REGION: Partial<Record<RegionCode, readonly HomeBaseCityRecord[]>> = {
  JP: JAPAN_PREFECTURE_CITIES,
  US: UNITED_STATES_STATE_CITIES,
};

const fallbackRecordCache = new Map<RegionCode, HomeBaseCityRecord>();

function normalizeInput(value: string): string {
  return value.toLowerCase().trim().replace(/\s+/g, " ");
}

function getLocalizedCityName(record: HomeBaseCityRecord, language: UiLanguage): string {
  return language === "en" ? record.nameEn : record.nameJa;
}

function getLocalizedAreaName(record: HomeBaseCityRecord, language: UiLanguage): string | undefined {
  return language === "en" ? record.areaEn : record.areaJa;
}

function getFallbackRecord(region: RegionCode): HomeBaseCityRecord {
  const cached = fallbackRecordCache.get(region);
  if (cached) {
    return cached;
  }

  const fallback: HomeBaseCityRecord = {
    id: `fallback-${region}`,
    nameJa: getDefaultHomeBaseCityForRegion(region, "ja"),
    nameEn: getDefaultHomeBaseCityForRegion(region, "en"),
  };
  fallbackRecordCache.set(region, fallback);
  return fallback;
}

function getComparableVariants(record: HomeBaseCityRecord): string[] {
  return [
    record.nameJa,
    record.nameEn,
    ...(record.aliasesJa ?? []),
    ...(record.aliasesEn ?? []),
  ]
    .map((value) => normalizeInput(value))
    .filter(Boolean);
}

function localizeRecord(record: HomeBaseCityRecord, language: UiLanguage): HomeBaseCityOption {
  const name = getLocalizedCityName(record, language);
  const area = getLocalizedAreaName(record, language);
  const label = area ? `${name} (${area})` : name;

  return {
    value: name,
    label,
  };
}

function findRecordByCityInput(records: readonly HomeBaseCityRecord[], city: string): HomeBaseCityRecord | null {
  const normalizedCity = normalizeInput(city);
  if (!normalizedCity) {
    return null;
  }

  for (const record of records) {
    const variants = getComparableVariants(record);
    if (variants.includes(normalizedCity)) {
      return record;
    }
  }

  return null;
}

export function getHomeBaseCityRecordsForRegion(region: RegionCode): readonly HomeBaseCityRecord[] {
  return CITIES_BY_REGION[region] ?? [getFallbackRecord(region)];
}

export function getHomeBaseCityOptionsForRegion(
  region: RegionCode,
  language: UiLanguage
): HomeBaseCityOption[] {
  return getHomeBaseCityRecordsForRegion(region).map((record) => localizeRecord(record, language));
}

export function isSupportedHomeBaseCityForRegion(
  region: RegionCode,
  _language: UiLanguage,
  city: string
): boolean {
  const records = getHomeBaseCityRecordsForRegion(region);
  const matchedRecord = findRecordByCityInput(records, city);
  return matchedRecord !== null;
}

export function resolveHomeBaseCityForRegion(
  region: RegionCode,
  language: UiLanguage,
  requestedCity?: string
): string {
  const records = getHomeBaseCityRecordsForRegion(region);

  if (requestedCity) {
    const matchedRecord = findRecordByCityInput(records, requestedCity);
    if (matchedRecord) {
      return getLocalizedCityName(matchedRecord, language);
    }
  }

  const fallbackDefault = getDefaultHomeBaseCityForRegion(region, language);
  const defaultRecord = findRecordByCityInput(records, fallbackDefault);
  if (defaultRecord) {
    return getLocalizedCityName(defaultRecord, language);
  }

  return records[0] ? getLocalizedCityName(records[0], language) : fallbackDefault;
}
