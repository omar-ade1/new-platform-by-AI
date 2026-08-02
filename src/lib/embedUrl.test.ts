import { describe, expect, it } from "vitest";
import { getEmbedUrl } from "./embedUrl";

describe("getEmbedUrl", () => {
  it("converts a standard youtube watch URL to an embed URL", () => {
    expect(getEmbedUrl("https://www.youtube.com/watch?v=abc123")).toBe("https://www.youtube.com/embed/abc123");
  });

  it("converts a youtube shorts URL to an embed URL", () => {
    expect(getEmbedUrl("https://www.youtube.com/shorts/abc123")).toBe("https://www.youtube.com/embed/abc123");
  });

  it("converts a youtu.be short link to an embed URL", () => {
    expect(getEmbedUrl("https://youtu.be/abc123")).toBe("https://www.youtube.com/embed/abc123");
  });

  it("converts a vimeo URL to a vimeo player URL", () => {
    expect(getEmbedUrl("https://vimeo.com/123456789")).toBe("https://player.vimeo.com/video/123456789");
  });

  it("strips www. and m. prefixes before matching the host", () => {
    expect(getEmbedUrl("https://m.youtube.com/watch?v=abc123")).toBe("https://www.youtube.com/embed/abc123");
  });

  it("returns the url unchanged for an unrecognized host", () => {
    expect(getEmbedUrl("https://example.com/video/123")).toBe("https://example.com/video/123");
  });

  it("returns the url unchanged for an invalid URL string", () => {
    expect(getEmbedUrl("not a url")).toBe("not a url");
  });

  it("returns the youtube url unchanged when there's no video id to extract", () => {
    expect(getEmbedUrl("https://www.youtube.com/channel/xyz")).toBe("https://www.youtube.com/channel/xyz");
  });
});
