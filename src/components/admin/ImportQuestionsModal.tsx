"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { buildQuestionsCsvTemplate, parseQuestionsCsv, type ParsedQuestionRow } from "@/lib/questionsCsv";

function downloadTemplate() {
  // ﻿ (BOM) في الأول ضروري عشان Excel يفتح الملف كـ UTF-8 صح، وإلا بيحوّل العربي لرموز غريبة
  const blob = new Blob(["﻿" + buildQuestionsCsvTemplate()], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "نموذج_أسئلة.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export default function ImportQuestionsModal({
  open,
  onClose,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (rows: ParsedQuestionRow[]) => Promise<void>;
}) {
  const [rows, setRows] = useState<ParsedQuestionRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);

  function reset() {
    setRows([]);
    setFileName("");
    setParsing(false);
    setImporting(false);
  }

  function handleClose() {
    reset();
    onClose();
  }

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

  const validRows = rows.filter((r) => r.errors.length === 0);
  const invalidCount = rows.length - validRows.length;

  async function handleConfirm() {
    if (validRows.length === 0) return;
    setImporting(true);
    await onConfirm(validRows);
    setImporting(false);
    handleClose();
  }

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
            className="bg-surface rounded-2xl p-8 w-full max-w-3xl max-h-[85vh] overflow-y-auto"
          >
            <h2 className="font-display font-black text-2xl text-primary mb-2">استيراد أسئلة من ملف</h2>
            <p className="text-ink/50 text-base mb-6">
              ملف CSV فيه: نص السؤال، اختيار أ، اختيار ب، اختيار ج، اختيار د، الإجابة الصح (أ/ب/ج/د).{" "}
              <button onClick={downloadTemplate} className="text-primary font-bold hover:text-pink transition-colors">
                حمّل نموذج فاضي
              </button>
            </p>

            <label className="block">
              <span className="block font-bold text-base mb-2">الملف *</span>
              <input
                type="file"
                accept=".csv,text/csv"
                disabled={parsing || importing}
                onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
                className="w-full rounded-2xl border-2 border-ink/10 px-5 py-3.5 text-base focus:border-primary outline-none transition-colors disabled:opacity-60 file:ml-3 file:rounded-full file:border-0 file:bg-primary/10 file:px-4 file:py-2 file:text-primary file:font-bold"
              />
            </label>

            {parsing && <p className="text-ink/50 text-base mt-4">جاري قراءة {fileName}...</p>}

            {!parsing && rows.length > 0 && (
              <div className="mt-6 space-y-4">
                <p className="text-base font-bold">
                  هيتضاف <span className="text-teal">{validRows.length}</span> سؤال
                  {invalidCount > 0 && (
                    <>
                      {" "}
                      — <span className="text-pink">{invalidCount}</span> صف فيه مشاكل هيتم تجاهله
                    </>
                  )}
                </p>

                <div className="space-y-2.5 max-h-96 overflow-y-auto">
                  {rows.map((row) => (
                    <div
                      key={row.rowNumber}
                      className={`rounded-2xl border-2 p-4 ${row.errors.length > 0 ? "border-pink/40 bg-pink/5" : "border-ink/10"}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm text-ink/40 font-bold shrink-0">صف {row.rowNumber}</p>
                        {row.errors.length === 0 ? (
                          <span className="text-xs font-bold text-teal bg-teal/10 rounded-full px-2.5 py-1 shrink-0">جاهز</span>
                        ) : (
                          <span className="text-xs font-bold text-pink bg-pink/10 rounded-full px-2.5 py-1 shrink-0">هيتجاهل</span>
                        )}
                      </div>
                      <p className="font-bold text-base mt-1">{row.question_text || "—"}</p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {row.options.map((opt) => (
                          <span
                            key={opt.letter}
                            className={`text-sm rounded-full px-3 py-1 ${
                              opt.letter === row.correctLetter ? "bg-teal/15 text-teal font-bold" : "bg-ink/5 text-ink/60"
                            }`}
                          >
                            {opt.letter}) {opt.text || "—"}
                          </span>
                        ))}
                      </div>
                      {row.errors.length > 0 && <p className="text-sm text-pink mt-2">{row.errors.join(" · ")}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 pt-6">
              <button
                onClick={handleConfirm}
                disabled={validRows.length === 0 || importing}
                className="flex-1 py-3.5 rounded-full bg-primary text-white font-display font-bold text-base hover:bg-pink transition-colors disabled:opacity-40"
              >
                {importing ? "جاري الاستيراد..." : `أضف ${validRows.length || ""} سؤال`}
              </button>
              <button
                onClick={handleClose}
                disabled={importing}
                className="px-7 py-3.5 rounded-full border-2 border-ink/10 font-bold text-base hover:bg-ink/5 transition-colors disabled:opacity-60"
              >
                إلغاء
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
