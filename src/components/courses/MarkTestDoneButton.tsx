"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase/client";
import { trackContentSeen } from "@/lib/supabase/track-progress";

export default function MarkTestDoneButton({
  userId,
  contentItemId,
  initialDone,
  qualified,
}: {
  userId: string;
  contentItemId: string;
  initialDone: boolean;
  qualified: boolean;
}) {
  const [done, setDone] = useState(initialDone);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  async function handleClick() {
    if (!qualified) {
      toast.error("لازم تحل الاختبار وتجيب 80% على الأقل في محاولة واحدة على الأقل الأول عشان تقدر تعلّمها.");
      return;
    }
    setSaving(true);
    await trackContentSeen(supabase, userId, contentItemId);
    setSaving(false);
    setDone(true);
    toast.success("اتسجل إنك امتحنتها قبل كده");
    router.refresh();
  }

  if (done) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-bold text-teal bg-teal/10 rounded-full px-3 py-1">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
          <path d="M20 6 9 17l-5-5" />
        </svg>
        امتحنتها قبل كده
      </span>
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={saving}
      className="inline-flex items-center gap-1.5 text-sm font-bold text-primary bg-primary/10 hover:bg-primary hover:text-white rounded-full px-4 py-2 transition-colors disabled:opacity-60"
    >
      {saving ? "جاري التسجيل..." : "علّمها إني امتحنتها قبل كده"}
    </button>
  );
}
