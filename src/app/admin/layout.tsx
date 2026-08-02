// app/admin/layout.tsx
import { redirect } from "next/navigation";
import AdminSidebar from "@/components/admin/AdminSidebar";
import { createClient } from "@/lib/supabase/server";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/access-denied?reason=not-authenticated");
  }

  const { data: profile, error } = await supabase.from("profiles").select("role").eq("id", user.id).single();

  if (error || profile?.role !== "admin") {
    redirect("/access-denied?reason=not-admin");
  }

  return (
    <div className="grid md:grid-cols-[280px_minmax(0,1fr)] print:block min-h-[calc(100vh-4rem)]">
      <AdminSidebar />
      <main className="p-6 md:p-10 min-w-0 overflow-x-hidden">{children}</main>
    </div>
  );
}
