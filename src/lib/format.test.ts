import { describe, expect, it } from "vitest";
import { formatDuration, formatFileSize, scoreTier } from "./format";

describe("formatDuration", () => {
  it("returns null for null/zero/undefined", () => {
    expect(formatDuration(null)).toBeNull();
    expect(formatDuration(0)).toBeNull();
  });

  it("formats seconds under a minute with zero-padded seconds", () => {
    expect(formatDuration(5)).toBe("0:05");
  });

  it("formats minutes and seconds", () => {
    expect(formatDuration(65)).toBe("1:05");
  });

  it("does not roll minutes over into hours", () => {
    expect(formatDuration(3661)).toBe("61:01");
  });
});

describe("formatFileSize", () => {
  it("returns null for null/zero/undefined", () => {
    expect(formatFileSize(null)).toBeNull();
    expect(formatFileSize(0)).toBeNull();
  });

  it("formats sizes under 1024kb as KB", () => {
    expect(formatFileSize(500)).toBe("500 KB");
  });

  it("formats sizes at or above 1024kb as MB with one decimal", () => {
    expect(formatFileSize(1024)).toBe("1.0 MB");
    expect(formatFileSize(2048)).toBe("2.0 MB");
    expect(formatFileSize(1536)).toBe("1.5 MB");
  });
});

describe("scoreTier", () => {
  it("returns a neutral tier for null", () => {
    expect(scoreTier(null)).toEqual({ text: "text-ink/40", bg: "bg-ink/5", bar: "bg-ink/20" });
  });

  it("treats 80 and above as the top (teal) tier", () => {
    expect(scoreTier(80).text).toBe("text-teal");
    expect(scoreTier(100).text).toBe("text-teal");
  });

  it("treats 79 as the middle (yellow) tier, not the top tier", () => {
    expect(scoreTier(79).text).toBe("text-yellow");
  });

  it("treats 50 and above (but under 80) as the middle (yellow) tier", () => {
    expect(scoreTier(50).text).toBe("text-yellow");
  });

  it("treats under 50 as the bottom (pink) tier", () => {
    expect(scoreTier(49).text).toBe("text-pink");
    expect(scoreTier(0).text).toBe("text-pink");
  });
});
