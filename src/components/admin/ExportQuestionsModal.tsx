"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { buildQuestionsCsv } from "@/lib/questionsCsv";
import { toMemoRows, type ExportQuestion } from "@/lib/questionExportMap";
import { buildQuestionMemoDocx, MEMO_THEMES, type MemoThemeId } from "@/lib/questionMemoDocx";
import { buildQuestionMemoHtml } from "@/lib/questionMemoHtml";

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

const LARGE_EXPORT_THRESHOLD = 500;

type ExportFormat = "csv" | "word";

export default function ExportQuestionsModal({
  open,
  onClose,
  defaultTitle,
  loadQuestions,
}: {
  open: boolean;
  onClose: () => void;
  defaultTitle: string;
  loadQuestions: () => Promise<ExportQuestion[]>;
}) {
  const [title, setTitle] = useState(defaultTitle);
  const [format, setFormat] = useState<ExportFormat>("csv");
  const [themeId, setThemeId] = useState<MemoThemeId>("default");
  const [optionsInline, setOptionsInline] = useState(true);
  const [generating, setGenerating] = useState<"none" | "csv" | "unsolved" | "solved">("none");
  const [questions, setQuestions] = useState<ExportQuestion[] | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle(defaultTitle);
    setQuestions(null);
    setLoadError(false);
    loadQuestions()
      .then(setQuestions)
      .catch(() => setLoadError(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function handleClose() {
    if (generating !== "none") return;
    onClose();
  }

  async function handleDownload(showAnswers?: boolean) {
    if (!title.trim()) {
      toast.error("محتاج اسم للملف الأول");
      return;
    }
    if (!questions || questions.length === 0) return;

    setGenerating(format === "csv" ? "csv" : showAnswers ? "solved" : "unsolved");
    try {
      const rows = toMemoRows(questions);
      if (format === "csv") {
        const blob = new Blob(["﻿" + buildQuestionsCsv(rows)], { type: "text/csv;charset=utf-8;" });
        downloadBlob(blob, `${title.trim()}.csv`);
      } else {
        const blob = await buildQuestionMemoDocx(rows, { title: title.trim(), showAnswers: !!showAnswers, themeId, optionsInline });
        downloadBlob(blob, `${title.trim()} (${showAnswers ? "محلولة" : "بدون حل"}).docx`);
      }
      toast.success("اتنزّل الملف");
    } catch {
      toast.error("حصل خطأ في تجهيز الملف");
    }
    setGenerating("none");
  }

  function handlePrintPdf(showAnswers: boolean) {
    if (!title.trim()) {
      toast.error("محتاج اسم للملف الأول");
      return;
    }
    if (!questions || questions.length === 0) return;

    const rows = toMemoRows(questions);
    const html = buildQuestionMemoHtml(rows, { title: title.trim(), showAnswers, themeId, optionsInline });
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("المتصفح منع فتح نافذة الطباعة — فعّل النوافذ المنبثقة وحاول تاني");
      return;
    }
    printWindow.document.write(html);
    printWindow.document.close();
  }

  const canDownload = !!questions && questions.length > 0;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-ink/50 flex items-center justify-center p-4 z-50"
          onClick={handleClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-surface rounded-xl p-7 w-full max-w-3xl max-h-[85vh] overflow-y-auto"
          >
            <h2 className="font-display font-bold text-xl text-primary mb-2">تصدير الأسئلة</h2>
            <p className="text-ink/50 text-base mb-2">هيتم جلب الأسئلة من القاعدة مباشرة وتحويلها للصيغة اللي تختارها.</p>

            {questions === null && !loadError && <p className="text-ink/50 text-base mb-6">جاري تجهيز الأسئلة...</p>}
            {loadError && <p className="text-pink text-base font-bold mb-6">حصل خطأ في جلب الأسئلة</p>}
            {questions !== null && !loadError && (
              <p className="text-base font-bold mb-6">
                {questions.length === 0 ? (
                  <span className="text-pink">مفيش أسئلة في النطاق ده</span>
                ) : (
                  <>
                    <span className="text-teal">{questions.length}</span> سؤال جاهز للتصدير
                    {questions.length > LARGE_EXPORT_THRESHOLD && " — العدد كبير وممكن ياخد وقت في التجهيز"}
                  </>
                )}
              </p>
            )}

            <div className="space-y-6">
              <div>
                <label className="block font-bold text-base mb-2">اسم الملف *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-lg border border-ink/15 px-4 py-3 text-base focus:border-primary outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block font-bold text-base mb-2">الصيغة</label>
                <div className="flex flex-wrap gap-2.5">
                  <button
                    onClick={() => setFormat("csv")}
                    className={`rounded-full px-4 py-2.5 border-2 font-bold text-sm transition-colors ${
                      format === "csv" ? "border-primary bg-primary/10 text-primary" : "border-ink/10 hover:border-primary/30"
                    }`}
                  >
                    CSV (إكسل)
                  </button>
                  <button
                    onClick={() => setFormat("word")}
                    className={`rounded-full px-4 py-2.5 border-2 font-bold text-sm transition-colors ${
                      format === "word" ? "border-primary bg-primary/10 text-primary" : "border-ink/10 hover:border-primary/30"
                    }`}
                  >
                    Word (مذكرة)
                  </button>
                </div>
              </div>

              {format === "word" && (
                <>
                  <div>
                    <label className="block font-bold text-base mb-2">ثيم ألوان المذكرة</label>
                    <div className="flex flex-wrap gap-2.5">
                      {MEMO_THEMES.map((theme) => (
                        <button
                          key={theme.id}
                          onClick={() => setThemeId(theme.id)}
                          className={`flex items-center gap-2 rounded-full px-4 py-2.5 border-2 font-bold text-sm transition-colors ${
                            themeId === theme.id ? "border-primary bg-primary/10 text-primary" : "border-ink/10 hover:border-primary/30"
                          }`}
                        >
                          <span className="w-4 h-4 rounded-full shrink-0" style={{ background: theme.swatch }} />
                          {theme.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-base mb-2">شكل الاختيارات</label>
                    <div className="flex flex-wrap gap-2.5">
                      <button
                        onClick={() => setOptionsInline(true)}
                        className={`rounded-full px-4 py-2.5 border-2 font-bold text-sm transition-colors ${
                          optionsInline ? "border-primary bg-primary/10 text-primary" : "border-ink/10 hover:border-primary/30"
                        }`}
                      >
                        كل الاختيارات في صف واحد
                      </button>
                      <button
                        onClick={() => setOptionsInline(false)}
                        className={`rounded-full px-4 py-2.5 border-2 font-bold text-sm transition-colors ${
                          !optionsInline ? "border-primary bg-primary/10 text-primary" : "border-ink/10 hover:border-primary/30"
                        }`}
                      >
                        كل اختيار في سطر لوحده
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-8">
              {format === "csv" ? (
                <button
                  onClick={() => handleDownload()}
                  disabled={generating !== "none" || !canDownload}
                  className="flex-1 py-3 rounded-lg bg-primary text-white font-display font-bold text-base hover:bg-pink transition-colors disabled:opacity-40"
                >
                  {generating === "csv" ? "جاري التجهيز..." : "نزّل CSV"}
                </button>
              ) : (
                <>
                  <button
                    onClick={() => handleDownload(false)}
                    disabled={generating !== "none" || !canDownload}
                    className="px-5 py-3 rounded-lg border border-primary/20 text-primary font-display font-bold text-base hover:bg-primary/5 transition-colors disabled:opacity-40"
                  >
                    {generating === "unsolved" ? "جاري التجهيز..." : "نزّل (بدون حل)"}
                  </button>
                  <button
                    onClick={() => handleDownload(true)}
                    disabled={generating !== "none" || !canDownload}
                    className="px-5 py-3 rounded-lg bg-primary text-white font-display font-bold text-base hover:bg-pink transition-colors disabled:opacity-40"
                  >
                    {generating === "solved" ? "جاري التجهيز..." : "نزّل (محلولة)"}
                  </button>
                </>
              )}
              <button
                onClick={handleClose}
                disabled={generating !== "none"}
                className="px-6 py-3 rounded-lg border border-ink/15 font-bold text-base hover:bg-ink/5 transition-colors disabled:opacity-60"
              >
                إلغاء
              </button>
            </div>

            {format === "word" && (
              <div className="pt-5">
                <p className="text-ink/50 text-sm mb-2">
                  أو حوّلها لـ PDF مباشرة (بتفتح نافذة طباعة المتصفح — اختار &quot;حفظ كـ PDF&quot; منها)
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => handlePrintPdf(false)}
                    disabled={!canDownload}
                    className="px-5 py-3 rounded-lg border border-teal/30 text-teal font-display font-bold text-base hover:bg-teal/5 transition-colors disabled:opacity-40"
                  >
                    PDF (بدون حل)
                  </button>
                  <button
                    onClick={() => handlePrintPdf(true)}
                    disabled={!canDownload}
                    className="px-5 py-3 rounded-lg border border-teal/30 text-teal font-display font-bold text-base hover:bg-teal/5 transition-colors disabled:opacity-40"
                  >
                    PDF (محلولة)
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
