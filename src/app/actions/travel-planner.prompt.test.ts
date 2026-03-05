import { describe, it, expect, vi } from 'vitest';
import { getUserConstraintPrompt } from './travel-planner';
import * as userSettingsActions from './user-settings';

// Mock getUserSettings
vi.mock('./user-settings', () => ({
  getUserSettings: vi.fn(),
}));

describe('getUserConstraintPrompt', () => {
  it('returns empty string when no settings exist', async () => {
    vi.spyOn(userSettingsActions, 'getUserSettings').mockResolvedValue({
      success: true,
      settings: {}
    });

    const prompt = await getUserConstraintPrompt();
    expect(prompt).toContain('=== OUTPUT LANGUAGE (MUST FOLLOW) ===');
    expect(prompt).toContain('Japanese');
    expect(prompt).toContain('=== HOME BASE ROUND-TRIP REQUIREMENT (MUST FOLLOW) ===');
    expect(prompt).toContain('Home City:');
  });

  it('includes travel style when provided', async () => {
    vi.spyOn(userSettingsActions, 'getUserSettings').mockResolvedValue({
      success: true,
      settings: {
        travelStyle: 'I like slow travel and food.'
      }
    });

    const prompt = await getUserConstraintPrompt();
    expect(prompt).toContain('=== USER TRAVEL STYLE / PREFERENCES ===');
    expect(prompt).toContain('I like slow travel and food.');
    expect(prompt).not.toContain('=== CRITICAL USER INSTRUCTIONS (MUST FOLLOW) ===');
  });

  it('includes custom instructions when provided', async () => {
    vi.spyOn(userSettingsActions, 'getUserSettings').mockResolvedValue({
      success: true,
      settings: {
        customInstructions: 'No museums.'
      }
    });

    const prompt = await getUserConstraintPrompt();
    expect(prompt).toContain('=== CRITICAL USER INSTRUCTIONS (MUST FOLLOW) ===');
    expect(prompt).toContain('No museums.');
    expect(prompt).not.toContain('=== USER TRAVEL STYLE / PREFERENCES ===');
  });

  it('includes both when both are provided', async () => {
    vi.spyOn(userSettingsActions, 'getUserSettings').mockResolvedValue({
      success: true,
      settings: {
        travelStyle: 'Relaxed.',
        customInstructions: 'No hiking.'
      }
    });

    const prompt = await getUserConstraintPrompt();
    expect(prompt).toContain('=== USER TRAVEL STYLE / PREFERENCES ===');
    expect(prompt).toContain('Relaxed.');
    expect(prompt).toContain('=== CRITICAL USER INSTRUCTIONS (MUST FOLLOW) ===');
    expect(prompt).toContain('No hiking.');
  });

  it('uses preferred language and home base city constraints when provided', async () => {
    vi.spyOn(userSettingsActions, 'getUserSettings').mockResolvedValue({
      success: true,
      settings: {
        preferredLanguage: 'en',
        preferredRegion: 'US',
        homeBaseCity: 'Seattle',
      }
    });

    const prompt = await getUserConstraintPrompt();
    expect(prompt).toContain('=== OUTPUT LANGUAGE (MUST FOLLOW) ===');
    expect(prompt).toContain('English');
    expect(prompt).toContain('Home Region: US');
    expect(prompt).toContain('Home City: Seattle');
    expect(prompt).toContain('MUST start from Seattle');
    expect(prompt).toContain('MUST return to Seattle');
  });
});
