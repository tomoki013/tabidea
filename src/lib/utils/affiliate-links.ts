/**
 * アフィリエイトリンク生成ユーティリティ
 * Phase 3: 収益化機能
 *
 * 対応サービス:
 * - 楽天トラベル（国内向け）
 * - Booking.com（海外向け）
 * - じゃらん（国内向け）
 * - スカイスキャナー（航空券）
 */

// ============================================
// Types
// ============================================

/**
 * 旅行リージョン
 */
export type TravelRegion = 'domestic' | 'overseas';

/**
 * アフィリエイトサービス
 */
export type AffiliateService =
  | 'rakuten_travel'
  | 'booking_com'
  | 'jalan'
  | 'skyscanner'
  | 'trip_com'
  | 'klook'
  | 'getyourguide';

/**
 * 宿泊検索パラメータ
 */
export interface HotelSearchParams {
  /** 目的地 */
  destination: string;
  /** 目的地（英語、Booking.com等の検索用） */
  destinationEn?: string;
  /** チェックイン日（YYYY-MM-DD） */
  checkIn?: string;
  /** チェックアウト日（YYYY-MM-DD） */
  checkOut?: string;
  /** 大人の人数 */
  adults?: number;
  /** 子供の人数 */
  children?: number;
  /** 部屋数 */
  rooms?: number;
}

/**
 * 航空券検索パラメータ
 */
export interface FlightSearchParams {
  /** 出発地 */
  origin: string;
  /** 目的地 */
  destination: string;
  /** 出発日（YYYY-MM-DD） */
  departureDate?: string;
  /** 復路日（YYYY-MM-DD） */
  returnDate?: string;
  /** 大人の人数 */
  adults?: number;
  /** 座席クラス */
  cabinClass?: 'economy' | 'premium_economy' | 'business' | 'first';
}

export interface FlightSearchInfo {
  /** 元の出発地 */
  originalOrigin: string;
  /** 検索に使う出発地 */
  resolvedOrigin: string;
  /** 表示用の空港ラベル */
  resolvedOriginLabel?: string;
  /** 都市名から空港へ補正したか */
  originAdjusted: boolean;
}

/**
 * アフィリエイトリンク結果
 */
export interface AffiliateLink {
  /** サービス名 */
  service: AffiliateService;
  /** サービス表示名 */
  displayName: string;
  /** リンクURL */
  url: string;
  /** アイコン絵文字 */
  icon: string;
  /** 優先度（低いほど上に表示） */
  priority: number;
  /** アフィリエイトIDが設定済みかどうか */
  isAffiliate: boolean;
}

// ============================================
// Constants
// ============================================

/**
 * サービス表示名
 */
const SERVICE_DISPLAY_NAMES: Record<AffiliateService, string> = {
  rakuten_travel: '楽天トラベル',
  booking_com: 'Booking.com',
  jalan: 'じゃらん',
  skyscanner: 'スカイスキャナー',
  trip_com: 'Trip.com',
  klook: 'Klook',
  getyourguide: 'GetYourGuide',
};

/**
 * サービスアイコン
 */
const SERVICE_ICONS: Record<AffiliateService, string> = {
  rakuten_travel: '🏨',
  booking_com: '🌍',
  jalan: '♨️',
  skyscanner: '✈️',
  trip_com: '🏨',
  klook: '🎫',
  getyourguide: '🎯',
};

/**
 * 国内判定キーワード
 */
const DOMESTIC_KEYWORDS = [
  '日本',
  'japan',
  '東京',
  'tokyo',
  '大阪',
  'osaka',
  '京都',
  'kyoto',
  '北海道',
  'hokkaido',
  '沖縄',
  'okinawa',
  '福岡',
  'fukuoka',
  '名古屋',
  'nagoya',
  '神戸',
  'kobe',
  '横浜',
  'yokohama',
  '札幌',
  'sapporo',
  '仙台',
  'sendai',
  '広島',
  'hiroshima',
  '金沢',
  'kanazawa',
  '奈良',
  'nara',
  '鎌倉',
  'kamakura',
  '箱根',
  'hakone',
  '富士',
  'fuji',
  '熱海',
  'atami',
  '軽井沢',
  'karuizawa',
  '伊豆',
  'izu',
  '九州',
  'kyushu',
  '四国',
  'shikoku',
  '本州',
  'honshu',
  '関西',
  'kansai',
  '関東',
  'kanto',
  '東北',
  'tohoku',
  '中部',
  'chubu',
  '中国地方',
  '近畿',
  'kinki',
];

export interface FlightOriginAirportRule {
  code: string;
  label: string;
  cityAliases: string[];
  airportAliases: string[];
}

export const FLIGHT_ORIGIN_AIRPORT_RULES: FlightOriginAirportRule[] = [
  {
    code: 'KIX',
    label: '関西国際空港 (KIX)',
    cityAliases: ['京都', '京都市', 'kyoto', '大阪', '大阪市', 'osaka', '神戸', '神戸市', 'kobe', '奈良', '奈良市', 'nara', '関西', 'kansai'],
    airportAliases: ['関西国際空港', '関空', 'kix', 'kansaiinternationalairport', 'kansaiairport'],
  },
  {
    code: 'HND',
    label: '羽田空港 (HND)',
    cityAliases: ['東京', '東京都', 'tokyo'],
    airportAliases: ['羽田', '羽田空港', 'hnd', 'haneda', 'hanedaairport'],
  },
  {
    code: 'NRT',
    label: '成田国際空港 (NRT)',
    cityAliases: [],
    airportAliases: ['成田', '成田空港', '成田国際空港', 'nrt', 'narita', 'naritainternationalairport', 'naritaairport'],
  },
  {
    code: 'NGO',
    label: '中部国際空港 (NGO)',
    cityAliases: ['名古屋', '名古屋市', 'nagoya'],
    airportAliases: ['中部国際空港', 'セントレア', 'ngo', 'chubucentrair', 'centrair'],
  },
  {
    code: 'FUK',
    label: '福岡空港 (FUK)',
    cityAliases: ['福岡', '福岡市', 'fukuoka'],
    airportAliases: ['福岡空港', 'fuk', 'fukuokaairport'],
  },
  {
    code: 'CTS',
    label: '新千歳空港 (CTS)',
    cityAliases: ['札幌', '札幌市', 'sapporo', '北海道', 'hokkaido'],
    airportAliases: ['新千歳', '新千歳空港', 'cts', 'newchitose', 'newchitoseairport', 'chitoseairport'],
  },
  {
    code: 'OKA',
    label: '那覇空港 (OKA)',
    cityAliases: ['沖縄', '那覇', '沖縄県', 'okinawa', 'naha'],
    airportAliases: ['那覇空港', 'oka', 'nahaairport'],
  },
];

// ============================================
// Helper Functions
// ============================================

/**
 * 目的地が国内かどうかを判定
 */
export function isDomesticDestination(destination: string): boolean {
  const normalized = destination.toLowerCase();
  return DOMESTIC_KEYWORDS.some((keyword) =>
    normalized.includes(keyword.toLowerCase())
  );
}

/**
 * 日本語の都市名・地域名を英語に変換するマッピング
 */
const CITY_NAME_MAP: Record<string, string> = {
  // エジプト
  'カイロ': 'Cairo, Egypt',
  'アスワン': 'Aswan, Egypt',
  'アブシンベル': 'Abu Simbel, Egypt',
  'ルクソール': 'Luxor, Egypt',
  'アレキサンドリア': 'Alexandria, Egypt',
  'ギザ': 'Giza, Egypt',
  'エジプト': 'Egypt',
  // 東南アジア
  'バリ': 'Bali, Indonesia',
  'ウブド': 'Ubud, Bali',
  'クタ': 'Kuta, Bali',
  'バンコク': 'Bangkok, Thailand',
  'プーケット': 'Phuket, Thailand',
  'チェンマイ': 'Chiang Mai, Thailand',
  'ハノイ': 'Hanoi, Vietnam',
  'ホーチミン': 'Ho Chi Minh City, Vietnam',
  'シンガポール': 'Singapore',
  'クアラルンプール': 'Kuala Lumpur, Malaysia',
  'セブ': 'Cebu, Philippines',
  'マニラ': 'Manila, Philippines',
  // ヨーロッパ
  'パリ': 'Paris, France',
  'ロンドン': 'London, UK',
  'ローマ': 'Rome, Italy',
  'バルセロナ': 'Barcelona, Spain',
  'マドリード': 'Madrid, Spain',
  'ベルリン': 'Berlin, Germany',
  'ミュンヘン': 'Munich, Germany',
  'ウィーン': 'Vienna, Austria',
  'プラハ': 'Prague, Czech Republic',
  'ブダペスト': 'Budapest, Hungary',
  'アムステルダム': 'Amsterdam, Netherlands',
  'イスタンブール': 'Istanbul, Turkey',
  'アテネ': 'Athens, Greece',
  'サントリーニ': 'Santorini, Greece',
  'フィレンツェ': 'Florence, Italy',
  'ヴェネツィア': 'Venice, Italy',
  'ミラノ': 'Milan, Italy',
  // 北米
  'ニューヨーク': 'New York, USA',
  'ロサンゼルス': 'Los Angeles, USA',
  'サンフランシスコ': 'San Francisco, USA',
  'ハワイ': 'Hawaii, USA',
  'ホノルル': 'Honolulu, Hawaii',
  'ラスベガス': 'Las Vegas, USA',
  'バンクーバー': 'Vancouver, Canada',
  'トロント': 'Toronto, Canada',
  // オセアニア
  'シドニー': 'Sydney, Australia',
  'メルボルン': 'Melbourne, Australia',
  'オークランド': 'Auckland, New Zealand',
  // 韓国
  'ソウル': 'Seoul, South Korea',
  '釜山': 'Busan, South Korea',
  'プサン': 'Busan, South Korea',
  '済州': 'Jeju, South Korea',
  'チェジュ': 'Jeju, South Korea',
  // 台湾
  '台北': 'Taipei, Taiwan',
  '高雄': 'Kaohsiung, Taiwan',
  '台中': 'Taichung, Taiwan',
  // 中国
  '上海': 'Shanghai, China',
  '北京': 'Beijing, China',
  '香港': 'Hong Kong',
  // その他
  'ドバイ': 'Dubai, UAE',
  'モルディブ': 'Maldives',
  'カンクン': 'Cancun, Mexico',
};

/**
 * 日本語の目的地名を英語のBooking.com検索用文字列に変換
 * 括弧や中黒で区切られた複数都市名から最初の具体的な都市名を抽出
 */
export function toEnglishDestination(destination: string): string {
  // 括弧内の都市名を抽出: "エジプト（カイロ・アスワン・アブシンベル）" → ["カイロ", "アスワン", "アブシンベル"]
  const bracketMatch = destination.match(/[（(]([^）)]+)[）)]/);
  if (bracketMatch) {
    const cities = bracketMatch[1].split(/[・、,]/);
    // 最初の都市名で変換を試みる
    for (const city of cities) {
      const trimmed = city.trim();
      if (CITY_NAME_MAP[trimmed]) {
        return CITY_NAME_MAP[trimmed];
      }
    }
  }

  // 中黒で区切られた場合: "カイロ・ルクソール・アスワン" → 最初の都市名
  const parts = destination.split(/[・、,/]/);
  for (const part of parts) {
    const trimmed = part.trim();
    if (CITY_NAME_MAP[trimmed]) {
      return CITY_NAME_MAP[trimmed];
    }
  }

  // 全体で一致を試みる
  if (CITY_NAME_MAP[destination.trim()]) {
    return CITY_NAME_MAP[destination.trim()];
  }

  // 部分一致を試みる
  for (const [jaName, enName] of Object.entries(CITY_NAME_MAP)) {
    if (destination.includes(jaName)) {
      return enName;
    }
  }

  // フォールバック: そのまま返す（英語が混在していればそれが使われる）
  return destination;
}

/**
 * 日付を YYYYMMDD 形式に変換
 */
function formatDateCompact(date: string): string {
  return date.replace(/-/g, '');
}

/**
 * URLエンコード
 */
function encode(str: string): string {
  return encodeURIComponent(str);
}

function normalizeFlightOrigin(value: string): string {
  return value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\s\-・,()/（）]/g, '');
}

function isIataCode(value: string): boolean {
  return /^[A-Z]{3}$/.test(value.trim().toUpperCase());
}

export function resolveFlightOriginAirport(origin: string): {
  rule?: FlightOriginAirportRule;
  matchedAsAirport: boolean;
} {
  const normalizedOrigin = normalizeFlightOrigin(origin);

  for (const rule of FLIGHT_ORIGIN_AIRPORT_RULES) {
    if (normalizedOrigin === normalizeFlightOrigin(rule.code)) {
      return { rule, matchedAsAirport: true };
    }

    if (rule.airportAliases.some((alias) => normalizeFlightOrigin(alias) === normalizedOrigin)) {
      return { rule, matchedAsAirport: true };
    }

    if (rule.cityAliases.some((alias) => normalizeFlightOrigin(alias) === normalizedOrigin)) {
      return { rule, matchedAsAirport: false };
    }
  }

  return { matchedAsAirport: false };
}

export function getFlightSearchInfo(params: FlightSearchParams): FlightSearchInfo {
  const originalOrigin = params.origin.trim();

  if (!originalOrigin) {
    return {
      originalOrigin: '',
      resolvedOrigin: '',
      originAdjusted: false,
    };
  }

  if (isDomesticDestination(params.destination)) {
    return {
      originalOrigin,
      resolvedOrigin: originalOrigin,
      originAdjusted: false,
    };
  }

  if (isIataCode(originalOrigin)) {
    return {
      originalOrigin,
      resolvedOrigin: originalOrigin.toUpperCase(),
      originAdjusted: false,
    };
  }

  const { rule, matchedAsAirport } = resolveFlightOriginAirport(originalOrigin);

  if (!rule) {
    return {
      originalOrigin,
      resolvedOrigin: originalOrigin,
      originAdjusted: false,
    };
  }

  return {
    originalOrigin,
    resolvedOrigin: rule.code,
    resolvedOriginLabel: rule.label,
    originAdjusted: !matchedAsAirport,
  };
}

// ============================================
// Link Generators
// ============================================

/**
 * 楽天トラベルのリンクを生成
 */
function generateRakutenTravelLink(params: HotelSearchParams): { url: string; isAffiliate: boolean } {
  const affiliateId = process.env.NEXT_PUBLIC_RAKUTEN_AFFILIATE_ID || '';

  const baseUrl = 'https://travel.rakuten.co.jp/hotel/search/';

  const queryParams = new URLSearchParams({
    f_keyword: params.destination,
  });

  if (params.checkIn) {
    queryParams.set('f_cd1', formatDateCompact(params.checkIn));
  }
  if (params.checkOut) {
    queryParams.set('f_cd2', formatDateCompact(params.checkOut));
  }
  if (params.adults) {
    queryParams.set('f_adult_num', params.adults.toString());
  }
  if (params.rooms) {
    queryParams.set('f_room_num', params.rooms.toString());
  }

  const searchUrl = `${baseUrl}?${queryParams.toString()}`;

  // アフィリエイトIDが設定されている場合のみラッパーURLを使用
  if (affiliateId) {
    return {
      url: `https://hb.afl.rakuten.co.jp/hgc/${affiliateId}/?pc=${encode(searchUrl)}`,
      isAffiliate: true,
    };
  }

  return { url: searchUrl, isAffiliate: false };
}

/**
 * Booking.comのリンクを生成
 */
function generateBookingComLink(params: HotelSearchParams): { url: string; isAffiliate: boolean } {
  const affiliateId = process.env.NEXT_PUBLIC_BOOKING_AFFILIATE_ID || '';

  const baseUrl = 'https://www.booking.com/searchresults.ja.html';

  // Use English destination name for reliable Booking.com search
  const searchDestination = params.destinationEn || toEnglishDestination(params.destination);

  const queryParams = new URLSearchParams({
    ss: searchDestination,
    lang: 'ja',
    dest_type: 'city',
  });

  if (params.checkIn) {
    queryParams.set('checkin', params.checkIn);
  }
  if (params.checkOut) {
    queryParams.set('checkout', params.checkOut);
  }
  if (params.adults) {
    queryParams.set('group_adults', params.adults.toString());
  }
  if (params.children) {
    queryParams.set('group_children', params.children.toString());
  }
  if (params.rooms) {
    queryParams.set('no_rooms', params.rooms.toString());
  }

  if (affiliateId) {
    queryParams.set('aid', affiliateId);
  }

  return { url: `${baseUrl}?${queryParams.toString()}`, isAffiliate: !!affiliateId };
}

/**
 * じゃらんのリンクを生成
 */
function generateJalanLink(params: HotelSearchParams): { url: string; isAffiliate: boolean } {
  const affiliateId = process.env.NEXT_PUBLIC_JALAN_AFFILIATE_ID || '';

  const baseUrl = 'https://www.jalan.net/yad/search_yad.html';

  const queryParams = new URLSearchParams({
    keyword: params.destination,
  });

  if (params.checkIn) {
    const [year, month, day] = params.checkIn.split('-');
    queryParams.set('year', year);
    queryParams.set('month', month);
    queryParams.set('day', day);
  }
  if (params.adults) {
    queryParams.set('adultNum', params.adults.toString());
  }
  if (params.rooms) {
    queryParams.set('roomCount', params.rooms.toString());
  }

  const searchUrl = `${baseUrl}?${queryParams.toString()}`;

  // アフィリエイトIDが設定されている場合のみラッパーURLを使用
  if (affiliateId) {
    return {
      url: `https://ck.jp.ap.valuecommerce.com/servlet/referral?sid=${affiliateId}&pid=&vc_url=${encode(searchUrl)}`,
      isAffiliate: true,
    };
  }

  return { url: searchUrl, isAffiliate: false };
}

/**
 * スカイスキャナーのリンクを生成
 * 場所名をそのまま使うとURLが壊れるため、検索ページへリダイレクト
 */
function generateSkyscannerLink(params: FlightSearchParams): { url: string; isAffiliate: boolean } {
  const affiliateId = process.env.NEXT_PUBLIC_SKYSCANNER_AFFILIATE_ID || '';
  const searchInfo = getFlightSearchInfo(params);

  // 検索ページURLを使用（場所名をそのままパスに入れるとリンクが壊れるため）
  const baseUrl = 'https://www.skyscanner.jp/transport/flights';

  // 場所名からIATAコード的な短縮名を使えない場合は、
  // 汎用的な検索URLを使用する
  const origin = encode(searchInfo.resolvedOrigin || params.origin);
  const destination = encode(params.destination);

  let path = `${baseUrl}/${origin}/${destination}/`;

  if (params.departureDate) {
    path += formatDateCompact(params.departureDate).slice(2) + '/'; // YYMMDD
    if (params.returnDate) {
      path += formatDateCompact(params.returnDate).slice(2) + '/';
    }
  }

  const queryParams = new URLSearchParams({
    adults: (params.adults || 1).toString(),
    cabinclass: params.cabinClass || 'economy',
    preferdirects: 'false',
    market: 'JP',
    locale: 'ja-JP',
    currency: 'JPY',
  });

  if (affiliateId) {
    queryParams.set('associateid', affiliateId);
  }

  // 場所名に日本語が含まれる場合は検索ページにフォールバック
  const hasJapanese = /[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/.test(
    (searchInfo.resolvedOrigin || params.origin) + params.destination
  );

  if (hasJapanese) {
    const searchUrl = 'https://www.skyscanner.jp/transport/flights/';
    const searchParams = new URLSearchParams({
      market: 'JP',
      locale: 'ja-JP',
      currency: 'JPY',
      adults: (params.adults || 1).toString(),
      oym: params.departureDate ? params.departureDate.slice(0, 7).replace('-', '') : '',
      originname: searchInfo.resolvedOrigin || params.origin,
      destinationname: params.destination,
    });
    if (affiliateId) {
      searchParams.set('associateid', affiliateId);
    }
    return { url: `${searchUrl}?${searchParams.toString()}`, isAffiliate: !!affiliateId };
  }

  return { url: `${path}?${queryParams.toString()}`, isAffiliate: !!affiliateId };
}

/**
 * Trip.comのホテルリンクを生成
 */
function generateTripComLink(params: HotelSearchParams): { url: string; isAffiliate: boolean } {
  const affiliateId = process.env.NEXT_PUBLIC_TRIP_COM_AFFILIATE_ID || '';
  const searchDestination = params.destinationEn || toEnglishDestination(params.destination);

  const baseUrl = 'https://jp.trip.com/hotels/list';
  const queryParams = new URLSearchParams({
    city: searchDestination,
    locale: 'ja-JP',
    curr: 'JPY',
  });

  if (params.checkIn) {
    queryParams.set('checkin', params.checkIn);
  }
  if (params.checkOut) {
    queryParams.set('checkout', params.checkOut);
  }

  if (affiliateId) {
    queryParams.set('AllianceID', affiliateId);
  }

  return { url: `${baseUrl}?${queryParams.toString()}`, isAffiliate: !!affiliateId };
}

/**
 * Klookのアクティビティリンクを生成
 */
function generateKlookLink(destination: string): { url: string; isAffiliate: boolean } {
  const affiliateId = process.env.NEXT_PUBLIC_KLOOK_AFFILIATE_ID || '';
  const baseUrl = 'https://www.klook.com/ja/search/';
  const queryParams = new URLSearchParams({ query: destination });

  if (affiliateId) {
    queryParams.set('aid', affiliateId);
  }

  return { url: `${baseUrl}?${queryParams.toString()}`, isAffiliate: !!affiliateId };
}

/**
 * GetYourGuideのアクティビティリンクを生成
 */
function generateGetYourGuideLink(destination: string): { url: string; isAffiliate: boolean } {
  const baseUrl = 'https://www.getyourguide.com/s/';
  const queryParams = new URLSearchParams({ q: destination, lc: 'ja' });

  return { url: `${baseUrl}?${queryParams.toString()}`, isAffiliate: false };
}

/**
 * アクティビティ予約リンクを生成
 */
export function generateActivityLinks(destination: string): AffiliateLink[] {
  const links: AffiliateLink[] = [];

  const klook = generateKlookLink(destination);
  links.push({
    service: 'klook',
    displayName: SERVICE_DISPLAY_NAMES.klook,
    url: klook.url,
    icon: SERVICE_ICONS.klook,
    priority: 1,
    isAffiliate: klook.isAffiliate,
  });

  if (!isDomesticDestination(destination)) {
    const gyg = generateGetYourGuideLink(destination);
    links.push({
      service: 'getyourguide',
      displayName: SERVICE_DISPLAY_NAMES.getyourguide,
      url: gyg.url,
      icon: SERVICE_ICONS.getyourguide,
      priority: 2,
      isAffiliate: gyg.isAffiliate,
    });
  }

  return links;
}

// ============================================
// Main Functions
// ============================================

/**
 * 宿泊検索用のアフィリエイトリンクを生成
 */
export function generateHotelLinks(
  params: HotelSearchParams,
  region?: TravelRegion
): AffiliateLink[] {
  const isDomestic =
    region === 'domestic' ||
    (region !== 'overseas' && isDomesticDestination(params.destination));

  const links: AffiliateLink[] = [];

  if (isDomestic) {
    // 国内旅行: 楽天、じゃらんを優先
    const rakuten = generateRakutenTravelLink(params);
    links.push({
      service: 'rakuten_travel',
      displayName: SERVICE_DISPLAY_NAMES.rakuten_travel,
      url: rakuten.url,
      icon: SERVICE_ICONS.rakuten_travel,
      priority: 1,
      isAffiliate: rakuten.isAffiliate,
    });
    const jalan = generateJalanLink(params);
    links.push({
      service: 'jalan',
      displayName: SERVICE_DISPLAY_NAMES.jalan,
      url: jalan.url,
      icon: SERVICE_ICONS.jalan,
      priority: 2,
      isAffiliate: jalan.isAffiliate,
    });
    const booking = generateBookingComLink(params);
    links.push({
      service: 'booking_com',
      displayName: SERVICE_DISPLAY_NAMES.booking_com,
      url: booking.url,
      icon: SERVICE_ICONS.booking_com,
      priority: 3,
      isAffiliate: booking.isAffiliate,
    });
  } else {
    // 海外旅行: Booking.com > Trip.com > 楽天
    const booking = generateBookingComLink(params);
    links.push({
      service: 'booking_com',
      displayName: SERVICE_DISPLAY_NAMES.booking_com,
      url: booking.url,
      icon: SERVICE_ICONS.booking_com,
      priority: 1,
      isAffiliate: booking.isAffiliate,
    });
    const tripCom = generateTripComLink(params);
    links.push({
      service: 'trip_com',
      displayName: SERVICE_DISPLAY_NAMES.trip_com,
      url: tripCom.url,
      icon: SERVICE_ICONS.trip_com,
      priority: 2,
      isAffiliate: tripCom.isAffiliate,
    });
    const rakuten = generateRakutenTravelLink(params);
    links.push({
      service: 'rakuten_travel',
      displayName: SERVICE_DISPLAY_NAMES.rakuten_travel,
      url: rakuten.url,
      icon: SERVICE_ICONS.rakuten_travel,
      priority: 3,
      isAffiliate: rakuten.isAffiliate,
    });
  }

  return links.sort((a, b) => a.priority - b.priority);
}

/**
 * 航空券検索用のアフィリエイトリンクを生成
 */
export function generateFlightLinks(
  params: FlightSearchParams
): AffiliateLink[] {
  const skyscanner = generateSkyscannerLink(params);
  return [
    {
      service: 'skyscanner',
      displayName: SERVICE_DISPLAY_NAMES.skyscanner,
      url: skyscanner.url,
      icon: SERVICE_ICONS.skyscanner,
      priority: 1,
      isAffiliate: skyscanner.isAffiliate,
    },
  ];
}

/**
 * リンクリストにアフィリエイトリンクが含まれるかどうか
 */
export function hasAffiliateLinks(links: AffiliateLink[]): boolean {
  return links.some((link) => link.isAffiliate);
}

/**
 * クリック計測用のイベントデータを生成
 */
export function createAffiliateClickEvent(
  service: AffiliateService,
  destination: string,
  cardType: 'hotel' | 'flight' | 'activity'
): Record<string, string> {
  return {
    event_name: 'affiliate_click',
    service,
    destination,
    card_type: cardType,
  };
}

/**
 * GA4イベントを送信
 */
export function trackAffiliateClick(
  service: AffiliateService,
  destination: string,
  cardType: 'hotel' | 'flight' | 'activity'
): void {
  if (typeof window !== 'undefined' && 'gtag' in window) {
    const gtag = (window as unknown as { gtag: (...args: unknown[]) => void }).gtag;
    gtag('event', 'affiliate_click', {
      service,
      destination,
      card_type: cardType,
    });
  }
}
