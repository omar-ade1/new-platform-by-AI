"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase/client";

export default function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await supabase.auth.signOut();
    toast.success("تم تسجيل الخروج");
    router.push("/");
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      className="w-full sm:w-auto px-8 py-3.5 rounded-full border-2 border-pink text-pink font-display font-bold text-base hover:bg-pink hover:text-white transition-colors"
    >
      تسجيل الخروج
    </button>
  );
}
