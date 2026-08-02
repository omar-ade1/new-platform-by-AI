"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { Passage } from "@/components/admin/QuestionBankManager";

export default function QuestionBankDeletePassageModal({
  target,
  deleting,
  onConfirm,
  onClose,
}: {
  target: Passage | null;
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
            className="bg-surface rounded-2xl p-8 w-full max-w-lg"
          >
            <h2 className="font-display font-black text-xl text-primary mb-5">تأكيد حذف النص</h2>
            <p className="text-ink/60 text-base mb-1">
              هل تريد حذف نص <span className="font-bold text-ink">&quot;{target.title}&quot;</span>؟
            </p>
            <p className="text-ink/40 text-sm mb-7">الأسئلة المرتبطة بيه مش هتتمسح، بس هتفضل من غير نص.</p>
            <div className="flex items-center gap-3">
              <button
                onClick={onConfirm}
                disabled={deleting}
                className="flex-1 py-3.5 rounded-full bg-red-500 text-white font-display font-bold text-base hover:bg-red-600 transition-colors disabled:opacity-60"
              >
                {deleting ? "جاري الحذف..." : "احذف"}
              </button>
              <button
                onClick={onClose}
                className="px-7 py-3.5 rounded-full border-2 border-ink/10 font-bold text-base hover:bg-ink/5 transition-colors"
              >
                إلغاء
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
