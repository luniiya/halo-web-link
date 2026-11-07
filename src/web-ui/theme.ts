export type Theme = "auto" | "light" | "dark";

// Keep these keys in sync with the inline script in index.html, which applies
// them before first paint so the page never flashes the wrong theme or color.
const THEME_KEY = "hwl-theme";
const ACCENT_KEY = "hwl-accent";
const SECONDARY_KEY = "hwl-secondary";
const SIDEBAR_KEY = "hwl-sidebar-collapsed";

export const DEFAULT_ACCENT = "#1cb0f6";
export const DEFAULT_SECONDARY = "#7c5cff";
/** Swatches offered in the color picker; any #rrggbb works too. */
export const COLOR_PRESETS = ["#1cb0f6", "#7c5cff", "#ec4f9a", "#58cc02", "#ff9600", "#ff4b4b", "#00c2a8", "#4b4b4b"];

export function isHexColor(value: unknown): value is string {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);
}

function read(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}

function write(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {}
}

export function normalizeTheme(value: string | null): Theme {
  return value === "light" || value === "dark" ? value : "auto";
}

export function savedTheme(): Theme {
  return normalizeTheme(read(THEME_KEY));
}

const darkQuery = () => matchMedia("(prefers-color-scheme: dark)");

function paintTheme(theme: Theme) {
  const dark = theme === "dark" || (theme === "auto" && darkQuery().matches);
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.classList.toggle("dark", dark);
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", dark ? "#131f24" : "#ffffff");
}

let followingSystem = false;

/** Apply a theme to the page; with persist, remember it ("auto" clears the saved choice). */
export function applyTheme(theme: Theme, persist = true) {
  paintTheme(theme);
  // Auto follows the system live, not just at load.
  if (!followingSystem) {
    followingSystem = true;
    darkQuery().addEventListener("change", () => paintTheme(savedTheme()));
  }
  if (persist) write(THEME_KEY, theme === "auto" ? null : theme);
}

export type Colors = { accent: string; secondary: string };

export function savedColors(): Colors {
  const accent = read(ACCENT_KEY);
  const secondary = read(SECONDARY_KEY);
  return { accent: isHexColor(accent) ? accent : DEFAULT_ACCENT, secondary: isHexColor(secondary) ? secondary : DEFAULT_SECONDARY };
}

/** Set the accent and secondary colors; every shade in styles.css derives from these two. */
export function applyColors({ accent, secondary }: Colors, persist = true) {
  const style = document.documentElement.style;
  style.setProperty("--accent", accent);
  style.setProperty("--secondary", secondary);
  if (!persist) return;
  write(ACCENT_KEY, accent === DEFAULT_ACCENT ? null : accent);
  write(SECONDARY_KEY, secondary === DEFAULT_SECONDARY ? null : secondary);
}

// Compact sidebar: a class on <html> so index.html can set it before first paint.
export function savedSidebarCollapsed(): boolean {
  return read(SIDEBAR_KEY) === "1";
}

export function applySidebarCollapsed(collapsed: boolean) {
  document.documentElement.classList.toggle("sidebar-collapsed", collapsed);
  write(SIDEBAR_KEY, collapsed ? "1" : null);
}
