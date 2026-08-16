// app/courses/[id]/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import CourseContentTree, { type SectionNode } from "@/components/courses/CourseContentTree";
import RequestEnrollmentButton from "@/components/courses/RequestEnrollmentButton";
import DecorShapes from "@/components/shared/DecorShapes";
import RevealCard from "@/components/shared/RevealCard";
import { formatExpiryStatus } from "@/lib/enrollmentDuration";
import { getCourseAccessInfo } from "@/lib/supabase/course-access";
import { createClient } from "@/lib/supabase/server";

const headerShapes = [
  { top: "10%", right: "-6%", size: 110, color: "#FF5D8F", rotate: 10, opacity: 0.2 },
  { top: "55%", right: "20%", size: 60, color: "#FFC93C", rotate: -15, opacity: 0.25 },
  { top: "70%", right: "-4%", size: 90, color: "#00C2A8", rotate: 8, opacity: 0.18 },
];

export default async function CourseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: course } = await supabase.from("courses").select("id, title, description, image_url").eq("id", id).single();

  if (!course) {
    notFound();
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { hasAccess, enrollment } = await getCourseAccessInfo(supabase, user, id);
  const expiryStatus = enrollment ? formatExpiryStatus(enrollment.expires_at) : null;

  let requestState: "none" | "pending" | "rejected" | "approved" = "none";
  if (user && !hasAccess) {
    const { data: latestRequest } = await supabase
      .from("enrollment_requests")
      .select("status")
      .eq("user_id", user.id)
      .eq("course_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    requestState = (latestRequest?.status as typeof requestState) || "none";
  }

  let sections: SectionNode[] = [];
  let seenIds: string[] = [];
  let totalTrackable = 0;
  const testScores: Record<string, number | null> = {};

  if (hasAccess) {
    const { data } = await supabase
      .from("sections")
      .select(
        `
        id, title, description, order_index,
        units (
          id, title, order_index,
          item_groups ( id, color, order_index ),
          content_items (
            id, item_group_id, type, title, order_index,
            videos ( video_url, duration_seconds ),
            files ( file_url, file_type, file_size_kb ),
            notes ( body ),
            tests ( time_limit_minutes )
          )
        )
      `
      )
      .eq("course_id", id);

    sections = sortTree((data as unknown as SectionNode[]) ?? []);

    // أي اختبار فيه سؤال واحد على الأقل غير محلول (معندوش اختيار متعلّم إنه صح) بيتخفي تمامًا عن
    // الطالب لحد ما الأدمن يراجعه ويحله — الاختبار لسه "قيد الإعداد".
    const { data: unsolvedTestIds } = await supabase.rpc("get_unsolved_test_ids", { p_course_id: id });
    const unsolvedSet = new Set<string>(unsolvedTestIds ?? []);
    if (unsolvedSet.size > 0) {
      sections = sections.map((s) => ({
        ...s,
        units: s.units.map((u) => ({
          ...u,
          content_items: u.content_items.filter((item) => !(item.type === "test" && unsolvedSet.has(item.id))),
        })),
      }));
    }

    const trackableIds = sections.flatMap((s) => s.units.flatMap((u) => u.content_items.map((i) => i.id)));
    totalTrackable = trackableIds.length;

    if (user && trackableIds.length > 0) {
      const { data: progress } = await supabase
        .from("content_progress")
        .select("content_item_id")
        .eq("user_id", user.id)
        .in("content_item_id", trackableIds);
      seenIds = (progress ?? []).map((p) => p.content_item_id);
    }

    // آخر درجة للطالب في كل اختبار (بتتعرض جنب الاختبار في الشجرة، بغض النظر عن علامة الصح)
    const testIds = sections.flatMap((s) => s.units.flatMap((u) => u.content_items.filter((i) => i.type === "test").map((i) => i.id)));
    if (user && testIds.length > 0) {
      const { data: attempts } = await supabase
        .from("test_attempts")
        .select("test_id, score, total_questions, completed_at")
        .eq("user_id", user.id)
        .in("test_id", testIds)
        .order("completed_at", { ascending: false });

      for (const a of attempts ?? []) {
        if (testScores[a.test_id] !== undefined) continue;
        testScores[a.test_id] = a.total_questions > 0 ? Math.round((a.score / a.total_questions) * 100) : null;
      }
    }
  }

  const progressPercent = totalTrackable > 0 ? Math.round((seenIds.length / totalTrackable) * 100) : 0;

  return (
    <section className="space-y-8 pb-12">
      <div className="relative bg-primary overflow-hidden">
        <DecorShapes shapes={headerShapes} rotateDelta={6} durationBase={9} />
        <div className="relative max-w-3xl mx-auto px-4 pt-14 pb-10 text-white">
          <h1 className="font-display font-black text-3xl md:text-4xl mb-3">{course.title}</h1>
          {course.description && <p className="text-white/70 leading-relaxed max-w-xl">{course.description}</p>}

          {hasAccess && totalTrackable > 0 && (
            <div className="mt-6 max-w-sm">
              <div className="flex items-center justify-between mb-1.5 text-sm">
                <span className="text-white/70 font-bold">تقدمك في الدورة</span>
                <span className="font-display font-black text-yellow">{progressPercent}%</span>
              </div>
              <div className="h-2.5 rounded-full bg-white/15 overflow-hidden">
                <div className="h-full rounded-full bg-yellow transition-all" style={{ width: `${progressPercent}%` }} />
              </div>
            </div>
          )}

          {hasAccess && (
            <Link
              href={`/courses/${id}/review`}
              className="mt-5 inline-flex items-center gap-1.5 text-sm font-bold text-white border-2 border-white/25 bg-white/10 hover:bg-white/20 hover:border-white/40 rounded-full px-4 py-2.5 transition-colors"
            >
              امتحن كل أسئلتك الغلط في الدورة
            </Link>
          )}

          {hasAccess && expiryStatus && !expiryStatus.expired && (
            <p className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-yellow bg-white/10 rounded-full px-3 py-1.5">
              الدورة هتقفل عندك: {expiryStatus.label}
            </p>
          )}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 space-y-6">
        {!user ? (
          <RevealCard>
            <div className="bg-surface rounded-2xl border-2 border-ink/10 p-8 text-center space-y-4">
              <p className="font-display font-bold text-lg">سجّل دخولك عشان تشوف محتوى الدورة</p>
              <Link
                href="/login"
                className="inline-block px-6 py-3 rounded-full bg-primary text-white font-display font-bold hover:bg-pink transition-colors"
              >
                تسجيل الدخول
              </Link>
            </div>
          </RevealCard>
        ) : !hasAccess ? (
          <RevealCard>
            <div className="bg-surface rounded-2xl border-2 border-ink/10 p-8 text-center space-y-4">
              <p className="font-display font-bold text-lg">{expiryStatus?.expired ? "انتهت مدة اشتراكك في الدورة دي" : "مش مشترك في الدورة دي"}</p>
              <p className="text-ink/60">ابعت طلب انضمام وهنراجعه، أو تواصل معانا لو محتاج مساعدة.</p>
              <RequestEnrollmentButton courseId={id} initialState={requestState} />
              <Link href="/contact" className="block text-ink/50 text-sm font-bold hover:text-primary transition-colors">
                تواصل معنا
              </Link>
            </div>
          </RevealCard>
        ) : sections.length === 0 ? (
          <p className="text-ink/50">لسه مفيش محتوى مضاف للدورة دي.</p>
        ) : (
          <CourseContentTree courseId={id} sections={sections} seenIds={seenIds} testScores={testScores} />
        )}
      </div>
    </section>
  );
}

function sortTree(sections: SectionNode[]): SectionNode[] {
  return [...sections]
    .sort((a, b) => a.order_index - b.order_index)
    .map((section) => ({
      ...section,
      units: [...section.units]
        .sort((a, b) => a.order_index - b.order_index)
        .map((unit) => ({
          ...unit,
          content_items: [...unit.content_items].sort((a, b) => a.order_index - b.order_index),
        })),
    }));
}
