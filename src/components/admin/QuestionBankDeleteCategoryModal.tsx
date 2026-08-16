"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { QuestionCategory } from "@/lib/supabase/questionBank";

export default function QuestionBankDeleteCategoryModal({
  target,
  checking,
  blockedReason,
  deleting,
  onConfirm,
  onClose,
}: {
  target: QuestionCategory | null;
  checking: boolean;
  blockedReason: string | null;
  deleting: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {target && (
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
            <h2 className="font-display font-black text-xl text-primary mb-5">تأكيد حذف التصنيف</h2>
            {checking ? (
              <p className="text-ink/50 text-base mb-7">جاري التحقق...</p>
            ) : blockedReason ? (
              <p className="text-red-500 text-base mb-7">{blockedReason}</p>
            ) : (
              <p className="text-ink/60 text-base mb-7">
                هل تريد حذف تصنيف <span className="font-bold text-ink">&quot;{target.title}&quot;</span>؟
              </p>
            )}
            <div className="flex items-center gap-3">
              {!checking && !blockedReason && (
                <button
                  onClick={onConfirm}
                  disabled={deleting}
                  className="flex-1 py-3 rounded-lg bg-red-500 text-white font-display font-bold text-base hover:bg-red-600 transition-colors disabled:opacity-60"
                >
                  {deleting ? "جاري الحذف..." : "احذف"}
                </button>
              )}
              <button
                onClick={onClose}
                className="px-6 py-3 rounded-lg border border-ink/15 font-bold text-base hover:bg-ink/5 transition-colors flex-1"
              >
                {blockedReason ? "تمام" : "إلغاء"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
