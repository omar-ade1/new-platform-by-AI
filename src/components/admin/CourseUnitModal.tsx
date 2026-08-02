"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { Unit } from "@/components/admin/CourseContentManager";

export type UnitModalState = { open: boolean; sectionId: string | null; editing: Unit | null; title: string };

export default function CourseUnitModal({
  modal,
  onModalChange,
  saving,
  onSave,
  onClose,
}: {
  modal: UnitModalState;
  onModalChange: (next: UnitModalState) => void;
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
            className="bg-surface rounded-2xl p-8 w-full max-w-lg"
          >
            <h2 className="font-display font-black text-2xl text-primary mb-6">{modal.editing ? "تعديل الوحدة" : "إضافة وحدة جديدة"}</h2>
            <form onSubmit={onSave} className="space-y-5">
              <div>
                <label className="block font-bold text-base mb-2">العنوان *</label>
                <input
                  type="text"
                  required
                  value={modal.title}
                  onChange={(e) => onModalChange({ ...modal, title: e.target.value })}
                  className="w-full rounded-2xl border-2 border-ink/10 px-5 py-3.5 text-base focus:border-primary outline-none transition-colors"
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
                  disabled={saving}
                  className="px-7 py-3.5 rounded-full border-2 border-ink/10 font-bold text-base hover:bg-ink/5 transition-colors disabled:opacity-60"
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
