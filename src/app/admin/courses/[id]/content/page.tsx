// app/admin/courses/[id]/content/page.tsx
import { notFound } from "next/navigation";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import CourseContentManager from "@/components/admin/CourseContentManager";
import { createClient } from "@/lib/supabase/server";

export default async function AdminCourseContentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: course } = await supabase.from("courses").select("id, title").eq("id", id).single();

  if (!course) {
    notFound();
  }

  return (
    <div>
      <AdminPageHeader
        breadcrumb={[{ label: "الدورات", href: "/admin/courses" }, { label: course.title }]}
        title={`إدارة محتوى: ${course.title}`}
        description="الأقسام والوحدات والعناصر (فيديو/ملف/ملاحظة/اختبار) بتاعة الدورة دي"
      />

      <CourseContentManager courseId={course.id} courseTitle={course.title} />
    </div>
  );
}
