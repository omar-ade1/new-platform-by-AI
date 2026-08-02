"use client";

import { motion, useScroll, useSpring } from "framer-motion";

export default function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 });

  return (
    <motion.div
      style={{ scaleX, transformOrigin: "right" }}
      className="print:hidden fixed top-0 left-0 right-0 h-1 bg-gradient-to-l from-pink via-yellow to-teal z-[60]"
    />
  );
}