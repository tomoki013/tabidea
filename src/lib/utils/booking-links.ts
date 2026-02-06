/**
 * 予約リンク生成ユーティリティ
 * アクティビティ種別に応じた予約サービスへのリンクを生成
 */

import {
  generateHotelLinks,
  generateFlightLinks,
  isDomesticDestination,
  type AffiliateLink,
  type TravelRegion,
} from './affiliate-links';

// ============================================
// Types
// ============================================

export type BookingType = 'hotel' | 'flight' | 'activity';

export interface BookingLinkConfig {
  type: BookingType;
  destination: string;
  checkinDate?: string;
  checkoutDate?: string;
  origin?: string;
  region?: TravelRegion;
}

export interface BookingLinkResult {
  type: BookingType;
  label: string;
  icon: string;
  links: AffiliateLink[];
}

// ============================================
// Activity Link Generators
// ============================================

/**
 * Klookのアクティビティリンクを生成
 */
function generateKlookLink(destination: string): { url: string; isAffiliate: boolean } {
  const affiliateId = process.env.NEXT_PUBLIC_KLOOK_AFFILIATE_ID || '';
  const baseUrl = 'https://www.klook.com/ja/search/';
  const queryParams = new URLSearchParams({
    query: destination,
  });

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
  const queryParams = new URLSearchParams({
    q: destination,
    lc: 'ja',
  });

  return { url: `${baseUrl}?${queryParams.toString()}`, isAffiliate: false };
}

/**
 * アクティビティ予約リンクを生成
 */
function generateActivityLinks(destination: string): AffiliateLink[] {
  const links: AffiliateLink[] = [];

  const klook = generateKlookLink(destination);
  links.push({
    service: 'booking_com' as const,
    displayName: 'Klook',
    url: klook.url,
    icon: '🎫',
    priority: 1,
    isAffiliate: klook.isAffiliate,
  });

  if (!isDomesticDestination(destination)) {
    const gyg = generateGetYourGuideLink(destination);
    links.push({
      service: 'booking_com' as const,
      displayName: 'GetYourGuide',
      url: gyg.url,
      icon: '🎯',
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
 * 予約タイプに応じたリンクを生成
 */
export function generateBookingLinks(config: BookingLinkConfig): BookingLinkResult {
  switch (config.type) {
    case 'hotel':
      return {
        type: 'hotel',
        label: 'ホテルを予約',
        icon: '🏨',
        links: generateHotelLinks(
          {
            destination: config.destination,
            checkIn: config.checkinDate,
            checkOut: config.checkoutDate,
          },
          config.region
        ),
      };

    case 'flight':
      return {
        type: 'flight',
        label: '航空券を探す',
        icon: '✈️',
        links: generateFlightLinks({
          origin: config.origin || '',
          destination: config.destination,
          departureDate: config.checkinDate,
          returnDate: config.checkoutDate,
        }),
      };

    case 'activity':
      return {
        type: 'activity',
        label: '体験を予約',
        icon: '🎫',
        links: generateActivityLinks(config.destination),
      };
  }
}

/**
 * 旅程全体の予約リンクまとめを生成
 */
export function generateTripBookingSummary(
  destination: string,
  region?: TravelRegion,
  checkinDate?: string,
  checkoutDate?: string,
): BookingLinkResult[] {
  const results: BookingLinkResult[] = [];

  // ホテル
  results.push(
    generateBookingLinks({
      type: 'hotel',
      destination,
      checkinDate,
      checkoutDate,
      region,
    })
  );

  // 航空券
  results.push(
    generateBookingLinks({
      type: 'flight',
      destination,
      region,
    })
  );

  // アクティビティ
  results.push(
    generateBookingLinks({
      type: 'activity',
      destination,
      region,
    })
  );

  return results;
}
