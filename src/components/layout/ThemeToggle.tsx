"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { applyTheme, getStoredTheme, THEMES, type ThemeId } from "@/lib/theme";

export default function ThemeToggle() {
  const [active, setActive] = useState<ThemeId>("default");
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setActive(getStoredTheme());
  }, []);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  function choose(id: ThemeId) {
    applyTheme(id);
    setActive(id);
    setOpen(false);
  }

  const activeTheme = THEMES.find((t) => t.id === active) ?? THEMES[0];

  return (
    <div ref={rootRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        title="اختار الثيم"
        aria-label="اختار الثيم"
        className="w-10 h-10 rounded-full border-2 border-ink/10 flex items-center justify-center hover:border-primary/40 transition-colors shrink-0"
      >
        <span className="w-5 h-5 rounded-full" style={{ background: activeTheme.swatch }} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -6 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 top-full mt-2 z-50 bg-surface rounded-2xl border-2 border-ink/10 shadow-lg p-2 min-w-40"
          >
            {THEMES.map((t) => (
              <button
                key={t.id}
                onClick={() => choose(t.id)}
                className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-base font-bold transition-colors ${
                  t.id === active ? "bg-primary/10 text-primary" : "hover:bg-primary/5"
                }`}
              >
                <span className="w-5 h-5 rounded-full shrink-0" style={{ background: t.swatch }} />
                {t.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
