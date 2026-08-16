"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { Section } from "@/components/admin/CourseContentManager";

export type SectionModalState = { open: boolean; editing: Section | null; title: string; description: string };

export default function CourseSectionModal({
  modal,
  onModalChange,
  saving,
  onSave,
  onClose,
}: {
  modal: SectionModalState;
  onModalChange: (next: SectionModalState) => void;
  saving: boolean;
  onSave: (e: React.FormEvent) => void;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {modal.open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-ink/50 flex items-center justify-center p-4 z-50"
          onClick={saving ? undefined : onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-surface rounded-xl p-7 w-full max-w-lg"
          >
            <h2 className="font-display font-bold text-xl text-primary mb-6">{modal.editing ? "تعديل القسم" : "إضافة قسم جديد"}</h2>
            <form onSubmit={onSave} className="space-y-5">
              <div>
                <label className="block font-bold text-base mb-2">العنوان *</label>
                <input
                  type="text"
                  required
                  value={modal.title}
                  onChange={(e) => onModalChange({ ...modal, title: e.target.value })}
                  className="w-full rounded-lg border border-ink/15 px-4 py-3 text-base focus:border-primary outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block font-bold text-base mb-2">الوصف</label>
                <textarea
                  value={modal.description}
                  onChange={(e) => onModalChange({ ...modal, description: e.target.value })}
                  rows={2}
                  className="w-full rounded-lg border border-ink/15 px-4 py-3 text-base focus:border-primary outline-none transition-colors resize-none"
                />
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
                  disabled={saving}
                  className="px-6 py-3 rounded-lg border border-ink/15 font-bold text-base hover:bg-ink/5 transition-colors disabled:opacity-60"
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
