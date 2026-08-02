"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import AnimatedHeading from "@/components/shared/AnimatedHeading";
import DecorShapes from "@/components/shared/DecorShapes";
import { EmailIcon, EyeIcon, LockIcon, PhoneIcon, UserIcon } from "@/components/icons";
import { supabase } from "@/lib/supabase/client";

const headingTokens = [{ text: "يلا" }, { text: "نبدأ", marker: true, color: "#FFC93C" }, { text: "سوا" }];

// زخرفة هندسية ثابتة بألوان الهوية - نفس فلسفة صفحة الدخول بترتيب مختلف
const shapes = [
  { top: "12%", right: "-6%", size: 110, color: "#00C2A8", rotate: -10, opacity: 0.25 },
  { top: "48%", right: "18%", size: 60, color: "#FF5D8F", rotate: 18, opacity: 0.3 },
  { top: "70%", right: "-2%", size: 140, color: "#FFC93C", rotate: 8, opacity: 0.18 },
  { top: "30%", right: "60%", size: 36, color: "#FF5D8F", rotate: -20, opacity: 0.25 },
];

const perks = [
  { title: "بنك أسئلة ضخم", desc: "مئات الأسئلة مرتبة قسم قسم." },
  { title: "شرح بالعامية", desc: "من الأستاذ عادل فؤاد عاشور مباشرة." },
  { title: "نتيجة فورية", desc: "تعرف مستواك أول ما تخلّص الاختبار." },
];

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function passwordStrength(pw: string) {
  if (!pw) return { level: 0, label: "" };
  let score = 0;
  if (pw.length >= 6) score++;
  if (pw.length >= 10) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (score <= 1) return { level: 1, label: "ضعيفة" };
  if (score <= 2) return { level: 2, label: "متوسطة" };
  if (score === 3) return { level: 3, label: "قوية" };
  return { level: 4, label: "قوية جدًا" };
}

const strengthColors = ["", "#FF5D8F", "#FFC93C", "#00C2A8", "#2D1B69"];

export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agree, setAgree] = useState(false);
  const [loading, setLoading] = useState(false);

  const strength = useMemo(() => passwordStrength(password), [password]);
  const passwordsMatch = confirmPassword.length > 0 && confirmPassword === password;
  const passwordsMismatch = confirmPassword.length > 0 && !passwordsMatch;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error("كلمة المرور وتأكيدها مش متطابقين");
      return;
    }
    if (!agree) {
      toast.error("لازم توافق على الشروط الأول");
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          phone: phone,
        },
      },
    });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    toast.success("اتعمل حسابك بنجاح!");
    setLoading(false);
    router.push("/login");
  }

  return (
    <section className="grid md:grid-cols-2 min-h-[calc(100vh-4rem)]">
      {/* ===== البانل البصري ===== */}
      <div className="relative order-2 md:order-1 bg-primary text-white overflow-hidden hidden md:flex flex-col justify-between p-12">
        <DecorShapes shapes={shapes} rotateDelta={-6} durationBase={9} />

        <Link href="/" className="relative font-display font-black text-2xl">
          الوجيز<span className="text-yellow">.</span>
        </Link>

        <div className="relative">
          <p className="font-display font-black text-3xl leading-relaxed mb-8">
            كل يوم بتأجّله،
            <br />
            سؤال{" "}
            <span className="marker" style={{ "--marker-color": "#FF5D8F" } as React.CSSProperties}>
              هتفوّته
            </span>
            .
          </p>

          <div className="space-y-4">
            {perks.map((p) => (
              <div key={p.title} className="flex items-start gap-3">
                <span className="mt-1 w-6 h-6 rounded-full bg-yellow text-primary flex items-center justify-center shrink-0">
                  <CheckIcon />
                </span>
                <div>
                  <p className="font-display font-bold">{p.title}</p>
                  <p className="text-white/60 text-sm">{p.desc}</p>
                </div>
              </div>
            ))}
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
            اعمل حسابك في أقل من دقيقة
          </motion.p>

          <motion.form
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            onSubmit={handleSubmit}
            className="space-y-5"
          >
            <div>
              <label className="block font-display font-bold mb-2 text-sm">الاسم بالكامل</label>
              <div className="relative">
                <span className="absolute inset-y-0 right-4 flex items-center text-ink/40">
                  <UserIcon />
                </span>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-xl border-2 border-ink/10 pr-12 pl-4 py-3 focus:border-primary outline-none transition-colors"
                  placeholder="اسمك هنا"
                />
              </div>
            </div>

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
              <label className="block font-display font-bold mb-2 text-sm">رقم الهاتف</label>
              <div className="relative">
                <span className="absolute inset-y-0 right-4 flex items-center text-ink/40">
                  <PhoneIcon />
                </span>
                <input
                  type="tel"
                  required
                  dir="ltr"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-xl border-2 border-ink/10 pr-12 pl-4 py-3 focus:border-primary outline-none transition-colors text-right"
                  placeholder="05xxxxxxxx"
                />
              </div>
            </div>

            <div>
              <label className="block font-display font-bold mb-2 text-sm">كلمة المرور</label>
              <div className="relative">
                <span className="absolute inset-y-0 right-4 flex items-center text-ink/40">
                  <LockIcon />
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border-2 border-ink/10 pr-12 pl-12 py-3 focus:border-primary outline-none transition-colors"
                  placeholder="6 أحرف على الأقل"
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

              {password.length > 0 && (
                <div className="mt-2">
                  <div className="flex gap-1 h-1.5">
                    {[1, 2, 3, 4].map((i) => (
                      <span
                        key={i}
                        className="flex-1 rounded-full transition-colors duration-300"
                        style={{
                          background: i <= strength.level ? strengthColors[strength.level] : "#1A103314",
                        }}
                      />
                    ))}
                  </div>
                  <p className="text-xs mt-1" style={{ color: strengthColors[strength.level] || "#1A1033" }}>
                    {strength.label}
                  </p>
                </div>
              )}
            </div>

            <div>
              <label className="block font-display font-bold mb-2 text-sm">تأكيد كلمة المرور</label>
              <div className="relative">
                <span className="absolute inset-y-0 right-4 flex items-center text-ink/40">
                  <LockIcon />
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`w-full rounded-xl border-2 pr-12 pl-4 py-3 outline-none transition-colors ${
                    passwordsMismatch
                      ? "border-pink focus:border-pink"
                      : passwordsMatch
                        ? "border-teal focus:border-teal"
                        : "border-ink/10 focus:border-primary"
                  }`}
                  placeholder="اعد كتابة كلمة المرور"
                />
                {passwordsMatch && (
                  <span className="absolute inset-y-0 left-4 flex items-center text-teal">
                    <CheckIcon />
                  </span>
                )}
              </div>
              {passwordsMismatch && <p className="text-xs mt-1 text-pink">كلمتا المرور مش متطابقتين</p>}
            </div>

            <label className="flex items-start gap-2 text-sm text-ink/60 cursor-pointer select-none">
              <input
                type="checkbox"
                required
                checked={agree}
                onChange={(e) => setAgree(e.target.checked)}
                className="w-4 h-4 mt-0.5 rounded accent-primary"
              />
              موافق على الشروط وسياسة الخصوصية
            </label>

            <motion.button
              whileHover={{ scale: loading ? 1 : 1.02 }}
              whileTap={{ scale: loading ? 1 : 0.98 }}
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-full bg-primary text-white font-display font-bold hover:bg-pink transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? "جاري إنشاء الحساب..." : "إنشاء الحساب"}
            </motion.button>
          </motion.form>

          <p className="text-center text-sm text-ink/60 mt-6">
            عندك حساب بالفعل؟{" "}
            <Link href="/login" className="text-primary font-bold hover:text-pink">
              سجّل دخولك
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}
