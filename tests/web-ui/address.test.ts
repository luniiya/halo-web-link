import { describe, expect, test } from "bun:test";
import { toUrl } from "../../src/web-ui/address.ts";

describe("toUrl", () => {
  test("keeps http(s) URLs", () => {
    expect(toUrl(" https://example.com/a?b=1 ")).toBe("https://example.com/a?b=1");
    expect(toUrl("http://localhost:3000")).toBe("http://localhost:3000");
  });
  test("adds https:// to hosts", () => {
    expect(toUrl("example.com")).toBe("https://example.com");
    expect(toUrl("news.ycombinator.com/item?id=1")).toBe("https://news.ycombinator.com/item?id=1");
    expect(toUrl("localhost:8080/x")).toBe("https://localhost:8080/x");
    expect(toUrl("192.168.1.2:9377")).toBe("https://192.168.1.2:9377");
  });
  test("searches for anything else", () => {
    expect(toUrl("halo web link")).toBe("https://www.google.com/search?q=halo%20web%20link");
  });
  test("rejects empty input and other schemes", () => {
    expect(toUrl("   ")).toBeNull();
    expect(toUrl("file:///etc/passwd")).toBeNull();
    expect(toUrl("javascript:alert(1)")).toBeNull();
  });
});
