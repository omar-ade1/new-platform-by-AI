"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { Passage, Question } from "@/components/admin/TestQuestionsManager";

export default function TestEditQuestionModal({
  modal,
  text,
  onTextChange,
  passageId,
  onPassageIdChange,
  passages,
  saving,
  onSave,
  onClose,
}: {
  modal: Question | null;
  text: string;
  onTextChange: (value: string) => void;
  passageId: string;
  onPassageIdChange: (value: string) => void;
  passages: Passage[];
  saving: boolean;
  onSave: (e: React.FormEvent) => void;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {modal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-ink/50 flex items-center justify-center p-4 z-50"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-surface rounded-2xl p-8 w-full max-w-lg"
          >
            <h2 className="font-display font-black text-2xl text-primary mb-6">تعديل السؤال</h2>
            <form onSubmit={onSave} className="space-y-5">
              <div>
                <label className="block font-bold text-base mb-2">نص السؤال *</label>
                <textarea
                  required
                  rows={3}
                  value={text}
                  onChange={(e) => onTextChange(e.target.value)}
                  className="w-full rounded-2xl border-2 border-ink/10 px-5 py-3.5 text-base focus:border-primary outline-none transition-colors resize-none"
                />
              </div>

              {passages.length > 0 && (
                <div>
                  <label className="block font-bold text-base mb-2">نص القراءة المرتبط</label>
                  <select
                    value={passageId}
                    onChange={(e) => onPassageIdChange(e.target.value)}
                    className="w-full rounded-2xl border-2 border-ink/10 px-5 py-3.5 text-base focus:border-primary outline-none transition-colors bg-surface"
                  >
                    <option value="">بدون نص (سؤال مستقل)</option>
                    {passages.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <p className="text-sm text-ink/40">التعديل هنا بيعدّل السؤال في بنك الأسئلة نفسه، مش نسخة منفصلة للاختبار ده.</p>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-3.5 rounded-full bg-primary text-white font-display font-bold text-base hover:bg-pink transition-colors disabled:opacity-60"
                >
                  {saving ? "جاري الحفظ..." : "حفظ"}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-7 py-3.5 rounded-full border-2 border-ink/10 font-bold text-base hover:bg-ink/5 transition-colors"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
