import { render, screen } from '@testing-library/react';
import TransitCard from './TransitCard';
import { TransitInfo } from '@/types';
import { describe, it, expect } from 'vitest';

describe('TransitCard', () => {
  const mockTransit: TransitInfo = {
    type: 'flight',
    departure: { place: 'Osaka', time: '10:00' },
    arrival: { place: 'KL', time: '16:00' },
    memo: 'JL123'
  };

  it('renders transit information correctly', () => {
    render(<TransitCard transit={mockTransit} />);

    // Expect capitalized label "Flight"
    expect(screen.getByText('Flight')).toBeDefined();
    expect(screen.getByText('Osaka')).toBeDefined();
    expect(screen.getByText('KL')).toBeDefined();
    expect(screen.getByText('10:00')).toBeDefined();
    expect(screen.getByText('16:00')).toBeDefined();
    expect(screen.getByText('JL123')).toBeDefined();
  });

  it('renders without optional fields', () => {
    const minimalTransit: TransitInfo = {
      type: 'train',
      departure: { place: 'Tokyo' },
      arrival: { place: 'Kyoto' }
    };

    render(<TransitCard transit={minimalTransit} />);

    // Expect capitalized label "Train"
    expect(screen.getByText('Train')).toBeDefined();
    expect(screen.getByText('Tokyo')).toBeDefined();
    expect(screen.getByText('Kyoto')).toBeDefined();
    // Check if time placeholder exists
    expect(screen.getAllByText('--:--').length).toBeGreaterThan(0);
  });
});
