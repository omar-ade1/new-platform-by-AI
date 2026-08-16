"use client";

import { AnimatePresence, motion } from "framer-motion";
import RichQuestionTextEditor from "@/components/admin/RichQuestionTextEditor";
import { DEFAULT_CATEGORY_TITLE } from "@/lib/supabase/questionBank";

export default function TestQuickAddQuestionModal({
  open,
  text,
  onTextChange,
  options,
  onOptionTextChange,
  onAddOption,
  onRemoveOption,
  correctIndex,
  onCorrectIndexChange,
  categoryId,
  onCategoryIdChange,
  flattenedCategories,
  creating,
  onSave,
  onClose,
}: {
  open: boolean;
  text: string;
  onTextChange: (value: string) => void;
  options: { text: string }[];
  onOptionTextChange: (index: number, text: string) => void;
  onAddOption: () => void;
  onRemoveOption: (index: number) => void;
  correctIndex: number;
  onCorrectIndexChange: (index: number) => void;
  categoryId: string;
  onCategoryIdChange: (value: string) => void;
  flattenedCategories: { id: string; title: string; depth: number }[];
  creating: boolean;
  onSave: (e: React.FormEvent) => void;
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
            <h2 className="font-display font-bold text-xl text-primary mb-2">سؤال جديد</h2>
            <p className="text-ink/50 text-base mb-6">هيتضاف لبنك الأسئلة ولاختبار ده على طول.</p>

            <form onSubmit={onSave} className="space-y-5">
              <div>
                <label className="block font-bold text-base mb-2">نص السؤال *</label>
                <RichQuestionTextEditor value={text} onChange={onTextChange} />
              </div>

              <div>
                <label className="block font-bold text-base mb-2">الاختيارات * (حدد الإجابة الصحيحة)</label>
                <div className="space-y-2.5">
                  {options.map((option, index) => (
                    <div key={index} className="flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => onCorrectIndexChange(index)}
                        title="الإجابة الصحيحة"
                        className={`w-8 h-8 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors ${
                          correctIndex === index ? "border-teal bg-teal" : "border-ink/20 hover:border-teal"
                        }`}
                      >
                        {correctIndex === index && (
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5">
                            <path d="M20 6 9 17l-5-5" />
                          </svg>
                        )}
                      </button>
                      <input
                        value={option.text}
                        onChange={(e) => onOptionTextChange(index, e.target.value)}
                        placeholder={`اختيار ${index + 1}`}
                        className="flex-1 min-w-0 rounded-xl border-2 border-ink/10 px-4 py-2.5 text-base focus:border-primary outline-none transition-colors"
                      />
                      {options.length > 2 && (
                        <button
                          type="button"
                          onClick={() => onRemoveOption(index)}
                          className="w-10 h-10 flex items-center justify-center rounded-lg border-2 border-red-200 text-red-400 hover:text-red-600 hover:border-red-400 hover:bg-red-50 transition-colors shrink-0"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={onAddOption}
                  className="text-base font-bold text-primary border-2 border-primary/20 hover:border-primary hover:bg-primary/5 transition-colors mt-3 px-4 py-2 rounded-lg"
                >
                  + إضافة اختيار
                </button>
              </div>

              <div>
                <label className="block font-bold text-base mb-2">التصنيف في البنك</label>
                <select
                  value={categoryId}
                  onChange={(e) => onCategoryIdChange(e.target.value)}
                  className="w-full rounded-lg border border-ink/15 px-4 py-3 text-base focus:border-primary outline-none transition-colors bg-surface"
                >
                  <option value="">بدون تصنيف محدد (هيتحط في &quot;{DEFAULT_CATEGORY_TITLE}&quot;)</option>
                  {flattenedCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {"— ".repeat(c.depth)}
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 py-3 rounded-lg bg-primary text-white font-display font-bold text-base hover:bg-pink transition-colors disabled:opacity-60"
                >
                  {creating ? "جاري الإضافة..." : "أضف السؤال للاختبار"}
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
