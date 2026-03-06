/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import SettingsModal from './SettingsModal';
import * as AuthContext from '@/context/AuthContext';
import * as userSettingsActions from '@/app/actions/user-settings';

const mockSetTheme = vi.fn();

// Mock server actions
vi.mock('@/app/actions/user-settings', () => ({
  getUserSettings: vi.fn(),
  updateUserSettings: vi.fn(),
}));

vi.mock('next-themes', () => ({
  useTheme: vi.fn(() => ({
    theme: 'system',
    setTheme: mockSetTheme,
  })),
}));

vi.mock('next-intl', () => ({
  createTranslator: () => (key: string) => key,
  useTranslations: () => (key: string) => {
    const dictionary: Record<string, string> = {
      'tabs.account': 'アカウント',
      'tabs.plan': 'プラン管理',
      'tabs.ai': 'AI設定',
      'account.title': 'アカウント設定',
      'account.logout': 'ログアウト',
      'themeLight': 'ライト',
      'themeDark': 'ダーク',
      'themeSystem': 'システム',
      languageAndRegion: '言語と地域',
      languageDescription: '言語を切り替えると、その言語の推奨地域が初期値として設定されます。',
      displayLanguage: '表示言語',
      region: '地域',
      homeBaseCity: '出発・帰着都市',
      homeBaseCityPlaceholder: '例: 東京 / New York',
      homeBaseCitySearchPlaceholder: 'Search city',
      homeBaseCitySearchNoResults: 'No cities found',
      homeBaseCitySearchResultsCount: '{count} results',
      homeBaseCityRequestPrefix: 'If your city is not listed,',
      homeBaseCityRequestLink: 'Contact form',
      homeBaseCityRequestSuffix: 'request an addition.',
      languageAndRouteUsage: 'AIは指定言語で出力し、指定した地域・都市を出発地と帰着地に利用します。',
      aiOutputAndRoutePolicy: 'AIプラン生成は表示言語で出力され、ホーム都市を起点に往復する旅程を優先します。',
      'ai.travelStyleLabel': '旅のスタイル',
      'ai.travelStylePlaceholder': '歴史的な場所が好き、朝はゆっくり...',
      save: '設定を保存',
      regionSearchPlaceholder: 'Search region by name or code',
      regionSearchNoResults: 'No regions found',
      regionSearchResultsCount: '{count} results',
    };
    return dictionary[key] ?? key;
  },
}));

vi.mock('@/app/actions/travel-planner', () => ({
  deleteAccount: vi.fn(),
}));

vi.mock('@/app/actions/billing', () => ({
  getBillingAccessInfo: vi.fn().mockResolvedValue({
    isSubscribed: true,
    planType: 'pro_monthly',
    userType: 'premium',
    ticketCount: 0,
    subscriptionEndsAt: '2026-12-31',
  }),
  getUserUsageStats: vi.fn().mockResolvedValue({
    planGeneration: { current: 1, limit: -1, remaining: -1, resetAt: null },
    travelInfo: { current: 0, limit: -1, remaining: -1, resetAt: null },
    planStorage: { current: 1, limit: -1 },
  }),
}));

vi.mock('@/app/actions/stripe/portal', () => ({
  createPortalSession: vi.fn(),
}));

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => '/current-path',
}));

// Mock AuthContext hook
vi.mock('@/context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

const mockUser = {
  uid: 'test-uid',
  email: 'test@example.com',
  displayName: 'Test User',
  photoURL: 'https://example.com/photo.jpg',
  avatarUrl: 'https://example.com/photo.jpg',
};

const mockSignOut = vi.fn();

describe('SettingsModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSetTheme.mockClear();

    // Mock useAuth return value
    (AuthContext.useAuth as any).mockReturnValue({
      user: mockUser,
      signOut: mockSignOut,
      loading: false,
    });

    (userSettingsActions.getUserSettings as any).mockResolvedValue({
      success: true,
      settings: {
        customInstructions: 'Original instructions',
        travelStyle: 'Original style',
        preferredLanguage: 'en',
        preferredRegion: 'US',
        homeBaseCity: 'New York',
      },
    });
    (userSettingsActions.updateUserSettings as any).mockResolvedValue({ success: true });
  });

  it('renders correctly when open', async () => {
    render(<SettingsModal isOpen={true} onClose={vi.fn()} />);

    // Should show Account settings by default
    expect(screen.getByRole('heading', { name: /アカウント設定/ })).toBeDefined();
  });

  it('switches to AI settings and shows Travel Style input', async () => {
    render(<SettingsModal isOpen={true} onClose={vi.fn()} />);

    // Switch to AI tab
    const aiTab = screen.getByText('AI設定');
    fireEvent.click(aiTab);

    // AI settings is default tab
    await waitFor(() => {
      expect(screen.getByText('旅のスタイル')).toBeDefined();
    });

    // Since we mocked isSubscribed=true via getBillingAccessInfo, it should be enabled
    const travelStyleInput = screen.getByPlaceholderText(/歴史的な場所が好き、朝はゆっくり/);
    expect(travelStyleInput).toBeDefined();
    expect(travelStyleInput.hasAttribute('disabled')).toBe(false);
  });

  it('switches display theme from account settings', async () => {
    render(<SettingsModal isOpen={true} onClose={vi.fn()} />);

    const darkButton = await screen.findByRole('button', { name: 'ダーク' });
    fireEvent.click(darkButton);

    expect(mockSetTheme).toHaveBeenCalledWith('dark');
  });

  it('loads existing travel style', async () => {
    render(<SettingsModal isOpen={true} onClose={vi.fn()} />);

    // Switch to AI tab
    const aiTab = screen.getByText('AI設定');
    fireEvent.click(aiTab);

    await waitFor(() => {
      expect(screen.getByDisplayValue('Original style')).toBeDefined();
    });
  });

  it('saves travel style', async () => {
    render(<SettingsModal isOpen={true} onClose={vi.fn()} />);

    // Switch to AI tab
    const aiTab = screen.getByText('AI設定');
    fireEvent.click(aiTab);

    // Wait for load
    await waitFor(() => {
      expect(screen.getByDisplayValue('Original style')).toBeDefined();
    });

    // Change value
    const input = screen.getByDisplayValue('Original style');
    fireEvent.change(input, { target: { value: 'New style' } });

    // Save
    const saveButton = screen.getByText('設定を保存');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(userSettingsActions.updateUserSettings).toHaveBeenCalledWith({
        customInstructions: 'Original instructions',
        travelStyle: 'New style',
        preferredLanguage: 'en',
        preferredRegion: 'US',
        homeBaseCity: 'New York',
      });
    });
  });

  it('updates region by search selection and saves matching home base city', async () => {
    render(<SettingsModal isOpen={true} onClose={vi.fn()} />);

    const regionTrigger = await screen.findByRole('button', { name: /United States \(US\)/ });
    fireEvent.click(regionTrigger);

    const searchInput = await screen.findByPlaceholderText('Search region by name or code');
    fireEvent.change(searchInput, { target: { value: 'France' } });

    const franceOption = await screen.findByRole('option', { name: 'France (0033)' });
    fireEvent.click(franceOption);

    fireEvent.click(screen.getByText('AI設定'));

    const saveButton = screen.getByText('設定を保存');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(userSettingsActions.updateUserSettings).toHaveBeenCalledWith({
        customInstructions: 'Original instructions',
        travelStyle: 'Original style',
        preferredLanguage: 'en',
        preferredRegion: '0033',
        homeBaseCity: 'Paris',
      });
    });
  });

  it('keeps explicitly saved home base city on reload and save', async () => {
    (userSettingsActions.getUserSettings as any).mockResolvedValueOnce({
      success: true,
      settings: {
        customInstructions: 'Original instructions',
        travelStyle: 'Original style',
        preferredLanguage: 'en',
        preferredRegion: 'US',
        homeBaseCity: 'Seattle',
      },
    });

    render(<SettingsModal isOpen={true} onClose={vi.fn()} />);

    fireEvent.click(screen.getByText('AI設定'));
    const saveButton = await screen.findByText('設定を保存');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(userSettingsActions.updateUserSettings).toHaveBeenCalledWith({
        customInstructions: 'Original instructions',
        travelStyle: 'Original style',
        preferredLanguage: 'en',
        preferredRegion: 'US',
        homeBaseCity: 'Seattle',
      });
    });
  });

  it('does not overwrite home base city when selecting the same region', async () => {
    render(<SettingsModal isOpen={true} onClose={vi.fn()} />);

    const regionTrigger = await screen.findByRole('button', { name: /United States \(US\)/ });
    fireEvent.click(regionTrigger);

    const searchInput = await screen.findByPlaceholderText('Search region by name or code');
    fireEvent.change(searchInput, { target: { value: 'United States' } });

    const usOption = await screen.findByRole('option', { name: 'United States (US)' });
    fireEvent.click(usOption);

    fireEvent.click(screen.getByText('AI設定'));
    fireEvent.click(screen.getByText('設定を保存'));

    await waitFor(() => {
      expect(userSettingsActions.updateUserSettings).toHaveBeenCalledWith({
        customInstructions: 'Original instructions',
        travelStyle: 'Original style',
        preferredLanguage: 'en',
        preferredRegion: 'US',
        homeBaseCity: 'New York',
      });
    });
  });

  it('shows no-result message when region search has no match', async () => {
    render(<SettingsModal isOpen={true} onClose={vi.fn()} />);

    const regionTrigger = await screen.findByRole('button', { name: /United States \(US\)/ });
    fireEvent.click(regionTrigger);

    const searchInput = await screen.findByPlaceholderText('Search region by name or code');
    fireEvent.change(searchInput, { target: { value: 'zzzzzzzz' } });

    await waitFor(() => {
      expect(screen.getByText('No regions found')).toBeDefined();
    });
  });

  it('shows no-result message and contact link when city search has no match', async () => {
    render(<SettingsModal isOpen={true} onClose={vi.fn()} />);

    const homeBaseLabel = await screen.findByText('出発・帰着都市');
    const homeBaseField = homeBaseLabel.closest('label');
    expect(homeBaseField).toBeTruthy();
    const cityTrigger = homeBaseField?.querySelector('button');
    expect(cityTrigger).toBeTruthy();
    if (!cityTrigger) {
      throw new Error('city trigger not found');
    }
    fireEvent.click(cityTrigger);

    const searchInput = await screen.findByPlaceholderText('Search city');
    fireEvent.change(searchInput, { target: { value: 'zzzzzzzz' } });

    await waitFor(() => {
      expect(screen.getByText('No cities found')).toBeDefined();
    });

    const contactLink = screen.getByRole('link', { name: 'Contact form' });
    expect(contactLink.getAttribute('href')).toBe('/ja/contact');
  });
});
