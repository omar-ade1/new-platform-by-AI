"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { QuestionCategory } from "@/lib/supabase/questionBank";

export default function QuestionBankCategoryModal({
  modal,
  title,
  onTitleChange,
  parentId,
  onParentIdChange,
  parentOptions,
  saving,
  onSave,
  onClose,
}: {
  modal: { mode: "add" | "edit"; category: QuestionCategory | null; parentId: string | null } | null;
  title: string;
  onTitleChange: (value: string) => void;
  parentId: string;
  onParentIdChange: (value: string) => void;
  parentOptions: QuestionCategory[];
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
            className="bg-surface rounded-xl p-7 w-full max-w-lg"
          >
            <h2 className="font-display font-bold text-xl text-primary mb-6">{modal.mode === "add" ? "تصنيف جديد" : "تعديل التصنيف"}</h2>
            <form onSubmit={onSave} className="space-y-5">
              <div>
                <label className="block font-bold text-base mb-2">الاسم *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => onTitleChange(e.target.value)}
                  className="w-full rounded-lg border border-ink/15 px-4 py-3 text-base focus:border-primary outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block font-bold text-base mb-2">التصنيف الأب</label>
                <select
                  value={parentId}
                  onChange={(e) => onParentIdChange(e.target.value)}
                  className="w-full rounded-lg border border-ink/15 px-4 py-3 text-base focus:border-primary outline-none transition-colors bg-surface"
                >
                  <option value="">بدون (تصنيف رئيسي)</option>
                  {parentOptions.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-3 rounded-lg bg-primary text-white font-display font-bold text-base hover:bg-pink transition-colors disabled:opacity-60"
                >
                  {saving ? "جاري الحفظ..." : "حفظ"}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-3 rounded-lg border border-ink/15 font-bold text-base hover:bg-ink/5 transition-colors"
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
