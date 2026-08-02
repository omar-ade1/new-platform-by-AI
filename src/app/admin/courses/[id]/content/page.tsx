// app/admin/courses/[id]/content/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
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
      <div className="flex items-center gap-2 text-sm text-ink/50 mb-4">
        <Link href="/admin/courses" className="hover:text-primary transition-colors">
          الدورات
        </Link>
        <span>/</span>
        <span className="text-ink">{course.title}</span>
      </div>
      <h1 className="font-display font-black text-2xl text-primary mb-1">إدارة محتوى: {course.title}</h1>
      <p className="text-ink/60 text-sm mb-6">الأقسام والوحدات والعناصر (فيديو/ملف/ملاحظة/اختبار) بتاعة الدورة دي</p>

      <CourseContentManager courseId={course.id} courseTitle={course.title} />
    </div>
  );
}
