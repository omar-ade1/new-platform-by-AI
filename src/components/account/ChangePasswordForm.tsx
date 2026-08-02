"use client";

import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase/client";

export default function ChangePasswordForm() {
  const [newPassword, setNewPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error("كلمة المرور لازم تكون 6 أحرف على الأقل");
      return;
    }

    setChangingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setChangingPassword(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("اتغيرت كلمة المرور بنجاح");
    setNewPassword("");
    setShowPasswordForm(false);
  }

  if (!showPasswordForm) {
    return (
      <button onClick={() => setShowPasswordForm(true)} className="text-primary font-display font-bold text-base hover:text-pink transition-colors">
        تغيير كلمة المرور
      </button>
    );
  }

  return (
    <form onSubmit={handleChangePassword} className="flex flex-col sm:flex-row gap-3 items-start">
      <input
        type="password"
        required
        minLength={6}
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        placeholder="كلمة المرور الجديدة"
        className="flex-1 w-full rounded-xl border-2 border-ink/10 px-4 py-2.5 text-base focus:border-primary outline-none transition-colors"
      />
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={changingPassword}
          className="px-5 py-2.5 rounded-full bg-primary text-white font-display font-bold text-base hover:bg-pink transition-colors disabled:opacity-60"
        >
          {changingPassword ? "جاري الحفظ..." : "حفظ"}
        </button>
        <button
          type="button"
          onClick={() => {
            setShowPasswordForm(false);
            setNewPassword("");
          }}
          className="px-5 py-2.5 rounded-full border-2 border-ink/10 font-display font-bold text-base hover:border-primary transition-colors"
        >
          إلغاء
        </button>
      </div>
    </form>
  );
}
