---
name: connect-agent-keep
description: User feedback: keep the "Connect your agent" control exactly as it was; it's one of the best-looking parts
type: decision
---

*(as of 2026-11-07)* The user: "i think we should of left the connect agent as it was it was one of the thing that
looked best". Keep `src/web-ui/components/AgentPrompt.tsx` as the original pill: `.connect-agent` with the
`#agent-profile-select`, the shiny `#copy-agent-prompt` button (idle "Connect your agent", hover "Click to copy
prompt", ripple, Copied!/failed), the eye `#agent-prompt-preview-button` and `dialog#agent-prompt-dialog`.
It was restored from git HEAD the same day (only diff vs HEAD: comment says hwl). During the sidebar rework
([[layout-rework]]) place this control as-is, don't redesign it into a nav item.
