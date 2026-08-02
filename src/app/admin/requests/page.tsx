// app/admin/requests/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import DurationPicker from "@/components/admin/DurationPicker";
import { computeExpiresAt, defaultDurationValue } from "@/lib/enrollmentDuration";
import { supabase } from "@/lib/supabase/client";

type RequestStatus = "pending" | "approved" | "rejected";

type RequestRow = {
  id: string;
  user_id: string;
  course_id: string;
  status: RequestStatus;
  created_at: string;
  decided_at: string | null;
  courses: { title: string } | null;
};

type Profile = {
  id: string;
  full_name: string | null;
  phone: string | null;
};

const statusBadge: Record<RequestStatus, { label: string; className: string }> = {
  pending: { label: "قيد الانتظار", className: "bg-yellow/15 text-yellow" },
  approved: { label: "مقبول", className: "bg-teal/15 text-teal" },
  rejected: { label: "مرفوض", className: "bg-red-100 text-red-500" },
};

type ConfirmAction = { type: "approve"; request: RequestRow } | { type: "reject"; request: RequestRow } | { type: "approveAll" };

export default function AdminRequestsPage() {
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [profiles, setProfiles] = useState<Map<string, Profile>>(new Map());
  const [loading, setLoading] = useState(true);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [bulkApproving, setBulkApproving] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [approveDuration, setApproveDuration] = useState(defaultDurationValue);

  async function fetchAll() {
    setLoading(true);

    const { data: requestsData, error } = await supabase
      .from("enrollment_requests")
      .select("id, user_id, course_id, status, created_at, decided_at, courses(title)")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("حصل خطأ في تحميل الطلبات");
      setLoading(false);
      return;
    }

    const rows = (requestsData as unknown as RequestRow[]) ?? [];
    const userIds = [...new Set(rows.map((r) => r.user_id))];

    let profilesMap = new Map<string, Profile>();
    if (userIds.length > 0) {
      const { data: profilesData } = await supabase.from("profiles").select("id, full_name, phone").in("id", userIds);
      profilesMap = new Map((profilesData ?? []).map((p) => [p.id, p]));
    }

    setRequests(rows);
    setProfiles(profilesMap);
    setLoading(false);
  }

  useEffect(() => {
    fetchAll();
  }, []);

  const pendingRequests = useMemo(() => requests.filter((r) => r.status === "pending"), [requests]);
  const historyRequests = useMemo(() => requests.filter((r) => r.status !== "pending"), [requests]);

  function markProcessing(id: string, on: boolean) {
    setProcessingIds((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  async function ensureEnrolled(userId: string, courseId: string, expiresAt: string | null): Promise<boolean> {
    const { data: existing } = await supabase.from("enrollments").select("id").eq("user_id", userId).eq("course_id", courseId).maybeSingle();

    if (existing) {
      // موجود بالفعل (غالبًا اشتراك سابق منتهي) — جدده بدل ما نسيبه زي ما هو
      const { error } = await supabase.from("enrollments").update({ expires_at: expiresAt }).eq("id", existing.id);
      return !error;
    }

    const { error } = await supabase.from("enrollments").insert({ user_id: userId, course_id: courseId, expires_at: expiresAt });
    return !error;
  }

  async function handleApprove(request: RequestRow, expiresAt: string | null) {
    markProcessing(request.id, true);

    const enrolled = await ensureEnrolled(request.user_id, request.course_id, expiresAt);
    if (!enrolled) {
      toast.error("حصل خطأ في تسجيل الطالب في الدورة");
      markProcessing(request.id, false);
      return;
    }

    const { error } = await supabase
      .from("enrollment_requests")
      .update({ status: "approved", decided_at: new Date().toISOString() })
      .eq("id", request.id);

    if (error) {
      toast.error("اتسجل الطالب بس حصل خطأ في تحديث حالة الطلب");
    } else {
      toast.success("تم قبول الطلب وتسجيل الطالب في الدورة");
      setRequests((prev) =>
        prev.map((r) => (r.id === request.id ? { ...r, status: "approved", decided_at: new Date().toISOString() } : r))
      );
    }
    markProcessing(request.id, false);
  }

  async function handleReject(request: RequestRow) {
    markProcessing(request.id, true);

    const { error } = await supabase
      .from("enrollment_requests")
      .update({ status: "rejected", decided_at: new Date().toISOString() })
      .eq("id", request.id);

    if (error) {
      toast.error("حصل خطأ في رفض الطلب");
    } else {
      toast.success("تم رفض الطلب");
      setRequests((prev) =>
        prev.map((r) => (r.id === request.id ? { ...r, status: "rejected", decided_at: new Date().toISOString() } : r))
      );
    }
    markProcessing(request.id, false);
  }

  async function handleApproveAll(expiresAt: string | null) {
    if (pendingRequests.length === 0) return;
    setBulkApproving(true);

    const userIds = [...new Set(pendingRequests.map((r) => r.user_id))];
    const { data: existingEnrollments, error: fetchError } = await supabase
      .from("enrollments")
      .select("id, user_id, course_id")
      .in("user_id", userIds);

    if (fetchError) {
      toast.error("حصل خطأ، جرب تاني");
      setBulkApproving(false);
      return;
    }

    const existingByPair = new Map((existingEnrollments ?? []).map((e) => [`${e.user_id}:${e.course_id}`, e.id]));
    const toInsert = pendingRequests
      .filter((r) => !existingByPair.has(`${r.user_id}:${r.course_id}`))
      .map((r) => ({ user_id: r.user_id, course_id: r.course_id, expires_at: expiresAt }));

    // اشتراكات سابقة (غالبًا منتهية) لنفس الطلاب والدورات دي — نجددها بدل ما نسيبها زي ما هي
    const toRenewIds = pendingRequests
      .map((r) => existingByPair.get(`${r.user_id}:${r.course_id}`))
      .filter((id): id is string => !!id);

    if (toInsert.length > 0) {
      const { error: insertError } = await supabase.from("enrollments").insert(toInsert);
      if (insertError) {
        toast.error("حصل خطأ في تسجيل الطلاب");
        setBulkApproving(false);
        return;
      }
    }

    if (toRenewIds.length > 0) {
      const { error: renewError } = await supabase.from("enrollments").update({ expires_at: expiresAt }).in("id", toRenewIds);
      if (renewError) {
        toast.error("حصل خطأ في تجديد بعض الاشتراكات");
        setBulkApproving(false);
        return;
      }
    }

    const ids = pendingRequests.map((r) => r.id);
    const decidedAt = new Date().toISOString();
    const { error: updateError } = await supabase
      .from("enrollment_requests")
      .update({ status: "approved", decided_at: decidedAt })
      .in("id", ids);

    if (updateError) {
      toast.error("اتسجل الطلاب بس حصل خطأ في تحديث حالة الطلبات");
    } else {
      toast.success(`تم قبول ${ids.length} طلب`);
      setRequests((prev) => prev.map((r) => (ids.includes(r.id) ? { ...r, status: "approved", decided_at: decidedAt } : r)));
    }
    setBulkApproving(false);
  }

  async function handleConfirm() {
    if (!confirmAction) return;

    if (confirmAction.type === "approve") {
      await handleApprove(confirmAction.request, computeExpiresAt(approveDuration));
    } else if (confirmAction.type === "reject") {
      await handleReject(confirmAction.request);
    } else {
      await handleApproveAll(computeExpiresAt(approveDuration));
    }
    setConfirmAction(null);
  }

  const confirmBusy =
    confirmAction?.type === "approveAll" ? bulkApproving : confirmAction ? processingIds.has(confirmAction.request.id) : false;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display font-black text-3xl text-primary mb-2">طلبات الانضمام</h1>
          <p className="text-ink/60 text-lg">راجع طلبات الطلاب اللي عايزين ينضموا للدورات</p>
        </div>
        <button
          onClick={() => {
            setApproveDuration(defaultDurationValue);
            setConfirmAction({ type: "approveAll" });
          }}
          disabled={pendingRequests.length === 0 || bulkApproving}
          className="shrink-0 px-6 py-3.5 rounded-full bg-primary text-white font-display font-bold text-base hover:bg-pink transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {bulkApproving ? "جاري القبول..." : `قبول الكل${pendingRequests.length > 0 ? ` (${pendingRequests.length})` : ""}`}
        </button>
      </div>

      {loading ? (
        <p className="text-ink/40 text-lg">جاري التحميل...</p>
      ) : pendingRequests.length === 0 ? (
        <p className="text-ink/40 text-lg mb-8">مفيش طلبات قيد الانتظار دلوقتي.</p>
      ) : (
        <div className="space-y-4 mb-8">
          {pendingRequests.map((request) => {
            const profile = profiles.get(request.user_id);
            const isProcessing = processingIds.has(request.id);
            return (
              <div
                key={request.id}
                className="rounded-2xl border-2 border-ink/10 bg-surface p-6 flex flex-col lg:flex-row lg:items-center gap-5"
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center font-display font-bold text-primary text-xl shrink-0">
                    {profile?.full_name?.[0] || "ط"}
                  </div>
                  <div className="min-w-0">
                    <p className="font-display font-bold text-lg break-words">{profile?.full_name || "بدون اسم"}</p>
                    <p className="text-ink/50 text-base" dir="ltr">
                      {profile?.phone || "—"}
                    </p>
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-ink/40 text-sm mb-1">عايز ينضم لـ</p>
                  <p className="font-bold text-lg break-words">{request.courses?.title || "دورة محذوفة"}</p>
                </div>

                <p className="text-ink/40 text-base shrink-0">{new Date(request.created_at).toLocaleDateString("ar-EG")}</p>

                <div className="flex items-center gap-2.5 shrink-0">
                  <button
                    onClick={() => {
                      setApproveDuration(defaultDurationValue);
                      setConfirmAction({ type: "approve", request });
                    }}
                    disabled={isProcessing || bulkApproving}
                    className="px-5 py-3 rounded-full bg-teal text-white font-display font-bold text-base hover:opacity-90 transition-opacity disabled:opacity-40"
                  >
                    قبول
                  </button>
                  <button
                    onClick={() => setConfirmAction({ type: "reject", request })}
                    disabled={isProcessing || bulkApproving}
                    className="px-5 py-3 rounded-full border-2 border-red-200 text-red-500 font-bold text-base hover:bg-red-50 transition-colors disabled:opacity-40"
                  >
                    رفض
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && historyRequests.length > 0 && (
        <details className="rounded-2xl border-2 border-ink/10 bg-surface p-6">
          <summary className="font-display font-bold text-lg cursor-pointer select-none">السجل ({historyRequests.length})</summary>
          <div className="mt-5 divide-y divide-ink/10">
            {historyRequests.map((request) => {
              const profile = profiles.get(request.user_id);
              const badge = statusBadge[request.status];
              return (
                <div key={request.id} className="py-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                  <p className="font-bold text-base sm:w-48 break-words">{profile?.full_name || "بدون اسم"}</p>
                  <p className="text-ink/60 text-base flex-1 break-words">{request.courses?.title || "دورة محذوفة"}</p>
                  <span className={`inline-block w-fit text-sm font-bold px-3 py-1.5 rounded-full ${badge.className}`}>{badge.label}</span>
                  <p className="text-ink/40 text-sm shrink-0">
                    {request.decided_at ? new Date(request.decided_at).toLocaleDateString("ar-EG") : "—"}
                  </p>
                </div>
              );
            })}
          </div>
        </details>
      )}

      {/* ===== Modal تأكيد قبول/رفض/قبول الكل ===== */}
      <AnimatePresence>
        {confirmAction && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-ink/50 flex items-center justify-center p-4 z-50"
            onClick={() => !confirmBusy && setConfirmAction(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-surface rounded-2xl p-8 w-full max-w-lg"
            >
              {(() => {
                if (confirmAction.type === "approveAll") {
                  return (
                    <>
                      <div className="flex items-center gap-4 mb-5">
                        <div className="w-14 h-14 rounded-2xl bg-teal/10 text-teal flex items-center justify-center shrink-0">
                          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                            <path d="M20 6 9 17l-5-5" />
                          </svg>
                        </div>
                        <h2 className="font-display font-black text-xl text-primary">تأكيد قبول كل الطلبات</h2>
                      </div>
                      <p className="text-ink/60 text-base mb-7">
                        هل تريد قبول كل الطلبات المعلقة وعددها{" "}
                        <span className="font-bold text-ink">{pendingRequests.length}</span>؟ هيتم تسجيل كل الطلاب دول في الدورات
                        اللي طلبوها على طول.
                      </p>
                    </>
                  );
                }

                const profile = profiles.get(confirmAction.request.user_id);
                const studentName = profile?.full_name || "بدون اسم";
                const courseTitle = confirmAction.request.courses?.title || "دورة محذوفة";

                if (confirmAction.type === "approve") {
                  return (
                    <>
                      <div className="flex items-center gap-4 mb-5">
                        <div className="w-14 h-14 rounded-2xl bg-teal/10 text-teal flex items-center justify-center shrink-0">
                          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                            <path d="M20 6 9 17l-5-5" />
                          </svg>
                        </div>
                        <h2 className="font-display font-black text-xl text-primary">تأكيد قبول الطلب</h2>
                      </div>
                      <p className="text-ink/60 text-base mb-7">
                        هل تريد قبول طلب <span className="font-bold text-ink">{studentName}</span> للانضمام لدورة{" "}
                        <span className="font-bold text-ink">&quot;{courseTitle}&quot;</span>؟
                      </p>
                    </>
                  );
                }

                return (
                  <>
                    <div className="flex items-center gap-4 mb-5">
                      <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center shrink-0">
                        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                          <path d="M18 6 6 18M6 6l12 12" />
                        </svg>
                      </div>
                      <h2 className="font-display font-black text-xl text-primary">تأكيد رفض الطلب</h2>
                    </div>
                    <p className="text-ink/60 text-base mb-7">
                      هل تريد رفض طلب <span className="font-bold text-ink">{studentName}</span> للانضمام لدورة{" "}
                      <span className="font-bold text-ink">&quot;{courseTitle}&quot;</span>؟
                    </p>
                  </>
                );
              })()}

              {confirmAction.type !== "reject" && (
                <div className="mb-7">
                  <DurationPicker value={approveDuration} onChange={setApproveDuration} />
                </div>
              )}

              <div className="flex items-center gap-3">
                <button
                  onClick={handleConfirm}
                  disabled={confirmBusy}
                  className={`flex-1 py-3.5 rounded-full text-white font-display font-bold text-base transition-colors disabled:opacity-60 ${
                    confirmAction.type === "reject" ? "bg-red-500 hover:bg-red-600" : "bg-teal hover:opacity-90"
                  }`}
                >
                  {confirmBusy
                    ? "جاري التنفيذ..."
                    : confirmAction.type === "approveAll"
                      ? "قبول الكل"
                      : confirmAction.type === "approve"
                        ? "قبول الطلب"
                        : "رفض الطلب"}
                </button>
                <button
                  onClick={() => setConfirmAction(null)}
                  disabled={confirmBusy}
                  className="px-7 py-3.5 rounded-full border-2 border-ink/10 font-bold text-base hover:bg-ink/5 transition-colors disabled:opacity-60"
                >
                  تراجع
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
