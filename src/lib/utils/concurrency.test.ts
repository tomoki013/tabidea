import { describe, it, expect, vi } from 'vitest';
import { mapWithConcurrency } from './concurrency';

describe('mapWithConcurrency', () => {
  it('should process all items and return results in order', async () => {
    const items = [1, 2, 3, 4, 5];
    const results = await mapWithConcurrency(items, 3, async (item) => item * 2);

    expect(results).toEqual([
      { status: 'fulfilled', value: 2 },
      { status: 'fulfilled', value: 4 },
      { status: 'fulfilled', value: 6 },
      { status: 'fulfilled', value: 8 },
      { status: 'fulfilled', value: 10 },
    ]);
  });

  it('should respect concurrency limit', async () => {
    let activeTasks = 0;
    let maxConcurrent = 0;

    const items = [1, 2, 3, 4, 5, 6];
    await mapWithConcurrency(items, 2, async () => {
      activeTasks++;
      maxConcurrent = Math.max(maxConcurrent, activeTasks);
      await new Promise((r) => setTimeout(r, 10));
      activeTasks--;
    });

    expect(maxConcurrent).toBeLessThanOrEqual(2);
  });

  it('should handle rejected promises without affecting others', async () => {
    const items = [1, 2, 3];
    const results = await mapWithConcurrency(items, 3, async (item) => {
      if (item === 2) throw new Error('fail');
      return item;
    });

    expect(results[0]).toEqual({ status: 'fulfilled', value: 1 });
    expect(results[1].status).toBe('rejected');
    expect(results[2]).toEqual({ status: 'fulfilled', value: 3 });
  });

  it('should handle empty items array', async () => {
    const results = await mapWithConcurrency([], 3, async (item: number) => item);
    expect(results).toEqual([]);
  });

  it('should work when concurrency exceeds items count', async () => {
    const items = [1, 2];
    const results = await mapWithConcurrency(items, 10, async (item) => item);

    expect(results).toEqual([
      { status: 'fulfilled', value: 1 },
      { status: 'fulfilled', value: 2 },
    ]);
  });

  it('should pass index to the callback', async () => {
    const items = ['a', 'b', 'c'];
    const indices: number[] = [];
    await mapWithConcurrency(items, 2, async (_, index) => {
      indices.push(index);
    });

    expect(indices.sort()).toEqual([0, 1, 2]);
  });
});
