// app/admin/courses/[id]/content/[itemId]/questions/page.tsx
import { notFound } from "next/navigation";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
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
      <AdminPageHeader
        breadcrumb={[
          { label: "الدورات", href: "/admin/courses" },
          { label: course.title, href: `/admin/courses/${course.id}/content` },
          { label: item.title },
        ]}
        title={`أسئلة اختبار: ${item.title}`}
        description="ضيف أسئلة من بنك الأسئلة للاختبار ده ورتّبها"
      />

      <TestQuestionsManager testId={item.id} testTitle={item.title} />
    </div>
  );
}
