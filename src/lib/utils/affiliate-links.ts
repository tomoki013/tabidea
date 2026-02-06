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
  | 'skyscanner';

/**
 * 宿泊検索パラメータ
 */
export interface HotelSearchParams {
  /** 目的地 */
  destination: string;
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
};

/**
 * サービスアイコン
 */
const SERVICE_ICONS: Record<AffiliateService, string> = {
  rakuten_travel: '🏨',
  booking_com: '🌍',
  jalan: '♨️',
  skyscanner: '✈️',
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

  const queryParams = new URLSearchParams({
    ss: params.destination,
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

  // 検索ページURLを使用（場所名をそのままパスに入れるとリンクが壊れるため）
  const baseUrl = 'https://www.skyscanner.jp/transport/flights';

  // 場所名からIATAコード的な短縮名を使えない場合は、
  // 汎用的な検索URLを使用する
  const origin = encode(params.origin);
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
    params.origin + params.destination
  );

  if (hasJapanese) {
    const searchUrl = 'https://www.skyscanner.jp/transport/flights/';
    const searchParams = new URLSearchParams({
      market: 'JP',
      locale: 'ja-JP',
      currency: 'JPY',
      adults: (params.adults || 1).toString(),
      oym: params.departureDate ? params.departureDate.slice(0, 7).replace('-', '') : '',
      originname: params.origin,
      destinationname: params.destination,
    });
    if (affiliateId) {
      searchParams.set('associateid', affiliateId);
    }
    return { url: `${searchUrl}?${searchParams.toString()}`, isAffiliate: !!affiliateId };
  }

  return { url: `${path}?${queryParams.toString()}`, isAffiliate: !!affiliateId };
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
    // 海外旅行: Booking.com を優先
    const booking = generateBookingComLink(params);
    links.push({
      service: 'booking_com',
      displayName: SERVICE_DISPLAY_NAMES.booking_com,
      url: booking.url,
      icon: SERVICE_ICONS.booking_com,
      priority: 1,
      isAffiliate: booking.isAffiliate,
    });
    const rakuten = generateRakutenTravelLink(params);
    links.push({
      service: 'rakuten_travel',
      displayName: SERVICE_DISPLAY_NAMES.rakuten_travel,
      url: rakuten.url,
      icon: SERVICE_ICONS.rakuten_travel,
      priority: 2,
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
  cardType: 'hotel' | 'flight'
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
  cardType: 'hotel' | 'flight'
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
