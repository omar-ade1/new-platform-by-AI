"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase/client";

type RequestState = "none" | "pending" | "rejected" | "approved";

export default function RequestEnrollmentButton({ courseId, initialState }: { courseId: string; initialState: RequestState }) {
  const [state, setState] = useState<RequestState>(initialState);
  const [loading, setLoading] = useState(false);

  async function handleRequest() {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      toast.error("لازم تسجل دخول الأول");
      setLoading(false);
      return;
    }

    const { error } = await supabase.from("enrollment_requests").insert({ user_id: user.id, course_id: courseId });

    if (error) {
      toast.error("حصل خطأ في إرسال الطلب، جرب تاني");
    } else {
      toast.success("اتبعت طلبك، هنراجعه ونرد عليك قريب");
      setState("pending");
    }
    setLoading(false);
  }

  if (state === "pending") {
    return (
      <span className="inline-flex items-center gap-2 text-sm font-bold text-yellow bg-yellow/15 rounded-full px-4 py-2">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 3" />
        </svg>
        طلبك قيد المراجعة، هنرد عليك قريب
      </span>
    );
  }

  return (
    <div className="space-y-3">
      {state === "rejected" && (
        <span className="inline-flex items-center gap-2 text-sm font-bold text-pink bg-pink/10 rounded-full px-4 py-2">
          للأسف طلبك السابق اتقفل، تقدر تبعت تاني
        </span>
      )}
      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }} className="inline-block">
        <button
          onClick={handleRequest}
          disabled={loading}
          className="inline-block px-6 py-3 rounded-full bg-primary text-white font-display font-bold hover:bg-pink transition-colors disabled:opacity-60"
        >
          {loading ? "جاري الإرسال..." : state === "rejected" ? "اطلب الانضمام تاني" : "اطلب الانضمام للدورة"}
        </button>
      </motion.div>
    </div>
  );
}
