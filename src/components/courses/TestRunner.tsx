"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { toast } from "sonner";
import FormattedQuestionText from "@/components/shared/FormattedQuestionText";
import QuestionReviewCard, { type ReviewQuestion } from "@/components/shared/QuestionReviewCard";
import { supabase } from "@/lib/supabase/client";

const optionLetters = ["أ", "ب", "ج", "د", "هـ", "و", "ز", "ح"];

type Passage = { id: string; title: string; body: string };
type Option = { id: string; option_text: string; order_index: number; is_correct?: boolean };
type Question = {
  id: string;
  question_text: string;
  order_index: number;
  passage: Passage | null;
  options: Option[];
  selected_option_id?: string | null;
};
type TestData = { content_item_id: string; time_limit_minutes: number | null; questions: Question[] };
type SubmitResult = { attempt_id: string; score: number; total_questions: number; review: ReviewQuestion[] };

type Phase = "intro" | "loading" | "in_progress" | "submitting" | "submitted";

function formatClock(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function TestRunner({
  testId,
  courseId,
  title,
  timeLimitMinutes,
}: {
  testId: string;
  courseId: string;
  title: string;
  timeLimitMinutes: number | null;
}) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [testData, setTestData] = useState<TestData | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const submittingRef = useRef(false);

  async function handleStart() {
    setPhase("loading");
    const { data, error } = await supabase.rpc("get_test_for_attempt", { p_content_item_id: testId });
    if (error || !data) {
      toast.error("حصل خطأ في تحميل الاختبار");
      setPhase("intro");
      return;
    }
    const loaded = data as TestData;
    setTestData(loaded);
    setAnswers({});
    setSecondsLeft(loaded.time_limit_minutes ? loaded.time_limit_minutes * 60 : null);
    setPhase("in_progress");
  }

  function selectOption(questionId: string, optionId: string) {
    setAnswers((prev) => ({ ...prev, [questionId]: optionId }));
  }

  async function submitAttempt(auto: boolean) {
    if (submittingRef.current || !testData) return;
    submittingRef.current = true;
    setConfirmOpen(false);
    setPhase("submitting");

    const payload = testData.questions.map((q) => ({
      question_id: q.id,
      selected_option_id: answers[q.id] ?? null,
    }));

    const { data, error } = await supabase.rpc("submit_test_attempt", {
      p_content_item_id: testId,
      p_answers: payload,
    });

    submittingRef.current = false;

    if (error || !data) {
      toast.error("حصل خطأ في تسليم الاختبار");
      setPhase("in_progress");
      return;
    }

    if (auto) toast.info("خلص الوقت، الاختبار اتسلّم تلقائي");
    setResult(data as SubmitResult);
    setPhase("submitted");
  }

  useEffect(() => {
    if (phase !== "in_progress" || secondsLeft === null) return;
    if (secondsLeft <= 0) {
      const timeout = setTimeout(() => submitAttempt(true), 0);
      return () => clearTimeout(timeout);
    }
    const timer = setTimeout(() => setSecondsLeft((s) => (s === null ? null : s - 1)), 1000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, secondsLeft]);

  // لما النتيجة تظهر، نرجّع الصفحة لفوق بدل ما تفضل واقفة في نص/آخر الأسئلة اللي كان بيحلها
  useEffect(() => {
    if (phase === "submitted") window.scrollTo({ top: 0, behavior: "smooth" });
  }, [phase]);

  function handleRetry() {
    setTestData(null);
    setAnswers({});
    setResult(null);
    setSecondsLeft(null);
    setPhase("intro");
  }

  const answeredCount = useMemo(() => Object.keys(answers).length, [answers]);
  const totalQuestions = testData?.questions.length ?? 0;
  const unansweredCount = totalQuestions - answeredCount;

  if (phase === "intro" || phase === "loading") {
    return (
      <div className="bg-surface rounded-2xl border-2 border-ink/10 p-8 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-teal/10 text-teal flex items-center justify-center mx-auto">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <rect x="4" y="3" width="16" height="18" rx="2" />
            <path d="M9 8h6M9 12h6M9 16h4" />
          </svg>
        </div>
        <p className="text-ink/60 text-base">
          {timeLimitMinutes ? `مدة الاختبار: ${timeLimitMinutes} دقيقة` : "الاختبار من غير وقت محدد"}
        </p>
        <button
          onClick={handleStart}
          disabled={phase === "loading"}
          className="px-8 py-3.5 rounded-full bg-primary text-white font-display font-bold text-base hover:bg-pink transition-colors disabled:opacity-60"
        >
          {phase === "loading" ? "جاري التحميل..." : "ابدأ الاختبار"}
        </button>
      </div>
    );
  }

  if (phase === "in_progress" || phase === "submitting") {
    return (
      <div className="space-y-5">
        <div className="sticky top-2 z-10 flex items-center justify-between gap-3 bg-surface rounded-2xl border-2 border-ink/10 px-5 py-3.5 shadow-lg shadow-primary/5">
          <p className="text-base font-bold text-ink/60">اتجاوبت {answeredCount} من {totalQuestions}</p>
          {secondsLeft !== null && (
            <span className={`font-display font-black text-lg ${secondsLeft <= 60 ? "text-pink" : "text-primary"}`}>
              {formatClock(secondsLeft)}
            </span>
          )}
        </div>

        {testData?.questions.map((question, index, arr) => {
          const showPassage = !!question.passage && question.passage.id !== (index > 0 ? arr[index - 1].passage?.id : undefined);
          return (
            <div key={question.id} className="space-y-3">
              {showPassage && question.passage && (
                <div className="rounded-2xl bg-primary/5 border-2 border-primary/15 p-5">
                  <span className="text-xs font-bold text-primary bg-primary/15 rounded-full px-3 py-1.5">نص قراءة</span>
                  <p className="text-base text-ink/70 leading-relaxed whitespace-pre-wrap mt-2.5">{question.passage.body}</p>
                </div>
              )}
              <div className="bg-surface rounded-2xl border-2 border-ink/10 p-5 space-y-3.5">
                <div className="flex items-start gap-3">
                  <span className="w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm flex items-center justify-center shrink-0">
                    {index + 1}
                  </span>
                  <FormattedQuestionText html={question.question_text} className="flex-1 text-base font-bold leading-relaxed" />
                </div>
                <div className="space-y-2">
                  {question.options.map((option, optIndex) => {
                    const selected = answers[question.id] === option.id;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => selectOption(question.id, option.id)}
                        className={`w-full flex items-center gap-3 rounded-xl border-2 px-4 py-3.5 text-right transition-colors ${
                          selected ? "bg-primary/10 border-primary" : "bg-ink/[0.015] border-ink/10 hover:border-primary/30"
                        }`}
                      >
                        <span
                          className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-base shrink-0 ${
                            selected ? "bg-primary text-white" : "bg-surface text-ink/50 border-2 border-ink/10"
                          }`}
                        >
                          {optionLetters[optIndex] ?? optIndex + 1}
                        </span>
                        <span className="flex-1 min-w-0 text-base font-bold">{option.option_text}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}

        <button
          onClick={() => setConfirmOpen(true)}
          disabled={phase === "submitting"}
          className="w-full py-4 rounded-full bg-primary text-white font-display font-bold text-lg hover:bg-pink transition-colors disabled:opacity-60"
        >
          {phase === "submitting" ? "جاري التسليم..." : "سلّم الاختبار"}
        </button>

        <AnimatePresence>
          {confirmOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-ink/50 flex items-center justify-center p-4 z-50"
              onClick={() => setConfirmOpen(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ duration: 0.2 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-surface rounded-2xl p-8 w-full max-w-md"
              >
                <h2 className="font-display font-black text-2xl text-primary mb-2">تسليم الاختبار</h2>
                <p className="text-ink/60 text-base mb-6">
                  {unansweredCount > 0
                    ? `لسه فيه ${unansweredCount} سؤال من غير إجابة. متأكد عايز تسلّم كده؟`
                    : "متأكد عايز تسلّم الاختبار؟"}
                </p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => submitAttempt(false)}
                    className="flex-1 py-3.5 rounded-full bg-primary text-white font-display font-bold text-base hover:bg-pink transition-colors"
                  >
                    سلّم
                  </button>
                  <button
                    onClick={() => setConfirmOpen(false)}
                    className="px-7 py-3.5 rounded-full border-2 border-ink/10 font-bold text-base hover:bg-ink/5 transition-colors"
                  >
                    كمّل الاختبار
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // submitted
  return (
    <div className="space-y-5">
      <div className="bg-surface rounded-2xl border-2 border-ink/10 p-8 text-center space-y-2">
        <p className="text-ink/50 text-base font-bold">نتيجتك في {title}</p>
        <p className="font-display font-black text-5xl text-teal">
          {result?.score} <span className="text-ink/30 text-3xl">/ {result?.total_questions}</span>
        </p>
        <div className="flex items-center justify-center gap-3 flex-wrap mt-4">
          <button
            onClick={handleRetry}
            className="px-7 py-3 rounded-full border-2 border-primary/20 text-primary font-display font-bold text-base hover:bg-primary/5 transition-colors"
          >
            جرب تاني
          </button>
          {result && result.score < result.total_questions && (
            <Link
              href={`/courses/${courseId}/review?test=${testId}&title=${encodeURIComponent(title)}`}
              className="px-7 py-3 rounded-full bg-primary text-white font-display font-bold text-base hover:bg-pink transition-colors"
            >
              راجع أسئلتك الغلط دلوقتي
            </Link>
          )}
        </div>
      </div>

      {result?.review.map((question, index, arr) => (
        <QuestionReviewCard
          key={question.id}
          question={question}
          index={index}
          showPassage={!!question.passage && question.passage.id !== (index > 0 ? arr[index - 1].passage?.id : undefined)}
        />
      ))}
    </div>
  );
}
