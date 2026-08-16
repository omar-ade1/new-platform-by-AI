// app/courses/[id]/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import CourseContentTree, { type SectionNode } from "@/components/courses/CourseContentTree";
import CourseProgressRing from "@/components/courses/CourseProgressRing";
import RequestEnrollmentButton from "@/components/courses/RequestEnrollmentButton";
import DecorShapes from "@/components/shared/DecorShapes";
import RevealCard from "@/components/shared/RevealCard";
import { formatExpiryStatus } from "@/lib/enrollmentDuration";
import { getCourseAccessInfo } from "@/lib/supabase/course-access";
import { createClient } from "@/lib/supabase/server";

const headerShapes = [
  { top: "8%", right: "-8%", size: 150, color: "#FF5D8F", rotate: 10, opacity: 0.16 },
  { top: "62%", right: "26%", size: 70, color: "#FFC93C", rotate: -15, opacity: 0.2 },
  { top: "72%", right: "-6%", size: 120, color: "#00C2A8", rotate: 8, opacity: 0.14 },
];

// رسالة تشجيعية بتتغيّر حسب تقدّم الطالب — عشان الهيرو يحسّ الطالب بمكانه في رحلته، مش بس رقم مجرد
function progressMessage(percent: number) {
  if (percent >= 100) return "خلصت الدورة كلها! جهّز نفسك للمراجعة";
  if (percent >= 75) return "قربت تخلص الدورة كلها";
  if (percent >= 40) return "تمام، إنت في نص الطريق";
  if (percent > 0) return "بداية قوية، كمّل بنفس الحماس";
  return "يلا نبدأ! أول خطوة في رحلتك";
}

function ReviewIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 4v5h5" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" />
    </svg>
  );
}

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
    <section className="space-y-10 pb-16">
      <div className="relative overflow-hidden mx-4 md:mx-auto md:max-w-5xl mt-6 rounded-[2rem] md:rounded-[2.75rem] bg-gradient-to-br from-primary via-primary to-[#1B1050]">
        <DecorShapes shapes={headerShapes} rotateDelta={6} durationBase={9} />
        <div className="relative px-6 py-12 md:px-14 md:py-16 text-white flex flex-col lg:flex-row lg:items-center gap-10">
          <div className="flex-1 min-w-0">
            <h1 className="font-display font-black text-4xl md:text-5xl leading-[1.1] mb-4">{course.title}</h1>
            {course.description && <p className="text-white/70 text-lg leading-relaxed max-w-xl">{course.description}</p>}

            <div className="mt-7 flex flex-wrap items-center gap-3">
              {hasAccess && (
                <Link
                  href={`/courses/${id}/review`}
                  className="inline-flex items-center gap-2 text-sm font-bold text-white border-2 border-white/25 bg-white/10 hover:bg-white/20 hover:border-white/40 rounded-full px-5 py-3 transition-colors"
                >
                  <ReviewIcon />
                  امتحن كل أسئلتك الغلط في الدورة
                </Link>
              )}

              {hasAccess && expiryStatus && !expiryStatus.expired && (
                <span className="inline-flex items-center gap-2 text-sm font-bold text-yellow bg-white/10 rounded-full px-4 py-3">
                  <ClockIcon />
                  الدورة هتقفل عندك: {expiryStatus.label}
                </span>
              )}
            </div>
          </div>

          {hasAccess && totalTrackable > 0 && (
            <div className="shrink-0 flex flex-col items-center text-center gap-3 lg:border-r lg:border-white/15 lg:pr-10">
              <CourseProgressRing percent={progressPercent} />
              <div>
                <p className="font-display font-bold text-base">{progressMessage(progressPercent)}</p>
                <p className="text-white/50 text-sm mt-1">
                  كمّلت {seenIds.length} من {totalTrackable}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 space-y-6">
        {!user ? (
          <RevealCard>
            <div className="max-w-lg mx-auto bg-surface rounded-[1.75rem] border-2 border-ink/10 p-10 text-center space-y-5">
              <p className="font-display font-black text-xl">سجّل دخولك عشان تشوف محتوى الدورة</p>
              <Link
                href="/login"
                className="inline-block px-7 py-3.5 rounded-full bg-primary text-white font-display font-bold hover:bg-pink transition-colors"
              >
                تسجيل الدخول
              </Link>
            </div>
          </RevealCard>
        ) : !hasAccess ? (
          <RevealCard>
            <div className="max-w-lg mx-auto bg-surface rounded-[1.75rem] border-2 border-ink/10 p-10 text-center space-y-5">
              <p className="font-display font-black text-xl">{expiryStatus?.expired ? "انتهت مدة اشتراكك في الدورة دي" : "مش مشترك في الدورة دي"}</p>
              <p className="text-ink/60 text-base">ابعت طلب انضمام وهنراجعه، أو تواصل معانا لو محتاج مساعدة.</p>
              <RequestEnrollmentButton courseId={id} initialState={requestState} />
              <Link href="/contact" className="block text-ink/50 text-sm font-bold hover:text-primary transition-colors">
                تواصل معنا
              </Link>
            </div>
          </RevealCard>
        ) : sections.length === 0 ? (
          <p className="text-ink/50 text-center py-10">لسه مفيش محتوى مضاف للدورة دي.</p>
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
