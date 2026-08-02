"use client";

import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import type { ContentItem, ContentType, ItemFormState, Unit } from "@/components/admin/CourseContentManager";

export type ItemModalState = { open: boolean; unit: Unit | null; editing: ContentItem | null; form: ItemFormState };

export default function CourseItemModal({
  modal,
  onModalChange,
  selectedFile,
  onFileChange,
  uploadProgress,
  saving,
  onSave,
  onClose,
}: {
  modal: ItemModalState;
  onModalChange: (next: ItemModalState) => void;
  selectedFile: File | null;
  onFileChange: (file: File | null) => void;
  uploadProgress: number | null;
  saving: boolean;
  onSave: (e: React.FormEvent) => void;
  onClose: () => void;
}) {
  const unit = modal.unit;
  return (
    <AnimatePresence>
      {modal.open && unit && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-ink/50 flex items-center justify-center p-4 z-50 overflow-y-auto"
          onClick={saving ? undefined : onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-surface rounded-2xl p-8 w-full max-w-lg my-8"
          >
            <h2 className="font-display font-black text-2xl text-primary mb-6">{modal.editing ? "تعديل العنصر" : "إضافة عنصر جديد"}</h2>
            <form onSubmit={onSave} className="space-y-5">
              <div>
                <label className="block font-bold text-base mb-2">النوع *</label>
                <select
                  value={modal.form.type}
                  disabled={!!modal.editing}
                  onChange={(e) => onModalChange({ ...modal, form: { ...modal.form, type: e.target.value as ContentType } })}
                  className="w-full rounded-2xl border-2 border-ink/10 px-5 py-3.5 text-base focus:border-primary outline-none transition-colors disabled:bg-ink/5 disabled:text-ink/40"
                >
                  <option value="video">فيديو</option>
                  <option value="file">ملف</option>
                  <option value="note">ملاحظة</option>
                  <option value="test">اختبار</option>
                </select>
                {modal.editing && <p className="text-sm text-ink/40 mt-2">مينفعش تغيّر نوع العنصر بعد الإنشاء.</p>}
              </div>

              <div>
                <label className="block font-bold text-base mb-2">العنوان *</label>
                <input
                  type="text"
                  required
                  value={modal.form.title}
                  onChange={(e) => onModalChange({ ...modal, form: { ...modal.form, title: e.target.value } })}
                  className="w-full rounded-2xl border-2 border-ink/10 px-5 py-3.5 text-base focus:border-primary outline-none transition-colors"
                />
              </div>

              {unit.item_groups.length > 0 && (
                <div>
                  <label className="block font-bold text-base mb-2">الجروب اللوني</label>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => onModalChange({ ...modal, form: { ...modal.form, item_group_id: "" } })}
                      title="بدون جروب"
                      className={`w-9 h-9 rounded-full border-2 flex items-center justify-center text-ink/40 text-base transition-colors ${
                        modal.form.item_group_id === "" ? "border-primary" : "border-ink/10"
                      }`}
                    >
                      ×
                    </button>
                    {unit.item_groups.map((g) => (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => onModalChange({ ...modal, form: { ...modal.form, item_group_id: g.id } })}
                        title={g.color}
                        className={`w-9 h-9 rounded-full shadow transition-all ${
                          modal.form.item_group_id === g.id ? "ring-2 ring-offset-2 ring-primary" : ""
                        }`}
                        style={{ background: g.color }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {modal.form.type === "video" && (
                <>
                  <div>
                    <label className="block font-bold text-base mb-2">رابط الفيديو *</label>
                    <input
                      type="text"
                      required
                      value={modal.form.video_url}
                      onChange={(e) => onModalChange({ ...modal, form: { ...modal.form, video_url: e.target.value } })}
                      placeholder="https://..."
                      className="w-full rounded-2xl border-2 border-ink/10 px-5 py-3.5 text-base focus:border-primary outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-base mb-2">المدة (بالثواني)</label>
                    <input
                      type="number"
                      value={modal.form.duration_seconds}
                      onChange={(e) => onModalChange({ ...modal, form: { ...modal.form, duration_seconds: e.target.value } })}
                      className="w-full rounded-2xl border-2 border-ink/10 px-5 py-3.5 text-base focus:border-primary outline-none transition-colors"
                    />
                  </div>
                </>
              )}

              {modal.form.type === "file" && (
                <div>
                  <label className="block font-bold text-base mb-2">الملف {!modal.editing && "*"}</label>
                  {modal.editing?.files?.file_url && !selectedFile && (
                    <p className="text-sm text-ink/50 mb-2">الملف الحالي: {modal.editing.files.file_url.split("_").slice(1).join("_")}</p>
                  )}
                  <input
                    type="file"
                    accept=".pdf,application/pdf"
                    disabled={saving}
                    onChange={(e) => {
                      const file = e.target.files?.[0] ?? null;
                      if (file && !file.name.toLowerCase().endsWith(".pdf")) {
                        toast.error("مسموح برفع ملفات PDF بس");
                        e.target.value = "";
                        onFileChange(null);
                        return;
                      }
                      onFileChange(file);
                    }}
                    className="w-full rounded-2xl border-2 border-ink/10 px-5 py-3.5 text-base focus:border-primary outline-none transition-colors disabled:opacity-60 file:ml-3 file:rounded-full file:border-0 file:bg-primary/10 file:px-4 file:py-2 file:text-primary file:font-bold"
                  />
                  {modal.editing && <p className="text-sm text-ink/40 mt-2">سيبها فاضية لو مش عايز تستبدل الملف الحالي.</p>}
                  {uploadProgress !== null && (
                    <div className="mt-3">
                      <div className="h-2.5 rounded-full bg-ink/10 overflow-hidden">
                        <div className="h-full bg-primary transition-all" style={{ width: `${uploadProgress}%` }} />
                      </div>
                      <p className="text-sm text-ink/50 mt-1.5">جاري رفع الملف... {uploadProgress}%</p>
                    </div>
                  )}
                </div>
              )}

              {modal.form.type === "note" && (
                <div>
                  <label className="block font-bold text-base mb-2">نص الملاحظة *</label>
                  <textarea
                    required
                    value={modal.form.note_body}
                    onChange={(e) => onModalChange({ ...modal, form: { ...modal.form, note_body: e.target.value } })}
                    rows={5}
                    className="w-full rounded-2xl border-2 border-ink/10 px-5 py-3.5 text-base focus:border-primary outline-none transition-colors resize-none"
                  />
                </div>
              )}

              {modal.form.type === "test" && (
                <div>
                  <label className="block font-bold text-base mb-2">مدة الاختبار (بالدقايق)</label>
                  <input
                    type="number"
                    value={modal.form.time_limit_minutes}
                    onChange={(e) => onModalChange({ ...modal, form: { ...modal.form, time_limit_minutes: e.target.value } })}
                    className="w-full rounded-2xl border-2 border-ink/10 px-5 py-3.5 text-base focus:border-primary outline-none transition-colors"
                  />
                  <p className="text-sm text-ink/40 mt-2">تقدر تضيف/ترتّب أسئلة الاختبار ده من زرار &quot;الأسئلة&quot; بعد ما تحفظ.</p>
                </div>
              )}

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-3.5 rounded-full bg-primary text-white font-display font-bold text-base hover:bg-pink transition-colors disabled:opacity-60"
                >
                  {saving ? (uploadProgress !== null ? `جاري الرفع... ${uploadProgress}%` : "جاري الحفظ...") : "حفظ"}
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
