export function VideoIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="2" y="5" width="15" height="14" rx="2" />
      <path d="m17 10 5-3v10l-5-3" />
    </svg>
  );
}

export function FileIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
      <path d="M14 2v6h6" />
    </svg>
  );
}

export function NoteIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

export function TestIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M9 8h6M9 12h6M9 16h4" />
    </svg>
  );
}

export function ClockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" />
    </svg>
  );
}

export const contentTypeIcons = {
  video: <VideoIcon />,
  file: <FileIcon />,
  note: <NoteIcon />,
  test: <TestIcon />,
};

export const contentTypeAccent = {
  video: { text: "text-pink", bg: "bg-pink/10", strip: "bg-pink" },
  file: { text: "text-yellow", bg: "bg-yellow/15", strip: "bg-yellow" },
  note: { text: "text-primary", bg: "bg-primary/10", strip: "bg-primary" },
  test: { text: "text-teal", bg: "bg-teal/10", strip: "bg-teal" },
} as const;

export const contentTypeLabels = {
  video: "فيديو",
  file: "ملف",
  note: "ملاحظة",
  test: "اختبار",
} as const;
