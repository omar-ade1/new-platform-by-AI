"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import AnimatedHeading from "@/components/shared/AnimatedHeading";
import DecorShapes from "@/components/shared/DecorShapes";
import { EmailIcon, EyeIcon, LockIcon } from "@/components/icons";
import { supabase } from "@/lib/supabase/client";

const headingTokens = [{ text: "أهلاً" }, { text: "بيك", marker: true, color: "#FF5D8F" }, { text: "تاني" }];

// زخرفة هندسية ثابتة بألوان الهوية - مربعات مايلة بمقاسات وشفافيات مختلفة
const shapes = [
  { top: "8%", right: "10%", size: 90, color: "#FF5D8F", rotate: 12, opacity: 0.25 },
  { top: "60%", right: "-4%", size: 130, color: "#FFC93C", rotate: -8, opacity: 0.2 },
  { top: "78%", right: "28%", size: 55, color: "#00C2A8", rotate: 20, opacity: 0.3 },
  { top: "22%", right: "55%", size: 40, color: "#FFC93C", rotate: -15, opacity: 0.2 },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast.error("الإيميل أو كلمة المرور غلط");
      setLoading(false);
      return;
    }

    toast.success("أهلاً بيك تاني!");
    setLoading(false);
    router.push("/");
    router.refresh();
  }

  return (
    <section className="grid md:grid-cols-2 min-h-[calc(100vh-4rem)]">
      {/* ===== البانل البصري ===== */}
      <div className="relative order-2 md:order-1 bg-primary text-white overflow-hidden hidden md:flex flex-col justify-between p-12">
        <DecorShapes shapes={shapes} rotateDelta={6} durationBase={8} />

        <Link href="/" className="relative font-display font-black text-2xl">
          الوجيز<span className="text-yellow">.</span>
        </Link>

        <div className="relative">
          <p className="font-display font-black text-3xl leading-relaxed mb-6">
            &quot;النجاح مش{" "}
            <span className="marker" style={{ "--marker-color": "#FFC93C" } as React.CSSProperties}>
              صدفة
            </span>
            ،
            <br />
            هو مذاكرة صح من أول يوم.&quot;
          </p>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center font-display font-bold">ع.ف</div>
            <div>
              <p className="font-display font-bold">عادل فؤاد عاشور</p>
              <p className="text-white/60 text-sm">مؤسس منصة الوجيز</p>
            </div>
          </div>
        </div>

        <p className="relative text-white/50 text-sm">© {new Date().getFullYear()} الوجيز. كل الحقوق محفوظة.</p>
      </div>

      {/* ===== الفورم ===== */}
      <div className="order-1 md:order-2 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md">
          <h1 className="font-display font-black text-3xl md:text-4xl text-primary text-center mb-2">
            <AnimatedHeading tokens={headingTokens} mode="load" />
          </h1>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="text-center text-ink/60 mb-10"
          >
            سجّل دخولك عشان تكمّل من مكانك
          </motion.p>

          <motion.form
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            onSubmit={handleSubmit}
            className="space-y-5"
          >
            <div>
              <label className="block font-display font-bold mb-2 text-sm">البريد الإلكتروني</label>
              <div className="relative">
                <span className="absolute inset-y-0 right-4 flex items-center text-ink/40">
                  <EmailIcon />
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border-2 border-ink/10 pr-12 pl-4 py-3 focus:border-primary outline-none transition-colors"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="font-display font-bold text-sm">كلمة المرور</label>
                <Link href="#" className="text-xs text-primary hover:text-pink font-bold">
                  نسيت كلمة المرور؟
                </Link>
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 right-4 flex items-center text-ink/40">
                  <LockIcon />
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border-2 border-ink/10 pr-12 pl-12 py-3 focus:border-primary outline-none transition-colors"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 left-4 flex items-center text-ink/40 hover:text-primary transition-colors"
                  aria-label="إظهار/إخفاء كلمة المرور"
                >
                  <EyeIcon open={showPassword} />
                </button>
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm text-ink/60 cursor-pointer select-none">
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="w-4 h-4 rounded accent-primary" />
              فضّل تسجيل دخولي
            </label>

            <motion.button
              whileHover={{ scale: loading ? 1 : 1.02 }}
              whileTap={{ scale: loading ? 1 : 0.98 }}
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-full bg-primary text-white font-display font-bold hover:bg-pink transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? "جاري تسجيل الدخول..." : "تسجيل الدخول"}
            </motion.button>
          </motion.form>

          <p className="text-center text-sm text-ink/60 mt-6">
            لسه معندكش حساب؟{" "}
            <Link href="/signup" className="text-primary font-bold hover:text-pink">
              سجّل من هنا
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}
