import { describe, it, expect } from 'vitest';
import {
  getNights,
  getDays,
  getSamplePlanById,
  filterSamplePlansByTags,
  filterSamplePlansByDays,
  getAllTags,
  getAllRegions,
  getAreaFromRegion,
  samplePlans,
} from './sample-plans';

describe('sample-plans', () => {
  describe('getNights', () => {
    it('should return correct nights from date string', () => {
      expect(getNights('2泊3日')).toBe(2);
      expect(getNights('3泊4日')).toBe(3);
      expect(getNights('1泊2日')).toBe(1);
    });

    it('should return 0 for invalid format', () => {
      expect(getNights('3日間')).toBe(0);
      expect(getNights('invalid')).toBe(0);
      expect(getNights('')).toBe(0);
    });
  });

  describe('getDays', () => {
    it('should return correct days from date string', () => {
      expect(getDays('2泊3日')).toBe(3);
      expect(getDays('3泊4日')).toBe(4);
      expect(getDays('1泊2日')).toBe(2);
    });

    it('should return 1 for invalid format', () => {
      expect(getDays('3日間')).toBe(1);
      expect(getDays('invalid')).toBe(1);
      expect(getDays('')).toBe(1);
    });
  });

  describe('getSamplePlanById', () => {
    it('should return sample plan when id exists', () => {
      const plan = getSamplePlanById('sapporo-otaru-family');
      expect(plan).toBeDefined();
      expect(plan?.id).toBe('sapporo-otaru-family');
      expect(plan?.title).toContain('札幌');
    });

    it('should return undefined when id does not exist', () => {
      const plan = getSamplePlanById('non-existent-id');
      expect(plan).toBeUndefined();
    });
  });

  describe('filterSamplePlansByTags', () => {
    it('should return plans matching any of the tags', () => {
      const plans = filterSamplePlansByTags(['家族旅行']);
      expect(plans.length).toBeGreaterThan(0);
      expect(plans.every(p => p.tags.includes('家族旅行'))).toBe(true);
    });

    it('should return all plans when tags array is empty', () => {
      const plans = filterSamplePlansByTags([]);
      expect(plans.length).toBe(samplePlans.length);
    });

    it('should return plans matching multiple tags (OR logic)', () => {
      const plans = filterSamplePlansByTags(['家族旅行', 'カップル']);
      expect(plans.every(p =>
        p.tags.includes('家族旅行') || p.tags.includes('カップル')
      )).toBe(true);
    });
  });

  describe('filterSamplePlansByDays', () => {
    it('should return plans with matching days', () => {
      const plans = filterSamplePlansByDays(3);
      expect(plans.length).toBeGreaterThan(0);
      expect(plans.every(p => getDays(p.input.dates) === 3)).toBe(true);
    });

    it('should return all plans when days is null', () => {
      const plans = filterSamplePlansByDays(null);
      expect(plans.length).toBe(samplePlans.length);
    });

    it('should return plans with 5+ days when days is 5', () => {
      const plans = filterSamplePlansByDays(5);
      expect(plans.every(p => getDays(p.input.dates) >= 5)).toBe(true);
    });
  });

  describe('getAllTags', () => {
    it('should return array of unique tags', () => {
      const tags = getAllTags();
      expect(Array.isArray(tags)).toBe(true);
      expect(tags.length).toBeGreaterThan(0);

      // Check for uniqueness
      const uniqueTags = [...new Set(tags)];
      expect(uniqueTags.length).toBe(tags.length);
    });

    it('should include tags from sample plans', () => {
      const tags = getAllTags();
      // Should include common tags from sample plans
      expect(tags.some(t => ['家族旅行', 'カップル', 'グルメ', '文化体験'].includes(t))).toBe(true);
    });
  });

  describe('getAllRegions', () => {
    it('should return array of unique regions', () => {
      const regions = getAllRegions();
      expect(Array.isArray(regions)).toBe(true);
      expect(regions.length).toBeGreaterThan(0);

      // Check for uniqueness
      const uniqueRegions = [...new Set(regions)];
      expect(uniqueRegions.length).toBe(regions.length);
    });

    it('should include both domestic and overseas regions', () => {
      const regions = getAllRegions();
      // Should include some Japanese regions
      expect(regions.some(r => ['北海道', '東京', '京都', '沖縄'].includes(r))).toBe(true);
    });
  });

  describe('getAreaFromRegion', () => {
    it('should return correct area for Japanese regions', () => {
      expect(getAreaFromRegion('北海道')).toBe('北海道');
      expect(getAreaFromRegion('東京')).toBe('関東');
      expect(getAreaFromRegion('京都')).toBe('関西');
      expect(getAreaFromRegion('沖縄')).toBe('沖縄');
    });

    it('should return correct area for overseas regions', () => {
      expect(getAreaFromRegion('ハワイ')).toBe('北米');
      expect(getAreaFromRegion('フランス')).toBe('ヨーロッパ');
      expect(getAreaFromRegion('台湾')).toBe('アジア');
    });

    it('should return region itself for unknown regions', () => {
      // The function returns the region itself if not found in the map
      expect(getAreaFromRegion('unknown-region')).toBe('unknown-region');
    });
  });

  describe('samplePlans', () => {
    it('should have at least one sample plan', () => {
      expect(samplePlans.length).toBeGreaterThan(0);
    });

    it('should have valid structure for all plans', () => {
      samplePlans.forEach(plan => {
        expect(plan.id).toBeTruthy();
        expect(plan.title).toBeTruthy();
        expect(plan.description).toBeTruthy();
        expect(plan.input).toBeDefined();
        expect(plan.input.destinations.length).toBeGreaterThan(0);
        expect(plan.tags.length).toBeGreaterThan(0);
      });
    });

    it('should have unique ids', () => {
      const ids = samplePlans.map(p => p.id);
      const uniqueIds = [...new Set(ids)];
      expect(uniqueIds.length).toBe(ids.length);
    });
  });
});
