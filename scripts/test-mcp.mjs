#!/usr/bin/env node
// Self-contained MCP handshake/schema smoke test. It uses the official client
// transport so framing and protocol negotiation stay aligned with the SDK.

import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const ROOT = resolve(fileURLToPath(import.meta.url), '..', '..');
const SERVER = process.env.HWL_MCP_SERVER || resolve(ROOT, 'mcp', 'server.mjs');
const EXPECTED_TOOLS = [
  'hwl_create_tab',
  'hwl_snapshot',
  'hwl_click',
  'hwl_wait',
  'hwl_mouse',
  'hwl_type',
  'hwl_navigate',
  'hwl_scroll',
  'hwl_screenshot',
  'hwl_close_tab',
  'hwl_evaluate',
  'hwl_list_tabs',
  'hwl_import_cookies',
  'hwl_read_text',
  'hwl_select',
  'hwl_element_state',
  'hwl_upload',
  'hwl_batch',
  'hwl_wait_for_reply',
  'hwl_keep_open',
  'hwl_tab_history',
  'hwl_create_profile',
  'hwl_list_profiles',
  'hwl_delete_profile',
  'hwl_downloads',
  'hwl_save_page',
];

let failures = 0;
function check(name, condition, detail = '') {
  if (condition) console.log(`  ✓ ${name}`);
  else {
    console.error(`  ✗ ${name} ${detail}`);
    failures++;
  }
}

async function main() {
  console.log('mcp/server.mjs smoke test');
  const client = new Client({ name: 'hwl-smoke-test', version: '1.0.0' });
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [SERVER],
    cwd: ROOT,
    env: {
      PATH: process.env.PATH || '',
      HOME: process.env.HOME || '',
      USER: process.env.USER || '',
      NODE_OPTIONS: process.env.NODE_OPTIONS || '',
      HWL_BASE_URL: 'http://localhost:1',
    },
    stderr: 'pipe',
  });

  let stderr = '';
  transport.stderr?.on('data', chunk => { stderr += chunk.toString(); });

  try {
    await client.connect(transport);
    check('handshake returns server name', client.getServerVersion()?.name === 'halo-web-link');

    const { tools } = await client.listTools();
    const names = tools.map(tool => tool.name).sort();
    check('lists the expected tools', tools.length === EXPECTED_TOOLS.length, `got ${tools.length}`);
    check('tool names match expected', names.join(',') === [...EXPECTED_TOOLS].sort().join(','), `got: ${names.join(',')}`);

    for (const tool of tools) {
      check(`"${tool.name}" has description`, typeof tool.description === 'string' && tool.description.length > 0);
      check(`"${tool.name}" has inputSchema.object`, tool.inputSchema?.type === 'object' && tool.inputSchema.properties !== undefined);
    }

    const navigate = tools.find(tool => tool.name === 'hwl_navigate');
    const macros = navigate.inputSchema.properties.macro.enum;
    check('navigate exposes google + reddit macros', macros.includes('@google_search') && macros.includes('@reddit_search'));
    check('navigate has >=13 macros', macros.length >= 13, `got ${macros.length}`);

    const unknown = await client.callTool({ name: 'does_not_exist', arguments: {} });
    check('unknown tool returns isError', unknown.isError === true, `got isError=${unknown.isError}`);
    check('unknown tool mentions Unknown tool', /Unknown tool/.test(unknown.content[0].text));
  } catch (err) {
    console.error(`FATAL: ${err.message}${stderr ? `\nstderr:\n${stderr}` : ''}`);
    failures++;
  } finally {
    await transport.close().catch(() => {});
  }

  if (failures > 0) process.exit(1);
  console.log('\nall checks passed');
}

await main();
