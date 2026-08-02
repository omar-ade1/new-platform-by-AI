"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { Passage } from "@/components/admin/QuestionBankManager";

export default function QuestionBankPassageModal({
  modal,
  title,
  onTitleChange,
  body,
  onBodyChange,
  saving,
  onSave,
  onClose,
}: {
  modal: { mode: "add" | "edit"; passage: Passage | null } | null;
  title: string;
  onTitleChange: (value: string) => void;
  body: string;
  onBodyChange: (value: string) => void;
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
            className="bg-surface rounded-2xl p-8 w-full max-w-lg max-h-[85vh] overflow-y-auto"
          >
            <h2 className="font-display font-black text-2xl text-primary mb-2">{modal.mode === "add" ? "نص قراءة جديد" : "تعديل النص"}</h2>
            <p className="text-ink/50 text-base mb-6">تقدر تربط أكتر من سؤال بالنص ده بعد ما تحفظه.</p>
            <form onSubmit={onSave} className="space-y-5">
              <div>
                <label className="block font-bold text-base mb-2">عنوان النص *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => onTitleChange(e.target.value)}
                  className="w-full rounded-2xl border-2 border-ink/10 px-5 py-3.5 text-base focus:border-primary outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block font-bold text-base mb-2">نص الفقرة *</label>
                <textarea
                  required
                  rows={6}
                  value={body}
                  onChange={(e) => onBodyChange(e.target.value)}
                  className="w-full rounded-2xl border-2 border-ink/10 px-5 py-3.5 text-base focus:border-primary outline-none transition-colors resize-none"
                />
              </div>
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
