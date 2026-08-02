"use client";

import { motion } from "framer-motion";

type Token = { text: string; marker?: boolean; color?: string };

export default function AnimatedHeading({
  tokens,
  className = "",
  delay = 0,
  mode = "scroll", // "load" = يتحرك أول ما الصفحة تفتح | "scroll" = يتحرك كل ما يدخل الشاشة
}: {
  tokens: Token[];
  className?: string;
  delay?: number;
  mode?: "load" | "scroll";
}) {
  return (
    <span className={className}>
      {tokens.map((t, i) => (
        <span key={i} className="inline-block overflow-hidden align-bottom mx-1">
          <motion.span
            className={t.marker ? "marker inline-block" : "inline-block"}
            style={t.marker ? ({ "--marker-color": t.color ?? "#FFC93C" } as React.CSSProperties) : undefined}
            initial={{ y: "115%", rotate: 3 }}
            {...(mode === "load"
              ? { animate: { y: 0, rotate: 0 } }
              : {
                  whileInView: { y: 0, rotate: 0 },
                  viewport: { once: false, amount: 0.6 },
                  exit: { y: "115%", rotate: 3 },
                })}
            transition={{ duration: 0.6, delay: delay + i * 0.07, ease: [0.22, 1, 0.36, 1] }}
          >
            {t.text}
          </motion.span>
        </span>
      ))}
    </span>
  );
}