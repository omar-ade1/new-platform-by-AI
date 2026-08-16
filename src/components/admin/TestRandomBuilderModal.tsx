"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { Question } from "@/components/admin/TestQuestionsManager";
import FormattedQuestionText from "@/components/shared/FormattedQuestionText";

export default function TestRandomBuilderModal({
  open,
  flattenedCategories,
  selectedCategoryIds,
  onToggleCategory,
  pool,
  loadingPool,
  count,
  onCountChange,
  preview,
  onDraw,
  adding,
  onConfirmAdd,
  onBackToSelection,
  onClose,
}: {
  open: boolean;
  flattenedCategories: { id: string; title: string; depth: number }[];
  selectedCategoryIds: Set<string>;
  onToggleCategory: (id: string) => void;
  pool: Question[];
  loadingPool: boolean;
  count: number;
  onCountChange: (count: number) => void;
  preview: Question[] | null;
  onDraw: () => void;
  adding: boolean;
  onConfirmAdd: () => void;
  onBackToSelection: () => void;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {open && (
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
            className="bg-surface rounded-xl p-7 w-full max-w-lg max-h-[85vh] overflow-y-auto"
          >
            {preview === null ? (
              <>
                <h2 className="font-display font-bold text-xl text-primary mb-2">اختبار عشوائي</h2>
                <p className="text-ink/50 text-base mb-6">
                  اختار تصنيف أو أكتر (بيشمل تصنيفاته الفرعية تلقائي) وحدد عدد الأسئلة، وهنقترحلك أسئلة عشوائية منهم.
                </p>

                <div>
                  <label className="block font-bold text-base mb-2">التصنيفات</label>
                  {flattenedCategories.length === 0 ? (
                    <p className="text-ink/40 text-base">لسه مفيش تصنيفات في البنك.</p>
                  ) : (
                    <div className="max-h-56 overflow-y-auto rounded-2xl border-2 border-ink/10 p-2 space-y-0.5">
                      {flattenedCategories.map((c) => (
                        <label
                          key={c.id}
                          className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-primary/5 cursor-pointer text-base"
                          style={{ paddingInlineStart: 10 + c.depth * 18 }}
                        >
                          <input
                            type="checkbox"
                            checked={selectedCategoryIds.has(c.id)}
                            onChange={() => onToggleCategory(c.id)}
                            className="shrink-0 w-5 h-5"
                          />
                          <span className="break-words">{c.title}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-5">
                  <label className="block font-bold text-base mb-2">عدد الأسئلة</label>
                  <input
                    type="number"
                    min={1}
                    value={count}
                    onChange={(e) => onCountChange(Math.max(1, Number(e.target.value) || 1))}
                    className="w-full rounded-lg border border-ink/15 px-4 py-3 text-base focus:border-primary outline-none transition-colors"
                  />
                  <p className="text-sm text-ink/40 mt-2">
                    {loadingPool ? "جاري تحميل الأسئلة المتاحة..." : `متاح ${pool.length} سؤال في التصنيفات المختارة (مش هيكرر أي سؤال متضاف في الاختبار خلاص).`}
                  </p>
                </div>

                <div className="flex items-center gap-3 pt-6">
                  <button
                    onClick={onDraw}
                    disabled={selectedCategoryIds.size === 0 || loadingPool}
                    className="flex-1 py-3 rounded-lg bg-primary text-white font-display font-bold text-base hover:bg-pink transition-colors disabled:opacity-40"
                  >
                    اقترح أسئلة عشوائية
                  </button>
                  <button onClick={onClose} className="px-6 py-3 rounded-lg border border-ink/15 font-bold text-base hover:bg-ink/5 transition-colors">
                    إلغاء
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2 className="font-display font-bold text-xl text-primary mb-2">مراجعة الاختيار</h2>
                <p className="text-ink/50 text-base mb-5">
                  هيتضاف {preview.length} سؤال للاختبار.
                  {preview.length > count && " العدد زاد شوية عشان أسئلة نص القراءة المشترك بتتضاف مع بعض من غير تقسيم."}
                </p>

                <div className="max-h-72 overflow-y-auto space-y-2 mb-6">
                  {preview.map((q) => (
                    <div key={q.id} className="rounded-xl border-2 border-ink/10 px-4 py-3 text-base flex items-center gap-3">
                      <FormattedQuestionText html={q.question_text} className="flex-1 min-w-0 break-words" />
                      {q.passage_id && <span className="shrink-0 text-sm font-bold text-primary bg-primary/10 rounded-full px-3 py-1">من نص</span>}
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={onConfirmAdd}
                    disabled={adding}
                    className="flex-1 py-3 rounded-lg bg-primary text-white font-display font-bold text-base hover:bg-pink transition-colors disabled:opacity-60"
                  >
                    {adding ? "جاري الإضافة..." : "تأكيد الإضافة"}
                  </button>
                  <button
                    onClick={onDraw}
                    disabled={adding}
                    className="px-5 py-3 rounded-lg border border-primary/20 text-primary font-bold text-base hover:bg-primary/5 transition-colors disabled:opacity-40"
                  >
                    أعد الاختيار
                  </button>
                  <button
                    onClick={onBackToSelection}
                    disabled={adding}
                    className="px-5 py-3 rounded-lg border border-ink/15 font-bold text-base hover:bg-ink/5 transition-colors"
                  >
                    رجوع
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
