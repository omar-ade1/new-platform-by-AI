"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import AnimatedHeading from "@/components/shared/AnimatedHeading";
import DecorShapes from "@/components/shared/DecorShapes";
import { EmailIcon, UserIcon } from "@/components/icons";

const headingTokens = [{ text: "عندك" }, { text: "سؤال", marker: true, color: "#00C2A8" }, { text: "؟" }];

// زخرفة هندسية ثابتة بألوان الهوية - نفس فلسفة صفحتي الدخول والتسجيل
const shapes = [
  { top: "5%", right: "-8%", size: 120, color: "#FFC93C", rotate: 14, opacity: 0.2 },
  { top: "55%", right: "8%", size: 70, color: "#00C2A8", rotate: -12, opacity: 0.28 },
  { top: "78%", right: "-2%", size: 100, color: "#FF5D8F", rotate: 6, opacity: 0.2 },
];

function PhoneIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13 1 .36 1.98.68 2.92a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.16-1.25a2 2 0 0 1 2.11-.45c.94.32 1.92.55 2.92.68A2 2 0 0 1 22 16.92Z" />
    </svg>
  );
}

function WhatsappIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.29-1.39a9.9 9.9 0 0 0 4.75 1.21h.01c5.46 0 9.9-4.45 9.9-9.91C21.96 6.45 17.5 2 12.04 2Zm5.8 14.08c-.24.68-1.4 1.3-1.93 1.38-.5.08-1.1.11-1.78-.11a16.3 16.3 0 0 1-1.62-.6c-2.85-1.23-4.7-4.1-4.85-4.29-.14-.19-1.16-1.54-1.16-2.94s.73-2.09.99-2.38c.26-.28.56-.35.75-.35h.53c.17 0 .4-.06.62.48.24.58.8 2 .87 2.14.07.14.11.31.02.5-.09.19-.14.31-.28.47-.14.17-.29.37-.42.5-.14.14-.28.29-.12.57.16.28.72 1.2 1.55 1.94 1.06.95 1.96 1.25 2.24 1.39.28.14.44.12.6-.07.17-.19.71-.83.9-1.11.19-.28.38-.24.63-.14.26.09 1.66.79 1.94.93.28.14.47.21.53.33.07.12.07.68-.17 1.36Z" />
    </svg>
  );
}

function MessageIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5 8.6 8.6 0 0 1-3.85-.9L3 20l1.05-3.5A8.5 8.5 0 1 1 21 11.5Z" />
    </svg>
  );
}

// رقم الأستاذ عادل - نفس الرقم المستخدم في الفوتر
const PHONE = "0557384408";
const PHONE_INTL = "966557384408"; // لو الرقم دولي لواتساب، عدّله لو مختلف

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // TODO: نربطها بمكان فعلي (Supabase table أو إيميل) بعدين
    setSent(true);
  }

  return (
    <section className="grid md:grid-cols-2 min-h-[calc(100vh-4rem)]">
      {/* ===== البانل البصري ===== */}
      <div className="relative order-2 md:order-1 bg-primary text-white overflow-hidden hidden md:flex flex-col justify-between p-12">
        <DecorShapes shapes={shapes} rotateDelta={5} durationBase={9} />

        <p className="relative font-display font-black text-2xl">
          الوجيز<span className="text-yellow">.</span>
        </p>

        <div className="relative">
          <p className="font-display font-black text-3xl leading-relaxed mb-8">
            مستني{" "}
            <span className="marker" style={{ "--marker-color": "#FFC93C" } as React.CSSProperties}>
              ترد
            </span>{" "}
            عليك
            <br />
            بأسرع وقت ممكن
          </p>

          <div className="space-y-3">
            <a href={`tel:${PHONE}`} className="flex items-center gap-4 bg-white/10 hover:bg-white/20 rounded-2xl p-4 transition-colors">
              <span className="w-11 h-11 rounded-xl bg-yellow text-primary flex items-center justify-center shrink-0">
                <PhoneIcon />
              </span>
              <div>
                <p className="font-display font-bold">اتصل مباشرة</p>
                <p className="text-white/60 text-sm" dir="ltr">
                  {PHONE}
                </p>
              </div>
            </a>

            <a
              href={`https://wa.me/${PHONE_INTL}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-4 bg-white/10 hover:bg-white/20 rounded-2xl p-4 transition-colors"
            >
              <span className="w-11 h-11 rounded-xl bg-teal text-primary flex items-center justify-center shrink-0">
                <WhatsappIcon />
              </span>
              <div>
                <p className="font-display font-bold">واتساب</p>
                <p className="text-white/60 text-sm">ابعتلنا رسالة على طول</p>
              </div>
            </a>
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
            ابعتلنا وهنرد عليك بأسرع وقت
          </motion.p>

          <AnimatePresence mode="wait">
            {sent ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="rounded-2xl bg-teal/10 border-2 border-teal text-center py-12 px-6"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.15, type: "spring", stiffness: 200, damping: 12 }}
                  className="w-14 h-14 mx-auto rounded-full bg-teal text-white flex items-center justify-center text-2xl mb-4"
                >
                  ✓
                </motion.div>
                <p className="font-display font-bold text-lg text-primary">تم استلام رسالتك</p>
                <p className="text-ink/60 mt-2 text-sm">هنرجعلك على إيميلك قريب.</p>
              </motion.div>
            ) : (
              <motion.form
                key="form"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5, delay: 0.6 }}
                onSubmit={handleSubmit}
                className="space-y-5"
              >
                <div>
                  <label className="block font-display font-bold mb-2 text-sm">الاسم</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 right-4 flex items-center text-ink/40">
                      <UserIcon />
                    </span>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
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
                  <label className="block font-display font-bold mb-2 text-sm">رسالتك</label>
                  <div className="relative">
                    <span className="absolute top-3 right-4 flex items-center text-ink/40">
                      <MessageIcon />
                    </span>
                    <textarea
                      required
                      rows={5}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      className="w-full rounded-xl border-2 border-ink/10 pr-12 pl-4 py-3 focus:border-primary outline-none transition-colors resize-none"
                      placeholder="اكتب استفسارك هنا..."
                    />
                  </div>
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  className="w-full py-3 rounded-full bg-primary text-white font-display font-bold hover:bg-pink transition-colors"
                >
                  إرسال
                </motion.button>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
