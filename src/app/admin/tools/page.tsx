"use client";

import { useState } from "react";
import { toast } from "sonner";
import { buildQuestionMemoDocx, MEMO_THEMES, type MemoThemeId } from "@/lib/questionMemoDocx";
import { buildQuestionMemoHtml } from "@/lib/questionMemoHtml";
import { parseQuestionsCsv, type ParsedQuestionRow } from "@/lib/questionsCsv";

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AdminToolsPage() {
  const [rows, setRows] = useState<ParsedQuestionRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [parsing, setParsing] = useState(false);
  const [title, setTitle] = useState("");
  const [themeId, setThemeId] = useState<MemoThemeId>("default");
  const [optionsInline, setOptionsInline] = useState(true);
  const [generating, setGenerating] = useState<"none" | "unsolved" | "solved">("none");

  const validRows = rows.filter((r) => r.errors.length === 0);
  const invalidCount = rows.length - validRows.length;
  const canGenerate = validRows.length > 0 && title.trim().length > 0;

  async function handleFileChange(file: File | null) {
    if (!file) return;
    setParsing(true);
    setFileName(file.name);
    try {
      const text = await file.text();
      setRows(parseQuestionsCsv(text));
    } catch {
      toast.error("حصل خطأ في قراءة الملف");
    }
    setParsing(false);
  }

  async function handleDownload(showAnswers: boolean) {
    if (!canGenerate) return;
    setGenerating(showAnswers ? "solved" : "unsolved");
    try {
      const blob = await buildQuestionMemoDocx(validRows, { title: title.trim(), showAnswers, themeId, optionsInline });
      downloadBlob(blob, `${title.trim()} (${showAnswers ? "محلولة" : "بدون حل"}).docx`);
    } catch {
      toast.error("حصل خطأ في توليد الملف");
    }
    setGenerating("none");
  }

  function handlePrintPdf(showAnswers: boolean) {
    if (!canGenerate) return;
    const html = buildQuestionMemoHtml(validRows, { title: title.trim(), showAnswers, themeId, optionsInline });
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("المتصفح منع فتح نافذة الطباعة — فعّل النوافذ المنبثقة وحاول تاني");
      return;
    }
    printWindow.document.write(html);
    printWindow.document.close();
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display font-black text-3xl text-primary mb-2">أدوات عامة</h1>
        <p className="text-ink/60 text-lg">حوّل ملف أسئلة CSV لمذكرة Word جاهزة للطباعة</p>
      </div>

      <div className="rounded-2xl border-2 border-ink/10 bg-surface p-6 max-w-3xl space-y-6">
        <div>
          <h2 className="font-display font-bold text-xl mb-1">تحويل CSV إلى مذكرة Word</h2>
          <p className="text-ink/50 text-base">
            نفس شكل ملف استيراد الأسئلة (نص السؤال، اختيار أ/ب/ج/د، الإجابة الصح) — بيتحوّل لمذكرة منسّقة جاهزة للطباعة، بنسختين.
          </p>
        </div>

        <div>
          <label className="block font-bold text-base mb-2">اسم المذكرة *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="مثال: مذكرة التناظر اللفظي - الجزء الأول"
            className="w-full rounded-2xl border-2 border-ink/10 px-5 py-3.5 text-base focus:border-primary outline-none transition-colors"
          />
        </div>

        <div>
          <label className="block font-bold text-base mb-2">ملف الأسئلة (CSV) *</label>
          <input
            type="file"
            accept=".csv,text/csv"
            disabled={parsing}
            onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
            className="w-full rounded-2xl border-2 border-ink/10 px-5 py-3.5 text-base focus:border-primary outline-none transition-colors disabled:opacity-60 file:ml-3 file:rounded-full file:border-0 file:bg-primary/10 file:px-4 file:py-2 file:text-primary file:font-bold"
          />
        </div>

        {parsing && <p className="text-ink/50 text-base">جاري قراءة {fileName}...</p>}

        {!parsing && rows.length > 0 && (
          <div className="space-y-3">
            <p className="text-base font-bold">
              <span className="text-teal">{validRows.length}</span> سؤال جاهز
              {invalidCount > 0 && (
                <>
                  {" "}
                  — <span className="text-pink">{invalidCount}</span> صف فيه مشاكل هيتم تجاهله
                </>
              )}
            </p>
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {rows.map((row) => (
                <div
                  key={row.rowNumber}
                  className={`rounded-xl border-2 px-4 py-2.5 text-sm ${row.errors.length > 0 ? "border-pink/40 bg-pink/5 text-pink" : "border-ink/10"}`}
                >
                  <span className="font-bold text-ink/40 ml-2">صف {row.rowNumber}</span>
                  {row.errors.length > 0 ? row.errors.join(" · ") : row.question_text}
                </div>
              ))}
            </div>
          </div>
        )}

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

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            onClick={() => handleDownload(false)}
            disabled={!canGenerate || generating !== "none"}
            className="px-6 py-3.5 rounded-full border-2 border-primary/20 text-primary font-display font-bold text-base hover:bg-primary/5 transition-colors disabled:opacity-40"
          >
            {generating === "unsolved" ? "جاري التجهيز..." : "نزّل المذكرة (بدون حل)"}
          </button>
          <button
            onClick={() => handleDownload(true)}
            disabled={!canGenerate || generating !== "none"}
            className="px-6 py-3.5 rounded-full bg-primary text-white font-display font-bold text-base hover:bg-pink transition-colors disabled:opacity-40"
          >
            {generating === "solved" ? "جاري التجهيز..." : "نزّل المذكرة (محلولة)"}
          </button>
        </div>

        <div>
          <p className="text-ink/50 text-sm mb-2">
            أو حوّلها لـ PDF مباشرة (بتفتح نافذة طباعة المتصفح — اختار &quot;حفظ كـ PDF&quot; منها)
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => handlePrintPdf(false)}
              disabled={!canGenerate}
              className="px-6 py-3.5 rounded-full border-2 border-teal/30 text-teal font-display font-bold text-base hover:bg-teal/5 transition-colors disabled:opacity-40"
            >
              PDF (بدون حل)
            </button>
            <button
              onClick={() => handlePrintPdf(true)}
              disabled={!canGenerate}
              className="px-6 py-3.5 rounded-full border-2 border-teal/30 text-teal font-display font-bold text-base hover:bg-teal/5 transition-colors disabled:opacity-40"
            >
              PDF (محلولة)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
