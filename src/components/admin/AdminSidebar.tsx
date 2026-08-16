"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

function OverviewIcon() {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="3" width="8" height="8" rx="2" />
      <rect x="13" y="3" width="8" height="8" rx="2" />
      <rect x="3" y="13" width="8" height="8" rx="2" />
      <rect x="13" y="13" width="8" height="8" rx="2" />
    </svg>
  );
}

function CoursesIcon() {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 5.5c0-1 .8-1.5 2-1.5h6v16H6c-1.2 0-2 .5-2 1.5V5.5Z" />
      <path d="M20 5.5c0-1-.8-1.5-2-1.5h-6v16h6c1.2 0 2 .5 2 1.5V5.5Z" />
    </svg>
  );
}

function StudentsIcon() {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="9" cy="8" r="3.5" />
      <path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5" />
      <circle cx="17.5" cy="9" r="2.5" />
      <path d="M15.5 14.2c2.7.4 4.5 2.3 4.5 5.3" />
    </svg>
  );
}

function RequestsIcon() {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  );
}

function QuestionsIcon() {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.8.4-1.3 1-1.3 1.9" />
      <path d="M12 16.5h.01" />
    </svg>
  );
}

function ReportsIcon() {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
      <path d="M9 13.5v3M12.5 11v5.5M16 8.5v8" />
    </svg>
  );
}

function ToolsIcon() {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M14.7 6.3a4 4 0 0 1-5.4 5.4L4 17l3 3 5.3-5.3a4 4 0 0 1 5.4-5.4l-2.5 2.5-2-2 2.5-2.5Z" />
    </svg>
  );
}

const navItems = [
  { href: "/admin", label: "نظرة عامة", exact: true, Icon: OverviewIcon },
  { href: "/admin/courses", label: "الدورات", Icon: CoursesIcon },
  { href: "/admin/students", label: "الطلاب", Icon: StudentsIcon },
  { href: "/admin/requests", label: "طلبات الانضمام", Icon: RequestsIcon, countKey: "pendingRequests" as const },
  { href: "/admin/questions", label: "بنك الأسئلة", Icon: QuestionsIcon },
  { href: "/admin/reports", label: "التقارير", Icon: ReportsIcon },
  { href: "/admin/tools", label: "أدوات عامة", Icon: ToolsIcon },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const [pendingRequests, setPendingRequests] = useState(0);

  useEffect(() => {
    supabase
      .from("enrollment_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending")
      .then(({ count }) => setPendingRequests(count ?? 0));
  }, []);

  const counts = { pendingRequests };

  return (
    <aside className="print:hidden border-l border-ink/10 bg-surface p-4">
      <p className="font-display font-bold text-primary text-base tracking-wide mb-6 px-2">لوحة التحكم</p>
      <nav className="space-y-1">
        {navItems.map((item) => {
          const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          const count = item.countKey ? counts[item.countKey] : 0;
          const Icon = item.Icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3.5 py-3 font-bold text-base transition-colors ${
                isActive ? "bg-primary text-white" : "text-ink/60 hover:bg-primary/10 hover:text-ink"
              }`}
            >
              <Icon />
              <span className="flex-1">{item.label}</span>
              {count > 0 && (
                <span
                  className={`text-xs font-black rounded-full px-2.5 py-1 shrink-0 ${isActive ? "bg-white/20 text-white" : "bg-pink text-white"}`}
                >
                  {count}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
