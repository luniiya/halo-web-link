# Notes for Claude

## Testing / benchmarks

- https://www.automationexercise.com/test_cases: real e-commerce site with ~26 numbered test cases (signup/login, cart, checkout, search, subscription, contact form, product review, scroll behavior, etc). Good source of realistic tasks for comparing hwl MCP tools against other browser-automation tool sets (e.g. claude-in-chrome) or validating new hwl tools end-to-end.

## Git

- NEVER add `Co-Authored-By: Claude ...`, `Claude-Session: ...`, or any other Claude/AI attribution trailer to commit messages or PR descriptions. Plain commit messages only. This applies to subagents too.

## Memory

`memory/INDEX.md` maps the project notes (one fact per file, dated, append-only). Read it before
UI work: `memory/halo-style/` is the design system this dashboard follows (ported from haloLesson),
`memory/duolingo-ui/` the research behind it. Write new decisions there as they happen.
