"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

export default function RevealCard({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40, rotateX: -20, scale: 0.9 }}
      whileInView={{ opacity: 1, y: 0, rotateX: 0, scale: 1 }}
      viewport={{ once: false, amount: 0.4 }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      style={{ transformPerspective: 800 }}
    >
      {children}
    </motion.div>
  );
}