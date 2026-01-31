import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Footer from './Footer';

describe('Footer Component', () => {
  it('renders "特商法表記" instead of "特定商取引法に基づく表記"', () => {
    render(<Footer />);

    // Check that "特商法表記" exists
    // getByText throws error if not found, so if it returns, it exists.
    expect(screen.getByText('特商法表記')).toBeDefined();

    // Check that "特定商取引法に基づく表記" does NOT exist
    expect(screen.queryByText('特定商取引法に基づく表記')).toBeNull();
  });

  it('renders a link to the pricing page', () => {
    render(<Footer />);

    // Check that "料金プラン" exists
    const pricingLink = screen.getByRole('link', { name: '料金プラン' });
    expect(pricingLink).toBeDefined();

    // Check correct href
    expect(pricingLink.getAttribute('href')).toBe('/pricing');
  });
});
