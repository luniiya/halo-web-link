import os from 'node:os';
import { join } from 'node:path';

/**
 * Load only the environment settings the standalone MCP adapter requires.
 * This module intentionally does not import the core server configuration so
 * @luniiya/halo-web-link-mcp can run without the core package installed.
 */
export function loadMcpConfig() {
  return {
    port: parseInt(process.env.HWL_PORT || process.env.PORT || '9377', 10),
    apiKey: process.env.HWL_API_KEY || '',
    accessKey: (process.env.HWL_ACCESS_KEY || '').trim(),
    cookiesDir: process.env.HWL_COOKIES_DIR || join(os.homedir(), '.hwl', 'cookies'),
  };
}
