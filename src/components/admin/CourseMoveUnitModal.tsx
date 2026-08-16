"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { MoveOption, Unit } from "@/components/admin/CourseContentManager";

export type MoveUnitModalState = {
  open: boolean;
  unit: Unit | null;
  sections: MoveOption[];
  sectionId: string;
  moving: boolean;
};

export default function CourseMoveUnitModal({
  modal,
  onSectionIdChange,
  onConfirm,
  onClose,
}: {
  modal: MoveUnitModalState;
  onSectionIdChange: (sectionId: string) => void;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {modal.open && modal.unit && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-ink/50 flex items-center justify-center p-4 z-50"
          onClick={modal.moving ? undefined : onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-surface rounded-xl p-7 w-full max-w-lg"
          >
            <h2 className="font-display font-bold text-xl text-primary mb-2">نقل وحدة &quot;{modal.unit.title}&quot;</h2>
            <p className="text-sm text-ink/50 mb-6">اختار القسم الجديد اللي عايز تنقل الوحدة ليه — بكل محتواها (العناصر والجروبات اللونية).</p>

            <div className="space-y-5">
              <div>
                <label className="block font-bold text-base mb-2">القسم</label>
                <select
                  value={modal.sectionId}
                  onChange={(e) => onSectionIdChange(e.target.value)}
                  disabled={modal.moving}
                  className="w-full rounded-lg border border-ink/15 px-4 py-3 text-base focus:border-primary outline-none transition-colors disabled:bg-ink/5"
                >
                  {modal.sections.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={onConfirm}
                  disabled={modal.moving || !modal.sectionId || modal.sectionId === modal.unit.section_id}
                  className="flex-1 py-3 rounded-lg bg-primary text-white font-display font-bold text-base hover:bg-pink transition-colors disabled:opacity-60"
                >
                  {modal.moving ? "جاري النقل..." : "نقل"}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={modal.moving}
                  className="px-6 py-3 rounded-lg border border-ink/15 font-bold text-base hover:bg-ink/5 transition-colors disabled:opacity-60"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
