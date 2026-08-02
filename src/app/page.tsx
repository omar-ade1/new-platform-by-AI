"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import RevealCard from "@/components/shared/RevealCard";
import AnimatedHeading from "@/components/shared/AnimatedHeading";
import Accordion from "@/components/shared/Accordion";

const skills = [
  { tag: "تناظر لفظي", desc: "تدرّب على العلاقات بين الكلمات لحد ما تبقى بديهية.", color: "bg-pink" },
  { tag: "إكمال الجمل", desc: "اختار الكلمة المناسبة اللي تكمّل معنى الجملة صح.", color: "bg-yellow" },
  { tag: "استيعاب المقروء", desc: "افهم النص، واستنتج الإجابة مش تدوّر عليها بس.", color: "bg-teal" },
  { tag: "الخطأ السياقي", desc: "لاقي الكلمة اللي مكانها غلط في وسط الجملة.", color: "bg-primary" },
];

// عدّل الأرقام دي بالأرقام الحقيقية بعد ما تجهز المحتوى
const stats = [
  { number: "٣٠٠+", label: "سؤال في البنك" },
  { number: "٦", label: "أقسام رئيسية" },
  { number: "١٥+", label: "سنة خبرة تدريس" },
  { number: "١٠٠٪", label: "شرح بالعربي" },
];

const steps = [
  { n: "01", title: "اعمل حسابك", desc: "سجّل في أقل من دقيقة وابدأ فورًا من غير تعقيد." },
  { n: "02", title: "اختار القسم", desc: "روح على القسم اللي محتاج تذاكره، شوف الفيديو واقرأ الملفات." },
  { n: "03", title: "اختبر نفسك", desc: "حل الاختبار وشوف نتيجتك فورًا عشان تعرف مستواك الحقيقي." },
];

// عدّل الأسئلة والإجابات دي زي ما يناسبك
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
      {/* ===== Hero ===== */}
      <section className="relative mx-auto max-w-6xl px-4 pt-16 pb-24 text-center overflow-hidden">
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
          className="mt-6 text-lg text-ink/70 max-w-2xl mx-auto"
        >
          بنك أسئلة، شروحات، وفيديوهات مرتبة قسم قسم — عشان يوم الاختبار تكون مستعد فعلًا.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.9 }}
          className="mt-10 flex justify-center gap-4"
        >
          <Link href="/signup" className="px-8 py-3 rounded-full bg-primary text-white font-display font-bold hover:bg-pink transition-colors">
            ابدأ التحضير مجانًا
          </Link>
          <Link
            href="#skills"
            className="px-8 py-3 rounded-full border-2 border-primary text-primary font-display font-bold hover:bg-primary hover:text-white transition-colors"
          >
            شوف الأقسام
          </Link>
        </motion.div>
      </section>

      {/* ===== شريط إحصائيات ===== */}
      <section className="border-y-2 border-ink/10 bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-10 grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((s, i) => (
            <RevealCard key={s.label} delay={i * 0.08}>
              <div className="text-center">
                <p className="font-display font-black text-3xl md:text-4xl text-primary">{s.number}</p>
                <p className="text-sm text-ink/60 mt-1">{s.label}</p>
              </div>
            </RevealCard>
          ))}
        </div>
      </section>

      {/* ===== عن الأستاذ ===== */}
      <section className="mx-auto max-w-6xl px-4 py-20">
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

      {/* ===== الأقسام ===== */}
      <section id="skills" className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="font-display font-black text-3xl text-primary text-center mb-12">
          <AnimatedHeading tokens={skillsHeadingTokens} />
        </h2>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {skills.map((s, i) => (
            <RevealCard key={s.tag} delay={i * 0.1}>
              <div className="rounded-2xl border-2 border-ink/10 p-6 hover:-translate-y-1 hover:shadow-lg transition-all bg-surface h-full">
                <motion.span
                  className={`inline-block w-3 h-3 rounded-full ${s.color} mb-4`}
                  animate={{ scale: [1, 1.3, 1] }}
                  transition={{ duration: 2, repeat: Infinity, delay: i * 0.3, ease: "easeInOut" }}
                />
                <h3 className="font-display font-bold text-lg mb-2">{s.tag}</h3>
                <p className="text-sm text-ink/60 leading-relaxed">{s.desc}</p>
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
            <p className="text-white/70 mb-8 max-w-xl mx-auto">سجّل دلوقتي وابدأ أول اختبار تجريبي في أقل من دقيقتين.</p>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }} className="inline-block">
              <Link
                href="/signup"
                className="inline-block px-8 py-3 rounded-full bg-yellow text-primary font-display font-bold hover:bg-surface transition-colors"
              >
                إنشاء حساب
              </Link>
            </motion.div>
          </div>
        </RevealCard>
      </section>
    </>
  );
}
