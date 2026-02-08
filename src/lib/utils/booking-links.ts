/**
 * 予約リンク生成ユーティリティ
 * アクティビティ種別に応じた予約サービスへのリンクを生成
 */

import {
  generateHotelLinks,
  generateFlightLinks,
  generateActivityLinks,
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
