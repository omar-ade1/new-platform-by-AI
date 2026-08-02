// app/courses/[id]/content/[itemId]/page.tsx
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import RevealCard from "@/components/shared/RevealCard";
import TestRunner from "@/components/courses/TestRunner";
import MarkSeenButton from "@/components/courses/MarkSeenButton";
import MarkTestDoneButton from "@/components/courses/MarkTestDoneButton";
import { contentTypeAccent, contentTypeIcons, contentTypeLabels } from "@/components/courses/contentTypeIcons";
import { getEmbedUrl } from "@/lib/embedUrl";
import { formatFileSize } from "@/lib/format";
import { hasCourseAccess } from "@/lib/supabase/course-access";
import { createClient } from "@/lib/supabase/server";

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
  if (user) {
    const { data: progress } = await supabase
      .from("content_progress")
      .select("content_item_id")
      .eq("user_id", user.id)
      .eq("content_item_id", typedItem.id)
      .maybeSingle();
    alreadySeen = !!progress;

    if (isTest) {
      const { data: attempts } = await supabase
        .from("test_attempts")
        .select("score, total_questions")
        .eq("user_id", user.id)
        .eq("test_id", typedItem.id);
      testQualified = (attempts ?? []).some((a) => a.total_questions > 0 && a.score / a.total_questions >= 0.8);
    }
  }

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
    </section>
  );
}
