import { homedir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";

function port(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value || "", 10);
  return Number.isInteger(parsed) && parsed > 0 && parsed <= 65535 ? parsed : fallback;
}

const publicAccessKey = (process.env.HWL_ACCESS_KEY || "").trim();
const internalAccessKey = publicAccessKey || `internal-${randomUUID()}`;
const host = (process.env.HWL_BIND_HOST || "0.0.0.0").trim();
const packageVersion = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
).version as string;

export const containerConfig = {
  host,
  packageVersion,
  mcpPort: port(process.env.HWL_MCP_PORT || process.env.PORT, 9377),
  webPort: port(process.env.HWL_WEB_PORT, 6080),
  corePort: port(process.env.HWL_INTERNAL_PORT, 9378),
  coreHost: "127.0.0.1",
  publicAccessKey,
  // MCP URL handed to agents in the dashboard's copy prompt. Empty: derived
  // from the host the dashboard was opened at plus mcpPort.
  publicMcpUrl: (process.env.HWL_PUBLIC_MCP_URL || "").trim(),
  internalAccessKey,
  apiKey: process.env.HWL_API_KEY || "",
  adminKey: process.env.HWL_ADMIN_KEY || "",
  cookiesDir: process.env.HWL_COOKIES_DIR || join(homedir(), ".hwl", "cookies"),
  coreEnv: { ...process.env } as Record<string, string>,
};

export type ContainerConfig = typeof containerConfig;
