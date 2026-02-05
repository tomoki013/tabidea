/**
 * Affiliate Links Utility Tests
 */

import { describe, it, expect } from 'vitest';
import {
  isDomesticDestination,
  generateHotelLinks,
  generateFlightLinks,
  createAffiliateClickEvent,
} from './affiliate-links';

describe('affiliate-links', () => {
  describe('isDomesticDestination', () => {
    it('should return true for Japanese destinations', () => {
      expect(isDomesticDestination('東京')).toBe(true);
      expect(isDomesticDestination('大阪')).toBe(true);
      expect(isDomesticDestination('京都')).toBe(true);
      expect(isDomesticDestination('北海道')).toBe(true);
      expect(isDomesticDestination('沖縄')).toBe(true);
      expect(isDomesticDestination('Japan')).toBe(true);
      expect(isDomesticDestination('日本')).toBe(true);
    });

    it('should return false for overseas destinations', () => {
      expect(isDomesticDestination('パリ')).toBe(false);
      expect(isDomesticDestination('ニューヨーク')).toBe(false);
      expect(isDomesticDestination('ソウル')).toBe(false);
      expect(isDomesticDestination('バンコク')).toBe(false);
      expect(isDomesticDestination('シンガポール')).toBe(false);
    });

    it('should handle mixed cases', () => {
      expect(isDomesticDestination('TOKYO')).toBe(true);
      expect(isDomesticDestination('Tokyo')).toBe(true);
    });
  });

  describe('generateHotelLinks', () => {
    it('should generate domestic hotel links for Japanese destinations', () => {
      const links = generateHotelLinks({ destination: '東京' });

      expect(links.length).toBe(3);
      expect(links[0].service).toBe('rakuten_travel');
      expect(links[1].service).toBe('jalan');
      expect(links[2].service).toBe('booking_com');
    });

    it('should generate international hotel links for overseas destinations', () => {
      const links = generateHotelLinks({ destination: 'Paris' });

      expect(links.length).toBe(2);
      expect(links[0].service).toBe('booking_com');
      expect(links[1].service).toBe('rakuten_travel');
    });

    it('should respect explicit region parameter', () => {
      // Force domestic even for overseas destination
      const domesticLinks = generateHotelLinks(
        { destination: 'Paris' },
        'domestic'
      );
      expect(domesticLinks[0].service).toBe('rakuten_travel');

      // Force overseas even for domestic destination
      const overseasLinks = generateHotelLinks(
        { destination: '東京' },
        'overseas'
      );
      expect(overseasLinks[0].service).toBe('booking_com');
    });

    it('should include check-in/check-out dates in URL', () => {
      const links = generateHotelLinks({
        destination: '京都',
        checkIn: '2024-06-15',
        checkOut: '2024-06-17',
      });

      // Rakuten link should contain date
      expect(links[0].url).toContain('20240615');
    });

    it('should include adult count in URL', () => {
      const links = generateHotelLinks({
        destination: '大阪',
        adults: 3,
      });

      // Should contain adult parameter
      expect(links[0].url).toContain('3');
    });

    it('should return links with correct structure', () => {
      const links = generateHotelLinks({ destination: '箱根' });

      links.forEach((link) => {
        expect(link).toHaveProperty('service');
        expect(link).toHaveProperty('displayName');
        expect(link).toHaveProperty('url');
        expect(link).toHaveProperty('icon');
        expect(link).toHaveProperty('priority');
        expect(typeof link.url).toBe('string');
        expect(link.url.startsWith('http')).toBe(true);
      });
    });
  });

  describe('generateFlightLinks', () => {
    it('should generate Skyscanner link', () => {
      const links = generateFlightLinks({
        origin: '東京',
        destination: 'パリ',
      });

      expect(links.length).toBe(1);
      expect(links[0].service).toBe('skyscanner');
      expect(links[0].displayName).toBe('スカイスキャナー');
      expect(links[0].icon).toBe('✈️');
    });

    it('should include departure and return dates', () => {
      const links = generateFlightLinks({
        origin: '成田',
        destination: 'ロンドン',
        departureDate: '2024-07-01',
        returnDate: '2024-07-15',
      });

      expect(links[0].url).toContain('240701');
      expect(links[0].url).toContain('240715');
    });

    it('should include passenger count', () => {
      const links = generateFlightLinks({
        origin: '羽田',
        destination: 'ソウル',
        adults: 2,
      });

      expect(links[0].url).toContain('adults=2');
    });

    it('should include cabin class', () => {
      const links = generateFlightLinks({
        origin: '関西',
        destination: 'シンガポール',
        cabinClass: 'business',
      });

      expect(links[0].url).toContain('business');
    });
  });

  describe('createAffiliateClickEvent', () => {
    it('should create event data for hotel clicks', () => {
      const event = createAffiliateClickEvent(
        'rakuten_travel',
        '東京',
        'hotel'
      );

      expect(event.event_name).toBe('affiliate_click');
      expect(event.service).toBe('rakuten_travel');
      expect(event.destination).toBe('東京');
      expect(event.card_type).toBe('hotel');
    });

    it('should create event data for flight clicks', () => {
      const event = createAffiliateClickEvent(
        'skyscanner',
        'パリ',
        'flight'
      );

      expect(event.event_name).toBe('affiliate_click');
      expect(event.service).toBe('skyscanner');
      expect(event.destination).toBe('パリ');
      expect(event.card_type).toBe('flight');
    });
  });
});
