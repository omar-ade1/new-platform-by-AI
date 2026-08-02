"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import ThemeToggle from "@/components/layout/ThemeToggle";
import { supabase } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

const navLinks = [
  { href: "/", label: "الرئيسية" },
  { href: "/courses", label: "الدورات" },
  { href: "/contact", label: "تواصل معنا" },
];

const mobileItemVariants = {
  closed: { opacity: 0, y: -8 },
  open: { opacity: 1, y: 0 },
};

export default function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hoveredLink, setHoveredLink] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 8);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    let active = true;

    async function syncAuthState(currentUser: User | null) {
      setUser(currentUser);

      if (!currentUser) {
        setIsAdmin(false);
        return;
      }

      const { data: profile } = await supabase.from("profiles").select("role").eq("id", currentUser.id).single();
      if (active) setIsAdmin(profile?.role === "admin");
    }

    supabase.auth.getSession().then(({ data }) => {
      syncAuthState(data.session?.user ?? null).finally(() => {
        if (active) setCheckingAuth(false);
      });
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setTimeout(() => {
        syncAuthState(session?.user ?? null);
      }, 0);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  return (
    <header className="print:hidden sticky top-0 z-50 pt-3 px-3 md:px-4">
      {/* توهجات زخرفية خفيفة، جوه طبقة منفصلة ليها overflow-hidden بتاعها لوحدها —
          عشان متأثرش على أي حاجة تانية جوه الهيدر محتاجة تطلع بره حدوده (زي قايمة الثيمات) */}
      <div className="absolute inset-x-0 top-0 h-28 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute -top-10 right-16 w-32 h-32 rounded-full bg-yellow/25 blur-3xl"
          animate={{ x: [0, 18, 0], y: [0, 8, 0] }}
          transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute -top-6 left-40 w-28 h-28 rounded-full bg-teal/20 blur-3xl"
          animate={{ x: [0, -14, 0], y: [0, -6, 0] }}
          transition={{ duration: 13, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl">
        {/* شريط عائم بحد متدرج الألوان — بديل الخط البنفسجي البسيط اللي كان تحت الهيدر القديم */}
        <div
          className={`rounded-full p-[1.5px] bg-gradient-to-l from-pink via-primary to-teal transition-shadow ${
            scrolled ? "shadow-xl shadow-primary/15" : "shadow-lg shadow-primary/5"
          }`}
        >
          <div
            className={`rounded-full flex items-center justify-between h-14 md:h-16 px-3 md:px-5 backdrop-blur-xl transition-colors ${
              scrolled ? "bg-surface/95" : "bg-surface/75"
            }`}
          >
            <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
              <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-pink via-primary to-teal flex items-center justify-center font-display font-black text-white text-base shadow-md shadow-primary/30 group-hover:scale-105 transition-transform">
                و
              </span>
              <span className="font-display font-black text-xl text-primary">
                الوجيز
                <motion.span
                  className="inline-block text-pink"
                  animate={{ scale: [1, 1.35, 1] }}
                  transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                >
                  .
                </motion.span>
              </span>
            </Link>

            <nav
              className="hidden md:flex items-center gap-1 font-display font-bold"
              onMouseLeave={() => setHoveredLink(null)}
            >
              {navLinks.map((link) => {
                const isHovered = hoveredLink === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onMouseEnter={() => setHoveredLink(link.href)}
                    className={`relative px-4 py-2 rounded-full transition-colors ${isHovered ? "text-white" : "text-ink/70 hover:text-primary"}`}
                  >
                    {isHovered && (
                      <motion.span
                        layoutId="header-nav-pill"
                        className="absolute inset-0 bg-primary rounded-full -z-10"
                        transition={{ type: "spring", stiffness: 420, damping: 32 }}
                      />
                    )}
                    {link.label}
                  </Link>
                );
              })}
            </nav>

            <div className="flex items-center gap-2 md:gap-3">
              <ThemeToggle />

              <div className="hidden md:flex items-center gap-1">
                {checkingAuth ? null : user ? (
                  <>
                    {isAdmin && (
                      <Link href="/admin" className="px-4 py-2 font-display font-bold text-primary hover:text-pink transition-colors">
                        لوحة التحكم
                      </Link>
                    )}
                    <Link
                      href="/account"
                      className="px-5 py-2.5 rounded-full bg-primary text-white font-display font-bold hover:bg-pink hover:scale-105 hover:shadow-lg hover:shadow-primary/30 transition-all"
                    >
                      حسابي
                    </Link>
                  </>
                ) : (
                  <>
                    <Link href="/login" className="px-4 py-2 font-display font-bold text-primary hover:text-pink transition-colors">
                      تسجيل الدخول
                    </Link>
                    <Link
                      href="/signup"
                      className="px-5 py-2.5 rounded-full bg-primary text-white font-display font-bold hover:bg-pink hover:scale-105 hover:shadow-lg hover:shadow-primary/30 transition-all"
                    >
                      ابدأ مجانًا
                    </Link>
                  </>
                )}
              </div>

              <button
                className="md:hidden relative w-9 h-9 flex items-center justify-center text-primary shrink-0"
                onClick={() => setOpen((v) => !v)}
                aria-label={open ? "قفل القائمة" : "فتح القائمة"}
                aria-expanded={open}
              >
                <motion.span
                  className="absolute w-5 h-0.5 bg-primary rounded-full"
                  animate={{ rotate: open ? 45 : 0, y: open ? 0 : -6 }}
                  transition={{ duration: 0.25, ease: "easeInOut" }}
                />
                <motion.span
                  className="absolute w-5 h-0.5 bg-primary rounded-full"
                  animate={{ opacity: open ? 0 : 1, x: open ? 8 : 0 }}
                  transition={{ duration: 0.2 }}
                />
                <motion.span
                  className="absolute w-5 h-0.5 bg-primary rounded-full"
                  animate={{ rotate: open ? -45 : 0, y: open ? 0 : 6 }}
                  transition={{ duration: 0.25, ease: "easeInOut" }}
                />
              </button>
            </div>
          </div>
        </div>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.98 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="md:hidden mt-3 rounded-3xl border-2 border-ink/10 bg-surface shadow-xl overflow-hidden"
            >
              <motion.div
                initial="closed"
                animate="open"
                exit="closed"
                variants={{ open: { transition: { staggerChildren: 0.05, delayChildren: 0.05 } }, closed: {} }}
                className="flex flex-col gap-1 p-4 font-display font-bold"
              >
                {navLinks.map((link) => (
                  <motion.div key={link.href} variants={mobileItemVariants} transition={{ duration: 0.2 }}>
                    <Link
                      href={link.href}
                      onClick={() => setOpen(false)}
                      className="block py-3 px-4 rounded-2xl text-lg hover:bg-primary/5 hover:text-primary transition-colors"
                    >
                      {link.label}
                    </Link>
                  </motion.div>
                ))}

                {checkingAuth ? null : user ? (
                  <>
                    {isAdmin && (
                      <motion.div variants={mobileItemVariants} transition={{ duration: 0.2 }}>
                        <Link
                          href="/admin"
                          onClick={() => setOpen(false)}
                          className="block py-3 px-4 rounded-2xl text-lg hover:bg-primary/5 hover:text-primary transition-colors"
                        >
                          لوحة التحكم
                        </Link>
                      </motion.div>
                    )}
                    <motion.div variants={mobileItemVariants} transition={{ duration: 0.2 }} className="mt-2">
                      <Link
                        href="/account"
                        onClick={() => setOpen(false)}
                        className="block py-3.5 rounded-2xl bg-primary text-white text-center text-lg hover:bg-pink transition-colors"
                      >
                        حسابي
                      </Link>
                    </motion.div>
                  </>
                ) : (
                  <>
                    <motion.div variants={mobileItemVariants} transition={{ duration: 0.2 }}>
                      <Link
                        href="/login"
                        onClick={() => setOpen(false)}
                        className="block py-3 px-4 rounded-2xl text-lg hover:bg-primary/5 hover:text-primary transition-colors"
                      >
                        تسجيل الدخول
                      </Link>
                    </motion.div>
                    <motion.div variants={mobileItemVariants} transition={{ duration: 0.2 }} className="mt-2">
                      <Link
                        href="/signup"
                        onClick={() => setOpen(false)}
                        className="block py-3.5 rounded-2xl bg-primary text-white text-center text-lg hover:bg-pink transition-colors"
                      >
                        ابدأ مجانًا
                      </Link>
                    </motion.div>
                  </>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}
