"use client";

import { AnimatePresence, motion } from "framer-motion";

export default function ConfirmModal({
  open,
  onClose,
  onConfirm,
  busy,
  title,
  body,
  confirmLabel,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  busy: boolean;
  title: string;
  body: string;
  confirmLabel: string;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-ink/50 flex items-center justify-center p-4 z-50"
          onClick={busy ? undefined : onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-surface rounded-2xl p-8 w-full max-w-lg"
          >
            <div className="flex items-center gap-4 mb-5">
              <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center shrink-0">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 8v5M12 16h.01" />
                </svg>
              </div>
              <h2 className="font-display font-black text-xl text-primary">{title}</h2>
            </div>
            <p className="text-ink/60 text-base mb-7">{body}</p>
            <div className="flex items-center gap-3">
              <button
                onClick={onConfirm}
                disabled={busy}
                className="flex-1 py-3.5 rounded-full bg-red-500 text-white font-display font-bold text-base hover:bg-red-600 transition-colors disabled:opacity-60"
              >
                {busy ? "جاري الحذف..." : confirmLabel}
              </button>
              <button
                onClick={onClose}
                disabled={busy}
                className="px-7 py-3.5 rounded-full border-2 border-ink/10 font-bold text-base hover:bg-ink/5 transition-colors disabled:opacity-60"
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
