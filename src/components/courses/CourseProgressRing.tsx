"use client";

import { motion } from "framer-motion";

// حلقة تقدّم دائرية سميكة بدل شريط رفيع — نفس منطق الشريط القديم (نسبة من 0 لـ100) بس بحجم
// وحضور أكبر في الهيرو، وبتتحرك بمن غير-شيء لحد النسبة بمجرد ما الصفحة تفتح.
export default function CourseProgressRing({ percent, size = 128 }: { percent: number; size?: number }) {
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const clamped = Math.min(100, Math.max(0, percent));

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <div className="absolute inset-0 rounded-full bg-yellow/25 blur-2xl" />
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="relative -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth={strokeWidth} />
        {/* pathLength (0-1) بدل حساب محيط الدائرة يدوي — framer-motion بيحسب stroke-dasharray/
        dashoffset بنفسه من طول الشكل الفعلي، أضمن ومتوافق مع أي تغيير مستقبلي في الحجم/نصف القطر */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#FFC93C"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: clamped / 100 }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="font-display font-black text-3xl text-white leading-none">{clamped}%</span>
      </div>
    </div>
  );
}
