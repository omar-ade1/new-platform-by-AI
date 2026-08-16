// app/courses/[id]/content/[itemId]/page.tsx
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import RevealCard from "@/components/shared/RevealCard";
import TestRunner from "@/components/courses/TestRunner";
import MarkSeenButton from "@/components/courses/MarkSeenButton";
import MarkTestDoneButton from "@/components/courses/MarkTestDoneButton";
import { contentTypeAccent, contentTypeIcons, contentTypeLabels } from "@/components/courses/contentTypeIcons";
import { getEmbedUrl } from "@/lib/embedUrl";
import { formatFileSize, scoreTier } from "@/lib/format";
import { hasCourseAccess } from "@/lib/supabase/course-access";
import { createClient } from "@/lib/supabase/server";

type PreviousAttempt = { id: string; score: number; total_questions: number; completed_at: string | null };

function pctOf(a: PreviousAttempt): number | null {
  return a.total_questions > 0 ? Math.round((a.score / a.total_questions) * 100) : null;
}

type ItemWithPath = {
  id: string;
  title: string;
  type: "video" | "file" | "note" | "test";
  videos: { video_url: string } | null;
  files: { file_url: string; file_type: string | null; file_size_kb: number | null } | null;
  tests: { time_limit_minutes: number | null } | null;
  units: {
    title: string;
    sections: {
      title: string;
      course_id: string;
    } | null;
  } | null;
};

export default async function ContentItemPage({ params }: { params: Promise<{ id: string; itemId: string }> }) {
  const { id, itemId } = await params;
  const supabase = await createClient();

  const { data: item } = await supabase
    .from("content_items")
    .select(
      `
      id, title, type,
      videos ( video_url ),
      files ( file_url, file_type, file_size_kb ),
      tests ( time_limit_minutes ),
      units ( title, sections ( title, course_id ) )
    `
    )
    .eq("id", itemId)
    .single();

  const typedItem = item as unknown as ItemWithPath | null;
  const isVideo = typedItem?.type === "video" && !!typedItem.videos;
  const isFile = typedItem?.type === "file" && !!typedItem.files;
  const isTest = typedItem?.type === "test" && !!typedItem.tests;

  if (!typedItem || (!isVideo && !isFile && !isTest) || typedItem.units?.sections?.course_id !== id) {
    notFound();
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const access = await hasCourseAccess(supabase, user, id);

  if (!access) {
    redirect(`/access-denied?reason=${user ? "not-enrolled" : "not-authenticated"}`);
  }

  const { data: course } = await supabase.from("courses").select("title").eq("id", id).single();

  let alreadySeen = false;
  let testQualified = false;
  let previousAttempts: PreviousAttempt[] = [];
  let isAdmin = false;
  if (user) {
    const [{ data: progress }, { data: profile }] = await Promise.all([
      supabase.from("content_progress").select("content_item_id").eq("user_id", user.id).eq("content_item_id", typedItem.id).maybeSingle(),
      supabase.from("profiles").select("role").eq("id", user.id).single(),
    ]);
    alreadySeen = !!progress;
    isAdmin = profile?.role === "admin";

    if (isTest) {
      const { data: attempts } = await supabase
        .from("test_attempts")
        .select("id, score, total_questions, completed_at")
        .eq("user_id", user.id)
        .eq("test_id", typedItem.id)
        .order("completed_at", { ascending: false });
      previousAttempts = attempts ?? [];
      testQualified = previousAttempts.some((a) => a.total_questions > 0 && a.score / a.total_questions >= 0.8);
    }
  }

  // previousAttempts أصلاً من الأحدث للأقدم (نفس ترتيب الاستعلام) — الأحدث فوق

  let fileUrl: string | null = null;
  if (isFile && typedItem.files) {
    const { data: signed } = await supabase.storage.from("course-files").createSignedUrl(typedItem.files.file_url, 60 * 60);
    fileUrl = signed?.signedUrl ?? null;
  }

  return (
    <section className="max-w-4xl mx-auto px-4 py-10 space-y-6">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Link href={`/courses/${id}`} className="text-primary/60 hover:text-primary font-bold transition-colors">
          {course?.title ?? "الدورة"}
        </Link>
        <span className="text-ink/30">/</span>
        <span className="text-ink/50">{typedItem.units?.sections?.title}</span>
        <span className="text-ink/30">/</span>
        <span className="text-ink/50">{typedItem.units?.title}</span>
      </div>

      {isAdmin && isTest && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-primary/30 bg-primary/[0.04] px-4 py-3.5">
          <p className="flex items-center gap-2 text-sm font-bold text-primary/70">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="shrink-0">
              <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            بتشوف الاختبار ده بعين الأدمن
          </p>
          <Link
            href={`/admin/courses/${id}/content/${itemId}/questions`}
            className="shrink-0 px-4 py-2.5 rounded-lg bg-primary text-white font-display font-bold text-sm hover:bg-pink transition-colors"
          >
            شوف أسئلة الاختبار وعدّلها ←
          </Link>
        </div>
      )}

      <div className="space-y-3">
        <h1 className="font-display font-black text-3xl text-primary">{typedItem.title}</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`inline-flex items-center gap-1.5 text-sm font-bold rounded-full px-3 py-1 ${contentTypeAccent[typedItem.type].bg} ${contentTypeAccent[typedItem.type].text}`}
          >
            {contentTypeIcons[typedItem.type]}
            {contentTypeLabels[typedItem.type]}
          </span>
          {!isTest && user && <MarkSeenButton userId={user.id} contentItemId={typedItem.id} initialSeen={alreadySeen} />}
          {isTest && user && (
            <MarkTestDoneButton userId={user.id} contentItemId={typedItem.id} initialDone={alreadySeen} qualified={testQualified} />
          )}
        </div>
      </div>

      {isVideo && typedItem.videos && (
        <RevealCard>
          <div className="rounded-2xl overflow-hidden border-2 border-ink/10 shadow-lg shadow-primary/5">
            <div className={`h-1.5 ${contentTypeAccent.video.strip}`} />
            <div className="aspect-video bg-ink/5">
              <iframe
                src={getEmbedUrl(typedItem.videos.video_url)}
                title={typedItem.title}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
          </div>
        </RevealCard>
      )}

      {isFile && (
        <RevealCard>
          <div className="space-y-2">
            {typedItem.files && (typedItem.files.file_type || typedItem.files.file_size_kb) && (
              <p className="text-ink/50 text-sm font-bold">
                {[typedItem.files.file_type, formatFileSize(typedItem.files.file_size_kb)].filter(Boolean).join(" · ")}
              </p>
            )}
            {fileUrl ? (
              <div className="rounded-2xl overflow-hidden border-2 border-ink/10 shadow-lg shadow-primary/5">
                <div className={`h-1.5 ${contentTypeAccent.file.strip}`} />
                <div className="h-[80vh] bg-ink/5">
                  <iframe src={fileUrl} title={typedItem.title} className="w-full h-full" />
                </div>
              </div>
            ) : (
              <div className="bg-surface rounded-2xl border-2 border-ink/10 p-10 text-center">
                <p className="text-pink text-sm">الملف مش متاح دلوقتي، جرب تاني بعدين.</p>
              </div>
            )}
          </div>
        </RevealCard>
      )}

      {isTest && typedItem.tests && (
        <TestRunner testId={typedItem.id} courseId={id} title={typedItem.title} timeLimitMinutes={typedItem.tests.time_limit_minutes} />
      )}

      {isTest && previousAttempts.length > 0 && (
        // ⚠️ من غير RevealCard هنا عمدًا: العنصر ده طويل ومتغيّر الطول (عدد المحاولات)، وRevealCard
        // بيستخدم rotateX ثلاثي الأبعاد مع viewport={{once:false}} — بيتكسر بصريًا (تشويه شكل شبه منحرف)
        // على عناصر طويلة زي دي (نفس الباگ الموثّق قبل كده مع العناصر الطويلة).
        <div>
          <div className="rounded-2xl border-2 border-ink/10 bg-surface p-6 md:p-8">
            <h2 className="font-display font-black text-2xl text-primary mb-1">
              رحلتك مع{" "}
              <span className="marker" style={{ "--marker-color": "#00C2A8" } as React.CSSProperties}>
                الاختبار ده
              </span>
            </h2>
            <p className="text-ink/50 text-base mb-8">
              {previousAttempts.length === 1 ? "محاولة واحدة لحد دلوقتي" : `${previousAttempts.length} محاولات لحد دلوقتي`}
            </p>

            <div>
              {previousAttempts.map((attempt, i) => {
                const pct = pctOf(attempt);
                const t = scoreTier(pct);
                // الترتيب دلوقتي من الأحدث للأقدم — المحاولة "اللي قبلها زمنيًا" هي اللي جاية بعدها في القايمة
                const prevPct = i < previousAttempts.length - 1 ? pctOf(previousAttempts[i + 1]) : null;
                const isNewest = i === 0;
                const isLastRendered = i === previousAttempts.length - 1;
                return (
                  <div key={attempt.id} className="flex gap-4">
                    {/* السكة: الدايرة + الخط الواصل للمحاولة اللي بعدها، بيمتد لطول الصف نفسه بره أي حسابات مواقع يدوية */}
                    <div className="flex flex-col items-center shrink-0">
                      <span
                        className={`w-10 h-10 rounded-full flex items-center justify-center font-display font-black text-sm shrink-0 ${t.bg} ${t.text}`}
                      >
                        {pct ?? "—"}
                      </span>
                      {!isLastRendered && <div className="w-0.5 flex-1 bg-ink/10 my-1" />}
                    </div>
                    <div className={`flex-1 min-w-0 pt-1.5 ${isLastRendered ? "" : "pb-7"}`}>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-display font-bold text-lg">
                          {pct !== null ? `${pct}%` : "—"}{" "}
                          <span className="text-ink/40 text-base font-bold">
                            ({attempt.score}/{attempt.total_questions})
                          </span>
                        </p>
                        {isNewest && (
                          <span className="text-xs font-bold text-primary bg-primary/10 rounded-full px-2.5 py-1">آخر محاولة</span>
                        )}
                        {prevPct !== null && pct !== null && (
                          <span
                            className={`inline-flex items-center gap-1 text-sm font-bold rounded-full px-2.5 py-0.5 ${
                              pct > prevPct ? "bg-teal/10 text-teal" : pct < prevPct ? "bg-pink/10 text-pink" : "bg-ink/5 text-ink/50"
                            }`}
                          >
                            {pct > prevPct ? `↑ تحسّنت ${pct - prevPct}%` : pct < prevPct ? `↓ قلّت ${prevPct - pct}%` : "= زي المرة اللي فاتت"}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                        <p className="text-ink/40 text-sm">
                          {attempt.completed_at ? new Date(attempt.completed_at).toLocaleDateString("ar-EG") : ""}
                        </p>
                        <Link
                          href={`/courses/${id}/content/${itemId}/attempt/${attempt.id}`}
                          className="text-primary text-sm font-bold hover:text-pink transition-colors"
                        >
                          راجع إجاباتك ←
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
