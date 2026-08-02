// app/courses/page.tsx
"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import AnimatedHeading from "@/components/shared/AnimatedHeading";
import DecorShapes from "@/components/shared/DecorShapes";
import { supabase } from "@/lib/supabase/client";

const headingTokens = [{ text: "اختار" }, { text: "دورتك", marker: true, color: "#FFC93C" }, { text: "وابدأ" }];

const headerShapes = [
  { top: "10%", right: "-6%", size: 110, color: "#FF5D8F", rotate: 10, opacity: 0.2 },
  { top: "55%", right: "20%", size: 60, color: "#FFC93C", rotate: -15, opacity: 0.25 },
  { top: "70%", right: "-4%", size: 90, color: "#00C2A8", rotate: 8, opacity: 0.18 },
];

type Course = {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
};

const MOCK_COURSES: Course[] = [
  {
    id: "mock-1",
    title: "القدرات اللفظي - المستوى الأول",
    description: "أساسيات التناظر اللفظي، إكمال الجمل، الخطأ السياقي، من الصفر لحد الاحتراف.",
    image_url: null,
  },
  {
    id: "mock-2",
    title: "مراجعة نهائية - القدرات اللفظي",
    description: "تجميعات مكثفة، حل نماذج اختبارات سابقة، واستراتيجيات توفير الوقت.",
    image_url: null,
  },
  {
    id: "mock-3",
    title: "استيعاب المقروء المتقدم",
    description: "تدريب مكثف على النصوص الطويلة وأسئلة الاستنتاج والفهم العميق.",
    image_url: null,
  },
];

const accentColors = ["#FF5D8F", "#FFC93C", "#00C2A8"];

function CourseCard({ course, index, enrolled }: { course: Course; index: number; enrolled: boolean }) {
  const accent = accentColors[index % accentColors.length];

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: false, amount: 0.3 }}
      transition={{ duration: 0.5, delay: index * 0.08 }}
      whileHover={{ y: -8, scale: 1.015 }}
      className="group rounded-2xl border-2 border-ink/10 bg-surface overflow-hidden hover:shadow-2xl hover:border-primary/20 transition-shadow"
    >
      <div className="h-2" style={{ background: accent }} />

      <div className="aspect-16/10 relative overflow-hidden" style={{ background: `${accent}15` }}>
        {course.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={course.image_url} alt={course.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center relative">
            <span className="font-display font-black text-3xl opacity-20 group-hover:opacity-30 transition-opacity" style={{ color: accent }}>
              الوجيز
            </span>
            <motion.div
              className="absolute rounded-full"
              style={{ width: 60, height: 60, background: accent, opacity: 0.15, top: "15%", right: "10%" }}
              animate={{ scale: [1, 1.15, 1] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>
        )}
        {enrolled && (
          <span className="absolute top-3 right-3 inline-flex items-center gap-1 text-xs font-bold text-white bg-teal rounded-full px-3 py-1 shadow">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5">
              <path d="M20 6 9 17l-5-5" />
            </svg>
            مشترك
          </span>
        )}
      </div>

      <div className="p-5">
        <h3 className="font-display font-bold text-xl text-primary mb-2 leading-snug">{course.title}</h3>
        {course.description && <p className="text-ink/60 mb-4 leading-relaxed line-clamp-2">{course.description}</p>}
        <Link href={`/courses/${course.id}`} className="inline-flex items-center gap-1 font-bold transition-colors" style={{ color: accent }}>
          {enrolled ? "تابع الدورة" : "اعرف أكتر"}
          <span className="group-hover:-translate-x-1 transition-transform">←</span>
        </Link>
      </div>
    </motion.div>
  );
}

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrolledIds, setEnrolledIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [usingMockData, setUsingMockData] = useState(false);

  useEffect(() => {
    async function fetchCourses() {
      const [{ data, error }, { data: userData }] = await Promise.all([
        supabase.from("courses").select("*").order("order_index", { ascending: true, nullsFirst: false }),
        supabase.auth.getUser(),
      ]);

      if (error || !data || data.length === 0) {
        setCourses(MOCK_COURSES);
        setUsingMockData(true);
        if (error) toast.error("حصل خطأ في تحميل الدورات");
      } else {
        setCourses(data);
      }

      const userId = userData.user?.id;
      if (userId) {
        const { data: enrollments } = await supabase.from("enrollments").select("course_id, expires_at").eq("user_id", userId);
        const now = Date.now();
        const activeIds = (enrollments ?? [])
          .filter((e) => !e.expires_at || new Date(e.expires_at).getTime() > now)
          .map((e) => e.course_id);
        setEnrolledIds(new Set(activeIds));
      }

      setLoading(false);
    }
    fetchCourses();
  }, []);

  return (
    <section className="bg-background">
      {/* ===== البانل العلوي ===== */}
      <div className="relative bg-primary overflow-hidden">
        <DecorShapes shapes={headerShapes} rotateDelta={6} durationBase={9} />

        <div className="relative max-w-5xl mx-auto px-4 pt-16 pb-16 text-center text-white">
          <h1 className="font-display font-black text-3xl md:text-5xl mb-4">
            <AnimatedHeading tokens={headingTokens} mode="load" />
          </h1>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="text-white/70 max-w-md mx-auto"
          >
            دورات مصممة خصيصًا لاختبار القدرات اللفظي، من الأساسيات لحد التميز
          </motion.p>
        </div>
      </div>

      {/* ===== الكروت ===== */}
      <div className="max-w-5xl mx-auto px-4 py-16">
        {usingMockData && <p className="text-center text-xs text-ink/40 mb-6">(بيانات تجريبية للمعاينة - هتتبدل تلقائي أول ما تضيف دورات حقيقية)</p>}

        {loading ? (
          <p className="text-center text-ink/40 py-10">جاري تحميل الدورات...</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course, i) => (
              <CourseCard key={course.id} course={course} index={i} enrolled={enrolledIds.has(course.id)} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
