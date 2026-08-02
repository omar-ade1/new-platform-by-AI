// app/access-denied/page.tsx
"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Suspense } from "react";

type Reason = "not-authenticated" | "not-admin" | "not-enrolled" | "unknown";

const messages: Record<Reason, { title: string; body: string; actionLabel: string; actionHref: string }> = {
  "not-authenticated": {
    title: "لازم تسجل دخول الأول",
    body: "الصفحة اللي حاولت تدخلها محتاجة تسجيل دخول.",
    actionLabel: "تسجيل الدخول",
    actionHref: "/login",
  },
  "not-admin": {
    title: "مفيش صلاحية",
    body: "الصفحة دي مخصصة للأدمن بس.",
    actionLabel: "الرجوع للرئيسية",
    actionHref: "/",
  },
  "not-enrolled": {
    title: "مش مشترك في الدورة دي",
    body: "لازم تكون مسجل في الدورة عشان تقدر تشوف المحتوى.",
    actionLabel: "دوراتي",
    actionHref: "/account",
  },
  unknown: {
    title: "حصل خطأ",
    body: "مش قادرين نوصلك للصفحة دي دلوقتي.",
    actionLabel: "الرجوع للرئيسية",
    actionHref: "/",
  },
};

export default function AccessDeniedPage() {
  return (
    <Suspense>
      <AccessDeniedContent />
    </Suspense>
  );
}

function AccessDeniedContent() {
  const searchParams = useSearchParams();
  const reason = (searchParams.get("reason") as Reason) || "unknown";
  const content = messages[reason] || messages.unknown;

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4">
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="text-center max-w-sm">
        <div className="w-16 h-16 rounded-2xl bg-pink/10 text-pink flex items-center justify-center mx-auto mb-6">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8v5M12 16h.01" />
          </svg>
        </div>
        <h1 className="font-display font-black text-2xl text-primary mb-2">{content.title}</h1>
        <p className="text-ink/60 mb-8">{content.body}</p>
        <Link
          href={content.actionHref}
          className="inline-block px-6 py-3 rounded-full bg-primary text-white font-display font-bold hover:bg-pink transition-colors"
        >
          {content.actionLabel}
        </Link>
      </motion.div>
    </div>
  );
}
