// app/account/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import ChangePasswordForm from "@/components/account/ChangePasswordForm";
import LogoutButton from "@/components/account/LogoutButton";
import { EmailIcon, PhoneIcon, UserIcon } from "@/components/icons";
import DecorShapes from "@/components/shared/DecorShapes";
import RevealCard from "@/components/shared/RevealCard";
import TopicPerformance, { type TopicStat } from "@/components/shared/TopicPerformance";
import { formatExpiryStatus } from "@/lib/enrollmentDuration";
import { scoreTier } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

const heroShapes = [
  { top: "8%", right: "-6%", size: 120, color: "#FF5D8F", rotate: 10, opacity: 0.18 },
  { top: "55%", right: "18%", size: 60, color: "#FFC93C", rotate: -15, opacity: 0.2 },
  { top: "75%", right: "-4%", size: 95, color: "#00C2A8", rotate: 8, opacity: 0.16 },
];

const courseAccents = ["bg-teal/15 text-teal", "bg-pink/15 text-pink", "bg-yellow/20 text-yellow", "bg-primary/10 text-primary"];

type Profile = {
  full_name: string;
  phone: string;
};

type Enrollment = {
  id: string;
  expires_at: string | null;
  courses: {
    id: string;
    title: string;
    image_url: string | null;
  };
};

type TestAttempt = {
  id: string;
  score: number;
  total_questions: number;
  completed_at: string | null;
  tests: {
    content_items: {
      id: string;
      title: string;
      units: { sections: { course_id: string; courses: { title: string } | null } | null } | null;
    };
  };
};

function tierColorOnDark(pct: number | null) {
  if (pct === null) return "text-white/40";
  if (pct >= 80) return "text-teal";
  if (pct >= 50) return "text-yellow";
  return "text-pink";
}

function InfoRow({ icon, label, value, ltr }: { icon: ReactNode; label: string; value: string; ltr?: boolean }) {
  return (
    <div className="flex items-center gap-4">
      <span className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">{icon}</span>
      <div className="min-w-0">
        <p className="text-sm text-ink/50">{label}</p>
        <p className={`font-bold text-base truncate ${ltr ? "text-right" : ""}`} dir={ltr ? "ltr" : undefined}>
          {value}
        </p>
      </div>
    </div>
  );
}

export default async function AccountPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/access-denied?reason=not-authenticated");
  }

  const [profileResult, enrollmentsResult, attemptsResult, topicsResult] = await Promise.all([
    supabase.from("profiles").select("full_name, phone").eq("id", user.id).single(),
    supabase.from("enrollments").select("id, expires_at, courses(id, title, image_url)").eq("user_id", user.id),
    supabase
      .from("test_attempts")
      .select("id, score, total_questions, completed_at, tests(content_items(id, title, units(sections(course_id, courses(title)))))")
      .eq("user_id", user.id)
      .not("test_id", "is", null)
      .order("completed_at", { ascending: false }),
    supabase.rpc("get_topic_performance", { p_user_id: user.id }),
  ]);

  const profile = profileResult.data as Profile | null;
  const enrollments = (enrollmentsResult.data as unknown as Enrollment[]) ?? [];
  const attempts = (attemptsResult.data as unknown as TestAttempt[]) ?? [];
  const topics = (topicsResult.data as TopicStat[] | null) ?? [];

  const percentages = attempts.filter((a) => a.total_questions > 0).map((a) => Math.round((a.score / a.total_questions) * 100));
  const avgScore = percentages.length ? Math.round(percentages.reduce((sum, p) => sum + p, 0) / percentages.length) : null;
  const bestScore = percentages.length ? Math.max(...percentages) : null;

  const stats = [
    { label: "الدورات المشترك بيها", value: enrollments.length, color: "text-teal" },
    { label: "اختبارات اتحلت", value: attempts.length, color: "text-yellow" },
    { label: "متوسط الدرجات", value: avgScore !== null ? `${avgScore}%` : "—", color: tierColorOnDark(avgScore) },
    { label: "أعلى نتيجة", value: bestScore !== null ? `${bestScore}%` : "—", color: tierColorOnDark(bestScore) },
  ];

  return (
    <section className="pb-16">
      {/* ===== الهيدر ===== */}
      <div className="relative bg-primary overflow-hidden">
        <DecorShapes shapes={heroShapes} rotateDelta={6} durationBase={9} />
        <div className="relative max-w-3xl mx-auto px-4 pt-14 pb-10 text-white space-y-8">
          <div>
            <p className="text-white/60 font-bold text-base">أهلاً بيك</p>
            <h1 className="font-display font-black text-4xl mt-1">{profile?.full_name || "طالب الوجيز"}</h1>
            <p className="text-white/60 text-base mt-2">كمّل في طريقك للتفوق في اختبار القدرات اللفظي</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {stats.map((s) => (
              <div key={s.label} className="bg-white/10 rounded-2xl p-4 text-center">
                <p className={`font-display font-black text-3xl ${s.color}`}>{s.value}</p>
                <p className="text-sm text-white/60 font-bold mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 pt-8 space-y-8">
        {/* ===== البيانات الشخصية ===== */}
        <RevealCard>
          <div className="bg-surface rounded-3xl border-2 border-ink/10 p-8 space-y-6 shadow-lg shadow-primary/5">
            <h2 className="font-display font-bold text-xl">البيانات الشخصية</h2>
            <div className="grid sm:grid-cols-2 gap-6">
              <InfoRow icon={<UserIcon />} label="الاسم" value={profile?.full_name || "—"} />
              <InfoRow icon={<EmailIcon />} label="البريد الإلكتروني" value={user.email ?? "—"} ltr />
              <InfoRow icon={<PhoneIcon />} label="رقم الهاتف" value={profile?.phone || "—"} ltr />
            </div>

            <ChangePasswordForm />
          </div>
        </RevealCard>

        {/* ===== الدورات المشترك بيها ===== */}
        <div className="space-y-4">
          <h2 className="font-display font-bold text-xl">الدورات المشترك بيها</h2>
          {enrollments.length === 0 ? (
            <p className="text-ink/50 text-base">لسه مش مشترك في أي دورة.</p>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {enrollments.map((e, i) => {
                const expiryStatus = formatExpiryStatus(e.expires_at);
                return (
                  <RevealCard key={e.id} delay={i * 0.05}>
                    <div className="bg-surface rounded-2xl border-2 border-ink/10 p-5 flex items-center gap-4 hover:-translate-y-1 hover:shadow-lg transition-all">
                      <div
                        className={`w-14 h-14 rounded-2xl flex items-center justify-center font-display font-black text-xl shrink-0 ${courseAccents[i % courseAccents.length]}`}
                      >
                        {e.courses?.title?.[0] || "د"}
                      </div>
                      <div className="min-w-0">
                        <p className="font-display font-bold text-lg truncate">{e.courses?.title}</p>
                        {expiryStatus && (
                          <p className={`text-sm font-bold mt-0.5 ${expiryStatus.expired ? "text-pink" : "text-ink/50"}`}>{expiryStatus.label}</p>
                        )}
                      </div>
                    </div>
                  </RevealCard>
                );
              })}
            </div>
          )}
        </div>

        {/* ===== نقاط القوة والضعف ===== */}
        {topics.length > 0 && (
          <div className="space-y-4">
            <h2 className="font-display font-bold text-xl">نقاط قوتك وضعفك</h2>
            <TopicPerformance topics={topics} />
          </div>
        )}

        {/* ===== نتائج الاختبارات ===== */}
        <div className="space-y-4">
          <h2 className="font-display font-bold text-xl">نتائج الاختبارات</h2>
          {attempts.length === 0 ? (
            <p className="text-ink/50 text-base">لسه مختبرتش أي اختبار.</p>
          ) : (
            <div className="bg-surface rounded-2xl border-2 border-ink/10 divide-y divide-ink/10">
              {attempts.map((a) => {
                const itemId = a.tests?.content_items?.id;
                const courseId = a.tests?.content_items?.units?.sections?.course_id;
                const courseTitle = a.tests?.content_items?.units?.sections?.courses?.title;
                const pct = a.total_questions > 0 ? Math.round((a.score / a.total_questions) * 100) : null;
                const tier = scoreTier(pct);

                const content = (
                  <>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-display font-bold text-lg">{a.tests?.content_items?.title || "اختبار"}</p>
                        {courseTitle && (
                          <span className="text-sm text-primary/60 bg-primary/5 rounded-full px-3 py-0.5 shrink-0">{courseTitle}</span>
                        )}
                      </div>
                      <p className="text-sm text-ink/50 mt-1">
                        {a.completed_at ? new Date(a.completed_at).toLocaleDateString("ar-EG") : "لسه محلّوش"} · {a.score}/{a.total_questions} إجابة صح
                      </p>
                      <div className="h-2 w-40 rounded-full bg-ink/10 overflow-hidden mt-2.5">
                        <div className={`h-full rounded-full ${tier.bar}`} style={{ width: `${pct ?? 0}%` }} />
                      </div>
                    </div>
                    <span className={`shrink-0 font-display font-black text-xl rounded-full px-4 py-2 ${tier.text} ${tier.bg}`}>
                      {pct !== null ? `${pct}%` : "—"}
                    </span>
                  </>
                );

                if (itemId && courseId) {
                  return (
                    <Link
                      key={a.id}
                      href={`/courses/${courseId}/content/${itemId}/attempt/${a.id}`}
                      className="flex items-center justify-between gap-4 p-5 hover:bg-primary/5 transition-colors"
                    >
                      {content}
                    </Link>
                  );
                }
                return (
                  <div key={a.id} className="flex items-center justify-between gap-4 p-5">
                    {content}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <LogoutButton />
      </div>
    </section>
  );
}
