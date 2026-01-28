import { render, screen, fireEvent } from '@testing-library/react';
import { AuthButton } from './AuthButton';
import { describe, it, expect, vi } from 'vitest';

// Mock useAuth
const mockUseAuth = vi.fn();
vi.mock('@/context/AuthContext', () => ({
  useAuth: () => mockUseAuth()
}));

// Mock SettingsModal
vi.mock('./SettingsModal', () => ({
  default: ({ isOpen }: { isOpen: boolean }) => isOpen ? <div data-testid="settings-modal">Modal Content</div> : null
}));

describe('AuthButton', () => {
  it('renders loading state', () => {
    mockUseAuth.mockReturnValue({ isLoading: true });
    render(<AuthButton />);
    expect(screen.queryByText('ログイン')).toBeNull();
  });

  it('renders login link when not authenticated', () => {
    mockUseAuth.mockReturnValue({ isLoading: false, isAuthenticated: false });
    render(<AuthButton />);
    expect(screen.getByText('ログイン')).toBeDefined();
  });

  it('renders user avatar when authenticated', () => {
    mockUseAuth.mockReturnValue({
      isLoading: false,
      isAuthenticated: true,
      user: { displayName: 'TestUser', avatarUrl: '/avatar.png' }
    });
    render(<AuthButton />);
    const button = screen.getByLabelText('ユーザーメニュー');
    expect(button).toBeDefined();
  });

  it('opens modal when clicking avatar', () => {
    mockUseAuth.mockReturnValue({
      isLoading: false,
      isAuthenticated: true,
      user: { displayName: 'TestUser' }
    });
    render(<AuthButton />);

    const button = screen.getByLabelText('ユーザーメニュー');
    fireEvent.click(button);

    expect(screen.getByTestId('settings-modal')).toBeDefined();
  });
});
