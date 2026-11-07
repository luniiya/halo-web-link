export async function resizeViewport(page, width, height, { timeoutMs = 5000, pollIntervalMs = 50 } = {}) {
  let settled = null;
  page.setViewportSize({ width, height }).then(
    () => { settled = { ok: true }; },
    (error) => { settled = { error }; },
  );

  const deadline = Date.now() + timeoutMs;
  while (!settled && Date.now() < deadline) {
    const actual = await page.evaluate(() => ({ width: window.innerWidth, height: window.innerHeight }));
    if (actual.width === width && actual.height === height) return;
    await page.waitForTimeout(pollIntervalMs);
  }

  if (settled?.error) throw settled.error;
  if (settled?.ok) return;
  throw new Error(`Viewport resize timed out before reaching ${width}x${height}`);
}
