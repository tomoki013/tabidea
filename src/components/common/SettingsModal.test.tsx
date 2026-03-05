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
  useTranslations: () => (key: string) => {
    const dictionary: Record<string, string> = {
      languageAndRegion: '言語と地域',
      languageDescription: '言語を切り替えると、その言語の推奨地域が初期値として設定されます。',
      displayLanguage: '表示言語',
      region: '地域',
      homeBaseCity: '出発・帰着都市',
      homeBaseCityPlaceholder: '例: 東京 / New York',
      languageAndRouteUsage: 'AIは指定言語で出力し、指定した地域・都市を出発地と帰着地に利用します。',
      aiOutputAndRoutePolicy: 'AIプラン生成は表示言語で出力され、ホーム都市を起点に往復する旅程を優先します。',
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
});
