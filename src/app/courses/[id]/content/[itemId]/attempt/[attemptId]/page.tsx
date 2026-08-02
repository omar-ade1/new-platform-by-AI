// app/courses/[id]/content/[itemId]/attempt/[attemptId]/page.tsx
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import QuestionReviewCard, { type ReviewQuestion } from "@/components/shared/QuestionReviewCard";
import { hasCourseAccess } from "@/lib/supabase/course-access";
import { createClient } from "@/lib/supabase/server";

type Review = { attempt_id: string; score: number; total_questions: number; review: ReviewQuestion[] };

export default async function AttemptReviewPage({
  params,
}: {
  params: Promise<{ id: string; itemId: string; attemptId: string }>;
}) {
  const { id, itemId, attemptId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const access = await hasCourseAccess(supabase, user, id);
  if (!access) {
    redirect(`/access-denied?reason=${user ? "not-enrolled" : "not-authenticated"}`);
  }

  const { data: item } = await supabase.from("content_items").select("id, title").eq("id", itemId).eq("type", "test").single();
  if (!item) notFound();

  const { data: course } = await supabase.from("courses").select("title").eq("id", id).single();

  const { data, error } = await supabase.rpc("get_test_attempt_review", { p_attempt_id: attemptId });
  if (error || !data) notFound();

  const result = data as Review;

  return (
    <section className="max-w-4xl mx-auto px-4 py-10 space-y-6">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Link href={`/courses/${id}`} className="text-primary/60 hover:text-primary font-bold transition-colors">
          {course?.title ?? "الدورة"}
        </Link>
        <span className="text-ink/30">/</span>
        <Link href={`/courses/${id}/content/${itemId}`} className="text-primary/60 hover:text-primary font-bold transition-colors">
          {item.title}
        </Link>
        <span className="text-ink/30">/</span>
        <span className="text-ink/50">مراجعة المحاولة</span>
      </div>

      <h1 className="font-display font-black text-3xl text-primary">{item.title}</h1>

      <div className="space-y-5">
        <div className="bg-surface rounded-2xl border-2 border-ink/10 p-8 text-center space-y-2">
          <p className="text-ink/50 text-base font-bold">نتيجتك</p>
          <p className="font-display font-black text-5xl text-teal">
            {result.score} <span className="text-ink/30 text-3xl">/ {result.total_questions}</span>
          </p>
        </div>

        {result.review.map((question, index, arr) => (
          <QuestionReviewCard
            key={question.id}
            question={question}
            index={index}
            showPassage={!!question.passage && question.passage.id !== (index > 0 ? arr[index - 1].passage?.id : undefined)}
          />
        ))}
      </div>
    </section>
  );
}
