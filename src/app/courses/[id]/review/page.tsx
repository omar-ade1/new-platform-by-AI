// app/courses/[id]/review/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import ReviewRunner from "@/components/courses/ReviewRunner";
import { hasCourseAccess } from "@/lib/supabase/course-access";
import { createClient } from "@/lib/supabase/server";

export default async function CourseReviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ section?: string; test?: string; title?: string }>;
}) {
  const { id } = await params;
  const { section, test, title } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const access = await hasCourseAccess(supabase, user, id);
  if (!access) {
    redirect(`/access-denied?reason=${user ? "not-enrolled" : "not-authenticated"}`);
  }

  const { data: course } = await supabase.from("courses").select("title").eq("id", id).single();
  const scopeLabel = title ? `مراجعة "${title}"` : "مراجعة الدورة كلها";

  return (
    <section className="max-w-4xl mx-auto px-4 py-10 space-y-6">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Link href={`/courses/${id}`} className="text-primary/60 hover:text-primary font-bold transition-colors">
          {course?.title ?? "الدورة"}
        </Link>
        <span className="text-ink/30">/</span>
        <span className="text-ink/50">مراجعة الأسئلة الغلط</span>
      </div>

      <h1 className="font-display font-black text-3xl text-primary">{scopeLabel}</h1>

      <ReviewRunner courseId={id} sectionId={section ?? null} testId={test ?? null} scopeLabel={scopeLabel} />
    </section>
  );
}
