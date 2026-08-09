"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { ReactNode } from "react";
import RevealCard from "@/components/shared/RevealCard";
import AnimatedHeading from "@/components/shared/AnimatedHeading";
import Accordion from "@/components/shared/Accordion";

const skills: { tag: string; desc: string; color: string; border: string; example: ReactNode }[] = [
  {
    tag: "تناظر لفظي",
    desc: "تدرّب على العلاقات بين الكلمات لحد ما تبقى بديهية.",
    color: "bg-pink",
    border: "border-pink/25",
    example: (
      <p className="font-display font-bold text-ink/70">
        سيف <span className="text-ink/30">:</span> قتال <span className="text-ink/30 mx-1">≈</span> فرشاة{" "}
        <span className="text-ink/30">:</span> <span className="text-ink/35">؟</span>
      </p>
    ),
  },
  {
    tag: "إكمال الجمل",
    desc: "اختار الكلمة المناسبة اللي تكمّل معنى الجملة صح.",
    color: "bg-yellow",
    border: "border-yellow/30",
    example: (
      <p className="font-display font-bold text-ink/70">
        ذاكر بجد، فـ <span className="inline-block w-14 border-b-2 border-dashed border-ink/30 align-middle" /> في الاختبار.
      </p>
    ),
  },
  {
    tag: "استيعاب المقروء",
    desc: "افهم النص، واستنتج الإجابة مش تدوّر عليها بس.",
    color: "bg-teal",
    border: "border-teal/25",
    example: <p className="font-bold text-ink/70 leading-relaxed">"من ذاكر بانتظام قبل الاختبار بأسابيع، قلّت عنده نسبة القلق..."</p>,
  },
  {
    tag: "الخطأ السياقي",
    desc: "لاقي الكلمة اللي مكانها غلط في وسط الجملة.",
    color: "bg-primary",
    border: "border-primary/20",
    example: (
      <p className="font-bold text-ink/70 leading-relaxed">
        شرب الطفل الماء لأنه كان <span className="line-through decoration-pink decoration-2 text-ink/35">جائعًا</span>{" "}
        <span className="text-teal">عطشانًا</span>.
      </p>
    ),
  },
];

const steps = [
  { n: "01", title: "اعمل حسابك", desc: "سجّل في أقل من دقيقة وابدأ فورًا من غير تعقيد." },
  { n: "02", title: "اختار القسم", desc: "روح على القسم اللي محتاج تذاكره، شوف الفيديو واقرأ الملفات." },
  { n: "03", title: "اختبر نفسك", desc: "حل الاختبار وشوف نتيجتك فورًا عشان تعرف مستواك الحقيقي." },
];

const faqs = [
  { q: "هل المنصة مجانية؟", a: "التسجيل في المنصة مجاني، وهيبقى فيه تفاصيل أكتر عن المحتوى المتاح بعد التسجيل." },
  { q: "هل الاختبارات بتديني نتيجة فورية؟", a: "أيوه، أول ما تخلّص الاختبار بتشوف نتيجتك على طول من غير استنى." },
  { q: "إزاي أتواصل مع الأستاذ عادل لو عندي استفسار؟", a: "تقدر تتواصل مباشرة على رقم 0557384408." },
];

const heroTokens = [{ text: "ذاكر" }, { text: "القدرات اللفظي", marker: true, color: "#FFC93C" }, { text: "زي" }, { text: "ما" }, { text: "بتحب،" }];

const skillsHeadingTokens = [
  { text: "كل" },
  { text: "أقسام" },
  { text: "اللفظي", marker: true, color: "#00C2A8" },
  { text: "في" },
  { text: "مكان" },
  { text: "واحد" },
];

export default function HomePage() {
  return (
    <>
      {/* ===== Hero: الادّعاء + نموذج سؤال حقيقي حي، مش مجرد كلام تسويقي ===== */}
      <section className="relative mx-auto max-w-6xl px-4 pt-16 pb-20 md:pb-28 overflow-hidden">
        <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-14 items-center">
          <div className="text-center lg:text-right">
            <h1 className="font-display font-black text-4xl md:text-6xl leading-tight text-primary">
              <AnimatedHeading tokens={heroTokens} mode="load" />
              <br className="hidden md:block" />
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 0.6 }} className="inline-block">
                مش زي ما اتعودت
              </motion.span>
            </h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.75 }}
              className="mt-6 text-lg text-ink/70 max-w-xl mx-auto lg:mx-0"
            >
              بنك أسئلة، شروحات، وفيديوهات مرتبة قسم قسم — عشان يوم الاختبار تكون مستعد فعلًا.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.9 }}
              className="mt-10 grid sm:grid-cols-2 gap-3 max-w-md mx-auto lg:mx-0"
            >
              <Link
                href="/signup"
                className="rounded-2xl bg-primary text-white px-6 py-4 flex flex-col items-center lg:items-start gap-0.5 hover:bg-pink hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/25 transition-all"
              >
                <span className="text-xs font-bold text-white/70">لسه ما سجلتش؟</span>
                <span className="font-display font-black text-lg">سجّل من هنا ←</span>
              </Link>
              <Link
                href="/login"
                className="group rounded-2xl border-2 border-primary text-primary px-6 py-4 flex flex-col items-center lg:items-start gap-0.5 hover:bg-primary hover:text-white hover:-translate-y-0.5 transition-all"
              >
                <span className="text-xs font-bold text-primary/60 group-hover:text-white/70 transition-colors">عندك حساب قبل كده؟</span>
                <span className="font-display font-black text-lg">سجّل دخول ←</span>
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 1.0 }}
              className="mt-4 flex justify-center lg:justify-start"
            >
              <Link href="#skills" className="text-sm font-bold text-ink/50 hover:text-primary transition-colors">
                أو شوف الأقسام الأول
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 1.1 }}
              className="mt-6 flex flex-wrap justify-center lg:justify-start gap-3"
            >
              <span className="text-sm font-bold text-ink/50 bg-ink/5 rounded-full px-4 py-1.5">٣٠٠+ سؤال في البنك</span>
              <span className="text-sm font-bold text-ink/50 bg-ink/5 rounded-full px-4 py-1.5">١٥+ سنة خبرة تدريس</span>
            </motion.div>
          </div>

          {/* نموذج سؤال تناظر لفظي حقيقي بيتحل قدام عينك — مش كارت إحصائيات عام */}
          <motion.div
            initial={{ opacity: 0, y: 30, rotate: -4 }}
            animate={{ opacity: 1, y: 0, rotate: -2 }}
            transition={{ duration: 0.7, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
            whileHover={{ rotate: 0 }}
            className="relative mx-auto w-full max-w-sm"
          >
            <div className="absolute -inset-3 rounded-[2rem] bg-gradient-to-br from-pink/15 via-yellow/10 to-teal/15 -z-10" />
            <div className="rounded-[1.75rem] border-2 border-ink/10 bg-surface p-7 shadow-xl">
              <div className="flex items-center gap-2 mb-6">
                <span className="w-2 h-2 rounded-full bg-pink" />
                <p className="font-display font-bold text-xs text-ink/40">تناظر لفظي — نموذج من البنك</p>
              </div>

              <div className="text-center font-display font-black text-2xl text-primary mb-3">
                طبيب <span className="text-ink/25 mx-1">:</span> مستشفى
              </div>
              <div className="h-px bg-ink/10 mb-3" />
              <div className="text-center font-display font-black text-2xl text-primary mb-2">
                معلم <span className="text-ink/25 mx-1">:</span>{" "}
                <motion.span
                  className="marker inline-block"
                  style={{ "--marker-color": "#FFC93C" } as React.CSSProperties}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 1.8 }}
                >
                  مدرسة
                </motion.span>
              </div>

              <p className="text-center text-xs text-ink/40 mt-5">أسئلة من نفس شكل وصعوبة اختبار القدرات الحقيقي</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ===== عن الأستاذ ===== */}
      <section className="mx-auto max-w-6xl px-4 py-20 border-t-2 border-ink/10">
        <div className="grid md:grid-cols-[auto_1fr] gap-10 items-center">
          <RevealCard>
            <div className="w-40 h-40 md:w-52 md:h-52 mx-auto rounded-3xl bg-primary flex items-center justify-center rotate-3">
              <span className="font-display font-black text-5xl text-white -rotate-3">ع.ف</span>
            </div>
          </RevealCard>

          <RevealCard delay={0.1}>
            <p className="font-display font-bold text-pink mb-2">مين اللي بيقدّملك المحتوى</p>
            <h2 className="font-display font-black text-3xl md:text-5xl text-primary leading-tight mb-4">الأستاذ عادل فؤاد عاشور</h2>
            <p className="text-ink/70 leading-relaxed max-w-xl mb-6">
              كل المحتوى في &quot;الوجيز&quot; — الأسئلة والشروحات والفيديوهات — متجهّز ومتابع مباشرة من الأستاذ عادل، عشان تضمن إن اللي بتذاكره مظبوط
              وعلى المستوى المطلوب لاختبار القدرات اللفظي.
            </p>
            <a
              href="tel:0557384408"
              dir="ltr"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-white font-display font-bold hover:bg-pink transition-colors"
            >
              📞 0557384408
            </a>
          </RevealCard>
        </div>
      </section>

      {/* ===== الأقسام — كل كارت فيه نموذج سؤال حقيقي مش وصف مجرد ===== */}
      <section id="skills" className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="font-display font-black text-3xl text-primary text-center mb-12">
          <AnimatedHeading tokens={skillsHeadingTokens} />
        </h2>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {skills.map((s, i) => (
            <RevealCard key={s.tag} delay={i * 0.1}>
              <div className={`rounded-2xl border-2 ${s.border} p-6 hover:-translate-y-1 hover:shadow-lg transition-all bg-surface h-full flex flex-col`}>
                <span className={`inline-block w-3 h-3 rounded-full ${s.color} mb-4`} />
                <h3 className="font-display font-bold text-lg mb-3">{s.tag}</h3>
                <div className="rounded-xl bg-ink/[0.03] px-3 py-3 mb-3 text-sm leading-relaxed">{s.example}</div>
                <p className="text-sm text-ink/60 leading-relaxed mt-auto">{s.desc}</p>
              </div>
            </RevealCard>
          ))}
        </div>
      </section>

      {/* ===== إزاي هتذاكر معانا ===== */}
      <section className="bg-surface border-y-2 border-ink/10">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <RevealCard>
            <h2 className="font-display font-black text-3xl text-primary text-center mb-14">
              إزاي هتذاكر{" "}
              <span className="marker" style={{ "--marker-color": "#FF5D8F" } as React.CSSProperties}>
                معانا
              </span>
              ؟
            </h2>
          </RevealCard>

          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step, i) => (
              <RevealCard key={step.n} delay={i * 0.12}>
                <div className="relative pr-2">
                  <span className="font-display font-black text-6xl text-primary/10 leading-none">{step.n}</span>
                  <h3 className="font-display font-bold text-xl text-primary -mt-6">{step.title}</h3>
                  <p className="text-sm text-ink/60 leading-relaxed mt-2">{step.desc}</p>
                </div>
              </RevealCard>
            ))}
          </div>
        </div>
      </section>

      {/* ===== أسئلة شائعة ===== */}
      <section className="mx-auto max-w-3xl px-4 py-20">
        <RevealCard>
          <h2 className="font-display font-black text-3xl text-primary text-center mb-12">
            أسئلة{" "}
            <span className="marker" style={{ "--marker-color": "#FFC93C" } as React.CSSProperties}>
              شائعة
            </span>
          </h2>
        </RevealCard>
        <RevealCard delay={0.1}>
          <Accordion items={faqs} />
        </RevealCard>
      </section>

      {/* ===== CTA ختامي ===== */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <RevealCard>
          <div className="relative rounded-3xl bg-primary text-white px-8 py-16 text-center overflow-hidden">
            <h2 className="font-display font-black text-3xl md:text-4xl mb-4">جاهز تبدأ؟</h2>
            <p className="text-white/70 mb-8 max-w-xl mx-auto">اختار الطريق اللي يناسبك وابدأ أول اختبار تجريبي في أقل من دقيقتين.</p>
            <div className="flex flex-wrap justify-center gap-4">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}>
                <Link
                  href="/signup"
                  className="inline-block px-8 py-3.5 rounded-full bg-yellow text-primary font-display font-bold hover:bg-surface transition-colors"
                >
                  لسه ما سجلتش؟ سجّل من هنا
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}>
                <Link
                  href="/login"
                  className="inline-block px-8 py-3.5 rounded-full border-2 border-white text-white font-display font-bold hover:bg-white hover:text-primary transition-colors"
                >
                  عندك حساب؟ سجّل دخول
                </Link>
              </motion.div>
            </div>
          </div>
        </RevealCard>
      </section>
    </>
  );
}
