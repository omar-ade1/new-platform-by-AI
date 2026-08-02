"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { ContentItem, MoveOption } from "@/components/admin/CourseContentManager";

export type MoveModalState = {
  open: boolean;
  item: ContentItem | null;
  courses: MoveOption[];
  sections: MoveOption[];
  units: MoveOption[];
  courseId: string;
  sectionId: string;
  unitId: string;
  loading: boolean;
  moving: boolean;
};

export default function CourseMoveItemModal({
  modal,
  onUnitIdChange,
  onCourseChange,
  onSectionChange,
  onConfirm,
  onClose,
}: {
  modal: MoveModalState;
  onUnitIdChange: (unitId: string) => void;
  onCourseChange: (courseId: string) => void;
  onSectionChange: (sectionId: string) => void;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {modal.open && modal.item && (
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
            className="bg-surface rounded-2xl p-8 w-full max-w-lg"
          >
            <h2 className="font-display font-black text-2xl text-primary mb-2">نقل &quot;{modal.item.title}&quot;</h2>
            <p className="text-sm text-ink/50 mb-6">اختار الدورة والقسم والوحدة الجديدة اللي عايز تنقل العنصر ليها.</p>

            <div className="space-y-5">
              <div>
                <label className="block font-bold text-base mb-2">الدورة</label>
                <select
                  value={modal.courseId}
                  onChange={(e) => onCourseChange(e.target.value)}
                  disabled={modal.loading || modal.moving}
                  className="w-full rounded-2xl border-2 border-ink/10 px-5 py-3.5 text-base focus:border-primary outline-none transition-colors disabled:bg-ink/5"
                >
                  {modal.courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-base mb-2">القسم</label>
                <select
                  value={modal.sectionId}
                  onChange={(e) => onSectionChange(e.target.value)}
                  disabled={modal.loading || modal.moving || modal.sections.length === 0}
                  className="w-full rounded-2xl border-2 border-ink/10 px-5 py-3.5 text-base focus:border-primary outline-none transition-colors disabled:bg-ink/5"
                >
                  {modal.sections.length === 0 && <option value="">لا يوجد أقسام</option>}
                  {modal.sections.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-base mb-2">الوحدة</label>
                <select
                  value={modal.unitId}
                  onChange={(e) => onUnitIdChange(e.target.value)}
                  disabled={modal.loading || modal.moving || modal.units.length === 0}
                  className="w-full rounded-2xl border-2 border-ink/10 px-5 py-3.5 text-base focus:border-primary outline-none transition-colors disabled:bg-ink/5"
                >
                  {modal.units.length === 0 && <option value="">لا يوجد وحدات</option>}
                  {modal.units.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.title}
                    </option>
                  ))}
                </select>
              </div>

              <p className="text-sm text-ink/40">لو الوحدة الجديدة في قسم أو دورة تانية، الجروب اللوني الحالي هيتشال من العنصر.</p>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={onConfirm}
                  disabled={modal.loading || modal.moving || !modal.unitId}
                  className="flex-1 py-3.5 rounded-full bg-primary text-white font-display font-bold text-base hover:bg-pink transition-colors disabled:opacity-60"
                >
                  {modal.moving ? "جاري النقل..." : "نقل"}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={modal.moving}
                  className="px-7 py-3.5 rounded-full border-2 border-ink/10 font-bold text-base hover:bg-ink/5 transition-colors disabled:opacity-60"
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
