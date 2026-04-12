import { describe, it, expect, vi } from 'vitest';
import { withRetry } from '../../src/retry';

/**
 * Tests for the retry utility.
 * Uses short delays (1ms) to keep tests fast.
 */
describe('withRetry', () => {
  const fastDelays = [1, 1, 1];

  it('should return on first success without retrying', async () => {
    const fn = vi.fn().mockResolvedValue('ok');
    const result = await withRetry(fn, 'test', fastDelays);

    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should retry and succeed on second attempt', async () => {
    const fn = vi.fn().mockRejectedValueOnce(new Error('fail')).mockResolvedValue('ok');
    const result = await withRetry(fn, 'test', fastDelays);

    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should throw after all retries are exhausted', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('always fails'));

    await expect(withRetry(fn, 'test', fastDelays)).rejects.toThrow('always fails');
    expect(fn).toHaveBeenCalledTimes(4); // 1 initial + 3 retries
  });

  it('should succeed on the last possible attempt', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('fail 1'))
      .mockRejectedValueOnce(new Error('fail 2'))
      .mockRejectedValueOnce(new Error('fail 3'))
      .mockResolvedValue('ok');
    const result = await withRetry(fn, 'test', fastDelays);

    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(4);
  });
});
