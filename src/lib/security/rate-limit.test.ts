import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkPlanCreationRate } from './rate-limit';

// Mock createClient
const mockSelect = vi.fn();
const mockGt = vi.fn();
const mockEq = vi.fn();
const mockFrom = vi.fn(() => ({
  select: mockSelect,
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    from: mockFrom,
  })),
}));

describe('checkPlanCreationRate', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup chain
    mockSelect.mockReturnValue({ eq: mockEq });
    mockEq.mockReturnValue({ gt: mockGt });
  });

  it('should return success if count is below limit', async () => {
    // Mock count = 1
    mockGt.mockResolvedValue({ count: 1, error: null });

    const result = await checkPlanCreationRate('user-123');

    expect(result.success).toBe(true);
    expect(mockFrom).toHaveBeenCalledWith('plans');
    expect(mockSelect).toHaveBeenCalledWith('*', { count: 'exact', head: true });
    expect(mockEq).toHaveBeenCalledWith('user_id', 'user-123');
  });

  it('should return failure if count is equal to limit', async () => {
    // Mock count = 5 (limit)
    mockGt.mockResolvedValue({ count: 5, error: null });

    const result = await checkPlanCreationRate('user-123');

    expect(result.success).toBe(false);
    expect(result.message).toContain('頻度が高すぎます');
  });

  it('should return failure if count is above limit', async () => {
    // Mock count = 10
    mockGt.mockResolvedValue({ count: 10, error: null });

    const result = await checkPlanCreationRate('user-123');

    expect(result.success).toBe(false);
  });

  it('should return success (fail open) if DB error occurs', async () => {
    // Mock error
    mockGt.mockResolvedValue({ count: null, error: { message: 'DB Error' } });

    const result = await checkPlanCreationRate('user-123');

    expect(result.success).toBe(true);
  });
});
