// Text a user pastes into an agent so it can connect to bwl on its own.
export type AgentPromptInput = {
  mcpUrl: string;
  profile: string;
  authRequired: boolean;
  /** All profile names, so the agent knows what else exists. */
  profiles: string[];
};

/** Default MCP URL as seen from the dashboard's own host. */
export function defaultMcpUrl(location: { protocol: string; hostname: string }, mcpPort: number): string {
  const bare = location.hostname.replace(/^\[|\]$/g, "");
  const host = bare.includes(":") ? `[${bare}]` : bare;
  return `${location.protocol}//${host}:${mcpPort}/mcp`;
}

export function buildAgentPrompt({ mcpUrl, profile, authRequired, profiles }: AgentPromptInput): string {
  const others = profiles.filter((name) => name !== profile);
  const authHeader = authRequired ? `,\n      "headers": { "Authorization": "Bearer <BWL_ACCESS_KEY>" }` : "";
  const authFlag = authRequired ? ` --header "Authorization: Bearer <BWL_ACCESS_KEY>"` : "";
  return `# Browser: Bloom Web Link (bwl)

You have a headless anti-detection browser (Camoufox) available over MCP. It gets past bot detection and keeps cookies/logins, but it is slower and heavier than your built-in web tools.

## When to use it

- Simple lookups (search, reading docs, articles, an API or a static page): use your built-in tools first, such as WebSearch/WebFetch or curl. They are faster and cheaper.
- Use bwl when the built-in tools fail or can't do the job: the page blocks bots, shows a captcha, needs JavaScript to render, needs a login or saved cookies, or you have to interact with it (click, fill a form, upload a file, go through several steps).
- These are defaults, not rules. Use your judgment: if a site is known to need bwl, go straight to it; if bwl is overkill, don't use it.

## Connection

- MCP endpoint (Streamable HTTP): ${mcpUrl}
${authRequired ? "- Authentication: send `Authorization: Bearer <BWL_ACCESS_KEY>`. Ask the user for the key; never write it into committed files.\n" : ""}- If the bwl tools (\`bwl_create_tab\`, \`bwl_snapshot\`, ...) are not available yet, add the server:
  - Claude Code: \`claude mcp add --transport http bloom-web-link ${mcpUrl}${authFlag}\`
  - Other clients (.mcp.json, Cursor, ...):
    \`\`\`json
    { "mcpServers": { "bloom-web-link": { "type": "http", "url": "${mcpUrl}"${authHeader} } } }
    \`\`\`
  Then tell the user to restart/reload the MCP connection if needed.

## Your browser profile

Your dedicated browser profile is \`${profile}\`. Always open tabs with \`bwl_create_tab({ url, profile: "${profile}" })\`. A profile is a separate browser with its own fingerprint, cookies, logins and history, so stay in yours.
${others.length ? `Other profiles exist (${others.map((name) => `\`${name}\``).join(", ")}). You may use another one only when there is a real reason, e.g. the user asks you to or the login you need lives there. Say which profile you used and why.` : "Other profiles may exist; use one only when there is a real reason, e.g. the user asks you to."}
For a throwaway session that must not touch any saved logins, use \`profile: "burner"\`.

## How to browse

1. \`bwl_create_tab({ url, profile: "${profile}" })\` -> returns a \`tabId\`.
2. \`bwl_snapshot({ tabId })\` -> accessibility tree with element refs (\`e1\`, \`e2\`, ...). Pass \`includeScreenshot: false\` when you don't need the image. For just reading page text, \`bwl_read_text\` is much cheaper.
3. Interact by ref: \`bwl_click\`, \`bwl_type\`, \`bwl_select\`, \`bwl_scroll\`, \`bwl_navigate\`. Use \`bwl_batch\` for several steps in one call, and \`bwl_wait\` for slow pages.
4. Snapshot again after anything that changes the page; refs from an old snapshot go stale.
5. Tabs stay open until closed, so \`bwl_close_tab({ tabId })\` when you're done, unless the user wants the tab kept.

Files: \`bwl_save_page({ tabId })\` saves the current page (like Ctrl+S; a PDF or other document is saved as the original file). Downloads a click triggers are captured too. \`bwl_downloads({ tabId })\` lists them, and \`bwl_downloads({ tabId, downloadId })\` returns the file contents.
To attach a file to an upload field (a CV, a photo), use \`bwl_upload({ tabId, ref, url })\` with \`ref\` pointing at the input, its "Upload" button, or the drop zone. The bwl server fetches \`url\` itself, so serve a local file over HTTP (e.g. \`python3 -m http.server\` on an address bwl can reach) instead of inlining it. For small files, \`base64\` + \`filename\` works too.

The user can watch and take over every tab live in the dashboard. If you hit a captcha or a login you can't complete, ask them to finish it there, then continue.

## Remember this

If this project has an \`AGENTS.md\` or \`CLAUDE.md\` (or your equivalent instructions file), add this section to it, so future sessions keep using bwl with the \`${profile}\` profile. If there is none, ask the user whether to create one.
`;
}
