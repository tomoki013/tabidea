import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import SettingsModal from './SettingsModal';
import * as AuthContext from '@/context/AuthContext';
import * as userSettingsActions from '@/app/actions/user-settings';

// Mock server actions
vi.mock('@/app/actions/user-settings', () => ({
  getUserSettings: vi.fn(),
  updateUserSettings: vi.fn(),
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
      });
    });
  });
});
