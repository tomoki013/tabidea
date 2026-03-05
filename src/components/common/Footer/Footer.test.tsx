import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, it, expect, vi } from 'vitest';
import Footer from './Footer';
import { getMessages } from '@/lib/i18n/messages';

vi.mock('next/navigation', () => ({
  usePathname: () => '/ja',
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/components/common/LanguageSwitcher', () => ({
  default: () => null,
}));

describe('Footer Component', () => {
  const jaMessages = getMessages('ja');

  it('renders "特商法表記" instead of "特定商取引法に基づく表記"', () => {
    render(
      <NextIntlClientProvider locale="ja-JP" messages={jaMessages}>
        <Footer />
      </NextIntlClientProvider>
    );

    // Check that "特商法表記" exists
    // getByText throws error if not found, so if it returns, it exists.
    expect(screen.getByText('特商法表記')).toBeDefined();

    // Check that "特定商取引法に基づく表記" does NOT exist
    expect(screen.queryByText('特定商取引法に基づく表記')).toBeNull();
  });

  it('renders a link to the pricing page', () => {
    render(
      <NextIntlClientProvider locale="ja-JP" messages={jaMessages}>
        <Footer />
      </NextIntlClientProvider>
    );

    // Check that "料金プラン" exists
    const pricingLink = screen.getByRole('link', { name: '料金プラン' });
    expect(pricingLink).toBeDefined();

    // Check correct href
    expect(pricingLink.getAttribute('href')).toBe('/ja/pricing');
  });
});
