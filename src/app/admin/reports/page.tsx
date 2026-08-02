"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import QuestionReviewCard, { type ReviewQuestion } from "@/components/shared/QuestionReviewCard";
import TopicPerformance, { type TopicStat } from "@/components/shared/TopicPerformance";
import { scoreTier } from "@/lib/format";
import { supabase } from "@/lib/supabase/client";

type Student = { id: string; full_name: string | null; phone: string | null };

type Enrollment = { id: string; expires_at: string | null; courses: { id: string; title: string } | null };

type TestAttempt = {
  id: string;
  score: number;
  total_questions: number;
  completed_at: string | null;
  tests: {
    content_items: {
      id: string;
      title: string;
      units: { sections: { course_id: string; courses: { title: string } | null } | null } | null;
    };
  };
};

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      className={`shrink-0 transition-transform ${open ? "" : "-rotate-90"}`}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function AttemptRow({
  attempt,
  expanded,
  onToggle,
  review,
  loading,
}: {
  attempt: TestAttempt;
  expanded: boolean;
  onToggle: () => void;
  review: ReviewQuestion[] | undefined;
  loading: boolean;
}) {
  const courseTitle = attempt.tests?.content_items?.units?.sections?.courses?.title;
  const pct = attempt.total_questions > 0 ? Math.round((attempt.score / attempt.total_questions) * 100) : null;
  const tier = scoreTier(pct);

  return (
    <div className="print:break-inside-avoid">
      <button onClick={onToggle} className="w-full flex items-center justify-between gap-4 p-5 hover:bg-primary/5 transition-colors text-right">
        <ChevronIcon open={expanded} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-display font-bold text-lg">{attempt.tests?.content_items?.title || "اختبار"}</p>
            {courseTitle && <span className="text-sm text-primary/60 bg-primary/5 rounded-full px-3 py-0.5 shrink-0">{courseTitle}</span>}
          </div>
          <p className="text-sm text-ink/50 mt-1">
            {attempt.completed_at ? new Date(attempt.completed_at).toLocaleDateString("ar-EG") : "—"} · {attempt.score}/{attempt.total_questions} إجابة
            صح
          </p>
          <div className="h-2 w-40 rounded-full bg-ink/10 overflow-hidden mt-2.5">
            <div className={`h-full rounded-full ${tier.bar}`} style={{ width: `${pct ?? 0}%` }} />
          </div>
        </div>
        <span className={`shrink-0 font-display font-black text-xl rounded-full px-4 py-2 ${tier.text} ${tier.bg}`}>
          {pct !== null ? `${pct}%` : "—"}
        </span>
      </button>

      {/* التفاصيل مالهاش لازمة في "طباعة الدرجات" — دي ملخص بس، حتى لو كانت متفتوحة على الشاشة وقت الطباعة */}
      {expanded && (
        <div className="px-5 pb-5 space-y-3 print:hidden">
          {loading ? (
            <p className="text-ink/40 text-base">جاري تحميل تفاصيل الإجابات...</p>
          ) : review && review.length > 0 ? (
            review.map((q, i, arr) => (
              <QuestionReviewCard
                key={q.id}
                question={q}
                index={i}
                showPassage={!!q.passage && q.passage.id !== (i > 0 ? arr[i - 1].passage?.id : undefined)}
              />
            ))
          ) : (
            <p className="text-ink/40 text-base">مفيش تفاصيل إجابات متاحة للمحاولة دي.</p>
          )}
        </div>
      )}
    </div>
  );
}

// هيدر مخصص للطباعة بس (اسم المنصة + عنوان التقرير + بيانات الطالب + الفلاتر المطبّقة) —
// بيحل محل الهيدر والنافبار العادية اللي بتتخفي بـ print:hidden، عشان الورقة المطبوعة توضح
// لولي الأمر هو بيشوف تقرير مين وعن أي فترة/دورة بالظبط.
function ReportPrintHeader({
  student,
  courseTitle,
  fromDate,
  toDate,
}: {
  student: Student;
  courseTitle: string | null;
  fromDate: string;
  toDate: string;
}) {
  const scopeLabel = [courseTitle || "كل الدورات", fromDate || toDate ? `من ${fromDate || "البداية"} إلى ${toDate || "الآن"}` : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="hidden print:block mb-5 pb-3 border-b-4 border-primary">
      <div className="flex items-center justify-between">
        <p className="font-display font-black text-primary" style={{ fontSize: "13pt" }}>
          الوجيز
        </p>
        <p className="text-ink/50" style={{ fontSize: "9pt" }}>
          تاريخ الطباعة: {new Date().toLocaleDateString("ar-EG")}
        </p>
      </div>
      <p className="font-display font-black mt-1.5" style={{ fontSize: "18pt" }}>
        تقرير أداء الطالب
      </p>
      <div className="flex items-end justify-between mt-2 gap-3">
        <div>
          <p className="font-display font-bold" style={{ fontSize: "14pt" }}>
            {student.full_name || "بدون اسم"}
          </p>
          <p className="text-ink/60" dir="ltr" style={{ fontSize: "10pt" }}>
            {student.phone || "—"}
          </p>
        </div>
        <p className="text-ink/60 font-bold" style={{ fontSize: "10pt" }}>
          {scopeLabel}
        </p>
      </div>
    </div>
  );
}

function reportStats(attempts: TestAttempt[]) {
  const percentages = attempts.filter((a) => a.total_questions > 0).map((a) => Math.round((a.score / a.total_questions) * 100));
  const avgScore = percentages.length ? Math.round(percentages.reduce((sum, p) => sum + p, 0) / percentages.length) : null;
  const bestScore = percentages.length ? Math.max(...percentages) : null;
  return [
    { label: "عدد الاختبارات", value: attempts.length },
    { label: "متوسط الدرجات", value: avgScore !== null ? `${avgScore}%` : "—" },
    { label: "أعلى نتيجة", value: bestScore !== null ? `${bestScore}%` : "—" },
  ];
}

function DetailedPrintView({
  student,
  attempts,
  reviews,
  topics,
  courseTitle,
  fromDate,
  toDate,
}: {
  student: Student;
  attempts: TestAttempt[];
  reviews: Record<string, ReviewQuestion[]>;
  topics: TopicStat[];
  courseTitle: string | null;
  fromDate: string;
  toDate: string;
}) {
  return (
    <div className="space-y-5">
      <ReportPrintHeader student={student} courseTitle={courseTitle} fromDate={fromDate} toDate={toDate} />

      <div className="grid grid-cols-3 gap-3 break-inside-avoid">
        {reportStats(attempts).map((s) => (
          <div key={s.label} className="bg-surface rounded-2xl border-2 border-ink/10 p-4 text-center print:rounded-lg print:border print:p-2">
            <p className="font-display font-black text-2xl text-primary print:text-lg">{s.value}</p>
            <p className="text-xs text-ink/50 font-bold print:text-xs">{s.label}</p>
          </div>
        ))}
      </div>

      {topics.length > 0 && (
        <div className="space-y-3 break-inside-avoid">
          <h2 className="font-display font-bold text-lg" style={{ fontSize: "13pt" }}>
            نقاط القوة والضعف
          </h2>
          <TopicPerformance topics={topics} />
        </div>
      )}

      {attempts.map((a) => {
        const review = reviews[a.id] ?? [];
        const testCourseTitle = a.tests?.content_items?.units?.sections?.courses?.title;
        const pct = a.total_questions > 0 ? Math.round((a.score / a.total_questions) * 100) : null;
        return (
          <div key={a.id} className="space-y-2.5">
            {/* عنوان بداية الاختبار — كبير وعريض عشان يبان واضح لولي الأمر إن اختبار جديد بدأ هنا */}
            <div className="flex items-center justify-between gap-3 border-b-4 border-primary pb-2 break-inside-avoid">
              <div className="min-w-0">
                <p className="font-display font-black leading-tight" style={{ fontSize: "17pt" }}>
                  {a.tests?.content_items?.title || "اختبار"}
                </p>
                <p className="text-ink/60 font-bold mt-0.5" style={{ fontSize: "9.5pt" }}>
                  {testCourseTitle ? `${testCourseTitle} · ` : ""}
                  {a.completed_at ? new Date(a.completed_at).toLocaleDateString("ar-EG") : "—"}
                </p>
              </div>
              <span className="font-display font-black text-primary shrink-0" style={{ fontSize: "15pt" }}>
                {a.score}/{a.total_questions}
                {pct !== null ? ` (${pct}%)` : ""}
              </span>
            </div>
            {review.map((q, i, arr) => (
              <QuestionReviewCard
                key={q.id}
                question={q}
                index={i}
                showPassage={!!q.passage && q.passage.id !== (i > 0 ? arr[i - 1].passage?.id : undefined)}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}

export default function AdminReportsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [search, setSearch] = useState("");

  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [attempts, setAttempts] = useState<TestAttempt[]>([]);
  const [loadingReport, setLoadingReport] = useState(false);

  const [courseFilter, setCourseFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [reviewsByAttempt, setReviewsByAttempt] = useState<Record<string, ReviewQuestion[]>>({});
  const [loadingReviewIds, setLoadingReviewIds] = useState<Set<string>>(new Set());

  const [preparingDetailedPrint, setPreparingDetailedPrint] = useState(false);
  const [detailedPrintData, setDetailedPrintData] = useState<Record<string, ReviewQuestion[]> | null>(null);

  const [topics, setTopics] = useState<TopicStat[]>([]);
  const [loadingTopics, setLoadingTopics] = useState(false);

  useEffect(() => {
    supabase
      .from("profiles")
      .select("id, full_name, phone")
      .eq("role", "student")
      .order("full_name", { ascending: true })
      .then(({ data, error }) => {
        if (error) toast.error("حصل خطأ في تحميل الطلاب");
        setStudents(data || []);
        setLoadingStudents(false);
      });
  }, []);

  useEffect(() => {
    if (!detailedPrintData) return;
    const frame = requestAnimationFrame(() => window.print());
    return () => cancelAnimationFrame(frame);
  }, [detailedPrintData]);

  useEffect(() => {
    function handleAfterPrint() {
      setDetailedPrintData(null);
    }
    window.addEventListener("afterprint", handleAfterPrint);
    return () => window.removeEventListener("afterprint", handleAfterPrint);
  }, []);

  useEffect(() => {
    if (!selectedStudent) return;
    setLoadingTopics(true);
    supabase
      .rpc("get_topic_performance", {
        p_user_id: selectedStudent.id,
        p_course_id: courseFilter || null,
        p_from_date: fromDate ? `${fromDate}T00:00:00` : null,
        p_to_date: toDate ? `${toDate}T23:59:59` : null,
      })
      .then(({ data, error }) => {
        if (error) toast.error("حصل خطأ في تحميل تحليل نقاط القوة والضعف");
        setTopics((data as TopicStat[] | null) ?? []);
        setLoadingTopics(false);
      });
  }, [selectedStudent, courseFilter, fromDate, toDate]);

  const filteredStudents = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return students;
    return students.filter((s) => (s.full_name ?? "").toLowerCase().includes(q) || (s.phone ?? "").includes(q));
  }, [students, search]);

  async function selectStudent(student: Student) {
    setSelectedStudent(student);
    setCourseFilter("");
    setFromDate("");
    setToDate("");
    setExpandedIds(new Set());
    setReviewsByAttempt({});
    setTopics([]);
    setLoadingReport(true);

    const [{ data: enrollmentsData, error: enrollError }, { data: attemptsData, error: attemptsError }] = await Promise.all([
      supabase.from("enrollments").select("id, expires_at, courses(id, title)").eq("user_id", student.id),
      supabase
        .from("test_attempts")
        .select("id, score, total_questions, completed_at, tests(content_items(id, title, units(sections(course_id, courses(title)))))")
        .eq("user_id", student.id)
        .not("test_id", "is", null)
        .order("completed_at", { ascending: false }),
    ]);

    if (enrollError || attemptsError) toast.error("حصل خطأ في تحميل بيانات الطالب");
    setEnrollments((enrollmentsData as unknown as Enrollment[]) ?? []);
    setAttempts((attemptsData as unknown as TestAttempt[]) ?? []);
    setLoadingReport(false);
  }

  function backToList() {
    setSelectedStudent(null);
    setEnrollments([]);
    setAttempts([]);
    setTopics([]);
  }

  const filteredAttempts = useMemo(() => {
    return attempts.filter((a) => {
      const courseId = a.tests?.content_items?.units?.sections?.course_id;
      if (courseFilter && courseId !== courseFilter) return false;
      if (fromDate && (!a.completed_at || a.completed_at < `${fromDate}T00:00:00`)) return false;
      if (toDate && (!a.completed_at || a.completed_at > `${toDate}T23:59:59`)) return false;
      return true;
    });
  }, [attempts, courseFilter, fromDate, toDate]);

  const stats = reportStats(filteredAttempts);
  const courseFilterTitle = courseFilter ? (enrollments.find((e) => e.courses?.id === courseFilter)?.courses?.title ?? null) : null;

  async function fetchReview(attemptId: string): Promise<ReviewQuestion[]> {
    const { data, error } = await supabase.rpc("get_test_attempt_review", { p_attempt_id: attemptId });
    if (error || !data) {
      toast.error("حصل خطأ في تحميل تفاصيل الإجابات");
      return [];
    }
    return (data as { review: ReviewQuestion[] }).review;
  }

  async function toggleExpand(attemptId: string) {
    const willExpand = !expandedIds.has(attemptId);
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(attemptId)) next.delete(attemptId);
      else next.add(attemptId);
      return next;
    });

    if (willExpand && !reviewsByAttempt[attemptId]) {
      setLoadingReviewIds((prev) => new Set(prev).add(attemptId));
      const review = await fetchReview(attemptId);
      setReviewsByAttempt((prev) => ({ ...prev, [attemptId]: review }));
      setLoadingReviewIds((prev) => {
        const next = new Set(prev);
        next.delete(attemptId);
        return next;
      });
    }
  }

  async function handlePrintDetailed() {
    if (filteredAttempts.length === 0) {
      toast.error("مفيش نتايج تتطبع");
      return;
    }
    setPreparingDetailedPrint(true);
    const entries = await Promise.all(
      filteredAttempts.map(async (a) => {
        if (reviewsByAttempt[a.id]) return [a.id, reviewsByAttempt[a.id]] as const;
        return [a.id, await fetchReview(a.id)] as const;
      })
    );
    const merged = Object.fromEntries(entries);
    setReviewsByAttempt((prev) => ({ ...prev, ...merged }));
    setPreparingDetailedPrint(false);
    setDetailedPrintData(merged);
  }

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="font-display font-black text-3xl text-primary mb-2">التقارير</h1>
          <p className="text-ink/60 text-lg">تقرير تفصيلي عن نتايج أي طالب في اختباراته</p>
        </div>
        {selectedStudent && (
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => window.print()}
              className="shrink-0 px-6 py-3.5 rounded-full border-2 border-primary/20 text-primary font-display font-bold text-base hover:bg-primary/5 transition-colors"
            >
              طباعة الدرجات
            </button>
            <button
              onClick={handlePrintDetailed}
              disabled={preparingDetailedPrint}
              className="shrink-0 px-6 py-3.5 rounded-full bg-primary text-white font-display font-bold text-base hover:bg-pink transition-colors disabled:opacity-60"
            >
              {preparingDetailedPrint ? "جاري التجهيز..." : "طباعة بالتفصيل"}
            </button>
          </div>
        )}
      </div>

      {!selectedStudent ? (
        <>
          <div className="mb-6">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث بالاسم أو رقم الهاتف..."
              className="w-full max-w-md rounded-2xl border-2 border-ink/10 px-5 py-4 text-lg focus:border-primary outline-none transition-colors"
            />
          </div>

          {loadingStudents ? (
            <p className="text-ink/40 text-lg">جاري التحميل...</p>
          ) : filteredStudents.length === 0 ? (
            <p className="text-ink/40 text-lg">مفيش نتايج مطابقة للبحث.</p>
          ) : (
            <div className="space-y-3">
              {filteredStudents.map((student) => (
                <button
                  key={student.id}
                  onClick={() => selectStudent(student)}
                  className="w-full flex items-center gap-4 rounded-2xl border-2 border-ink/10 bg-surface p-5 hover:border-primary/40 hover:bg-primary/5 transition-colors text-right"
                >
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center font-display font-bold text-primary text-xl shrink-0">
                    {student.full_name?.[0] || "ط"}
                  </div>
                  <div className="min-w-0">
                    <p className="font-display font-bold text-lg break-words">{student.full_name || "بدون اسم"}</p>
                    <p className="text-ink/50 text-base" dir="ltr">
                      {student.phone || "—"}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </>
      ) : detailedPrintData ? (
        <DetailedPrintView
          student={selectedStudent}
          attempts={filteredAttempts}
          reviews={detailedPrintData}
          topics={topics}
          courseTitle={courseFilterTitle}
          fromDate={fromDate}
          toDate={toDate}
        />
      ) : (
        <div className="space-y-6">
          <button onClick={backToList} className="print:hidden text-primary font-bold text-base hover:text-pink transition-colors">
            ‹ رجوع لقايمة الطلاب
          </button>

          <ReportPrintHeader student={selectedStudent} courseTitle={courseFilterTitle} fromDate={fromDate} toDate={toDate} />

          <div className="bg-surface rounded-2xl border-2 border-ink/10 p-6 flex items-center gap-4 print:hidden">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center font-display font-black text-primary text-2xl shrink-0">
              {selectedStudent.full_name?.[0] || "ط"}
            </div>
            <div className="min-w-0">
              <p className="font-display font-black text-xl">{selectedStudent.full_name || "بدون اسم"}</p>
              <p className="text-ink/50 text-base" dir="ltr">
                {selectedStudent.phone || "—"}
              </p>
            </div>
          </div>

          <div className="print:hidden flex flex-wrap items-end gap-4">
            <div>
              <label className="block font-bold text-base mb-2">الدورة</label>
              <select
                value={courseFilter}
                onChange={(e) => setCourseFilter(e.target.value)}
                className="rounded-2xl border-2 border-ink/10 px-5 py-3.5 text-base focus:border-primary outline-none transition-colors bg-surface min-w-[220px]"
              >
                <option value="">كل الدورات</option>
                {enrollments.map((e) =>
                  e.courses ? (
                    <option key={e.courses.id} value={e.courses.id}>
                      {e.courses.title}
                    </option>
                  ) : null
                )}
              </select>
            </div>
            <div>
              <label className="block font-bold text-base mb-2">من تاريخ</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="rounded-2xl border-2 border-ink/10 px-5 py-3.5 text-base focus:border-primary outline-none transition-colors bg-surface"
              />
            </div>
            <div>
              <label className="block font-bold text-base mb-2">إلى تاريخ</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="rounded-2xl border-2 border-ink/10 px-5 py-3.5 text-base focus:border-primary outline-none transition-colors bg-surface"
              />
            </div>
            {(courseFilter || fromDate || toDate) && (
              <button
                onClick={() => {
                  setCourseFilter("");
                  setFromDate("");
                  setToDate("");
                }}
                className="text-primary font-bold text-base hover:text-pink transition-colors pb-3.5"
              >
                مسح الفلاتر
              </button>
            )}
          </div>

          {loadingReport ? (
            <p className="text-ink/40 text-lg">جاري التحميل...</p>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-4 print:gap-3 break-inside-avoid">
                {stats.map((s) => (
                  <div
                    key={s.label}
                    className="bg-surface rounded-2xl border-2 border-ink/10 p-5 text-center space-y-1 print:rounded-lg print:border print:p-2"
                  >
                    <p className="font-display font-black text-3xl text-primary print:text-lg">{s.value}</p>
                    <p className="text-sm text-ink/50 font-bold print:text-xs">{s.label}</p>
                  </div>
                ))}
              </div>

              {!loadingTopics && topics.length > 0 && (
                <div className="space-y-4 print:space-y-2 break-inside-avoid">
                  <h2 className="font-display font-bold text-xl print:text-base">نقاط القوة والضعف</h2>
                  <TopicPerformance topics={topics} />
                </div>
              )}

              <div className="space-y-4 print:space-y-2">
                <h2 className="font-display font-bold text-xl print:text-base">نتائج الاختبارات</h2>
                {filteredAttempts.length === 0 ? (
                  <p className="text-ink/50 text-base">مفيش نتايج مطابقة للفلاتر دي.</p>
                ) : (
                  <div className="bg-surface rounded-2xl border-2 border-ink/10 divide-y divide-ink/10">
                    {filteredAttempts.map((a) => (
                      <AttemptRow
                        key={a.id}
                        attempt={a}
                        expanded={expandedIds.has(a.id)}
                        onToggle={() => toggleExpand(a.id)}
                        review={reviewsByAttempt[a.id]}
                        loading={loadingReviewIds.has(a.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
