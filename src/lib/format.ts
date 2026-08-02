export function formatDuration(seconds: number | null) {
  if (!seconds) return null;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function formatFileSize(kb: number | null) {
  if (!kb) return null;
  return kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB`;
}

export function scoreTier(pct: number | null) {
  if (pct === null) return { text: "text-ink/40", bg: "bg-ink/5", bar: "bg-ink/20" };
  if (pct >= 80) return { text: "text-teal", bg: "bg-teal/10", bar: "bg-teal" };
  if (pct >= 50) return { text: "text-yellow", bg: "bg-yellow/15", bar: "bg-yellow" };
  return { text: "text-pink", bg: "bg-pink/10", bar: "bg-pink" };
}
