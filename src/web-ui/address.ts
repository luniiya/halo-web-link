// What the user typed in an address bar -> a URL the core accepts (http/https only).
// "example.com" gets https://, anything that doesn't look like a host is a web search.
export function toUrl(input: string): string | null {
  const text = input.trim();
  if (!text) return null;
  if (/^https?:\/\//i.test(text)) return text;
  if (/^[a-z][a-z\d+.-]*:/i.test(text) && !/^[^\s/:]+:\d+(\/|$)/.test(text)) return null; // other schemes (file:, about:, ...)
  const looksLikeHost = !/\s/.test(text) && (/^localhost(:\d+)?(\/|$)/i.test(text) || /^[^\s/]+\.[a-z]{2,}(:\d+)?(\/|$)/i.test(text) || /^\d{1,3}(\.\d{1,3}){3}(:\d+)?(\/|$)/.test(text));
  if (looksLikeHost) return `https://${text}`;
  return `https://www.google.com/search?q=${encodeURIComponent(text)}`;
}
