import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // بيسمح بفتح سيرفر التطوير من جهاز تاني على نفس شبكة الواي فاي (زي الموبايل) —
  // عنوان الجهاز المحلي بتاعك، لو اتغيّر (الراوتر بيغيّره أحيانًا) هتحتاج تحدّثه هنا
  allowedDevOrigins: ["10.108.250.161"],
};

export default nextConfig;
