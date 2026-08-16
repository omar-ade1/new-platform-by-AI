// app/admin/students/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import DurationPicker from "@/components/admin/DurationPicker";
import Pagination from "@/components/shared/Pagination";
import { computeExpiresAt, defaultDurationValue, formatExpiryStatus } from "@/lib/enrollmentDuration";
import { supabase } from "@/lib/supabase/client";

const PAGE_SIZE = 20;

type Student = {
  id: string;
  full_name: string | null;
  phone: string | null;
};

type Course = {
  id: string;
  title: string;
};

type Enrollment = {
  id: string;
  user_id: string;
  course_id: string;
  expires_at: string | null;
};

export default function AdminStudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");

  // ===== Modal تسجيل في دورة =====
  const [enrollModalStudent, setEnrollModalStudent] = useState<Student | null>(null);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [selectedDuration, setSelectedDuration] = useState(defaultDurationValue);
  const [enrolling, setEnrolling] = useState(false);

  // ===== Modal تأكيد إلغاء التسجيل =====
  const [unenrollTarget, setUnenrollTarget] = useState<{ enrollment: Enrollment; studentName: string; courseTitle: string } | null>(null);
  const [unenrolling, setUnenrolling] = useState(false);

  // ===== Modal تعديل المؤقت =====
  const [editTimerTarget, setEditTimerTarget] = useState<{ enrollment: Enrollment; studentName: string; courseTitle: string } | null>(null);
  const [editDuration, setEditDuration] = useState(defaultDurationValue);
  const [savingTimer, setSavingTimer] = useState(false);

  // بيجيب صفحة الطلاب المطلوبة بس (مش كل الطلاب دفعة واحدة)، والبحث بقى استعلام سيرفر (ilike)
  // على الاسم أو التليفون، مش فلترة على array محمّل بالكامل — نفس نمط بنك الأسئلة.
  async function fetchStudentsPage(pageNum: number, q: string) {
    setLoading(true);

    let query = supabase
      .from("profiles")
      .select("id, full_name, phone", { count: "exact" })
      .eq("role", "student")
      .order("full_name", { ascending: true });

    if (q) query = query.or(`full_name.ilike.%${q}%,phone.ilike.%${q}%`);

    const { data: studentsData, count, error } = await query.range((pageNum - 1) * PAGE_SIZE, pageNum * PAGE_SIZE - 1);

    if (error) {
      toast.error("حصل خطأ في تحميل الطلاب");
      setLoading(false);
      return;
    }

    setStudents(studentsData || []);
    setTotalCount(count ?? 0);

    // تسجيلات الصفحة دي بس، مش كل التسجيلات في المنصة
    const ids = (studentsData || []).map((s) => s.id);
    if (ids.length > 0) {
      const { data: enrollmentsData } = await supabase.from("enrollments").select("id, user_id, course_id, expires_at").in("user_id", ids);
      setEnrollments(enrollmentsData || []);
    } else {
      setEnrollments([]);
    }

    setLoading(false);
  }

  useEffect(() => {
    supabase
      .from("courses")
      .select("id, title")
      .order("order_index", { ascending: true, nullsFirst: false })
      .then(({ data }) => setCourses(data || []));
  }, []);

  // بحث سيرفر (مش فلترة محلية)، بعد ما المستخدم يوقف عن الكتابة شوية، وبيرجّع للصفحة الأولى
  useEffect(() => {
    const timeout = setTimeout(() => {
      setAppliedSearch(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    fetchStudentsPage(page, appliedSearch);
  }, [page, appliedSearch]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const coursesById = useMemo(() => new Map(courses.map((c) => [c.id, c])), [courses]);

  const enrollmentsByStudent = useMemo(() => {
    const map = new Map<string, Enrollment[]>();
    for (const e of enrollments) {
      const list = map.get(e.user_id) ?? [];
      list.push(e);
      map.set(e.user_id, list);
    }
    return map;
  }, [enrollments]);

  function openEnrollModal(student: Student) {
    setEnrollModalStudent(student);
    setSelectedCourseId("");
    setSelectedDuration(defaultDurationValue);
  }

  function closeEnrollModal() {
    setEnrollModalStudent(null);
    setSelectedCourseId("");
    setSelectedDuration(defaultDurationValue);
  }

  const availableCoursesForModal = useMemo(() => {
    if (!enrollModalStudent) return [];
    const enrolledCourseIds = new Set((enrollmentsByStudent.get(enrollModalStudent.id) ?? []).map((e) => e.course_id));
    return courses.filter((c) => !enrolledCourseIds.has(c.id));
  }, [courses, enrollModalStudent, enrollmentsByStudent]);

  async function handleEnroll(e: React.FormEvent) {
    e.preventDefault();
    if (!enrollModalStudent || !selectedCourseId) return;

    setEnrolling(true);
    const { data, error } = await supabase
      .from("enrollments")
      .insert({ user_id: enrollModalStudent.id, course_id: selectedCourseId, expires_at: computeExpiresAt(selectedDuration) })
      .select()
      .single();

    if (error) {
      toast.error(error.code === "23505" ? "الطالب مسجل في الدورة دي بالفعل" : "حصل خطأ في التسجيل");
    } else {
      toast.success("اتسجل الطالب في الدورة");
      setEnrollments((prev) => [...prev, data]);
      closeEnrollModal();
    }
    setEnrolling(false);
  }

  function openUnenrollModal(student: Student, enrollment: Enrollment) {
    setUnenrollTarget({
      enrollment,
      studentName: student.full_name || "بدون اسم",
      courseTitle: coursesById.get(enrollment.course_id)?.title || "دورة محذوفة",
    });
  }

  function closeUnenrollModal() {
    setUnenrollTarget(null);
  }

  async function handleConfirmUnenroll() {
    if (!unenrollTarget) return;

    setUnenrolling(true);
    const { error } = await supabase.from("enrollments").delete().eq("id", unenrollTarget.enrollment.id);
    if (error) {
      toast.error("حصل خطأ في إلغاء التسجيل");
    } else {
      toast.success("اتلغى تسجيل الطالب من الدورة");
      setEnrollments((prev) => prev.filter((e) => e.id !== unenrollTarget.enrollment.id));
      closeUnenrollModal();
    }
    setUnenrolling(false);
  }

  function openEditTimerModal(student: Student, enrollment: Enrollment) {
    setEditTimerTarget({
      enrollment,
      studentName: student.full_name || "بدون اسم",
      courseTitle: coursesById.get(enrollment.course_id)?.title || "دورة محذوفة",
    });
    setEditDuration(defaultDurationValue);
  }

  function closeEditTimerModal() {
    setEditTimerTarget(null);
    setEditDuration(defaultDurationValue);
  }

  async function handleSaveTimer() {
    if (!editTimerTarget) return;

    setSavingTimer(true);
    const expiresAt = computeExpiresAt(editDuration);
    const { error } = await supabase.from("enrollments").update({ expires_at: expiresAt }).eq("id", editTimerTarget.enrollment.id);

    if (error) {
      toast.error("حصل خطأ في تحديث المؤقت");
    } else {
      toast.success("اتحدث المؤقت");
      setEnrollments((prev) => prev.map((e) => (e.id === editTimerTarget.enrollment.id ? { ...e, expires_at: expiresAt } : e)));
      closeEditTimerModal();
    }
    setSavingTimer(false);
  }

  return (
    <div>
      <AdminPageHeader title="الطلاب" description="تسجيل الطلاب في الدورات وإدارة اشتراكاتهم" />

      <div className="mb-5">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ابحث بالاسم أو رقم الهاتف..."
          className="w-full max-w-sm rounded-lg border border-ink/15 px-4 py-3 text-base focus:border-primary outline-none transition-colors"
        />
      </div>

      {loading ? (
        <p className="text-ink/40 text-base">جاري التحميل...</p>
      ) : totalCount === 0 ? (
        <p className="text-ink/40 text-base">{appliedSearch ? "مفيش نتايج مطابقة للبحث." : "لسه مفيش طلاب مسجّلين في المنصة."}</p>
      ) : (
        <div className="space-y-3.5">
          <p className="text-ink/40 text-sm font-bold">
            {totalCount} طالب{appliedSearch ? " مطابق للبحث" : ""} — صفحة {page} من {totalPages}
          </p>

          <div className="rounded-xl border border-ink/10 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-base">
                <thead>
                  <tr className="bg-ink/[0.03] text-right">
                    <th className="py-3 px-4 font-bold text-sm text-ink/50">الاسم</th>
                    <th className="py-3 px-4 font-bold text-sm text-ink/50">الهاتف</th>
                    <th className="py-3 px-4 font-bold text-sm text-ink/50">الدورات المسجل فيها</th>
                    <th className="py-3 px-4 font-bold text-sm text-ink/50 w-1"></th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => {
                    const studentEnrollments = enrollmentsByStudent.get(student.id) ?? [];
                    return (
                      <tr key={student.id} className="border-t border-ink/[0.06] hover:bg-primary/[0.025] transition-colors">
                        <td className="py-3.5 px-4 align-top">
                          <div className="flex items-center gap-3 min-w-[160px]">
                            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center font-display font-bold text-primary text-base shrink-0">
                              {student.full_name?.[0] || "ط"}
                            </div>
                            <p className="font-bold break-words">{student.full_name || "بدون اسم"}</p>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 align-top text-ink/50 whitespace-nowrap" dir="ltr">
                          {student.phone || "—"}
                        </td>
                        <td className="py-3.5 px-4 align-top">
                          <div className="flex flex-wrap items-center gap-2">
                            {studentEnrollments.length === 0 ? (
                              <span className="text-ink/35 text-sm">مش مسجل في أي دورة</span>
                            ) : (
                              studentEnrollments.map((enrollment) => {
                                const course = coursesById.get(enrollment.course_id);
                                const expiryStatus = formatExpiryStatus(enrollment.expires_at);
                                return (
                                  <span
                                    key={enrollment.id}
                                    className={`inline-flex items-center gap-2 text-sm font-bold rounded-lg pr-3 pl-1.5 py-1.5 ${
                                      expiryStatus?.expired ? "bg-red-100 text-red-600" : "bg-primary/10 text-primary"
                                    }`}
                                  >
                                    {course?.title || "دورة محذوفة"}
                                    {expiryStatus && <span className="opacity-70">· {expiryStatus.label}</span>}
                                    <button
                                      onClick={() => openEditTimerModal(student, enrollment)}
                                      title="تعديل المؤقت"
                                      className="w-7 h-7 rounded-md bg-ink/10 hover:bg-primary/25 flex items-center justify-center transition-colors shrink-0"
                                    >
                                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <circle cx="12" cy="12" r="9" />
                                        <path d="M12 7v5l3.5 2" />
                                      </svg>
                                    </button>
                                    <button
                                      onClick={() => openUnenrollModal(student, enrollment)}
                                      title="إلغاء التسجيل"
                                      className="w-7 h-7 rounded-md bg-ink/10 hover:bg-red-200 hover:text-red-600 flex items-center justify-center transition-colors shrink-0"
                                    >
                                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5">
                                        <path d="M18 6 6 18M6 6l12 12" />
                                      </svg>
                                    </button>
                                  </span>
                                );
                              })
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 align-top">
                          <button
                            onClick={() => openEnrollModal(student)}
                            className="shrink-0 px-4 py-2 rounded-lg bg-primary text-white font-bold text-sm hover:bg-pink transition-colors whitespace-nowrap"
                          >
                            + تسجيل في دورة
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="pt-2">
            <Pagination page={page} totalPages={totalPages} onChange={setPage} />
          </div>
        </div>
      )}

      {/* ===== Modal تسجيل في دورة ===== */}
      <AnimatePresence>
        {enrollModalStudent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-ink/50 flex items-center justify-center p-4 z-50"
            onClick={closeEnrollModal}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-surface rounded-xl p-7 w-full max-w-md"
            >
              <h2 className="font-display font-bold text-xl text-primary mb-2">تسجيل في دورة</h2>
              <p className="text-ink/50 text-base mb-6">
                الطالب: <span className="font-bold text-ink">{enrollModalStudent.full_name || "بدون اسم"}</span>
              </p>

              {courses.length === 0 ? (
                <p className="text-ink/40 text-sm">لسه مفيش دورات متاحة، لازم تضيف دورة الأول.</p>
              ) : availableCoursesForModal.length === 0 ? (
                <p className="text-ink/40 text-sm">الطالب مسجل بالفعل في كل الدورات المتاحة.</p>
              ) : (
                <form onSubmit={handleEnroll} className="space-y-4">
                  <div>
                    <label className="block font-bold text-base mb-2">الدورة *</label>
                    <select
                      required
                      value={selectedCourseId}
                      onChange={(e) => setSelectedCourseId(e.target.value)}
                      className="w-full rounded-lg border border-ink/15 px-4 py-3 text-base focus:border-primary outline-none transition-colors bg-surface"
                    >
                      <option value="" disabled>
                        اختار دورة...
                      </option>
                      {availableCoursesForModal.map((course) => (
                        <option key={course.id} value={course.id}>
                          {course.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  <DurationPicker value={selectedDuration} onChange={setSelectedDuration} />

                  <div className="flex items-center gap-2.5 pt-1">
                    <button
                      type="submit"
                      disabled={enrolling || !selectedCourseId}
                      className="flex-1 py-3 rounded-lg bg-primary text-white font-bold text-base hover:bg-pink transition-colors disabled:opacity-60"
                    >
                      {enrolling ? "جاري التسجيل..." : "سجّل الطالب"}
                    </button>
                    <button
                      type="button"
                      onClick={closeEnrollModal}
                      className="px-5 py-3 rounded-lg border border-ink/15 font-bold text-base hover:bg-ink/5 transition-colors"
                    >
                      إلغاء
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== Modal تأكيد إلغاء التسجيل ===== */}
      <AnimatePresence>
        {unenrollTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-ink/50 flex items-center justify-center p-4 z-50"
            onClick={closeUnenrollModal}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-surface rounded-xl p-7 w-full max-w-md"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-11 h-11 rounded-xl bg-red-50 text-red-500 flex items-center justify-center shrink-0">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 8v5M12 16h.01" />
                  </svg>
                </div>
                <h2 className="font-display font-bold text-lg text-primary">تأكيد إلغاء التسجيل</h2>
              </div>

              <p className="text-ink/60 text-base mb-7">
                هل تريد إلغاء تسجيل <span className="font-bold text-ink">{unenrollTarget.studentName}</span> من دورة{" "}
                <span className="font-bold text-ink">&quot;{unenrollTarget.courseTitle}&quot;</span>؟
              </p>

              <div className="flex items-center gap-2.5">
                <button
                  onClick={handleConfirmUnenroll}
                  disabled={unenrolling}
                  className="flex-1 py-3 rounded-lg bg-red-500 text-white font-bold text-base hover:bg-red-600 transition-colors disabled:opacity-60"
                >
                  {unenrolling ? "جاري الإلغاء..." : "إلغاء التسجيل"}
                </button>
                <button
                  onClick={closeUnenrollModal}
                  className="px-5 py-3 rounded-lg border border-ink/15 font-bold text-base hover:bg-ink/5 transition-colors"
                >
                  تراجع
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== Modal تعديل المؤقت ===== */}
      <AnimatePresence>
        {editTimerTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-ink/50 flex items-center justify-center p-4 z-50"
            onClick={closeEditTimerModal}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-surface rounded-xl p-7 w-full max-w-md"
            >
              <h2 className="font-display font-bold text-xl text-primary mb-2">تعديل مدة الاشتراك</h2>
              <p className="text-ink/50 text-base mb-6">
                <span className="font-bold text-ink">{editTimerTarget.studentName}</span> في دورة{" "}
                <span className="font-bold text-ink">&quot;{editTimerTarget.courseTitle}&quot;</span>
              </p>

              <div className="space-y-4">
                <DurationPicker value={editDuration} onChange={setEditDuration} />
                <p className="text-sm text-ink/40 -mt-2">المدة الجديدة بتبدأ حساب من دلوقتي. اختار &quot;بدون مؤقت&quot; عشان تشيل الإقفال التلقائي خالص.</p>

                <div className="flex items-center gap-2.5">
                  <button
                    onClick={handleSaveTimer}
                    disabled={savingTimer}
                    className="flex-1 py-3 rounded-lg bg-primary text-white font-bold text-base hover:bg-pink transition-colors disabled:opacity-60"
                  >
                    {savingTimer ? "جاري الحفظ..." : "حفظ"}
                  </button>
                  <button
                    onClick={closeEditTimerModal}
                    className="px-5 py-3 rounded-lg border border-ink/15 font-bold text-base hover:bg-ink/5 transition-colors"
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
