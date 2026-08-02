// app/admin/courses/[id]/content/[itemId]/questions/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import TestQuestionsManager from "@/components/admin/TestQuestionsManager";
import { createClient } from "@/lib/supabase/server";

export default async function AdminTestQuestionsPage({ params }: { params: Promise<{ id: string; itemId: string }> }) {
  const { id, itemId } = await params;
  const supabase = await createClient();

  const [{ data: course }, { data: item }] = await Promise.all([
    supabase.from("courses").select("id, title").eq("id", id).single(),
    supabase.from("content_items").select("id, title, type").eq("id", itemId).single(),
  ]);

  if (!course || !item || item.type !== "test") {
    notFound();
  }

  return (
    <div>
      <div className="flex items-center gap-2 text-sm text-ink/50 mb-4">
        <Link href="/admin/courses" className="hover:text-primary transition-colors">
          الدورات
        </Link>
        <span>/</span>
        <Link href={`/admin/courses/${course.id}/content`} className="hover:text-primary transition-colors">
          {course.title}
        </Link>
        <span>/</span>
        <span className="text-ink">{item.title}</span>
      </div>
      <h1 className="font-display font-black text-2xl text-primary mb-1">أسئلة اختبار: {item.title}</h1>
      <p className="text-ink/60 text-sm mb-6">ضيف أسئلة من بنك الأسئلة للاختبار ده ورتّبها</p>

      <TestQuestionsManager testId={item.id} testTitle={item.title} />
    </div>
  );
}
