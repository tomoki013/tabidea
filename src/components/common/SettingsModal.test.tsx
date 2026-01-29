import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SettingsModal from './SettingsModal';
import * as userSettingsActions from '@/app/actions/user-settings';
import * as AuthContext from '@/context/AuthContext';

// Mock actions
vi.mock('@/app/actions/user-settings', () => ({
  getUserSettings: vi.fn(),
  updateUserSettings: vi.fn(),
}));

// Mock AuthContext
vi.mock('@/context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

// Mock useRouter
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

describe('SettingsModal', () => {
  const mockClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (AuthContext.useAuth as any).mockReturnValue({
      user: { id: 'test-user', email: 'test@example.com' },
      signOut: vi.fn(),
    });
    // Default mock for getUserSettings
    (userSettingsActions.getUserSettings as any).mockResolvedValue({
      success: true,
      settings: {
        customInstructions: '',
        travelStyle: '',
      },
    });
  });

  it('renders correctly when open', async () => {
    render(<SettingsModal isOpen={true} onClose={mockClose} />);

    // Check if modal content is present (might need to await for portal or animation)
    // The component uses `createPortal` to `document.body`.
    // We expect "設定" (Settings) to be visible.
    expect(await screen.findByText('設定')).toBeDefined();
  });

  it('switches to AI settings and shows Travel Style input', async () => {
    render(<SettingsModal isOpen={true} onClose={mockClose} />);

    // Click on AI Settings tab
    const aiTab = screen.getByText('AI設定');
    fireEvent.click(aiTab);

    // Wait for the AI settings content
    expect(await screen.findByText('旅のスタイル')).toBeDefined();

    // Check for hint text
    expect(screen.getByText('AIがあなたの好みを理解するための参考情報です。')).toBeDefined();

    // Check for textarea
    const textarea = screen.getByPlaceholderText('例：歴史的な場所が好きです。朝はゆっくりスタートしたいです...');
    expect(textarea).toBeDefined();
  });

  it('loads existing travel style', async () => {
    (userSettingsActions.getUserSettings as any).mockResolvedValue({
      success: true,
      settings: {
        travelStyle: 'Existing Style',
        customInstructions: 'Existing Instructions',
      },
    });

    render(<SettingsModal isOpen={true} onClose={mockClose} />);

    // Switch to AI tab
    fireEvent.click(screen.getByText('AI設定'));

    // Verify value
    const textarea = await screen.findByDisplayValue('Existing Style');
    expect(textarea).toBeDefined();
  });

  it('saves travel style', async () => {
    (userSettingsActions.updateUserSettings as any).mockResolvedValue({ success: true });

    render(<SettingsModal isOpen={true} onClose={mockClose} />);

    // Switch to AI tab
    fireEvent.click(screen.getByText('AI設定'));

    // Input new style
    const textarea = await screen.findByPlaceholderText('例：歴史的な場所が好きです。朝はゆっくりスタートしたいです...');
    fireEvent.change(textarea, { target: { value: 'New Travel Style' } });

    // Save
    const saveButton = screen.getByText('設定を保存');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(userSettingsActions.updateUserSettings).toHaveBeenCalledWith(expect.objectContaining({
        travelStyle: 'New Travel Style'
      }));
    });
  });
});
