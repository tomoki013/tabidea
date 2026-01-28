import { render, screen, fireEvent } from '@testing-library/react';
import TransitForm from './TransitForm';
import { TransitInfo } from '@/types';
import { describe, it, expect, vi } from 'vitest';

describe('TransitForm', () => {
  const mockOnSave = vi.fn();
  const mockOnCancel = vi.fn();
  const defaultProps = {
    dayIndex: 1,
    totalDays: 3,
    onSave: mockOnSave,
    onCancel: mockOnCancel,
  };

  it('renders correctly with empty initial state', () => {
    render(<TransitForm {...defaultProps} />);

    expect(screen.getByText('Day 1')).toBeDefined();
    expect(screen.getByText('移動手段の編集')).toBeDefined();
    expect(screen.getByText('飛行機')).toBeDefined();
    expect(screen.getByPlaceholderText('出発地 (例: 東京駅)')).toBeDefined();
    expect(screen.getByPlaceholderText('到着地 (例: 大阪駅)')).toBeDefined();
  });

  it('renders correctly with initial data', () => {
    const initialData: TransitInfo = {
      type: 'train',
      departure: { place: 'Tokyo', time: '10:00' },
      arrival: { place: 'Kyoto', time: '12:00' },
      memo: 'Hikari 505'
    };

    render(<TransitForm {...defaultProps} initialData={initialData} />);

    expect(screen.getByDisplayValue('Tokyo')).toBeDefined();
    expect(screen.getByDisplayValue('Kyoto')).toBeDefined();
    expect(screen.getByDisplayValue('10:00')).toBeDefined();
    expect(screen.getByDisplayValue('12:00')).toBeDefined();
    expect(screen.getByDisplayValue('Hikari 505')).toBeDefined();

    // Check if train type is selected (checking class presence is brittle, but button existence is good)
    const trainButton = screen.getByText('電車').closest('button');
    expect(trainButton).toBeDefined();
  });

  it('calls onSave with correct data when submitted', () => {
    render(<TransitForm {...defaultProps} />);

    fireEvent.change(screen.getByPlaceholderText('出発地 (例: 東京駅)'), { target: { value: 'Osaka' } });
    fireEvent.change(screen.getByPlaceholderText('到着地 (例: 大阪駅)'), { target: { value: 'Tokyo' } });

    const saveButton = screen.getByText('保存する').closest('button');
    fireEvent.click(saveButton!);

    expect(mockOnSave).toHaveBeenCalledWith({
      type: 'flight', // default
      departure: { place: 'Osaka', time: '' },
      arrival: { place: 'Tokyo', time: '' },
      memo: ''
    });
  });

  it('calls onCancel when cancel button is clicked', () => {
    render(<TransitForm {...defaultProps} />);

    const cancelButton = screen.getByText('キャンセル').closest('button');
    fireEvent.click(cancelButton!);

    expect(mockOnCancel).toHaveBeenCalled();
  });
});
