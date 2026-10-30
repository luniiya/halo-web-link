/**
 * Tests for the /tabs/:tabId/upload endpoint.
 *
 * The route is deeply embedded in server.js and can't be extracted without an
 * invasive refactor, so (following the project convention in
 * typeKeyboardMode.test.js / navigationTimeout.test.js) we test in two ways:
 *
 *   1. A mirrored copy of the request-validation logic, kept in sync with the
 *      route. If this diverges, integration use will catch it.
 *   2. Source-contract assertions: read server.js and assert the route exists
 *      and preserves its load-bearing behaviors (two-strategy attach, container
 *      file containment guard, no OS dialog dependency).
 */
import { describe, test, expect } from '@jest/globals';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const serverSrc = readFileSync(join(__dirname, '../../server.js'), 'utf8');

/**
 * Extracted validation logic matching the /upload endpoint in server.js.
 * Kept in sync with the route -- if this diverges, integration tests will catch it.
 *
 * Returns { status, error } for an early validation failure, or null if the
 * request provides userId and path. Individual path validation is performed by
 * resolveUploadPaths(), which has direct unit coverage in uploadPaths.test.js.
 */
function validateUploadRequest({ userId, path: filePath, url, base64, mode, ref, selector }) {
  if (!userId) return { status: 400, error: 'userId required' };
  if (!filePath && !url && !base64) return { status: 400, error: 'path, url, or base64 required' };
  if (mode === 'drop' && !ref && !selector) return { status: 400, error: 'mode "drop" needs a ref or selector for the drop zone' };

  return null;
}

// Default when the request omits `timeout` or supplies an unusable value.
// Kept in sync with UPLOAD_UI_TIMEOUT_MS in server.js.
const DEFAULT_UPLOAD_TIMEOUT_MS = 12000;

/**
 * Mirrors the `uploadTimeout` resolution in the /upload endpoint: use the
 * caller's `timeout` when it is a finite positive number, else the default.
 */
function resolveUploadTimeout(timeout) {
  return Number.isFinite(timeout) && timeout > 0 ? timeout : DEFAULT_UPLOAD_TIMEOUT_MS;
}

describe('/upload request validation', () => {
  test('requires userId', () => {
    const r = validateUploadRequest({ path: '/tmp/a.png' });
    expect(r).toMatchObject({ status: 400, error: 'userId required' });
  });

  test('requires a file source', () => {
    const r = validateUploadRequest({ userId: 'agent1' });
    expect(r).toMatchObject({ status: 400, error: 'path, url, or base64 required' });
  });

  test('accepts url or base64 instead of path', () => {
    expect(validateUploadRequest({ userId: 'agent1', url: 'http://lan/cv.pdf' })).toBeNull();
    expect(validateUploadRequest({ userId: 'agent1', base64: 'aGk=', filename: 'a.txt' })).toBeNull();
  });

  test('drop mode needs a drop target', () => {
    const r = validateUploadRequest({ userId: 'agent1', url: 'http://lan/cv.pdf', mode: 'drop' });
    expect(r).toMatchObject({ status: 400, error: expect.stringContaining('drop') });
    expect(validateUploadRequest({ userId: 'agent1', url: 'http://lan/cv.pdf', mode: 'drop', ref: 'e3' })).toBeNull();
  });

  test('accepts a single string path for upload-root validation', () => {
    const r = validateUploadRequest({ userId: 'agent1', path: '/data/x.png' });
    expect(r).toBeNull();
  });

  test('defers array and entry validation to resolveUploadPaths', () => {
    const r = validateUploadRequest({ userId: 'agent1', path: ['/data/a.png', '/data/b.png'] });
    expect(r).toBeNull();
  });

  test('ref/selector are optional (an existing input[type=file] needs no trigger)', () => {
    const r = validateUploadRequest({ userId: 'agent1', path: '/data/x.png' });
    expect(r).toBeNull();
  });
});

describe('/upload timeout argument', () => {
  test('defaults when omitted', () => {
    expect(resolveUploadTimeout(undefined)).toBe(DEFAULT_UPLOAD_TIMEOUT_MS);
  });

  test('honours a positive numeric override', () => {
    expect(resolveUploadTimeout(30000)).toBe(30000);
  });

  test('falls back to the default for zero, negative, or non-numeric values', () => {
    expect(resolveUploadTimeout(0)).toBe(DEFAULT_UPLOAD_TIMEOUT_MS);
    expect(resolveUploadTimeout(-1)).toBe(DEFAULT_UPLOAD_TIMEOUT_MS);
    expect(resolveUploadTimeout('soon')).toBe(DEFAULT_UPLOAD_TIMEOUT_MS);
    expect(resolveUploadTimeout(NaN)).toBe(DEFAULT_UPLOAD_TIMEOUT_MS);
  });
});

describe('/upload source contract', () => {
  test('the route is registered', () => {
    expect(serverSrc).toMatch(/app\.post\(\s*['"]\/tabs\/:tabId\/upload['"]/);
  });

  test('delegates path validation to the upload-root resolver', () => {
    expect(serverSrc).toMatch(/import \{ resolveUploadPaths \} from '\.\/lib\/upload-paths\.js';/);
    expect(serverSrc).toMatch(/resolveUploadPaths\(\{ uploadsDir: CONFIG\.uploadsDir, filePaths:/);
  });

  test('strategy 1 sets files directly on an existing input[type=file]', () => {
    expect(serverSrc).toMatch(/setInputFiles/);
    expect(serverSrc).toMatch(/input\[type="file"\]/);
    expect(serverSrc).toMatch(/direct_input/);
  });

  test('strategy 2 arms a filechooser and activates via keyboard then forced click', () => {
    expect(serverSrc).toMatch(/waitForEvent\(\s*['"]filechooser['"]/);
    expect(serverSrc).toMatch(/keyboard\.press\(\s*['"]Enter['"]\s*\)/);
    expect(serverSrc).toMatch(/force:\s*true/);
    expect(serverSrc).toMatch(/setFiles\(/);
  });

  test('url and base64 sources stay in memory, are size-capped, and need exactly one source', () => {
    expect(serverSrc).toMatch(/async function loadUploadSource\(/);
    expect(serverSrc).toMatch(/const UPLOAD_MAX_BYTES = /);
    expect(serverSrc).toMatch(/invalid_upload_source/);
    expect(serverSrc).toMatch(/upload_too_large/);
    // no temp files: url/base64 become { name, mimeType, buffer } payloads
    expect(serverSrc).toMatch(/payload = \{ name, mimeType, buffer \}/);
  });

  test('targets the file input belonging to a ref/selector and can drop on a drop zone', () => {
    expect(serverSrc).toMatch(/target_input/);
    expect(serverSrc).toMatch(/new DataTransfer\(\)/);
    expect(serverSrc).toMatch(/\['dragenter', 'dragover', 'drop'\]/);
    expect(serverSrc).toMatch(/attachedVia = 'drop'/);
  });

  test('upload route has its own larger body limit', () => {
    expect(serverSrc).toMatch(/const uploadJsonParser = express\.json\(\{ limit: '40mb' \}\);/);
    expect(serverSrc).toMatch(/app\.post\('\/tabs\/:tabId\/upload', uploadJsonParser,/);
    // the profile re-pointing middleware must parse upload bodies too
    expect(serverSrc).toMatch(/req\.path === '\/upload'\) return uploadJsonParser\(req, res, route\)/);
    expect(serverSrc).toMatch(/\(evaluate\|upload\)\$/);
  });

  test('runs under the per-user and per-tab locks like the other interaction routes', () => {
    const idx = serverSrc.indexOf("app.post('/tabs/:tabId/upload'");
    const slice = serverSrc.slice(idx, idx + 4000);
    expect(slice).toMatch(/withUserLimit\(/);
    expect(slice).toMatch(/withTabLock\(/);
  });

  test('declares named timeout constants instead of inline magic numbers', () => {
    for (const name of [
      'UPLOAD_UI_TIMEOUT_MS',
      'UPLOAD_PANEL_MARGIN_MS',
      'UPLOAD_INPUT_TIMEOUT_MS',
      'UPLOAD_FOCUS_TIMEOUT_MS',
      'UPLOAD_CLICK_TIMEOUT_MS',
      'UPLOAD_PANEL_POLL_MS',
      'UPLOAD_REFS_TIMEOUT_MS',
      'UPLOAD_SETTLE_MS',
    ]) {
      expect(serverSrc).toMatch(new RegExp(`const ${name} = \\d+;`));
    }
  });

  test('resolves the overall wait budget from the request timeout with a default', () => {
    const start = serverSrc.indexOf("app.post('/tabs/:tabId/upload'");
    const end = serverSrc.indexOf('\n// Type', start);
    const block = serverSrc.slice(start, end === -1 ? undefined : end);
    expect(block).toMatch(/req\.body\.timeout/);
    expect(block).toMatch(/UPLOAD_UI_TIMEOUT_MS/);
    // The whole route body should carry no bare millisecond literals -- every
    // timeout must reference a named constant or the resolved uploadTimeout.
    expect(block).not.toMatch(/timeout:\s*\d/);
    expect(block).not.toMatch(/timeoutMs:\s*\d/);
    expect(block).not.toMatch(/waitForTimeout\(\s*\d/);
  });
});
