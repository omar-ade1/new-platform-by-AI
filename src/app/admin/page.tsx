// app/admin/page.tsx
import AdminPageHeader from "@/components/admin/AdminPageHeader";

export default function AdminOverviewPage() {
  return (
    <div>
      <AdminPageHeader title="أهلاً بيك في لوحة التحكم" description="من هنا تقدر تدير الدورات، الأقسام، بنك الأسئلة، وتسجيل الطلاب." />
    </div>
  );
}
