"use client";

import Link from "next/link";
import { motion } from "framer-motion";

function PhoneIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13 1 .36 1.98.68 2.92a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.16-1.25a2 2 0 0 1 2.11-.45c.94.32 1.92.55 2.92.68A2 2 0 0 1 22 16.92Z" />
    </svg>
  );
}

function WhatsappIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.29-1.39a9.9 9.9 0 0 0 4.75 1.21h.01c5.46 0 9.9-4.45 9.9-9.91C21.96 6.45 17.5 2 12.04 2Zm5.8 14.08c-.24.68-1.4 1.3-1.93 1.38-.5.08-1.1.11-1.78-.11a16.3 16.3 0 0 1-1.62-.6c-2.85-1.23-4.7-4.1-4.85-4.29-.14-.19-1.16-1.54-1.16-2.94s.73-2.09.99-2.38c.26-.28.56-.35.75-.35h.53c.17 0 .4-.06.62.48.24.58.8 2 .87 2.14.07.14.11.31.02.5-.09.19-.14.31-.28.47-.14.17-.29.37-.42.5-.14.14-.28.29-.12.57.16.28.72 1.2 1.55 1.94 1.06.95 1.96 1.25 2.24 1.39.28.14.44.12.6-.07.17-.19.71-.83.9-1.11.19-.28.38-.24.63-.14.26.09 1.66.79 1.94.93.28.14.47.21.53.33.07.12.07.68-.17 1.36Z" />
    </svg>
  );
}

// نفس الرقم المستخدم في صفحة تواصل معنا
const PHONE = "0557384408";
const PHONE_INTL = "966557384408";

const quickLinks = [
  { href: "/", label: "الرئيسية" },
  { href: "/login", label: "تسجيل الدخول" },
  { href: "/signup", label: "إنشاء حساب" },
  { href: "/contact", label: "تواصل معنا" },
];

export default function Footer() {
  return (
    <footer className="print:hidden relative overflow-hidden bg-primary text-white mt-28 rounded-t-[2.5rem] md:rounded-t-[3.5rem]">
      <div className="h-[3px] rounded-t-[2.5rem] md:rounded-t-[3.5rem] bg-gradient-to-l from-pink via-yellow to-teal" />

      {/* توهجات زخرفية بألوان الهوية، بتتحرك ببطء خلف المحتوى */}
      <motion.div
        className="absolute -top-16 right-10 w-64 h-64 rounded-full bg-pink/15 blur-3xl pointer-events-none"
        animate={{ x: [0, 20, 0], y: [0, 12, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-0 left-0 w-72 h-72 rounded-full bg-teal/15 blur-3xl pointer-events-none"
        animate={{ x: [0, -16, 0], y: [0, -10, 0] }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute top-1/3 left-1/3 w-40 h-40 rounded-full bg-yellow/10 blur-3xl pointer-events-none"
        animate={{ x: [0, 12, 0], y: [0, -14, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* واترمارك اسم المنصة كخلفية زخرفية */}
      <p
        aria-hidden
        className="pointer-events-none select-none absolute -bottom-10 -left-4 font-display font-black text-white/[0.05] text-[12rem] leading-none hidden md:block"
      >
        الوجيز
      </p>

      <div className="relative z-10 mx-auto max-w-6xl px-4 pt-16 pb-14 grid gap-10 md:grid-cols-3">
        <div>
          <div className="flex items-center gap-2.5 mb-4">
            <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-pink via-yellow to-teal flex items-center justify-center font-display font-black text-primary text-base shadow-md shadow-black/10">
              و
            </span>
            <p className="font-display font-black text-2xl">
              الوجيز<span className="text-yellow">.</span>
            </p>
          </div>
          <p className="text-white/70 text-sm leading-relaxed max-w-xs">
            منصة تدريب مكثّف على اختبار القدرات اللفظي، مع الأستاذ عادل فؤاد عاشور.
          </p>
        </div>

        <div>
          <p className="font-display font-bold mb-4">روابط سريعة</p>
          <ul className="space-y-2.5 text-white/70 text-sm">
            {quickLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="group relative inline-block hover:text-yellow transition-colors">
                  {link.label}
                  <span className="absolute -bottom-0.5 right-0 left-0 h-px bg-yellow scale-x-0 group-hover:scale-x-100 origin-right transition-transform duration-300" />
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="font-display font-bold mb-4">تواصل</p>
          <p className="text-white/70 text-sm mb-3">أ. عادل فؤاد عاشور</p>
          <div className="space-y-2.5">
            <a href={`tel:${PHONE}`} className="flex items-center gap-3 text-white/80 hover:text-yellow transition-colors w-fit">
              <span className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                <PhoneIcon />
              </span>
              <span dir="ltr" className="text-sm">
                {PHONE}
              </span>
            </a>
            <a
              href={`https://wa.me/${PHONE_INTL}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 text-white/80 hover:text-teal transition-colors w-fit"
            >
              <span className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                <WhatsappIcon />
              </span>
              <span className="text-sm">واتساب</span>
            </a>
          </div>
        </div>
      </div>

      <div className="relative z-10 border-t border-white/10 py-4 text-center text-white/50 text-xs">
        © {new Date().getFullYear()} الوجيز. كل الحقوق محفوظة.
      </div>
    </footer>
  );
}
