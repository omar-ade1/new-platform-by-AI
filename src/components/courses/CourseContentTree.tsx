"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useMemo, useState } from "react";
import { formatDuration, formatFileSize, scoreTier } from "@/lib/format";
import { contentTypeAccent, contentTypeIcons, ClockIcon } from "./contentTypeIcons";

const sectionAccents = ["#FF5D8F", "#FFC93C", "#00C2A8"];

export type ContentItem = {
  id: string;
  item_group_id: string | null;
  type: "video" | "file" | "note" | "test";
  title: string;
  order_index: number;
  videos: { video_url: string; duration_seconds: number | null } | null;
  files: { file_url: string; file_type: string | null; file_size_kb: number | null } | null;
  notes: { body: string } | null;
  tests: { time_limit_minutes: number | null } | null;
};

export type ItemGroup = {
  id: string;
  color: string;
  order_index: number;
};

export type UnitNode = {
  id: string;
  title: string;
  order_index: number;
  item_groups: ItemGroup[];
  content_items: ContentItem[];
};

export type SectionNode = {
  id: string;
  title: string;
  description: string | null;
  order_index: number;
  units: UnitNode[];
};

function trackableCount(items: ContentItem[], seen: Set<string>) {
  return { done: items.filter((i) => seen.has(i.id)).length, total: items.length };
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function CheckBadge() {
  return (
    <span className="shrink-0 w-6 h-6 rounded-full bg-teal text-white flex items-center justify-center">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5">
        <path d="M20 6 9 17l-5-5" />
      </svg>
    </span>
  );
}

function ContentItemRow({
  item,
  color,
  courseId,
  done,
  score,
}: {
  item: ContentItem;
  color: string | null;
  courseId: string;
  done: boolean;
  score?: number | null;
}) {
  const [noteOpen, setNoteOpen] = useState(false);

  const icon = contentTypeIcons[item.type];
  const accent = contentTypeAccent[item.type];
  const tier = scoreTier(score ?? null);

  const meta =
    item.type === "video"
      ? formatDuration(item.videos?.duration_seconds ?? null)
      : item.type === "file"
        ? [item.files?.file_type, formatFileSize(item.files?.file_size_kb ?? null)].filter(Boolean).join(" · ")
        : item.type === "test" && item.tests?.time_limit_minutes
          ? `${item.tests.time_limit_minutes} دقيقة`
          : null;

  const row = (
    <div
      className={`flex items-center gap-3.5 px-4 py-4 rounded-2xl transition-all hover:-translate-y-0.5 hover:shadow-sm ${color ? "" : "hover:bg-primary/5"}`}
      style={color ? { background: `${color}33` } : undefined}
    >
      <span className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${accent.bg} ${accent.text}`}>{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-base truncate">{item.title}</p>
        {meta && (
          <p className="text-sm text-ink/40 flex items-center gap-1.5 mt-0.5">
            {item.type !== "file" && <ClockIcon />}
            {meta}
          </p>
        )}
      </div>
      {item.type === "test" && score !== null && score !== undefined && (
        <span className={`shrink-0 text-sm font-bold rounded-full px-3 py-1.5 ${tier.bg} ${tier.text}`}>{score}%</span>
      )}
      {done ? <CheckBadge /> : null}
    </div>
  );

  if ((item.type === "video" && item.videos) || (item.type === "file" && item.files) || (item.type === "test" && item.tests)) {
    return (
      <Link href={`/courses/${courseId}/content/${item.id}`} className="block">
        {row}
      </Link>
    );
  }

  if (item.type === "note" && item.notes) {
    return (
      <div>
        <button onClick={() => setNoteOpen((v) => !v)} className="w-full text-right">
          {row}
        </button>
        {noteOpen && <p className="px-4 pb-4 text-base text-ink/60 leading-relaxed whitespace-pre-wrap">{item.notes.body}</p>}
      </div>
    );
  }

  return row;
}

function UnitBlock({
  unit,
  courseId,
  seen,
  testScores,
}: {
  unit: UnitNode;
  courseId: string;
  seen: Set<string>;
  testScores: Record<string, number | null>;
}) {
  const [open, setOpen] = useState(false);
  const colorByGroup = new Map(unit.item_groups.map((g) => [g.id, g.color]));
  const { done, total } = trackableCount(unit.content_items, seen);

  return (
    <div className="border-t border-ink/10 first:border-t-0">
      <button onClick={() => setOpen((v) => !v)} className="w-full flex items-center justify-between gap-3 px-4 py-4 text-right">
        <span className="font-bold text-base">{unit.title}</span>
        <div className="flex items-center gap-2.5 shrink-0">
          {total > 0 && (
            <span className={`text-sm font-bold rounded-full px-3 py-1.5 ${done === total ? "bg-teal/15 text-teal" : "bg-ink/5 text-ink/40"}`}>
              {done}/{total}
            </span>
          )}
          <ChevronIcon open={open} />
        </div>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="pb-2 space-y-0.5">
              {unit.content_items.length === 0 ? (
                <p className="px-4 pb-3 text-sm text-ink/40">لسه مفيش محتوى في الوحدة دي.</p>
              ) : (
                unit.content_items.map((item) => (
                  <ContentItemRow
                    key={item.id}
                    item={item}
                    color={item.item_group_id ? (colorByGroup.get(item.item_group_id) ?? null) : null}
                    courseId={courseId}
                    done={seen.has(item.id)}
                    score={testScores[item.id]}
                  />
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SectionBlock({
  section,
  courseId,
  seen,
  testScores,
  index,
}: {
  section: SectionNode;
  courseId: string;
  seen: Set<string>;
  testScores: Record<string, number | null>;
  index: number;
}) {
  const [open, setOpen] = useState(true);
  const allItems = section.units.flatMap((u) => u.content_items);
  const { done, total } = trackableCount(allItems, seen);
  const sectionPercent = total > 0 ? Math.round((done / total) * 100) : 0;

  const accent = sectionAccents[index % sectionAccents.length];

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: index * 0.07, ease: [0.22, 1, 0.36, 1] }}
      className="bg-surface rounded-[1.75rem] border-2 border-ink/10 overflow-hidden"
    >
      <div className="px-6 pt-6 pb-5" style={{ background: `linear-gradient(135deg, ${accent}1F, ${accent}05)` }}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <button onClick={() => setOpen((v) => !v)} className="w-full sm:w-auto sm:flex-1 min-w-0 flex items-start gap-4 text-right">
            <span
              className="shrink-0 w-11 h-11 rounded-2xl flex items-center justify-center font-display font-black text-lg"
              style={{ background: `${accent}26`, color: accent }}
            >
              {String(index + 1).padStart(2, "0")}
            </span>
            <span className="min-w-0 pt-0.5">
              <p className="font-display font-black text-primary text-xl md:text-2xl">{section.title}</p>
              {section.description && <p className="text-base text-ink/50 mt-1">{section.description}</p>}
            </span>
          </button>
          <Link
            href={`/courses/${courseId}/review?section=${section.id}&title=${encodeURIComponent(section.title)}`}
            className="shrink-0 text-sm font-bold text-primary bg-primary/10 hover:bg-primary hover:text-white rounded-full px-4 py-2.5 transition-colors"
          >
            امتحن أسئلتك الغلط
          </Link>
        </div>

        <button onClick={() => setOpen((v) => !v)} className="w-full flex items-center gap-3 mt-5">
          {total > 0 && (
            <>
              <div className="flex-1 h-2.5 rounded-full bg-ink/10 overflow-hidden">
                <div className="h-full rounded-full bg-teal transition-all" style={{ width: `${sectionPercent}%` }} />
              </div>
              <span className="text-sm text-ink/45 font-bold shrink-0">
                {done}/{total}
              </span>
            </>
          )}
          <ChevronIcon open={open} />
        </button>
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            {section.units.length === 0 ? (
              <p className="px-6 pb-5 text-sm text-ink/40 border-t border-ink/10 pt-4">لسه مفيش وحدات في القسم ده.</p>
            ) : (
              section.units.map((unit) => <UnitBlock key={unit.id} unit={unit} courseId={courseId} seen={seen} testScores={testScores} />)
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function CourseContentTree({
  courseId,
  sections,
  seenIds,
  testScores = {},
}: {
  courseId: string;
  sections: SectionNode[];
  seenIds: string[];
  testScores?: Record<string, number | null>;
}) {
  const seen = useMemo(() => new Set(seenIds), [seenIds]);

  return (
    <div className="space-y-5">
      {sections.map((section, i) => (
        <SectionBlock key={section.id} section={section} courseId={courseId} seen={seen} testScores={testScores} index={i} />
      ))}
    </div>
  );
}
