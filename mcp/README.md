# halo-web-link stdio MCP adapter

**Most clients don't need this.** The hwl container serves MCP directly over Streamable HTTP at `http://localhost:9377/mcp` (see the [main README](../README.md#connect-an-agent)).

This package is a thin **stdio** adapter for MCP hosts that can only launch a local command. It turns each MCP tool call into a REST call against a running hwl container. It depends only on `@modelcontextprotocol/sdk`; no browser and no core server code.

## Setup

1. Start hwl: `docker compose up -d --build` from the repo root.
2. Install the adapter so `halo-web-link-mcp` is on your `PATH`:

   ```bash
   cd mcp && npm install && npm link
   ```

3. Register it with your host. For Claude Code:

   ```bash
   claude mcp add halo-web-link -s user -- halo-web-link-mcp
   ```

   Other hosts (Cursor, Codex, opencode, etc.) take the same command in their MCP config:

   ```json
   { "mcpServers": { "halo-web-link": { "command": "halo-web-link-mcp" } } }
   ```

## Environment variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `HWL_BASE_URL` | `http://localhost:9377` | Where the hwl container is listening |
| `HWL_USER_ID` | `mcp-<random>` | Browser session identity. Set a fixed value to resume the same tabs and storage across runs. Agents that share it must coordinate. |
| `HWL_SESSION_KEY` | `default` | Tab group within the user |
| `HWL_ACCESS_KEY` | _unset_ | Sent as `Authorization: Bearer` on every call; must match the container's `HWL_ACCESS_KEY` |
| `HWL_API_KEY` | _unset_ | Needed for `hwl_import_cookies`; must match the container's `HWL_API_KEY` |

## Tools

The adapter exposes the same 17 `hwl_*` tools as the HTTP endpoint (listed in the [main README](../README.md#tools)). Tool names, schemas, and REST routes are defined once in [`lib/tool-contracts.mjs`](lib/tool-contracts.mjs). The HTTP endpoint and the OpenClaw plugin use the same definitions, so the three can't drift apart.

## Troubleshooting

- **`401` on every call:** the container has `HWL_ACCESS_KEY` set. Set the same value in the adapter's env.
- **`403` on `hwl_import_cookies`:** `HWL_API_KEY` is missing or doesn't match the container.
- **`422 strict mode violation`:** a CSS selector matched several elements. Take a new snapshot and use the element ref.
- **`503` / `tab create timed out`:** check `docker compose logs hwl`. The dashboard at `http://localhost:6080` shows each tab's call log.

## Tests

```bash
npm run test:mcp    # handshake tests, in-repo and from the packed tarball
NODE_OPTIONS='--experimental-vm-modules' npx jest tests/unit/mcp-contracts.test.js   # REST traffic per tool, against a mock server
```
