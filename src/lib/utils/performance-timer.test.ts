import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  PerformanceTimer,
  createOutlineTimer,
  createChunkTimer,
  createPerformanceTimer,
  OUTLINE_TARGETS,
  OUTLINE_TARGETS_FLASH,
  OUTLINE_TARGETS_PRO,
  CHUNK_TARGETS,
  CHUNK_TARGETS_FLASH,
  CHUNK_TARGETS_PRO,
} from './performance-timer';

describe('PerformanceTimer', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should track step timings with start/end', async () => {
    const timer = new PerformanceTimer('test-op');

    timer.start('step1');
    await new Promise((r) => setTimeout(r, 50));
    const duration = timer.end('step1');

    expect(duration).toBeGreaterThanOrEqual(40);
    expect(duration).toBeLessThan(200);

    const report = timer.getReport();
    expect(report.operation).toBe('test-op');
    expect(report.steps).toHaveLength(1);
    expect(report.steps[0].name).toBe('step1');
    expect(report.steps[0].duration).toBeGreaterThanOrEqual(40);
  });

  it('should track step timings with measure()', async () => {
    const timer = new PerformanceTimer('test-op');

    const result = await timer.measure('async-step', async () => {
      await new Promise((r) => setTimeout(r, 30));
      return 42;
    });

    expect(result).toBe(42);

    const report = timer.getReport();
    expect(report.steps).toHaveLength(1);
    expect(report.steps[0].name).toBe('async-step');
    expect(report.steps[0].duration).toBeGreaterThanOrEqual(20);
  });

  it('should still record timing when measure() throws', async () => {
    const timer = new PerformanceTimer('test-op');

    await expect(
      timer.measure('failing-step', async () => {
        await new Promise((r) => setTimeout(r, 20));
        throw new Error('boom');
      })
    ).rejects.toThrow('boom');

    const report = timer.getReport();
    expect(report.steps).toHaveLength(1);
    expect(report.steps[0].name).toBe('failing-step');
    expect(report.steps[0].duration).toBeGreaterThanOrEqual(10);
  });

  it('should return 0 for end() on non-started step', () => {
    const timer = new PerformanceTimer('test-op');
    const duration = timer.end('nonexistent');
    expect(duration).toBe(0);
  });

  it('should compare against targets', async () => {
    const timer = new PerformanceTimer('test-op', {
      fast_step: 100,
      slow_step: 10,
      total: 200,
    });

    await timer.measure('fast_step', async () => {
      await new Promise((r) => setTimeout(r, 20));
    });

    await timer.measure('slow_step', async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    const report = timer.getReport();
    expect(report.targets).toHaveLength(3); // fast_step, slow_step, total

    const fastTarget = report.targets.find((t) => t.step === 'fast_step');
    expect(fastTarget).toBeDefined();
    expect(fastTarget!.met).toBe(true);

    const slowTarget = report.targets.find((t) => t.step === 'slow_step');
    expect(slowTarget).toBeDefined();
    expect(slowTarget!.met).toBe(false);
    expect(slowTarget!.overagePercent).toBeGreaterThan(0);
  });

  it('should track total duration', async () => {
    const timer = new PerformanceTimer('test-op');

    await new Promise((r) => setTimeout(r, 30));

    const total = timer.getTotalDuration();
    expect(total).toBeGreaterThanOrEqual(20);
  });

  it('should produce structured log output', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const timer = new PerformanceTimer('test-op', { step1: 1000 });

    await timer.measure('step1', async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    timer.log();

    expect(consoleSpy).toHaveBeenCalledTimes(1);
    const logOutput = consoleSpy.mock.calls[0][0] as string;
    expect(logOutput).toContain('[perf]');
    expect(logOutput).toContain('test-op');
    expect(logOutput).toContain('step1');
  });

  it('should track multiple steps in order', async () => {
    const timer = new PerformanceTimer('multi-step');

    await timer.measure('a', async () => Promise.resolve());
    await timer.measure('b', async () => Promise.resolve());
    await timer.measure('c', async () => Promise.resolve());

    const report = timer.getReport();
    expect(report.steps.map((s) => s.name)).toEqual(['a', 'b', 'c']);
  });
});

describe('Factory functions', () => {
  it('createOutlineTimer should use OUTLINE_TARGETS', () => {
    const timer = createOutlineTimer();
    const report = timer.getReport();
    expect(report.operation).toBe('generatePlanOutline');
  });

  it('createOutlineTimer with pro tier should use PRO targets', () => {
    const timer = createOutlineTimer('pro');
    const report = timer.getReport();
    expect(report.operation).toBe('generatePlanOutline');
  });

  it('createChunkTimer should use CHUNK_TARGETS with day range in name', () => {
    const timer = createChunkTimer(1, 3);
    const report = timer.getReport();
    expect(report.operation).toBe('generatePlanChunk(1-3)');
  });

  it('createChunkTimer with pro tier should use PRO targets', () => {
    const timer = createChunkTimer(1, 3, 'pro');
    const report = timer.getReport();
    expect(report.operation).toBe('generatePlanChunk(1-3)');
  });

  it('createPerformanceTimer should accept custom targets', () => {
    const timer = createPerformanceTimer('custom', { myStep: 500 });
    const report = timer.getReport();
    expect(report.operation).toBe('custom');
  });
});

describe('setTargets', () => {
  it('should update targets after creation', async () => {
    const timer = new PerformanceTimer('test-op', { fast_step: 100 });

    await timer.measure('fast_step', async () => {
      await new Promise((r) => setTimeout(r, 20));
    });

    // Before setTargets: target is 100ms, should be met
    let report = timer.getReport();
    const fastTarget = report.targets.find((t) => t.step === 'fast_step');
    expect(fastTarget).toBeDefined();
    expect(fastTarget!.met).toBe(true);

    // After setTargets: change target to 5ms, should now fail
    timer.setTargets({ fast_step: 5 });
    report = timer.getReport();
    const updatedTarget = report.targets.find((t) => t.step === 'fast_step');
    expect(updatedTarget).toBeDefined();
    expect(updatedTarget!.met).toBe(false);
  });
});

describe('Target constants', () => {
  it('OUTLINE_TARGETS should be an alias for OUTLINE_TARGETS_FLASH', () => {
    expect(OUTLINE_TARGETS).toBe(OUTLINE_TARGETS_FLASH);
  });

  it('CHUNK_TARGETS should be an alias for CHUNK_TARGETS_FLASH', () => {
    expect(CHUNK_TARGETS).toBe(CHUNK_TARGETS_FLASH);
  });

  it('OUTLINE_TARGETS_FLASH should have expected keys', () => {
    expect(OUTLINE_TARGETS_FLASH).toHaveProperty('usage_check');
    expect(OUTLINE_TARGETS_FLASH).toHaveProperty('cache_check');
    expect(OUTLINE_TARGETS_FLASH).toHaveProperty('rag_search');
    expect(OUTLINE_TARGETS_FLASH).toHaveProperty('prompt_build');
    expect(OUTLINE_TARGETS_FLASH).toHaveProperty('ai_generation');
    expect(OUTLINE_TARGETS_FLASH).toHaveProperty('hero_image');
    expect(OUTLINE_TARGETS_FLASH).toHaveProperty('total');
  });

  it('OUTLINE_TARGETS_PRO should have higher ai_generation target', () => {
    expect(OUTLINE_TARGETS_PRO.ai_generation).toBeGreaterThan(OUTLINE_TARGETS_FLASH.ai_generation);
    expect(OUTLINE_TARGETS_PRO.total).toBeGreaterThan(OUTLINE_TARGETS_FLASH.total);
  });

  it('CHUNK_TARGETS_FLASH should have expected keys', () => {
    expect(CHUNK_TARGETS_FLASH).toHaveProperty('prompt_build');
    expect(CHUNK_TARGETS_FLASH).toHaveProperty('ai_generation');
    expect(CHUNK_TARGETS_FLASH).toHaveProperty('total');
  });

  it('CHUNK_TARGETS_PRO should have higher ai_generation target', () => {
    expect(CHUNK_TARGETS_PRO.ai_generation).toBeGreaterThan(CHUNK_TARGETS_FLASH.ai_generation);
    expect(CHUNK_TARGETS_PRO.total).toBeGreaterThan(CHUNK_TARGETS_FLASH.total);
  });
});
