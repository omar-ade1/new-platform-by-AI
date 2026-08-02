export const DURATION_OPTIONS = [
  { value: "none", label: "بدون مؤقت (دايم)", days: null as number | null },
  { value: "1w", label: "أسبوع", days: 7 },
  { value: "2w", label: "أسبوعين", days: 14 },
  { value: "1m", label: "شهر", days: 30 },
  { value: "3m", label: "3 شهور", days: 90 },
  { value: "6m", label: "6 شهور", days: 180 },
  { value: "1y", label: "سنة", days: 365 },
  { value: "custom", label: "مدة مخصصة (أيام / ساعات / دقايق)", days: null as number | null },
];

export type DurationValue = { preset: string; days: number; hours: number; minutes: number };

export const defaultDurationValue: DurationValue = { preset: "none", days: 0, hours: 0, minutes: 30 };

export function computeExpiresAt(value: DurationValue): string | null {
  if (value.preset === "custom") {
    const totalMinutes = value.days * 24 * 60 + value.hours * 60 + value.minutes;
    if (totalMinutes <= 0) return null;
    return new Date(Date.now() + totalMinutes * 60 * 1000).toISOString();
  }

  const option = DURATION_OPTIONS.find((o) => o.value === value.preset);
  if (!option || option.days === null) return null;
  return new Date(Date.now() + option.days * 24 * 60 * 60 * 1000).toISOString();
}

export function formatExpiryStatus(expiresAt: string | null): { label: string; expired: boolean } | null {
  if (!expiresAt) return null;

  const remainingMs = new Date(expiresAt).getTime() - Date.now();
  if (remainingMs <= 0) return { label: "منتهي", expired: true };

  const totalMinutes = Math.ceil(remainingMs / (60 * 1000));
  if (totalMinutes < 60) return { label: totalMinutes === 1 ? "متبقي دقيقة" : `متبقي ${totalMinutes} دقيقة`, expired: false };

  const totalHours = Math.ceil(remainingMs / (60 * 60 * 1000));
  if (totalHours < 24) return { label: totalHours === 1 ? "متبقي ساعة" : `متبقي ${totalHours} ساعة`, expired: false };

  const days = Math.ceil(remainingMs / (24 * 60 * 60 * 1000));
  return { label: days === 1 ? "متبقي يوم واحد" : `متبقي ${days} يوم`, expired: false };
}
