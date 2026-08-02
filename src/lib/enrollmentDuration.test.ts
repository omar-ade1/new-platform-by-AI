import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { computeExpiresAt, formatExpiryStatus } from "./enrollmentDuration";

const NOW = new Date("2026-01-01T00:00:00.000Z");

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("computeExpiresAt", () => {
  it("returns null for the 'none' preset (permanent enrollment)", () => {
    expect(computeExpiresAt({ preset: "none", days: 0, hours: 0, minutes: 0 })).toBeNull();
  });

  it("computes a date N days from now for preset options", () => {
    const result = computeExpiresAt({ preset: "1w", days: 0, hours: 0, minutes: 0 });
    expect(result).toBe(new Date(NOW.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString());
  });

  it("computes a custom duration from days/hours/minutes", () => {
    const result = computeExpiresAt({ preset: "custom", days: 1, hours: 2, minutes: 30 });
    const expectedMinutes = 1 * 24 * 60 + 2 * 60 + 30;
    expect(result).toBe(new Date(NOW.getTime() + expectedMinutes * 60 * 1000).toISOString());
  });

  it("returns null for a custom duration that totals zero", () => {
    expect(computeExpiresAt({ preset: "custom", days: 0, hours: 0, minutes: 0 })).toBeNull();
  });

  it("returns null for an unrecognized preset", () => {
    expect(computeExpiresAt({ preset: "not-a-real-preset", days: 0, hours: 0, minutes: 0 })).toBeNull();
  });
});

describe("formatExpiryStatus", () => {
  it("returns null when there's no expiry date (permanent enrollment)", () => {
    expect(formatExpiryStatus(null)).toBeNull();
  });

  it("marks a past date as expired", () => {
    const past = new Date(NOW.getTime() - 1000).toISOString();
    expect(formatExpiryStatus(past)).toEqual({ label: "منتهي", expired: true });
  });

  it("reports minutes remaining when under an hour away", () => {
    const soon = new Date(NOW.getTime() + 5 * 60 * 1000).toISOString();
    const result = formatExpiryStatus(soon);
    expect(result?.expired).toBe(false);
    expect(result?.label).toBe("متبقي 5 دقيقة");
  });

  it("uses singular phrasing for exactly one minute remaining", () => {
    const oneMinute = new Date(NOW.getTime() + 60 * 1000).toISOString();
    expect(formatExpiryStatus(oneMinute)?.label).toBe("متبقي دقيقة");
  });

  it("reports hours remaining when under a day away", () => {
    const hoursAway = new Date(NOW.getTime() + 5 * 60 * 60 * 1000).toISOString();
    expect(formatExpiryStatus(hoursAway)?.label).toBe("متبقي 5 ساعة");
  });

  it("reports days remaining when more than a day away", () => {
    const daysAway = new Date(NOW.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString();
    expect(formatExpiryStatus(daysAway)?.label).toBe("متبقي 3 يوم");
  });
});
