---
name: hwl-rebrand
description: Bloom Web Link -> Halo Web Link rename decisions (clean break, no fallbacks)
type: decision
---

# Rebrand to Halo Web Link

*(as of 2026-11-07)* User decisions:
- Rename **everything**, now, as a **clean break: no compatibility aliases, no fallbacks** to old names.
  - "Bloom Web Link" → "Halo Web Link", `bloom-web-link` → `halo-web-link`, `bwl` → `hwl`, `BWL_*` env → `HWL_*`,
    MCP tools `bwl_*` → `hwl_*`, `bwl.config.json` → `hwl.config.json`, `.bwl` dirs → `.hwl`, localStorage `bwl-*` → `hwl-*`.
- The GitHub repo and the local folder name are renamed by the user (git is theirs).
- Clients (Claude Code MCP config, other repos' CLAUDE.md mentioning bwl) must be updated after.

Related: [[hwl-ui-restyle]]
