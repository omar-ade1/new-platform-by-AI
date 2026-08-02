"use client";

import { motion } from "framer-motion";

export type Shape = {
  top: string;
  right: string;
  size: number;
  color: string;
  rotate: number;
  opacity: number;
};

// زخرفة هندسية ثابتة بألوان الهوية - بتتكرر في صفحات الدخول والتسجيل والتواصل
export default function DecorShapes({ shapes, rotateDelta = 6, durationBase = 8 }: { shapes: Shape[]; rotateDelta?: number; durationBase?: number }) {
  return (
    <>
      {shapes.map((s, i) => (
        <motion.div
          key={i}
          className="absolute rounded-2xl"
          style={{
            top: s.top,
            right: s.right,
            width: s.size,
            height: s.size,
            background: s.color,
            opacity: s.opacity,
          }}
          initial={{ rotate: s.rotate, scale: 0.9 }}
          animate={{ rotate: [s.rotate, s.rotate + rotateDelta, s.rotate], scale: [0.9, 1, 0.9] }}
          transition={{ duration: durationBase + i, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
    </>
  );
}
