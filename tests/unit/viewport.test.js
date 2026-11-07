import { describe, test, expect, jest } from '@jest/globals';
import { resizeViewport } from '../../lib/viewport.js';

describe('resizeViewport', () => {
  test('returns when the browser resized but Playwright stays pending', async () => {
    const page = {
      setViewportSize: jest.fn(() => new Promise(() => {})),
      evaluate: jest.fn(async () => ({ width: 375, height: 667 })),
      waitForTimeout: jest.fn(),
    };

    await resizeViewport(page, 375, 667);

    expect(page.setViewportSize).toHaveBeenCalledWith({ width: 375, height: 667 });
    expect(page.evaluate).toHaveBeenCalled();
  });

  test('fails when the requested dimensions are never reached', async () => {
    const page = {
      setViewportSize: jest.fn(() => new Promise(() => {})),
      evaluate: jest.fn(async () => ({ width: 800, height: 600 })),
      waitForTimeout: jest.fn(),
    };

    await expect(resizeViewport(page, 375, 667, { timeoutMs: 0 }))
      .rejects.toThrow('Viewport resize timed out');
  });
});
