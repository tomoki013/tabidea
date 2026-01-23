import { UserInput, Itinerary } from "@/types";
import { additionalSamplePlans } from "./additional-sample-plans";

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

const baseSamplePlans: SamplePlan[] = [
  {
    id: "sapporo-otaru-family",
    title: "札幌・小樽 家族で楽しむ2泊3日",
    description:
      "北海道の王道ルート！札幌の時計台から小樽運河まで、子供も大人も楽しめるグルメと観光スポットを巡る旅。新鮮な海鮮丼やラーメン、スイーツも堪能できます。",
    input: {
      destinations: ["札幌・小樽"],
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
      destinations: ["京都・奈良"],
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
      destinations: ["石垣島・竹富島"],
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
      destinations: ["東京（六本木・渋谷・表参道）"],
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
      destinations: ["金沢"],
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
      destinations: ["箱根"],
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
      destinations: ["広島・宮島"],
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
  {
    id: "fukuoka-gourmet",
    title: "福岡 博多屋台とグルメ満喫1泊2日",
    description:
      "食の都・福岡で食べ歩き！博多ラーメン、もつ鍋、明太子はもちろん、夜は中洲の屋台で地元の雰囲気を楽しむ。太宰府天満宮への参拝も忘れずに。",
    input: {
      destinations: ["福岡（博多・天神・太宰府）"],
      isDestinationDecided: true,
      region: "domestic",
      dates: "1泊2日",
      companions: "友人",
      theme: ["グルメ", "文化・歴史", "ショッピング"],
      budget: "中程度",
      pace: "普通",
      freeText:
        "福岡の美味しいものを食べ尽くしたい！夜は屋台にも挑戦したいです。",
    },
    createdAt: "2025-09-12",
    tags: ["友人旅行", "1泊2日", "福岡", "通年", "グルメ", "屋台"],
  },
  {
    id: "osaka-usj-family",
    title: "大阪 USJと食い倒れ2泊3日",
    description:
      "家族で楽しむ大阪旅行！USJで一日中遊んだ後は、道頓堀でたこ焼きやお好み焼きを堪能。笑いとグルメがいっぱいの思い出作り。",
    input: {
      destinations: ["大阪"],
      isDestinationDecided: true,
      region: "domestic",
      dates: "2泊3日",
      companions: "家族（子供あり）",
      theme: ["テーマパーク", "グルメ", "家族旅行"],
      budget: "高め",
      pace: "普通",
      freeText:
        "子供とUSJをメインに楽しみたい。大阪らしいグルメも食べたいです。",
    },
    createdAt: "2025-08-05",
    tags: ["家族旅行", "2泊3日", "大阪", "通年", "テーマパーク", "グルメ"],
  },
  {
    id: "nagoya-ghibli-family",
    title: "名古屋 ジブリパークと名古屋めし2泊3日",
    description:
      "話題のジブリパークを探索！ひつまぶし、味噌カツなどの名古屋めしも満喫。レゴランドや名古屋港水族館など、子供が喜ぶスポットも充実。",
    input: {
      destinations: ["愛知（名古屋・長久手）"],
      isDestinationDecided: true,
      region: "domestic",
      dates: "2泊3日",
      companions: "家族（子供あり）",
      theme: ["テーマパーク", "グルメ", "子供"],
      budget: "中程度",
      pace: "ゆっくり",
      freeText:
        "ジブリパークに行ってみたい！子供連れでも楽しめる名古屋観光もしたい。",
    },
    createdAt: "2025-10-20",
    tags: ["家族旅行", "2泊3日", "愛知", "通年", "テーマパーク", "グルメ"],
  },
  {
    id: "ise-shima-resort",
    title: "伊勢志摩 神宮参拝とリゾート2泊3日",
    description:
      "伊勢神宮で心を清め、賢島のリゾートホテルでゆったり。おかげ横丁での食べ歩きや、鳥羽水族館も楽しめる、大人のための休日プラン。",
    input: {
      destinations: ["伊勢・志摩"],
      isDestinationDecided: true,
      region: "domestic",
      dates: "2泊3日",
      companions: "カップル・夫婦",
      theme: ["神社仏閣", "リゾート", "グルメ"],
      budget: "高め",
      pace: "ゆっくり",
      freeText:
        "伊勢神宮にお参りして、美味しい伊勢海老や松阪牛を食べたい。ゆっくりできるホテルが良い。",
    },
    createdAt: "2025-11-03",
    tags: ["カップル", "2泊3日", "三重", "通年", "神社仏閣", "リゾート"],
  },
  {
    id: "shikoku-udon-nature",
    title: "四国 うどん巡りと絶景3泊4日",
    description:
      "香川の讃岐うどんの名店を巡り、愛媛の道後温泉でほっこり。しまなみ海道の絶景ドライブや、高知のカツオのたたきも味わう四国周遊旅。",
    input: {
      destinations: ["四国（香川・愛媛・高知）"],
      isDestinationDecided: true,
      region: "domestic",
      dates: "3泊4日",
      companions: "友人",
      theme: ["グルメ", "温泉", "自然・絶景"],
      budget: "中程度",
      pace: "アクティブ",
      freeText:
        "美味しいうどん屋さんを何軒か巡りたい！道後温泉にも入りたいです。",
    },
    createdAt: "2025-05-25",
    tags: ["友人旅行", "3泊4日", "香川", "愛媛", "四国", "グルメ", "温泉"],
  },
  {
    id: "sendai-matsushima",
    title: "仙台・松島 絶景と牛タン1泊2日",
    description:
      "日本三景の一つ、松島の絶景を遊覧船から堪能。仙台では厚切りの牛タンやずんだ餅を味わう。歴史ある伊達政宗ゆかりのスポットも巡る旅。",
    input: {
      destinations: ["宮城（仙台・松島）"],
      isDestinationDecided: true,
      region: "domestic",
      dates: "1泊2日",
      companions: "カップル・夫婦",
      theme: ["自然・絶景", "グルメ", "文化・歴史"],
      budget: "中程度",
      pace: "普通",
      freeText: "松島のきれいな景色を見たい。本場の牛タンも楽しみ！",
    },
    createdAt: "2025-10-10",
    tags: ["カップル", "1泊2日", "宮城", "秋", "グルメ", "絶景"],
  },
  {
    id: "nagano-nature-retreat",
    title: "長野 軽井沢と松本城2泊3日",
    description:
      "避暑地・軽井沢でショッピングとカフェ巡り。国宝・松本城の雄姿に感動し、信州そばや新鮮な野菜料理など山の幸も楽しむリフレッシュ旅。",
    input: {
      destinations: ["長野（軽井沢・松本）"],
      isDestinationDecided: true,
      region: "domestic",
      dates: "2泊3日",
      companions: "カップル・夫婦",
      theme: ["自然・絶景", "ショッピング", "歴史"],
      budget: "中程度",
      pace: "ゆっくり",
      freeText:
        "自然の中でリフレッシュしたい。軽井沢のアウトレットと松本城に行きたい。",
    },
    createdAt: "2025-08-20",
    tags: ["カップル", "2泊3日", "長野", "夏", "自然", "ショッピング"],
  },
  {
    id: "kobe-port-nightview",
    title: "神戸 港町散策と夜景1泊2日",
    description:
      "異国情緒あふれる北野異人館街や南京町を散策。夜は「1000万ドルの夜景」と称される六甲山からの景色や、神戸牛ディナーでロマンチックに。",
    input: {
      destinations: ["神戸"],
      isDestinationDecided: true,
      region: "domestic",
      dates: "1泊2日",
      companions: "カップル・夫婦",
      theme: ["夜景", "グルメ", "街歩き"],
      budget: "高め",
      pace: "普通",
      freeText:
        "おしゃれな神戸の街を歩きたい。夜景の見えるレストランで食事したい。",
    },
    createdAt: "2025-12-05",
    tags: ["カップル", "1泊2日", "兵庫", "冬", "夜景", "おしゃれ"],
  },
  {
    id: "kamakura-enoshima",
    title: "鎌倉・江ノ島 アジサイと海1泊2日",
    description:
      "古都・鎌倉で大仏や鶴岡八幡宮を参拝し、江ノ電に乗って江ノ島へ。海沿いのカフェでのんびりしたり、新鮮なしらす丼を食べたりする癒しの旅。",
    input: {
      destinations: ["鎌倉・江ノ島"],
      isDestinationDecided: true,
      region: "domestic",
      dates: "1泊2日",
      companions: "友人",
      theme: ["神社仏閣", "海", "グルメ"],
      budget: "中程度",
      pace: "普通",
      freeText: "江ノ電に乗って海を見に行きたい。鎌倉のお寺巡りもしたい。",
    },
    createdAt: "2025-06-10",
    tags: ["友人旅行", "1泊2日", "神奈川", "初夏", "海", "散歩"],
  },
  {
    id: "beppu-yufuin-onsen",
    title: "別府・湯布院 温泉三昧2泊3日",
    description:
      "おんせん県・大分の2大温泉地を巡る。別府の地獄めぐりで迫力を体感し、湯布院の金鱗湖周辺を散策。最高の湯と豊後牛やとり天などの地元グルメを満喫。",
    input: {
      destinations: ["大分（別府・湯布院）"],
      isDestinationDecided: true,
      region: "domestic",
      dates: "2泊3日",
      companions: "家族（大人のみ）",
      theme: ["温泉", "自然・絶景", "グルメ"],
      budget: "中程度",
      pace: "ゆっくり",
      freeText: "とにかく温泉でゆっくりしたい！地獄めぐりも見てみたい。",
    },
    createdAt: "2025-02-15",
    tags: ["家族旅行", "2泊3日", "大分", "冬", "温泉", "癒し"],
  },
  {
    id: "honolulu-resort",
    title: "ホノルル（ハワイ） リゾート満喫5泊7日",
    description:
      "常夏の楽園ハワイで過ごす、究極のリゾートステイ。ワイキキビーチでのんびり、ダイヤモンドヘッド登山で絶景を楽しみ、ショッピングやグルメも満喫。心身ともにリフレッシュするカップル・家族に人気のプラン。",
    input: {
      destinations: ["ホノルル"],
      isDestinationDecided: true,
      region: "overseas",
      dates: "5泊7日",
      companions: "カップル・夫婦",
      theme: ["リゾート", "ビーチ・海", "ショッピング", "自然・絶景"],
      budget: "高め",
      pace: "ゆっくり",
      freeText:
        "ハワイの海を見ながらのんびりしたい。お買い物もグルメも楽しみたいです。",
    },
    createdAt: "2025-07-10",
    tags: ["カップル", "5泊7日", "ハワイ", "海外", "リゾート", "ビーチ"],
  },
  {
    id: "paris-art-culture",
    title: "パリ 芸術とロマンチックな街歩き5泊7日",
    description:
      "ルーヴル、オルセーなど世界的な美術館を巡り、エッフェル塔や凱旋門などの名所を訪れる。セーヌ川沿いの散策や、おしゃれなカフェでのひとときも楽しむ、パリの魔法にかかる旅。",
    input: {
      destinations: ["パリ"],
      isDestinationDecided: true,
      region: "overseas",
      dates: "5泊7日",
      companions: "カップル・夫婦",
      theme: ["アート・美術館", "文化・歴史", "街歩き", "ロマンチック"],
      budget: "高め",
      pace: "普通",
      freeText:
        "憧れのパリで美術館巡りをしたい。美味しいパンやスイーツも食べたい。",
    },
    createdAt: "2025-05-20",
    tags: ["カップル", "5泊7日", "フランス", "ヨーロッパ", "海外", "アート"],
  },
  {
    id: "london-history-modern",
    title: "ロンドン 歴史とモダンが融合する街5泊7日",
    description:
      "大英博物館やバッキンガム宮殿で英国の伝統に触れ、ソーホーやショーディッチで最先端のカルチャーを感じる。ミュージカル鑑賞やアフタヌーンティーも欠かせない、刺激的なロンドン旅。",
    input: {
      destinations: ["ロンドン"],
      isDestinationDecided: true,
      region: "overseas",
      dates: "5泊7日",
      companions: "友人",
      theme: ["文化・歴史", "ショッピング", "エンターテイメント", "都市観光"],
      budget: "高め",
      pace: "アクティブ",
      freeText:
        "ロンドンの観光名所を一通り見たい。ハリーポッターのスタジオツアーにも行きたい。",
    },
    createdAt: "2025-08-15",
    tags: ["友人旅行", "5泊7日", "イギリス", "ヨーロッパ", "海外", "都市観光"],
  },
  {
    id: "newyork-city-life",
    title: "ニューヨーク 世界の中心で刺激的な4泊6日",
    description:
      "タイムズスクエアの熱気、セントラルパークの憩い、ブロードウェイの興奮。美術館巡りや最新グルメも楽しむ、エネルギー溢れるニューヨークを体感する旅。",
    input: {
      destinations: ["ニューヨーク"],
      isDestinationDecided: true,
      region: "overseas",
      dates: "4泊6日",
      companions: "一人旅",
      theme: ["都市観光", "アート・美術館", "エンターテイメント", "グルメ"],
      budget: "高め",
      pace: "アクティブ",
      freeText:
        "ニューヨークの街を歩き回りたい。本場のミュージカルやジャズを楽しみたい。",
    },
    createdAt: "2025-09-10",
    tags: ["一人旅", "4泊6日", "アメリカ", "北米", "海外", "都市観光"],
  },
  {
    id: "rome-ancient-history",
    title: "ローマ 永遠の都で歴史散歩5泊7日",
    description:
      "コロッセオ、フォロ・ロマーノなど古代ローマの遺跡を巡り、バチカン市国で荘厳な芸術に触れる。本場のパスタやジェラートも堪能する、歴史好きにはたまらないローマの休日。",
    input: {
      destinations: ["ローマ"],
      isDestinationDecided: true,
      region: "overseas",
      dates: "5泊7日",
      companions: "カップル・夫婦",
      theme: ["文化・歴史", "世界遺産", "グルメ", "街歩き"],
      budget: "中程度",
      pace: "普通",
      freeText:
        "ローマの遺跡を見て回りたい。美味しいイタリア料理もお腹いっぱい食べたい。",
    },
    createdAt: "2025-06-05",
    tags: ["カップル", "5泊7日", "イタリア", "ヨーロッパ", "海外", "歴史"],
  },
  {
    id: "barcelona-gaudi-art",
    title: "バルセロナ ガウディ建築と美食4泊6日",
    description:
      "サグラダ・ファミリアをはじめとするガウディの独創的な建築群を巡る。活気あるボケリア市場やバル巡りでタパスを味わう、情熱の街バルセロナを満喫する旅。",
    input: {
      destinations: ["バルセロナ"],
      isDestinationDecided: true,
      region: "overseas",
      dates: "4泊6日",
      companions: "友人",
      theme: ["アート・美術館", "グルメ", "建築", "街歩き"],
      budget: "中程度",
      pace: "普通",
      freeText:
        "ガウディの建築をたくさん見たい。夜はバルで美味しいタパスとお酒を楽しみたい。",
    },
    createdAt: "2025-10-25",
    tags: ["友人旅行", "4泊6日", "スペイン", "ヨーロッパ", "海外", "アート"],
  },
  {
    id: "bangkok-temple-food",
    title: "バンコク 黄金の寺院と屋台グルメ3泊5日",
    description:
      "ワット・アルンなどの荘厳な寺院を巡り、活気あふれるナイトマーケットでショッピングと屋台グルメを楽しむ。タイ式マッサージで癒やされる、エネルギッシュなバンコク旅。",
    input: {
      destinations: ["バンコク"],
      isDestinationDecided: true,
      region: "overseas",
      dates: "3泊5日",
      companions: "友人",
      theme: ["グルメ", "文化・歴史", "ショッピング", "リラックス"],
      budget: "安め",
      pace: "普通",
      freeText:
        "安くて美味しいタイ料理をたくさん食べたい！マッサージも毎日行きたい。",
    },
    createdAt: "2025-11-15",
    tags: ["友人旅行", "3泊5日", "タイ", "アジア", "海外", "グルメ"],
  },
  {
    id: "seoul-kpop-beauty",
    title: "ソウル トレンドと美容・グルメ2泊3日",
    description:
      "明洞や弘大でショッピング、流行のカフェ巡り。本場の韓国焼肉や屋台フードを楽しみ、美容クリニックやコスメ探しも充実。週末サクッと行けるソウル女子旅。",
    input: {
      destinations: ["ソウル"],
      isDestinationDecided: true,
      region: "overseas",
      dates: "2泊3日",
      companions: "友人",
      theme: ["グルメ", "ショッピング", "美容", "トレンド"],
      budget: "中程度",
      pace: "アクティブ",
      freeText:
        "コスメや服の買い物を楽しみたい。おしゃれなカフェにも行きたいです。",
    },
    createdAt: "2025-04-20",
    tags: ["友人旅行", "2泊3日", "韓国", "アジア", "海外", "ショッピング"],
  },
  {
    id: "taipei-nightmarket",
    title: "台北 夜市と千と千尋の世界2泊3日",
    description:
      "士林夜市などでB級グルメを食べ歩き。九份のノスタルジックな街並みを散策し、台北101からの夜景も楽しむ。近くて美味しい、台湾満喫の旅。",
    input: {
      destinations: ["台北"],
      isDestinationDecided: true,
      region: "overseas",
      dates: "2泊3日",
      companions: "家族（子供あり）",
      theme: ["グルメ", "夜景", "文化・歴史", "街歩き"],
      budget: "安め",
      pace: "ゆっくり",
      freeText:
        "美味しい小籠包やかき氷を食べたい。九份に行って提灯の景色を見たい。",
    },
    createdAt: "2025-03-10",
    tags: ["家族旅行", "2泊3日", "台湾", "アジア", "海外", "グルメ"],
  },
  {
    id: "singapore-city-resort",
    title: "シンガポール 近未来都市とガーデン3泊5日",
    description:
      "マリーナベイ・サンズやガーデンズ・バイ・ザ・ベイなど近未来的なスポットを巡る。多民族国家ならではの多様なグルメや、セントーサ島でのレジャーも楽しむ旅。",
    input: {
      destinations: ["シンガポール"],
      isDestinationDecided: true,
      region: "overseas",
      dates: "3泊5日",
      companions: "家族（子供あり）",
      theme: ["都市観光", "テーマパーク", "グルメ", "夜景"],
      budget: "高め",
      pace: "普通",
      freeText:
        "マーライオンを見たい。子供と一緒に動物園や植物園を楽しみたい。",
    },
    createdAt: "2025-08-01",
    tags: ["家族旅行", "3泊5日", "シンガポール", "アジア", "海外", "都市観光"],
  },
  {
    id: "sydney-harbour-nature",
    title: "シドニー オペラハウスと美しい港4泊6日",
    description:
      "世界遺産オペラハウスを眺め、ボンダイビーチで海風を感じる。コアラやカンガルーとの触れ合いや、ブルーマウンテンズへの小旅行も楽しむ、オーストラリアの自然と都市の融合。",
    input: {
      destinations: ["シドニー"],
      isDestinationDecided: true,
      region: "overseas",
      dates: "4泊6日",
      companions: "カップル・夫婦",
      theme: ["自然・絶景", "都市観光", "ビーチ・海", "動物"],
      budget: "高め",
      pace: "ゆっくり",
      freeText:
        "オペラハウスを見たい。オーストラリアならではの動物に会いたい。",
    },
    createdAt: "2025-12-01",
    tags: [
      "カップル",
      "4泊6日",
      "オーストラリア",
      "オセアニア",
      "海外",
      "自然",
    ],
  },
  {
    id: "vancouver-nature-city",
    title: "バンクーバー 自然と都市のハーモニー4泊6日",
    description:
      "スタンレーパークでのサイクリング、グランビルアイランドでのショッピング。海と山に囲まれた美しい都市で、アウトドアと都会的な楽しみを両立するカナダの旅。",
    input: {
      destinations: ["バンクーバー"],
      isDestinationDecided: true,
      region: "overseas",
      dates: "4泊6日",
      companions: "友人",
      theme: ["自然・絶景", "街歩き", "グルメ", "アクティビティ"],
      budget: "中程度",
      pace: "普通",
      freeText: "自然の中で体を動かしたい。美味しいシーフードも食べたいです。",
    },
    createdAt: "2025-07-25",
    tags: ["友人旅行", "4泊6日", "カナダ", "北米", "海外", "自然"],
  },
  {
    id: "losangeles-movie-beach",
    title: "ロサンゼルス 映画の都とビーチカルチャー4泊6日",
    description:
      "ハリウッドで映画の世界に浸り、サンタモニカビーチで西海岸の風を感じる。ビバリーヒルズでの散策や、テーマパークも楽しむエンターテイメント満載の旅。",
    input: {
      destinations: ["ロサンゼルス"],
      isDestinationDecided: true,
      region: "overseas",
      dates: "4泊6日",
      companions: "友人",
      theme: [
        "テーマパーク",
        "エンターテイメント",
        "ビーチ・海",
        "ショッピング",
      ],
      budget: "高め",
      pace: "アクティブ",
      freeText:
        "ハリウッドサインを見たい。ディズニーランドかユニバに行きたい。",
    },
    createdAt: "2025-09-20",
    tags: ["友人旅行", "4泊6日", "アメリカ", "北米", "海外", "エンタメ"],
  },
  {
    id: "bali-spirit-retreat",
    title: "バリ島 神々の島で癒やしのリゾート3泊5日",
    description:
      "ウブドの棚田や寺院を巡り、伝統舞踊を鑑賞。ビーチリゾートでのんびり過ごし、スパで心身を癒やす。スピリチュアルな空気に包まれる極上の休息。",
    input: {
      destinations: ["バリ島"],
      isDestinationDecided: true,
      region: "overseas",
      dates: "3泊5日",
      companions: "一人旅",
      theme: ["リゾート", "リラックス", "文化・歴史", "自然・絶景"],
      budget: "中程度",
      pace: "ゆっくり",
      freeText:
        "とにかくのんびりしたい。ヨガをしたり、スパでマッサージを受けたい。",
    },
    createdAt: "2025-06-30",
    tags: ["一人旅", "3泊5日", "インドネシア", "アジア", "海外", "リゾート"],
  },
  {
    id: "danang-hoian-resort",
    title: "ダナン・ホイアン ビーチとランタンの街3泊5日",
    description:
      "ダナンの美しいビーチでリゾートを満喫し、世界遺産ホイアンのランタンが彩る幻想的な夜景を楽しむ。ベトナム中部の魅力を凝縮した、フォトジェニックな旅。",
    input: {
      destinations: ["ダナン・ホイアン"],
      isDestinationDecided: true,
      region: "overseas",
      dates: "3泊5日",
      companions: "友人",
      theme: ["ビーチ・海", "世界遺産", "夜景", "グルメ"],
      budget: "安め",
      pace: "普通",
      freeText:
        "きれいな海で泳ぎたい。ホイアンのランタン祭りのような景色が見たい。",
    },
    createdAt: "2025-05-10",
    tags: ["友人旅行", "3泊5日", "ベトナム", "アジア", "海外", "リゾート"],
  },
  {
    id: "dubai-future-luxury",
    title: "ドバイ 砂漠と摩天楼のラグジュアリー3泊5日",
    description:
      "世界一高いビル・ブルジュハリファからの眺望、巨大モールでのショッピング。砂漠サファリでの冒険も楽しむ、驚きと興奮に満ちたアラビアンナイト。",
    input: {
      destinations: ["ドバイ"],
      isDestinationDecided: true,
      region: "overseas",
      dates: "3泊5日",
      companions: "カップル・夫婦",
      theme: ["都市観光", "ショッピング", "砂漠", "ラグジュアリー"],
      budget: "高め",
      pace: "アクティブ",
      freeText: "世界一の景色を見たい。砂漠でラクダに乗りたい。",
    },
    createdAt: "2025-11-25",
    tags: ["カップル", "3泊5日", "UAE", "中東", "海外", "ラグジュアリー"],
  },
  {
    id: "istanbul-east-west",
    title: "イスタンブール 東洋と西洋の交差点4泊7日",
    description:
      "アジアとヨーロッパに跨る歴史都市。ブルーモスクやアヤソフィアの壮麗な建築に圧倒され、グランドバザールで異国情緒を味わう。ボスポラス海峡クルーズも魅力。",
    input: {
      destinations: ["イスタンブール"],
      isDestinationDecided: true,
      region: "overseas",
      dates: "4泊7日",
      companions: "一人旅",
      theme: ["文化・歴史", "世界遺産", "街歩き", "グルメ"],
      budget: "中程度",
      pace: "普通",
      freeText: "モスクの美しい建築を見たい。バザールで雑貨を探したい。",
    },
    createdAt: "2025-10-15",
    tags: ["一人旅", "4泊7日", "トルコ", "ヨーロッパ", "海外", "歴史"],
  },
  {
    id: "cairo-pyramid-mystery",
    title: "カイロ 悠久のナイルとピラミッド4泊7日",
    description:
      "ギザの三大ピラミッドとスフィンクスに対面する感動。エジプト考古学博物館で古代の秘宝に触れ、ハン・ハリーリ市場で活気を感じる。古代文明の謎に迫る冒険。",
    input: {
      destinations: ["カイロ"],
      isDestinationDecided: true,
      region: "overseas",
      dates: "4泊7日",
      companions: "友人",
      theme: ["文化・歴史", "世界遺産", "冒険", "絶景"],
      budget: "中程度",
      pace: "アクティブ",
      freeText: "ピラミッドをこの目で見たい！ラクダにも乗ってみたい。",
    },
    createdAt: "2025-12-10",
    tags: ["友人旅行", "4泊7日", "エジプト", "アフリカ", "海外", "冒険"],
  },
  {
    id: "santorini-aegean-blue",
    title: "サントリーニ島 青と白の絶景リゾート4泊7日",
    description:
      "断崖絶壁に並ぶ白い家々と青いドームの教会。エーゲ海を見下ろす絶景カフェでくつろぎ、世界一とも言われるイアの夕日を眺める。ハネムーンにも最適なロマンチックな島。",
    input: {
      destinations: ["サントリーニ島"],
      isDestinationDecided: true,
      region: "overseas",
      dates: "4泊7日",
      companions: "カップル・夫婦",
      theme: ["リゾート", "絶景", "ロマンチック", "海"],
      budget: "高め",
      pace: "ゆっくり",
      freeText:
        "白い街並みと青い海の写真を撮りたい。夕日を見ながらゆっくり食事したい。",
    },
    createdAt: "2025-06-25",
    tags: ["カップル", "4泊7日", "ギリシャ", "ヨーロッパ", "海外", "リゾート"],
  },
  {
    id: "machu-picchu-adventure",
    title: "マチュピチュ 天空の遺跡を目指す旅5泊8日",
    description:
      "アンデスの山奥に潜むインカ帝国の遺跡マチュピチュへ。クスコの街並みや聖なる谷も巡り、南米の壮大な自然と謎多き歴史に触れる一生に一度の感動体験。",
    input: {
      destinations: ["マチュピチュ・クスコ"],
      isDestinationDecided: true,
      region: "overseas",
      dates: "5泊8日",
      companions: "友人",
      theme: ["世界遺産", "冒険", "文化・歴史", "絶景"],
      budget: "高め",
      pace: "アクティブ",
      freeText: "マチュピチュ遺跡に行ってみたい。アルパカにも会いたい。",
    },
    createdAt: "2025-09-05",
    tags: ["友人旅行", "5泊8日", "ペルー", "南米", "海外", "世界遺産"],
  },
  {
    id: "hongkong-gourmet",
    title: "香港 100万ドルの夜景と飲茶2泊3日",
    description:
      "ビクトリアピークからの絶景夜景と、本場の点心・飲茶を楽しむ食い倒れ旅。エネルギッシュな街並みと、古い寺院が共存する独特の雰囲気を味わう。",
    input: {
      destinations: ["香港"],
      isDestinationDecided: true,
      region: "overseas",
      dates: "2泊3日",
      companions: "友人",
      theme: ["グルメ", "夜景", "ショッピング", "街歩き"],
      budget: "中程度",
      pace: "普通",
      freeText: "美味しい飲茶をたくさん食べたい。夜景も絶対見たいです。",
    },
    createdAt: "2025-10-01",
    tags: ["友人旅行", "2泊3日", "香港", "アジア", "海外", "グルメ"],
  },
  {
    id: "cebu-resort",
    title: "セブ島 ジンベイザメと美しい海3泊4日",
    description:
      "フィリピンの楽園セブ島で、世界最大の魚ジンベイザメと一緒に泳ぐ感動体験。透明度の高い海でのシュノーケリングや、ビーチリゾートでのんびり過ごす。",
    input: {
      destinations: ["セブ島"],
      isDestinationDecided: true,
      region: "overseas",
      dates: "3泊4日",
      companions: "カップル・夫婦",
      theme: ["ビーチ・海", "アクティビティ", "リゾート", "自然・絶景"],
      budget: "安め",
      pace: "アクティブ",
      freeText: "ジンベイザメと泳ぎたい！綺麗な海でリゾート気分も味わいたい。",
    },
    createdAt: "2025-07-15",
    tags: ["カップル", "3泊4日", "フィリピン", "アジア", "海外", "ビーチ"],
  },
  {
    id: "hanoi-halong",
    title: "ハノイ・ハロン湾 世界遺産の奇岩クルーズ3泊5日",
    description:
      "ベトナムの首都ハノイの古い街並みをシクロで巡り、世界遺産ハロン湾で幻想的なクルーズ体験。フランス統治時代の建築や、ヘルシーなベトナム料理も魅力。",
    input: {
      destinations: ["ハノイ・ハロン湾"],
      isDestinationDecided: true,
      region: "overseas",
      dates: "3泊5日",
      companions: "家族（子供あり）",
      theme: ["世界遺産", "自然・絶景", "文化・歴史", "グルメ"],
      budget: "安め",
      pace: "ゆっくり",
      freeText:
        "ハロン湾のクルーズに乗ってみたい。子供でも食べやすいベトナム料理を楽しみたい。",
    },
    createdAt: "2025-05-05",
    tags: ["家族旅行", "3泊5日", "ベトナム", "アジア", "海外", "自然"],
  },
  {
    id: "kl-city",
    title: "クアラルンプール ペトロナスツインタワーと多文化4泊5日",
    description:
      "マレー系、中華系、インド系が融合する多文化都市。ペトロナスツインタワーの威容や、バトゥ洞窟の神秘に触れる。安くて美味しい屋台メシも充実。",
    input: {
      destinations: ["クアラルンプール"],
      isDestinationDecided: true,
      region: "overseas",
      dates: "4泊5日",
      companions: "一人旅",
      theme: ["都市観光", "文化・歴史", "グルメ", "フォトジェニック"],
      budget: "安め",
      pace: "普通",
      freeText:
        "異文化が混ざり合う街の雰囲気を感じたい。ツインタワーの写真も撮りたい。",
    },
    createdAt: "2025-08-10",
    tags: ["一人旅", "4泊5日", "マレーシア", "アジア", "海外", "都市観光"],
  },
  {
    id: "melbourne-cafe",
    title: "メルボルン カフェ文化とアートの街5泊7日",
    description:
      "「世界で最も住みやすい都市」で、こだわりのカフェ巡りとストリートアート散策。グレートオーシャンロードへのドライブで絶景も楽しむおしゃれな旅。",
    input: {
      destinations: ["メルボルン"],
      isDestinationDecided: true,
      region: "overseas",
      dates: "5泊7日",
      companions: "友人",
      theme: ["カフェ巡り", "アート・美術館", "街歩き", "自然・絶景"],
      budget: "中程度",
      pace: "ゆっくり",
      freeText: "おしゃれなカフェを巡りたい。街中のアートも楽しみたい。",
    },
    createdAt: "2025-11-20",
    tags: ["友人旅行", "5泊7日", "オーストラリア", "オセアニア", "海外", "おしゃれ"],
  },
  {
    id: "goldcoast-beach",
    title: "ゴールドコースト サーファーズパラダイスと動物4泊6日",
    description:
      "延々と続く白い砂浜でビーチライフを満喫。カランビン野生動物保護区でコアラを抱っこしたり、カンガルーに餌やり体験もできる、家族みんなが笑顔になる旅。",
    input: {
      destinations: ["ゴールドコースト"],
      isDestinationDecided: true,
      region: "overseas",
      dates: "4泊6日",
      companions: "家族（子供あり）",
      theme: ["ビーチ・海", "動物", "テーマパーク", "自然・絶景"],
      budget: "中程度",
      pace: "アクティブ",
      freeText: "子供と一緒に海で遊びたい。コアラを抱っこして写真を撮りたい。",
    },
    createdAt: "2025-01-20",
    tags: [
      "家族旅行",
      "4泊6日",
      "オーストラリア",
      "オセアニア",
      "海外",
      "ビーチ",
    ],
  },
  {
    id: "queenstown-nature",
    title: "クイーンズタウン 湖畔の絶景とアクティビティ5泊7日",
    description:
      "ニュージーランド南島の美しい湖畔の街。ミルフォードサウンドへのフィヨルド観光や、バンジージャンプなどのアクティビティ、美味しいワインも楽しめる。",
    input: {
      destinations: ["クイーンズタウン"],
      isDestinationDecided: true,
      region: "overseas",
      dates: "5泊7日",
      companions: "カップル・夫婦",
      theme: ["自然・絶景", "アクティビティ", "グルメ", "リラックス"],
      budget: "高め",
      pace: "アクティブ",
      freeText: "大自然の中でアクティビティを楽しみたい。景色が良い場所に行きたい。",
    },
    createdAt: "2025-03-15",
    tags: [
      "カップル",
      "5泊7日",
      "ニュージーランド",
      "オセアニア",
      "海外",
      "自然",
    ],
  },
  {
    id: "lasvegas-entertainment",
    title: "ラスベガス 眠らない街のエンタメとグランドキャニオン4泊6日",
    description:
      "カジノ、シルク・ドゥ・ソレイユのショー、巨大ホテルの噴水ショーなどエンタメ尽くし。ヘリコプターでグランドキャニオンへ飛ぶ絶景ツアーも。",
    input: {
      destinations: ["ラスベガス"],
      isDestinationDecided: true,
      region: "overseas",
      dates: "4泊6日",
      companions: "カップル・夫婦",
      theme: ["エンターテイメント", "カジノ", "自然・絶景", "夜景"],
      budget: "高め",
      pace: "アクティブ",
      freeText: "豪華なショーを観たい！グランドキャニオンにも行ってみたい。",
    },
    createdAt: "2025-09-30",
    tags: ["カップル", "4泊6日", "アメリカ", "北米", "海外", "エンタメ"],
  },
  {
    id: "sf-tech-city",
    title: "サンフランシスコ ゴールデンゲートブリッジと坂道散歩4泊6日",
    description:
      "赤い吊り橋ゴールデンゲートブリッジや、フィッシャーマンズワーフの活気ある港町。ケーブルカーに乗って坂道を上り下りし、シリコンバレーの空気も感じる。",
    input: {
      destinations: ["サンフランシスコ"],
      isDestinationDecided: true,
      region: "overseas",
      dates: "4泊6日",
      companions: "一人旅",
      theme: ["都市観光", "グルメ", "港町", "フォトジェニック"],
      budget: "高め",
      pace: "普通",
      freeText: "ケーブルカーに乗りたい。クラムチャウダーをパンの器で食べたい。",
    },
    createdAt: "2025-06-20",
    tags: ["一人旅", "4泊6日", "アメリカ", "北米", "海外", "都市観光"],
  },
  {
    id: "canadian-rockies",
    title: "カナディアンロッキー バンフとエメラルド色の湖5泊7日",
    description:
      "雄大なロッキー山脈と、宝石のように輝くルイーズ湖やモレーン湖。コロンビア大氷原での雪上車体験など、大自然の神秘を体感する感動の旅。",
    input: {
      destinations: ["バンフ・ジャスパー"],
      isDestinationDecided: true,
      region: "overseas",
      dates: "5泊7日",
      companions: "家族（子供あり）",
      theme: ["自然・絶景", "国立公園", "ハイキング", "ドライブ"],
      budget: "高め",
      pace: "普通",
      freeText: "カナダの大自然を満喫したい。綺麗な色の湖を見たい。",
    },
    createdAt: "2025-08-05",
    tags: ["家族旅行", "5泊7日", "カナダ", "北米", "海外", "自然"],
  },
  {
    id: "cancun-resort",
    title: "カンクン カリブ海のオールインクルーシブ5泊7日",
    description:
      "メキシコのカリブ海リゾート。飲食代込みのオールインクルーシブホテルで贅沢に過ごす。神秘的なセノーテでの遊泳や、チチェン・イッツァ遺跡観光も。",
    input: {
      destinations: ["カンクン"],
      isDestinationDecided: true,
      region: "overseas",
      dates: "5泊7日",
      companions: "カップル・夫婦",
      theme: ["リゾート", "ビーチ・海", "世界遺産", "リラックス"],
      budget: "高め",
      pace: "ゆっくり",
      freeText:
        "オールインクルーシブで何も気にせず飲み食いしたい。セノーテに行ってみたい。",
    },
    createdAt: "2025-02-10",
    tags: ["カップル", "5泊7日", "メキシコ", "中南米", "海外", "リゾート"],
  },
  {
    id: "vienna-music",
    title: "ウィーン 音楽と宮殿の優雅な休日4泊6日",
    description:
      "音楽の都ウィーンでオペラ座やシェーンブルン宮殿を見学。ザッハトルテを味わいながらカフェ文化に浸る、優雅で芸術的なひととき。",
    input: {
      destinations: ["ウィーン"],
      isDestinationDecided: true,
      region: "overseas",
      dates: "4泊6日",
      companions: "カップル・夫婦",
      theme: ["文化・歴史", "アート・美術館", "カフェ巡り", "音楽"],
      budget: "中程度",
      pace: "ゆっくり",
      freeText: "本場のザッハトルテを食べたい。宮殿コンサートに行ってみたい。",
    },
    createdAt: "2025-10-05",
    tags: [
      "カップル",
      "4泊6日",
      "オーストリア",
      "ヨーロッパ",
      "海外",
      "文化体験",
    ],
  },
  {
    id: "munich-beer",
    title: "ミュンヘン ビールと白鳥の城4泊6日",
    description:
      "ビアホールで本場のドイツビールとソーセージを堪能。少し足を延ばして、ディズニーの城のモデルとも言われるノイシュバンシュタイン城へ。",
    input: {
      destinations: ["ミュンヘン"],
      isDestinationDecided: true,
      region: "overseas",
      dates: "4泊6日",
      companions: "友人",
      theme: ["グルメ", "文化・歴史", "城めぐり", "絶景"],
      budget: "中程度",
      pace: "アクティブ",
      freeText: "ドイツビールを浴びるほど飲みたい！お城も見に行きたい。",
    },
    createdAt: "2025-09-15",
    tags: ["友人旅行", "4泊6日", "ドイツ", "ヨーロッパ", "海外", "グルメ"],
  },
  {
    id: "amsterdam-canals",
    title: "アムステルダム 運河と美術館の街歩き4泊6日",
    description:
      "網の目のように広がる運河沿いを散策。ゴッホ美術館やアンネ・フランクの家を訪れ、風車村ザーンセ・スカンスへの小旅行も楽しむ。",
    input: {
      destinations: ["アムステルダム"],
      isDestinationDecided: true,
      region: "overseas",
      dates: "4泊6日",
      companions: "友人",
      theme: ["アート・美術館", "街歩き", "文化・歴史", "フォトジェニック"],
      budget: "中程度",
      pace: "普通",
      freeText: "ゴッホ美術館に行きたい。運河クルーズも楽しみたい。",
    },
    createdAt: "2025-04-10",
    tags: ["友人旅行", "4泊6日", "オランダ", "ヨーロッパ", "海外", "アート"],
  },
  {
    id: "lisbon-scenery",
    title: "リスボン 7つの丘の街と路面電車4泊6日",
    description:
      "哀愁漂うファドを聴きながら、ポルトガル料理に舌鼓。黄色い路面電車が走る石畳の坂道や、ジェロニモス修道院などの大航海時代の遺産を巡る。",
    input: {
      destinations: ["リスボン"],
      isDestinationDecided: true,
      region: "overseas",
      dates: "4泊6日",
      companions: "一人旅",
      theme: ["街歩き", "世界遺産", "グルメ", "フォトジェニック"],
      budget: "中程度",
      pace: "ゆっくり",
      freeText: "路面電車の写真を撮りたい。エッグタルトを食べ比べしたい。",
    },
    createdAt: "2025-11-05",
    tags: ["一人旅", "4泊6日", "ポルトガル", "ヨーロッパ", "海外", "おしゃれ"],
  },
  {
    id: "dubrovnik-game",
    title: "ドゥブロヴニク アドリア海の真珠4泊6日",
    description:
      "オレンジ色の屋根と紺碧の海が美しい城壁都市。城壁を一周ウォーキングしたり、ケーブルカーで山頂から旧市街を一望したりする絶景の旅。",
    input: {
      destinations: ["ドゥブロヴニク"],
      isDestinationDecided: true,
      region: "overseas",
      dates: "4泊6日",
      companions: "カップル・夫婦",
      theme: ["世界遺産", "絶景", "ビーチ・海", "街歩き"],
      budget: "高め",
      pace: "ゆっくり",
      freeText:
        "「魔女の宅急便」のような景色を見たい。海鮮料理も楽しみたい。",
    },
    createdAt: "2025-06-15",
    tags: [
      "カップル",
      "4泊6日",
      "クロアチア",
      "ヨーロッパ",
      "海外",
      "世界遺産",
    ],
  },
  {
    id: "finland-aurora",
    title: "フィンランド オーロラとサンタクロース5泊7日",
    description:
      "冬の北欧でオーロラ鑑賞に挑戦。ロヴァニエミでサンタクロースに会い、犬ぞり体験や本場のサウナで温まる、幻想的な冬の体験。",
    input: {
      destinations: ["ヘルシンキ・ロヴァニエミ"],
      isDestinationDecided: true,
      region: "overseas",
      dates: "5泊7日",
      companions: "カップル・夫婦",
      theme: ["自然・絶景", "オーロラ", "体験", "冬"],
      budget: "高め",
      pace: "普通",
      freeText: "オーロラを見たい！サンタさんにも会って手紙を出したい。",
    },
    createdAt: "2025-12-20",
    tags: ["カップル", "5泊7日", "フィンランド", "ヨーロッパ", "海外", "自然"],
  },
  {
    id: "marrakech-exotic",
    title: "マラケシュ エキゾチックな迷宮都市4泊7日",
    description:
      "活気あふれるジャマ・エル・フナ広場や、迷路のようなスーク（市場）を探検。美しいイスラム建築や、おしゃれなリヤド（邸宅ホテル）滞在も魅力。",
    input: {
      destinations: ["マラケシュ"],
      isDestinationDecided: true,
      region: "overseas",
      dates: "4泊7日",
      companions: "友人",
      theme: ["文化・歴史", "ショッピング", "フォトジェニック", "雑貨"],
      budget: "中程度",
      pace: "普通",
      freeText: "かわいい雑貨を買いたい。モロッコ料理のタジン鍋を食べたい。",
    },
    createdAt: "2025-03-01",
    tags: ["友人旅行", "4泊7日", "モロッコ", "アフリカ", "海外", "おしゃれ"],
  },
  {
    id: "maldives-honeymoon",
    title: "モルディブ 水上コテージで極上の休日4泊6日",
    description:
      "1島1リゾートの楽園。海に直接降りられる水上コテージに滞在し、シュノーケリングやスパを楽しむ。何もしない贅沢を味わうハネムーンの定番。",
    input: {
      destinations: ["モルディブ"],
      isDestinationDecided: true,
      region: "overseas",
      dates: "4泊6日",
      companions: "カップル・夫婦",
      theme: ["リゾート", "ビーチ・海", "リラックス", "ハネムーン"],
      budget: "高め",
      pace: "ゆっくり",
      freeText: "水上コテージに泊まりたい。2人きりでゆっくり過ごしたい。",
    },
    createdAt: "2025-02-01",
    tags: ["カップル", "4泊6日", "モルディブ", "アジア", "海外", "リゾート"],
  },
  {
    id: "switzerland-alps",
    title: "スイス アルプスの名峰と鉄道の旅5泊7日",
    description:
      "登山鉄道に乗ってユングフラウヨッホやマッターホルンの絶景展望台へ。ハイジのような牧歌的な風景の中をハイキングし、チーズフォンデュを味わう。",
    input: {
      destinations: ["インターラーケン・ツェルマット"],
      isDestinationDecided: true,
      region: "overseas",
      dates: "5泊7日",
      companions: "家族（大人のみ）",
      theme: ["自然・絶景", "山", "ハイキング", "鉄道"],
      budget: "高め",
      pace: "アクティブ",
      freeText: "アルプスの山を見ながらハイキングしたい。登山鉄道にも乗りたい。",
    },
    createdAt: "2025-07-01",
    tags: ["家族旅行", "5泊7日", "スイス", "ヨーロッパ", "海外", "自然"],
  },
  {
    id: "nikko-history",
    title: "日光 世界遺産東照宮と鬼怒川温泉1泊2日",
    description:
      "豪華絢爛な日光東照宮を見学し、華厳の滝や中禅寺湖の自然美に触れる。夜は鬼怒川温泉でゆっくりくつろぐ、歴史と癒やしの関東近郊旅。",
    input: {
      destinations: ["日光・鬼怒川"],
      isDestinationDecided: true,
      region: "domestic",
      dates: "1泊2日",
      companions: "家族（子供あり）",
      theme: ["世界遺産", "温泉", "自然・絶景", "歴史"],
      budget: "中程度",
      pace: "ゆっくり",
      freeText: "東照宮の「見ざる言わざる聞かざる」を子供に見せたい。温泉に入りたい。",
    },
    createdAt: "2025-10-10",
    tags: ["家族旅行", "1泊2日", "栃木", "秋", "世界遺産", "温泉"],
  },
  {
    id: "fuji-kawaguchiko",
    title: "富士山・河口湖 絶景とアクティビティ1泊2日",
    description:
      "富士山を望む河口湖でボートやサイクリングを楽しむ。富士急ハイランドで絶叫マシンに挑戦したり、ほうとう鍋を食べたりと充実の週末。",
    input: {
      destinations: ["河口湖"],
      isDestinationDecided: true,
      region: "domestic",
      dates: "1泊2日",
      companions: "友人",
      theme: ["自然・絶景", "テーマパーク", "グルメ", "アクティビティ"],
      budget: "中程度",
      pace: "アクティブ",
      freeText: "富士山がきれいに見える場所に行きたい！富士急にも行きたい。",
    },
    createdAt: "2025-05-01",
    tags: ["友人旅行", "1泊2日", "山梨", "春", "自然", "テーマパーク"],
  },
  {
    id: "miyakojima-beach",
    title: "宮古島 東洋一のビーチと海亀2泊3日",
    description:
      "「宮古ブルー」と呼ばれる驚異的な青さの海。与那覇前浜ビーチでのんびりし、ウミガメと一緒に泳ぐシュノーケリング体験。伊良部大橋のドライブも最高。",
    input: {
      destinations: ["宮古島"],
      isDestinationDecided: true,
      region: "domestic",
      dates: "2泊3日",
      companions: "カップル・夫婦",
      theme: ["ビーチ・海", "自然・絶景", "ドライブ", "リラックス"],
      budget: "高め",
      pace: "ゆっくり",
      freeText: "とにかくきれいな海に入りたい。ドライブも楽しみたい。",
    },
    createdAt: "2025-07-05",
    tags: ["カップル", "2泊3日", "沖縄", "夏", "ビーチ", "離島"],
  },
  {
    id: "prague-medieval",
    title: "プラハ 中世の街並みとビール文化4泊6日",
    description:
      "「百塔の街」プラハでカレル橋やプラハ城を散策。夜は本場のピルスナービールとチェコ料理を堪能する、ロマンチックで歴史深い旅。",
    input: {
      destinations: ["プラハ"],
      isDestinationDecided: true,
      region: "overseas",
      dates: "4泊6日",
      companions: "カップル・夫婦",
      theme: ["街歩き", "文化・歴史", "グルメ", "夜景", "ロマンチック"],
      budget: "中程度",
      pace: "ゆっくり",
      freeText:
        "中世のような街並みを歩きたい。美味しいビールもたくさん飲みたい。",
    },
    createdAt: "2025-05-15",
    tags: [
      "カップル",
      "4泊6日",
      "チェコ",
      "ヨーロッパ",
      "海外",
      "歴史",
      "グルメ",
    ],
  },
  {
    id: "budapest-spa-nightview",
    title: "ブダペスト ドナウの真珠と温泉4泊6日",
    description:
      "ドナウ川の夜景クルーズと、歴史ある豪華な温泉体験。国会議事堂や漁夫の砦などの建築美にも酔いしれる、優雅な東欧の旅。",
    input: {
      destinations: ["ブダペスト"],
      isDestinationDecided: true,
      region: "overseas",
      dates: "4泊6日",
      companions: "友人",
      theme: ["夜景", "温泉", "建築", "フォトジェニック"],
      budget: "中程度",
      pace: "普通",
      freeText: "世界一美しい夜景を見たい。温泉にも入ってリラックスしたい。",
    },
    createdAt: "2025-09-08",
    tags: [
      "友人旅行",
      "4泊6日",
      "ハンガリー",
      "ヨーロッパ",
      "海外",
      "絶景",
      "温泉",
    ],
  },
  {
    id: "belgium-chocolate",
    title: "ブリュッセル・ブルージュ チョコと運河4泊6日",
    description:
      "グランプラスの豪華さに圧倒され、ブルージュの運河沿いを散歩。本場のワッフル、チョコレート、ベルギービールを味わい尽くす美食旅。",
    input: {
      destinations: ["ブリュッセル・ブルージュ"],
      isDestinationDecided: true,
      region: "overseas",
      dates: "4泊6日",
      companions: "友人",
      theme: ["グルメ", "街歩き", "ショッピング", "世界遺産"],
      budget: "中程度",
      pace: "ゆっくり",
      freeText:
        "美味しいチョコレートとワッフルを食べ歩きしたい。かわいい街並みも見たい。",
    },
    createdAt: "2025-04-25",
    tags: [
      "友人旅行",
      "4泊6日",
      "ベルギー",
      "ヨーロッパ",
      "海外",
      "グルメ",
      "おしゃれ",
    ],
  },
  {
    id: "malta-blue-fortress",
    title: "マルタ島 地中海の青と騎士団の街4泊7日",
    description:
      "はちみつ色の要塞都市バレッタを探索し、青の洞門やコミノ島のブルーラグーンで絶景を楽しむ。歴史とリゾートが融合した地中海の宝石。",
    input: {
      destinations: ["マルタ"],
      isDestinationDecided: true,
      region: "overseas",
      dates: "4泊7日",
      companions: "一人旅",
      theme: ["世界遺産", "ビーチ・海", "街歩き", "リゾート"],
      budget: "中程度",
      pace: "ゆっくり",
      freeText: "きれいな海と古い街並みの両方を楽しみたい。猫にも会いたい。",
    },
    createdAt: "2025-06-12",
    tags: [
      "一人旅",
      "4泊7日",
      "マルタ",
      "ヨーロッパ",
      "海外",
      "世界遺産",
      "リゾート",
    ],
  },
  {
    id: "iceland-nature-drive",
    title: "アイスランド 火と氷の絶景ドライブ5泊7日",
    description:
      "ゴールデンサークルで間欠泉や滝の迫力を体感。世界最大の露天風呂ブルーラグーンで癒やされ、オーロラハントにも挑戦する大自然満喫旅。",
    input: {
      destinations: ["レイキャビク"],
      isDestinationDecided: true,
      region: "overseas",
      dates: "5泊7日",
      companions: "友人",
      theme: ["自然・絶景", "温泉", "オーロラ", "ドライブ", "冒険"],
      budget: "高め",
      pace: "アクティブ",
      freeText: "今まで見たことのないような大自然を見たい。温泉にも入りたい。",
    },
    createdAt: "2025-10-30",
    tags: [
      "友人旅行",
      "5泊7日",
      "アイスランド",
      "ヨーロッパ",
      "海外",
      "自然",
      "冒険",
    ],
  },
  {
    id: "norway-fjord",
    title: "ノルウェー フィヨルドの大自然クルーズ5泊7日",
    description:
      "ベルゲンからソグネフィヨルドへ。山岳鉄道とフェリーを乗り継ぎ、断崖絶壁と深い入江が織りなす大迫力の絶景を目の当たりにする。",
    input: {
      destinations: ["ベルゲン・オスロ"],
      isDestinationDecided: true,
      region: "overseas",
      dates: "5泊7日",
      companions: "家族（大人のみ）",
      theme: ["自然・絶景", "クルーズ", "鉄道", "世界遺産"],
      budget: "高め",
      pace: "普通",
      freeText: "フィヨルドの絶景を船から見たい。鉄道の旅も楽しみたい。",
    },
    createdAt: "2025-07-15",
    tags: [
      "家族旅行",
      "5泊7日",
      "ノルウェー",
      "ヨーロッパ",
      "海外",
      "自然",
      "絶景",
    ],
  },
  {
    id: "stockholm-kiki",
    title: "ストックホルム 水の都と魔女の宅急便4泊6日",
    description:
      "14の島からなる美しい首都。ガムラスタンのカラフルな街並みを歩き、ノーベル賞晩餐会の市庁舎を見学。北欧デザインの雑貨探しも。",
    input: {
      destinations: ["ストックホルム"],
      isDestinationDecided: true,
      region: "overseas",
      dates: "4泊6日",
      companions: "友人",
      theme: ["街歩き", "ショッピング", "雑貨", "フォトジェニック"],
      budget: "高め",
      pace: "ゆっくり",
      freeText: "魔女の宅急便のモデルになった街を歩きたい。北欧雑貨を買いたい。",
    },
    createdAt: "2025-08-05",
    tags: [
      "友人旅行",
      "4泊6日",
      "スウェーデン",
      "ヨーロッパ",
      "海外",
      "おしゃれ",
    ],
  },
  {
    id: "copenhagen-fairytale",
    title: "コペンハーゲン おとぎの国とデザイン4泊6日",
    description:
      "カラフルなニューハウン、人魚姫の像、チボリ公園を巡る。洗練されたデンマークデザインの家具や建築に触れ、ヒュッゲな時間を過ごす。",
    input: {
      destinations: ["コペンハーゲン"],
      isDestinationDecided: true,
      region: "overseas",
      dates: "4泊6日",
      companions: "カップル・夫婦",
      theme: ["街歩き", "ショッピング", "テーマパーク", "アート"],
      budget: "高め",
      pace: "ゆっくり",
      freeText:
        "おしゃれな街並みで写真を撮りたい。美味しいオープンサンドを食べたい。",
    },
    createdAt: "2025-05-10",
    tags: [
      "カップル",
      "4泊6日",
      "デンマーク",
      "ヨーロッパ",
      "海外",
      "おしゃれ",
    ],
  },
  {
    id: "dublin-pub-celtic",
    title: "ダブリン パブ文化とケルトの歴史4泊6日",
    description:
      "テンプルバーエリアでアイリッシュパブをはしごし、ギネスビールを堪能。トリニティカレッジで「ケルズの書」を見て歴史を感じる大人の旅。",
    input: {
      destinations: ["ダブリン"],
      isDestinationDecided: true,
      region: "overseas",
      dates: "4泊6日",
      companions: "友人",
      theme: ["グルメ", "文化・歴史", "街歩き", "お酒"],
      budget: "中程度",
      pace: "普通",
      freeText: "本場のギネスビールをパブで飲みたい！陽気な音楽を楽しみたい。",
    },
    createdAt: "2025-09-20",
    tags: ["友人旅行", "4泊6日", "アイルランド", "ヨーロッパ", "海外", "グルメ"],
  },
  {
    id: "poland-history-memorial",
    title: "ワルシャワ・クラクフ 歴史の記憶を辿る5泊7日",
    description:
      "「北のパリ」ワルシャワの復興された旧市街と、古都クラクフを巡る。アウシュビッツ強制収容所を訪れ、平和について深く考える時間も。",
    input: {
      destinations: ["ワルシャワ・クラクフ"],
      isDestinationDecided: true,
      region: "overseas",
      dates: "5泊7日",
      companions: "一人旅",
      theme: ["世界遺産", "文化・歴史", "街歩き", "平和学習"],
      budget: "安め",
      pace: "普通",
      freeText: "負の遺産を含めて歴史をしっかり学びたい。きれいな街並みも見たい。",
    },
    createdAt: "2025-11-12",
    tags: [
      "一人旅",
      "5泊7日",
      "ポーランド",
      "ヨーロッパ",
      "海外",
      "歴史",
      "世界遺産",
    ],
  },
  {
    id: "angkor-wat-ruins",
    title: "シェムリアップ アンコールワット遺跡群3泊5日",
    description:
      "世界遺産アンコールワットの日の出に感動し、巨大な顔が並ぶバイヨン寺院や、樹木に覆われたタ・プロームを探検。カンボジアの神秘に触れる。",
    input: {
      destinations: ["シェムリアップ"],
      isDestinationDecided: true,
      region: "overseas",
      dates: "3泊5日",
      companions: "友人",
      theme: ["世界遺産", "冒険", "絶景", "文化・歴史"],
      budget: "安め",
      pace: "アクティブ",
      freeText: "アンコールワットの朝日を見たい。遺跡の中を冒険したい。",
    },
    createdAt: "2025-02-20",
    tags: [
      "友人旅行",
      "3泊5日",
      "カンボジア",
      "アジア",
      "海外",
      "世界遺産",
      "冒険",
    ],
  },
  {
    id: "india-taj-mahal",
    title: "インド タージマハルとピンクシティ4泊6日",
    description:
      "世界一美しい霊廟タージマハルと、ピンク色の建物が並ぶジャイプールを巡るゴールデントライアングル。カレーやチャイなど本場の味も満喫。",
    input: {
      destinations: ["デリー・アグラ・ジャイプール"],
      isDestinationDecided: true,
      region: "overseas",
      dates: "4泊6日",
      companions: "一人旅",
      theme: ["世界遺産", "文化・歴史", "グルメ", "フォトジェニック"],
      budget: "安め",
      pace: "アクティブ",
      freeText:
        "タージマハルを見たい。象に乗ったり、本場のカレーを食べたりしたい。",
    },
    createdAt: "2025-03-05",
    tags: ["一人旅", "4泊6日", "インド", "アジア", "海外", "世界遺産", "グルメ"],
  },
  {
    id: "kathmandu-himalaya",
    title: "カトマンズ ヒマラヤの絶景と神々の住む谷4泊6日",
    description:
      "カトマンズ盆地の古都パタンやバクタプルを散策。ナガルコットからヒマラヤ山脈の日の出を眺め、チベット仏教の聖地で祈りの空気に触れる。",
    input: {
      destinations: ["カトマンズ"],
      isDestinationDecided: true,
      region: "overseas",
      dates: "4泊6日",
      companions: "一人旅",
      theme: ["世界遺産", "自然・絶景", "山", "文化・歴史"],
      budget: "安め",
      pace: "ゆっくり",
      freeText: "ヒマラヤの山々を見たい。古い寺院や街並みをゆっくり歩きたい。",
    },
    createdAt: "2025-10-18",
    tags: [
      "一人旅",
      "4泊6日",
      "ネパール",
      "アジア",
      "海外",
      "自然",
      "世界遺産",
    ],
  },
  {
    id: "luang-prabang-relax",
    title: "ルアンパバーン 托鉢とメコン川の夕日3泊5日",
    description:
      "街全体が世界遺産の古都。早朝の托鉢を見学し、美しい滝で水遊び。メコン川の夕日を眺めながらビールを飲む、何もしない贅沢な時間。",
    input: {
      destinations: ["ルアンパバーン"],
      isDestinationDecided: true,
      region: "overseas",
      dates: "3泊5日",
      companions: "カップル・夫婦",
      theme: ["世界遺産", "リラックス", "自然・絶景", "文化・歴史"],
      budget: "安め",
      pace: "ゆっくり",
      freeText: "静かな場所でのんびりしたい。お寺巡りや自然を楽しみたい。",
    },
    createdAt: "2025-11-25",
    tags: [
      "カップル",
      "3泊5日",
      "ラオス",
      "アジア",
      "海外",
      "癒し",
      "世界遺産",
    ],
  },
  {
    id: "bagan-pagoda",
    title: "バガン 仏塔が林立する幻想的な平原3泊5日",
    description:
      "世界三大仏教遺跡のひとつ。数千もの仏塔が地平線まで続く景色は圧巻。eバイクで遺跡を巡り、夕日に染まるパゴダのシルエットに感動する。",
    input: {
      destinations: ["バガン"],
      isDestinationDecided: true,
      region: "overseas",
      dates: "3泊5日",
      companions: "一人旅",
      theme: ["世界遺産", "絶景", "文化・歴史", "フォトジェニック"],
      budget: "安め",
      pace: "アクティブ",
      freeText:
        "仏塔がたくさんある景色を見たい。朝日や夕日がきれいな場所に行きたい。",
    },
    createdAt: "2025-01-15",
    tags: [
      "一人旅",
      "3泊5日",
      "ミャンマー",
      "アジア",
      "海外",
      "絶景",
      "世界遺産",
    ],
  },
  {
    id: "sri-lanka-nature",
    title: "スリランカ 天空の城塞シギリヤと紅茶4泊6日",
    description:
      "巨大な岩山の上に築かれたシギリヤロックに登頂。高原列車で茶畑を抜け、本場のセイロンティーを楽しむ。アーユルヴェーダでデトックスも。",
    input: {
      destinations: ["コロンボ・シギリヤ"],
      isDestinationDecided: true,
      region: "overseas",
      dates: "4泊6日",
      companions: "友人",
      theme: ["世界遺産", "自然・絶景", "リラックス", "グルメ"],
      budget: "中程度",
      pace: "アクティブ",
      freeText: "シギリヤロックに登りたい。アーユルヴェーダのマッサージを受けたい。",
    },
    createdAt: "2025-06-05",
    tags: ["友人旅行", "4泊6日", "スリランカ", "アジア", "海外", "世界遺産", "癒し"],
  },
  {
    id: "fiji-island-resort",
    title: "フィジー ケラマブルーを超える海と笑顔4泊6日",
    description:
      "「世界一幸福な国」の人々の笑顔と、透明度抜群の海に癒やされる。離島のプライベートリゾートでシュノーケリングやハンモックでのんびり。",
    input: {
      destinations: ["ナンディ・ママヌザ諸島"],
      isDestinationDecided: true,
      region: "overseas",
      dates: "4泊6日",
      companions: "家族（子供あり）",
      theme: ["ビーチ・海", "リゾート", "リラックス", "家族旅行"],
      budget: "中程度",
      pace: "ゆっくり",
      freeText: "子供と安心して遊べるきれいな海に行きたい。現地の人と交流したい。",
    },
    createdAt: "2025-07-20",
    tags: [
      "家族旅行",
      "4泊6日",
      "フィジー",
      "オセアニア",
      "海外",
      "ビーチ",
      "リゾート",
    ],
  },
  {
    id: "tahiti-bora-bora",
    title: "タヒチ・ボラボラ島 地上の楽園で水上コテージ5泊7日",
    description:
      "「太平洋の真珠」ボラボラ島のラグーンは言葉を失う美しさ。水上バンガローから海に飛び込み、カヌーで運ばれる朝食を楽しむ究極のハネムーン。",
    input: {
      destinations: ["ボラボラ島"],
      isDestinationDecided: true,
      region: "overseas",
      dates: "5泊7日",
      companions: "カップル・夫婦",
      theme: ["リゾート", "ビーチ・海", "ロマンチック", "ハネムーン"],
      budget: "高め",
      pace: "ゆっくり",
      freeText:
        "一生に一度の贅沢で水上コテージに泊まりたい。何もしない贅沢を味わいたい。",
    },
    createdAt: "2025-12-10",
    tags: [
      "カップル",
      "5泊7日",
      "タヒチ",
      "オセアニア",
      "海外",
      "リゾート",
      "ビーチ",
    ],
  },
  {
    id: "new-caledonia-heaven",
    title: "ニューカレドニア 天国に一番近い島4泊6日",
    description:
      "世界遺産のサンゴ礁に囲まれた美しい海。フランスの雰囲気漂うヌメアでマルシェを散策し、イル・デ・パンの天然プールで魚と戯れる。",
    input: {
      destinations: ["ヌメア"],
      isDestinationDecided: true,
      region: "overseas",
      dates: "4泊6日",
      companions: "カップル・夫婦",
      theme: ["ビーチ・海", "グルメ", "リゾート", "自然・絶景"],
      budget: "中程度",
      pace: "ゆっくり",
      freeText: "きれいな海と美味しいフランス料理の両方を楽しみたい。",
    },
    createdAt: "2025-04-15",
    tags: [
      "カップル",
      "4泊6日",
      "ニューカレドニア",
      "オセアニア",
      "海外",
      "ビーチ",
      "グルメ",
    ],
  },
  {
    id: "palau-jellyfish",
    title: "パラオ 神秘の湖とミルキーウェイ3泊5日",
    description:
      "無数のクラゲと一緒に泳ぐジェリーフィッシュレイクや、美肌効果のある泥パックができるミルキーウェイ。世界遺産の海でダイビングやシュノーケル。",
    input: {
      destinations: ["コロール"],
      isDestinationDecided: true,
      region: "overseas",
      dates: "3泊5日",
      companions: "友人",
      theme: ["ダイビング", "ビーチ・海", "自然・絶景", "アクティビティ"],
      budget: "中程度",
      pace: "アクティブ",
      freeText: "クラゲの湖に行ってみたい。泥パックをして写真を撮りたい。",
    },
    createdAt: "2025-08-25",
    tags: [
      "友人旅行",
      "3泊5日",
      "パラオ",
      "オセアニア",
      "海外",
      "ビーチ",
      "ダイビング",
    ],
  },
  {
    id: "petra-adventure",
    title: "ペトラ遺跡 インディ・ジョーンズの世界3泊5日",
    description:
      "バラ色の岩肌を削って造られた巨大な遺跡都市。シークと呼ばれる峡谷を抜け、エル・ハズネ（宝物殿）が現れた瞬間の感動は一生もの。",
    input: {
      destinations: ["ペトラ"],
      isDestinationDecided: true,
      region: "overseas",
      dates: "3泊5日",
      companions: "友人",
      theme: ["世界遺産", "冒険", "絶景", "文化・歴史"],
      budget: "中程度",
      pace: "アクティブ",
      freeText: "インディ・ジョーンズのロケ地に行きたい。砂漠の遺跡を冒険したい。",
    },
    createdAt: "2025-04-10",
    tags: [
      "友人旅行",
      "3泊5日",
      "ヨルダン",
      "中東",
      "海外",
      "世界遺産",
      "冒険",
    ],
  },
  {
    id: "capetown-nature",
    title: "ケープタウン 喜望峰とペンギン5泊8日",
    description:
      "テーブルマウンテンからの絶景、喜望峰へのドライブ、そしてボルダーズビーチで野生のペンギンと触れ合う。アフリカの大自然と洗練された街を楽しむ。",
    input: {
      destinations: ["ケープタウン"],
      isDestinationDecided: true,
      region: "overseas",
      dates: "5泊8日",
      companions: "カップル・夫婦",
      theme: ["自然・絶景", "動物", "ドライブ", "グルメ"],
      budget: "高め",
      pace: "普通",
      freeText: "野生のペンギンに会いたい。喜望峰に行ってみたい。",
    },
    createdAt: "2025-11-01",
    tags: [
      "カップル",
      "5泊8日",
      "南アフリカ",
      "アフリカ",
      "海外",
      "自然",
      "動物",
    ],
  },
  {
    id: "kenya-safari",
    title: "ケニア マサイマラで野生動物サファリ5泊8日",
    description:
      "地平線まで続くサバンナで、ライオン、ゾウ、キリンなどの野生動物を探すゲームドライブ。豪華なロッジに泊まり、大自然の音を聞きながら眠る。",
    input: {
      destinations: ["マサイマラ国立保護区"],
      isDestinationDecided: true,
      region: "overseas",
      dates: "5泊8日",
      companions: "家族（子供あり）",
      theme: ["動物", "冒険", "自然・絶景", "家族旅行"],
      budget: "高め",
      pace: "ゆっくり",
      freeText: "子供に本物のライオンを見せたい。サファリカーに乗りたい。",
    },
    createdAt: "2025-08-15",
    tags: ["家族旅行", "5泊8日", "ケニア", "アフリカ", "海外", "動物", "冒険"],
  },
  {
    id: "madagascar-baobab",
    title: "マダガスカル バオバブ街道とキツネザル5泊8日",
    description:
      "「星の王子さま」にも登場するバオバブの巨木が並ぶ街道の夕日は圧巻。固有種のキツネザルに会い、独自の進化を遂げた不思議な島を探検。",
    input: {
      destinations: ["ムロンダバ"],
      isDestinationDecided: true,
      region: "overseas",
      dates: "5泊8日",
      companions: "友人",
      theme: ["自然・絶景", "動物", "フォトジェニック", "冒険"],
      budget: "高め",
      pace: "アクティブ",
      freeText: "バオバブの木がたくさんある道を見たい。横っ飛びするサルが見たい。",
    },
    createdAt: "2025-09-05",
    tags: [
      "友人旅行",
      "5泊8日",
      "マダガスカル",
      "アフリカ",
      "海外",
      "絶景",
      "動物",
    ],
  },
  {
    id: "uyuni-mirror",
    title: "ウユニ塩湖 天空の鏡と星空6泊9日",
    description:
      "雨季には湖面が鏡のようになり、空を映し出す奇跡の絶景。昼間のトリックアート写真撮影や、満天の星空が湖面に映る宇宙のような光景を楽しむ。",
    input: {
      destinations: ["ウユニ"],
      isDestinationDecided: true,
      region: "overseas",
      dates: "6泊9日",
      companions: "友人",
      theme: ["絶景", "フォトジェニック", "冒険", "自然・絶景"],
      budget: "高め",
      pace: "ハード",
      freeText: "ウユニ塩湖で鏡張りの写真を撮りたい。夜は星空を見たい。",
    },
    createdAt: "2025-02-10",
    tags: [
      "友人旅行",
      "5泊8日",
      "ボリビア",
      "中南米",
      "海外",
      "絶景",
      "フォトジェニック",
    ],
  },
  {
    id: "iguazu-falls",
    title: "イグアスの滝 世界最大の滝の咆哮5泊8日",
    description:
      "ブラジルとアルゼンチンに跨る巨大な滝。「悪魔の喉笛」を間近で見下ろし、ボートで滝壺に突っ込むずぶ濡れツアーで迫力を体感。",
    input: {
      destinations: ["イグアス"],
      isDestinationDecided: true,
      region: "overseas",
      dates: "5泊8日",
      companions: "友人",
      theme: ["世界遺産", "自然・絶景", "冒険", "アクティビティ"],
      budget: "高め",
      pace: "アクティブ",
      freeText: "世界一大きな滝を見に行きたい。ボートツアーで濡れたい。",
    },
    createdAt: "2025-05-20",
    tags: [
      "友人旅行",
      "5泊8日",
      "ブラジル",
      "アルゼンチン",
      "中南米",
      "海外",
      "自然",
      "世界遺産",
    ],
  },
  {
    id: "rio-carnival-view",
    title: "リオデジャネイロ コルコバードの丘とビーチ5泊8日",
    description:
      "コルコバードの丘に立つ巨大なキリスト像と、コパカバーナビーチの賑わい。情熱的なサンバのリズムを感じながら、絶景と都市を楽しむ。",
    input: {
      destinations: ["リオデジャネイロ"],
      isDestinationDecided: true,
      region: "overseas",
      dates: "5泊8日",
      companions: "友人",
      theme: ["都市観光", "ビーチ・海", "絶景", "世界遺産"],
      budget: "高め",
      pace: "普通",
      freeText: "有名なキリスト像を見たい。コパカバーナビーチで遊びたい。",
    },
    createdAt: "2025-02-25",
    tags: ["友人旅行", "5泊8日", "ブラジル", "中南米", "海外", "絶景", "都市観光"],
  },
  {
    id: "patagonia-glacier",
    title: "パタゴニア 氷河崩落とフィッツロイ6泊9日",
    description:
      "ペリト・モレノ氷河の轟音を伴う崩落を目撃し、フィッツロイ峰の朝焼け「燃える山」を拝む。地球の息吹を感じるトレッキング旅。",
    input: {
      destinations: ["エル・カラファテ"],
      isDestinationDecided: true,
      region: "overseas",
      dates: "6泊9日",
      companions: "一人旅",
      theme: ["自然・絶景", "ハイキング", "冒険", "山"],
      budget: "高め",
      pace: "ハード",
      freeText: "氷河が崩れるところを見たい。パタゴニアの大自然を歩きたい。",
    },
    createdAt: "2025-12-05",
    tags: [
      "一人旅",
      "5泊8日",
      "アルゼンチン",
      "チリ",
      "中南米",
      "海外",
      "自然",
      "冒険",
    ],
  },
  {
    id: "easter-island-moai",
    title: "イースター島 モアイ像の謎を追う5泊8日",
    description:
      "太平洋の孤島に立ち並ぶ巨大なモアイ像。アフ・トンガリキの15体のモアイや、製造工場だったラノ・ララクを巡り、古代のミステリーに触れる。",
    input: {
      destinations: ["イースター島"],
      isDestinationDecided: true,
      region: "overseas",
      dates: "5泊8日",
      companions: "一人旅",
      theme: ["世界遺産", "冒険", "文化・歴史", "絶景"],
      budget: "高め",
      pace: "ゆっくり",
      freeText: "モアイ像を生で見たい。自転車やバイクで島を回りたい。",
    },
    createdAt: "2025-03-20",
    tags: ["一人旅", "5泊8日", "チリ", "中南米", "海外", "世界遺産", "冒険"],
  },
  {
    id: "havana-classic-car",
    title: "ハバナ クラシックカーとサルサの夜4泊7日",
    description:
      "カラフルなコロニアル建築が残る旧市街を、アメ車クラシックカーでドライブ。夜はモヒートを片手にサルサ音楽に酔いしれる、時が止まったような街。",
    input: {
      destinations: ["ハバナ"],
      isDestinationDecided: true,
      region: "overseas",
      dates: "4泊7日",
      companions: "カップル・夫婦",
      theme: ["街歩き", "フォトジェニック", "文化・歴史", "お酒"],
      budget: "中程度",
      pace: "普通",
      freeText:
        "クラシックカーに乗って写真を撮りたい。キューバの音楽を楽しみたい。",
    },
    createdAt: "2025-06-15",
    tags: [
      "カップル",
      "4泊7日",
      "キューバ",
      "中南米",
      "海外",
      "おしゃれ",
      "レトロ",
    ],
  },
  {
    id: "jamaica-reggae-beach",
    title: "モンテゴベイ レゲエとカリブ海リゾート4泊7日",
    description:
      "陽気なレゲエのリズムが流れるカリブ海の楽園。美しいビーチでのんびりし、ボブ・マーリーゆかりの地を訪れる。ジャークチキンも必食。",
    input: {
      destinations: ["モンテゴベイ"],
      isDestinationDecided: true,
      region: "overseas",
      dates: "4泊7日",
      companions: "友人",
      theme: ["ビーチ・海", "音楽", "リゾート", "グルメ"],
      budget: "高め",
      pace: "ゆっくり",
      freeText:
        "レゲエを聴きながらビーチでビールを飲みたい。ジャークチキンを食べたい。",
    },
    createdAt: "2025-07-10",
    tags: ["友人旅行", "4泊7日", "ジャマイカ", "中南米", "海外", "ビーチ", "音楽"],
  },
  {
    id: "cappadocia-balloon",
    title: "カッパドキア 奇岩と気球の絶景3泊6日",
    description:
      "キノコのような奇岩が連なる不思議な風景。早朝の熱気球ツアーで空から絶景を見下ろし、洞窟ホテルに宿泊する非日常体験。",
    input: {
      destinations: ["カッパドキア"],
      isDestinationDecided: true,
      region: "overseas",
      dates: "3泊6日",
      companions: "カップル・夫婦",
      theme: ["絶景", "世界遺産", "体験", "フォトジェニック"],
      budget: "中程度",
      pace: "普通",
      freeText: "気球に乗って絶景を見たい。洞窟ホテルに泊まってみたい。",
    },
    createdAt: "2025-09-15",
    tags: ["カップル", "4泊6日", "トルコ", "ヨーロッパ", "海外", "絶景", "体験"],
  },
  {
    id: "amalfi-coast-drive",
    title: "アマルフィ海岸 世界一美しい海岸線3泊6日",
    description:
      "断崖絶壁にカラフルな家々が張り付くポジターノやアマルフィを巡る。レモンの香りが漂う街で、シーフードパスタとリモンチェッロを楽しむ。",
    input: {
      destinations: ["アマルフィ・ポジターノ"],
      isDestinationDecided: true,
      region: "overseas",
      dates: "3泊6日",
      companions: "カップル・夫婦",
      theme: ["世界遺産", "絶景", "ドライブ", "ロマンチック"],
      budget: "高め",
      pace: "ゆっくり",
      freeText: "海沿いのきれいな街をドライブしたい。美味しいパスタを食べたい。",
    },
    createdAt: "2025-05-30",
    tags: ["カップル", "4泊6日", "イタリア", "ヨーロッパ", "海外", "絶景", "おしゃれ"],
  },
  {
    id: "san-sebastian-pintxos",
    title: "サン・セバスティアン 世界一の美食街バル巡り3泊6日",
    description:
      "ミシュランの星の数とバルのクオリティで世界中の美食家を魅了する街。カウンターに並ぶピンチョスを食べ歩き、チャコリ（微発泡ワイン）で乾杯。",
    input: {
      destinations: ["サン・セバスティアン"],
      isDestinationDecided: true,
      region: "overseas",
      dates: "3泊6日",
      companions: "友人",
      theme: ["グルメ", "お酒", "街歩き", "ビーチ・海"],
      budget: "中程度",
      pace: "普通",
      freeText:
        "美味しいピンチョスを心ゆくまで食べたい。バルを何軒もハシゴしたい。",
    },
    createdAt: "2025-10-05",
    tags: [
      "友人旅行",
      "4泊6日",
      "スペイン",
      "ヨーロッパ",
      "海外",
      "グルメ",
      "お酒",
    ],
  },
  {
    id: "chiang-mai-lantern",
    title: "チェンマイ コムローイ祭りと古都の寺院3泊5日",
    description:
      "「北方のバラ」と呼ばれる古都。ランタンが一斉に空へ放たれる幻想的なコムローイ祭りの時期は特におすすめ。おしゃれなカフェや雑貨巡りも。",
    input: {
      destinations: ["チェンマイ"],
      isDestinationDecided: true,
      region: "overseas",
      dates: "3泊5日",
      companions: "友人",
      theme: ["文化・歴史", "絶景", "雑貨", "カフェ巡り"],
      budget: "安め",
      pace: "ゆっくり",
      freeText: "ランタン祭りの景色が見たい。かわいい雑貨屋さん巡りをしたい。",
    },
    createdAt: "2025-11-10",
    tags: ["友人旅行", "3泊5日", "タイ", "アジア", "海外", "絶景", "おしゃれ"],
  },
  {
    id: "yakushima-jomon-sugi",
    title: "屋久島 縄文杉トレッキングと苔むす森2泊3日",
    description:
      "樹齢数千年の縄文杉を目指す往復10時間のトレッキング。もののけ姫の舞台のような「白谷雲水峡」の苔むす森で、太古の自然に包まれる。",
    input: {
      destinations: ["屋久島"],
      isDestinationDecided: true,
      region: "domestic",
      dates: "2泊3日",
      companions: "友人",
      theme: ["世界遺産", "自然・絶景", "ハイキング", "冒険"],
      budget: "中程度",
      pace: "ハード",
      freeText: "縄文杉を見に行きたい。苔の森も歩いて写真を撮りたい。",
    },
    createdAt: "2025-05-01",
    tags: ["友人旅行", "2泊3日", "鹿児島", "九州", "国内", "世界遺産", "自然"],
  },
  {
    id: "naoshima-art-island",
    title: "直島・豊島 瀬戸内アートの島巡り2泊3日",
    description:
      "草間彌生の「南瓜」や地中美術館など、島全体がアート。フェリーで島々を渡り、現代アートと瀬戸内の穏やかな風景の融合を楽しむ。",
    input: {
      destinations: ["直島・豊島"],
      isDestinationDecided: true,
      region: "domestic",
      dates: "2泊3日",
      companions: "一人旅",
      theme: ["アート・美術館", "島旅", "フォトジェニック", "船旅"],
      budget: "中程度",
      pace: "ゆっくり",
      freeText: "現代アートを巡る島旅がしたい。おしゃれな写真を撮りたい。",
    },
    createdAt: "2025-10-15",
    tags: ["一人旅", "2泊3日", "香川", "四国", "国内", "アート", "おしゃれ"],
  },
  {
    id: "shirakawago-tradition",
    title: "白川郷・高山 日本の原風景と古い町並み1泊2日",
    description:
      "世界遺産・白川郷の合掌造り集落を散策。飛騨高山では古い町並みで食べ歩きや朝市を楽しみ、日本の伝統と美しさを再発見する旅。",
    input: {
      destinations: ["白川郷・高山"],
      isDestinationDecided: true,
      region: "domestic",
      dates: "1泊2日",
      companions: "家族（大人のみ）",
      theme: ["世界遺産", "文化・歴史", "街歩き", "グルメ"],
      budget: "中程度",
      pace: "ゆっくり",
      freeText: "合掌造りの家を見てみたい。飛騨牛の握り寿司を食べたい。",
    },
    createdAt: "2025-01-20",
    tags: ["家族旅行", "1泊2日", "岐阜", "東海", "国内", "世界遺産", "歴史"],
  },
  {
    id: "goto-islands-church",
    title: "五島列島 祈りの教会群と美しい海2泊3日",
    description:
      "世界遺産「長崎と天草地方の潜伏キリシタン関連遺産」の構成資産である教会を巡る。日本一とも言われる美しいビーチ「高浜海水浴場」にも感動。",
    input: {
      destinations: ["五島列島"],
      isDestinationDecided: true,
      region: "domestic",
      dates: "2泊3日",
      companions: "一人旅",
      theme: ["世界遺産", "文化・歴史", "ビーチ・海", "島旅"],
      budget: "中程度",
      pace: "ゆっくり",
      freeText: "静かな島で教会を巡りたい。きれいな海を見て癒やされたい。",
    },
    createdAt: "2025-06-10",
    tags: ["一人旅", "2泊3日", "長崎", "九州", "国内", "世界遺産", "癒し"],
  },
  {
    id: "ogasawara-nature",
    title: "小笠原諸島 東洋のガラパゴスとボニンブルー5泊6日",
    description:
      "定期船で24時間かけて行く絶海の孤島。固有の動植物を観察するネイチャーツアーや、イルカ・クジラと出会うドルフィンスイムはここだけの体験。",
    input: {
      destinations: ["父島"],
      isDestinationDecided: true,
      region: "domestic",
      dates: "5泊6日",
      companions: "一人旅",
      theme: ["世界遺産", "自然・絶景", "動物", "冒険"],
      budget: "高め",
      pace: "アクティブ",
      freeText:
        "船旅を楽しんで、手付かずの自然がある島に行きたい。イルカと泳ぎたい。",
    },
    createdAt: "2025-07-01",
    tags: ["一人旅", "5泊6日", "東京", "関東", "国内", "世界遺産", "秘境", "自然"],
  },
];

export const samplePlans: SamplePlan[] = [...baseSamplePlans, ...additionalSamplePlans as SamplePlan[]];

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
  "栃木",
  "山梨",
  "石川",
  "京都",
  "奈良",
  "広島",
  "沖縄",
  "ハワイ",
  "アメリカ",
  "カナダ",
  "メキシコ",
  "フランス",
  "イギリス",
  "ドイツ",
  "イタリア",
  "スペイン",
  "オーストリア",
  "オランダ",
  "スイス",
  "ポルトガル",
  "クロアチア",
  "フィンランド",
  "ギリシャ",
  "トルコ",
  "台湾",
  "韓国",
  "香港",
  "中国",
  "タイ",
  "ベトナム",
  "フィリピン",
  "マレーシア",
  "シンガポール",
  "インドネシア",
  "モルディブ",
  "カンボジア",
  "インド",
  "ネパール",
  "ラオス",
  "ミャンマー",
  "スリランカ",
  "オーストラリア",
  "ニュージーランド",
  "フィジー",
  "タヒチ",
  "ニューカレドニア",
  "パラオ",
  "UAE",
  "ヨルダン",
  "エジプト",
  "モロッコ",
  "南アフリカ",
  "ケニア",
  "マダガスカル",
  "ペルー",
  "ボリビア",
  "ブラジル",
  "アルゼンチン",
  "チリ",
  "キューバ",
  "ジャマイカ",
  "チェコ",
  "ハンガリー",
  "ベルギー",
  "マルタ",
  "アイスランド",
  "ノルウェー",
  "スウェーデン",
  "デンマーク",
  "アイルランド",
  "ポーランド",
  "岐阜",
  "香川",
  "長崎",
  "鹿児島",
  "島根",
  // English region tags
  "Madrid",
  "Barcelona",
  "Paris",
  "London",
  "Rome",
  "Milan",
  "Venice",
  "Florence",
  "Berlin",
  "Munich",
  "Vienna",
  "Salzburg",
  "Prague",
  "Budapest",
  "Amsterdam",
  "Brussels",
  "Zurich",
  "Geneva",
  "Lisbon",
  "Porto",
  "Dubrovnik",
  "Athens",
  "Santorini",
  "Istanbul",
  "Cappadocia",
  "Dubai",
  "Abu Dhabi",
  "Cairo",
  "Cape Town",
  "Marrakech",
  "New York",
  "Los Angeles",
  "San Francisco",
  "Las Vegas",
  "Orlando",
  "Chicago",
  "Boston",
  "Miami",
  "Vancouver",
  "Toronto",
  "Banff",
  "Cancun",
  "Mexico City",
  "Lima",
  "Cusco",
  "Rio de Janeiro",
  "Buenos Aires",
  "Santiago",
  "Sydney",
  "Melbourne",
  "Gold Coast",
  "Cairns",
  "Auckland",
  "Queenstown",
  "Seoul",
  "Busan",
  "Taipei",
  "Hanoi",
  "Ho Chi Minh",
  "Da Nang",
  "Bangkok",
  "Phuket",
  "Chiang Mai",
  "Singapore",
  "Kuala Lumpur",
  "Bali",
  "Cebu",
  "Siem Reap",
  "Reykjavik",
  "Helsinki",
  "Stockholm",
  "Oslo",
  "Copenhagen",
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
    // 国内
    北海道: "北海道",
    東京: "関東",
    神奈川: "関東",
    栃木: "関東",
    山梨: "甲信越",
    石川: "北陸",
    岐阜: "東海",
    京都: "関西",
    大阪: "関西",
    奈良: "関西",
    広島: "中国",
    香川: "四国",
    島根: "中国",
    長崎: "九州",
    鹿児島: "九州",
    沖縄: "沖縄",
    // アジア
    台湾: "アジア",
    韓国: "アジア",
    香港: "アジア",
    中国: "アジア",
    タイ: "アジア",
    ベトナム: "アジア",
    フィリピン: "アジア",
    マレーシア: "アジア",
    シンガポール: "アジア",
    インドネシア: "アジア",
    モルディブ: "アジア",
    カンボジア: "アジア",
    インド: "アジア",
    ネパール: "アジア",
    ラオス: "アジア",
    ミャンマー: "アジア",
    スリランカ: "アジア",
    // 北米・中南米
    ハワイ: "北米",
    アメリカ: "北米",
    カナダ: "北米",
    メキシコ: "中南米",
    ペルー: "中南米",
    ボリビア: "中南米",
    ブラジル: "中南米",
    アルゼンチン: "中南米",
    チリ: "中南米",
    キューバ: "中南米",
    ジャマイカ: "中南米",
    // ヨーロッパ
    フランス: "ヨーロッパ",
    イギリス: "ヨーロッパ",
    ドイツ: "ヨーロッパ",
    イタリア: "ヨーロッパ",
    スペイン: "ヨーロッパ",
    オーストリア: "ヨーロッパ",
    オランダ: "ヨーロッパ",
    スイス: "ヨーロッパ",
    ポルトガル: "ヨーロッパ",
    クロアチア: "ヨーロッパ",
    フィンランド: "ヨーロッパ",
    ギリシャ: "ヨーロッパ",
    トルコ: "ヨーロッパ",
    チェコ: "ヨーロッパ",
    ハンガリー: "ヨーロッパ",
    ベルギー: "ヨーロッパ",
    マルタ: "ヨーロッパ",
    アイスランド: "ヨーロッパ",
    ノルウェー: "ヨーロッパ",
    スウェーデン: "ヨーロッパ",
    デンマーク: "ヨーロッパ",
    アイルランド: "ヨーロッパ",
    ポーランド: "ヨーロッパ",
    // オセアニア・太平洋
    オーストラリア: "オセアニア",
    ニュージーランド: "オセアニア",
    フィジー: "オセアニア",
    タヒチ: "オセアニア",
    ニューカレドニア: "オセアニア",
    パラオ: "オセアニア",
    // 中東・アフリカ
    UAE: "中東",
    ヨルダン: "中東",
    エジプト: "アフリカ",
    モロッコ: "アフリカ",
    南アフリカ: "アフリカ",
    ケニア: "アフリカ",
    マダガスカル: "アフリカ",

    // English mappings
    // Europe
    "Madrid": "ヨーロッパ",
    "Barcelona": "ヨーロッパ",
    "Paris": "ヨーロッパ",
    "London": "ヨーロッパ",
    "Rome": "ヨーロッパ",
    "Milan": "ヨーロッパ",
    "Venice": "ヨーロッパ",
    "Florence": "ヨーロッパ",
    "Berlin": "ヨーロッパ",
    "Munich": "ヨーロッパ",
    "Vienna": "ヨーロッパ",
    "Salzburg": "ヨーロッパ",
    "Prague": "ヨーロッパ",
    "Budapest": "ヨーロッパ",
    "Amsterdam": "ヨーロッパ",
    "Brussels": "ヨーロッパ",
    "Zurich": "ヨーロッパ",
    "Geneva": "ヨーロッパ",
    "Lisbon": "ヨーロッパ",
    "Porto": "ヨーロッパ",
    "Dubrovnik": "ヨーロッパ",
    "Athens": "ヨーロッパ",
    "Santorini": "ヨーロッパ",
    "Istanbul": "ヨーロッパ",
    "Cappadocia": "ヨーロッパ",
    "Reykjavik": "ヨーロッパ",
    "Helsinki": "ヨーロッパ",
    "Stockholm": "ヨーロッパ",
    "Oslo": "ヨーロッパ",
    "Copenhagen": "ヨーロッパ",
    // Middle East / Africa
    "Dubai": "中東",
    "Abu Dhabi": "中東",
    "Cairo": "アフリカ",
    "Cape Town": "アフリカ",
    "Marrakech": "アフリカ",
    // North America
    "New York": "北米",
    "Los Angeles": "北米",
    "San Francisco": "北米",
    "Las Vegas": "北米",
    "Orlando": "北米",
    "Chicago": "北米",
    "Boston": "北米",
    "Miami": "北米",
    "Honolulu": "北米",
    "Vancouver": "北米",
    "Toronto": "北米",
    "Banff": "北米",
    "Cancun": "中南米",
    "Mexico City": "中南米",
    // South America
    "Lima": "中南米",
    "Cusco": "中南米",
    "Rio de Janeiro": "中南米",
    "Buenos Aires": "中南米",
    "Santiago": "中南米",
    // Oceania
    "Sydney": "オセアニア",
    "Melbourne": "オセアニア",
    "Gold Coast": "オセアニア",
    "Cairns": "オセアニア",
    "Auckland": "オセアニア",
    "Queenstown": "オセアニア",
    // Asia
    "Seoul": "アジア",
    "Busan": "アジア",
    "Taipei": "アジア",
    "Hanoi": "アジア",
    "Ho Chi Minh": "アジア",
    "Da Nang": "アジア",
    "Bangkok": "アジア",
    "Phuket": "アジア",
    "Chiang Mai": "アジア",
    "Singapore": "アジア",
    "Kuala Lumpur": "アジア",
    "Bali": "アジア",
    "Cebu": "アジア",
    "Siem Reap": "アジア",
  };
  return areaMap[region] || region;
}

/**
 * 任意のプランリストから全てのユニークなタグを取得（地域タグを除く）
 */
export function getTagsFromPlans(plans: SamplePlan[]): string[] {
  const tagSet = new Set<string>();
  plans.forEach((plan) => {
    plan.tags.forEach((tag) => {
      if (!regionTags.includes(tag)) {
        tagSet.add(tag);
      }
    });
  });
  return Array.from(tagSet).sort();
}

/**
 * 任意のプランリストから地域タグを取得
 */
export function getRegionsFromPlans(plans: SamplePlan[]): string[] {
  const regionSet = new Set<string>();
  plans.forEach((plan) => {
    plan.tags.forEach((tag) => {
      if (regionTags.includes(tag)) {
        regionSet.add(tag);
      }
    });
  });
  return Array.from(regionSet);
}
