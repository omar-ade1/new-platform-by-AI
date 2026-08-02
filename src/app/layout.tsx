import type { Metadata } from "next";
import { Cairo, Tajawal } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import ScrollProgress from "@/components/layout/ScrollProgress";
import { Toaster } from "sonner";

const cairo = Cairo({
  subsets: ["arabic"],
  weight: ["600", "700", "800", "900"],
  variable: "--font-cairo",
});

const tajawal = Tajawal({
  subsets: ["arabic"],
  weight: ["400", "500", "700"],
  variable: "--font-tajawal",
});

export const metadata: Metadata = {
  title: "الوجيز | منصة تحضير اختبار القدرات اللفظي",
  description: "حضّر لاختبار القدرات اللفظي مع الأستاذ عادل فؤاد عاشور",
};

// بيتنفذ قبل أي paint عشان يمنع "فلاش" الثيم الافتراضي قبل ما جافاسكريبت الصفحة يشتغل عادي —
// نفس النمط المستخدم في next-themes وأمثاله، هنا يدوي لأنه 3 قيم ثابتة بس.
const THEME_INIT_SCRIPT = `
(function () {
  try {
    var t = localStorage.getItem("theme");
    if (t === "green" || t === "dark") document.documentElement.setAttribute("data-theme", t);
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body className={`${cairo.variable} ${tajawal.variable} font-body bg-bg text-ink`}>
        <Script id="theme-init" strategy="beforeInteractive">
          {THEME_INIT_SCRIPT}
        </Script>
        <ScrollProgress />
        <Header />
        <main>{children}</main>
        <Toaster position="top-center" richColors />
        <Footer />
      </body>
    </html>
  );
}
