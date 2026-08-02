// app/admin/courses/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase/client";

type Course = {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  order_index: number | null;
  created_at: string;
};

type FormState = {
  title: string;
  description: string;
  image_url: string;
  order_index: string;
};

const emptyForm: FormState = { title: "", description: "", image_url: "", order_index: "" };
const CONFIRM_PHRASE = "نعم اريد مسح هذه الدورة";

function getNextOrderIndex(courses: Course[]) {
  return courses.length > 0 ? Math.max(...courses.map((c) => c.order_index ?? 0)) + 1 : 1;
}

function byOrderIndex(a: Course, b: Course) {
  if (a.order_index === null) return 1;
  if (b.order_index === null) return -1;
  return a.order_index - b.order_index;
}

export default function AdminCoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  // ===== Modal إضافة/تعديل =====
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  // ===== Modal الحذف =====
  const [courseToDelete, setCourseToDelete] = useState<Course | null>(null);
  const [confirmPhraseInput, setConfirmPhraseInput] = useState("");
  const [confirmNameInput, setConfirmNameInput] = useState("");
  const [deleting, setDeleting] = useState(false);

  async function fetchCourses() {
    setLoading(true);
    const { data, error } = await supabase.from("courses").select("*").order("order_index", { ascending: true, nullsFirst: false });

    if (error) {
      toast.error("حصل خطأ في تحميل الدورات");
    } else {
      setCourses(data || []);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchCourses();
  }, []);

  function openAddModal() {
    setEditingId(null);
    setForm({ ...emptyForm, order_index: getNextOrderIndex(courses).toString() });
    setModalOpen(true);
  }

  function openEditModal(course: Course) {
    setEditingId(course.id);
    setForm({
      title: course.title,
      description: course.description || "",
      image_url: course.image_url || "",
      order_index: course.order_index?.toString() || "",
    });
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error("العنوان مطلوب");
      return;
    }

    setSaving(true);

    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      image_url: form.image_url.trim() || null,
      order_index: form.order_index ? parseInt(form.order_index, 10) : getNextOrderIndex(courses),
    };

    if (editingId) {
      const { data, error } = await supabase.from("courses").update(payload).eq("id", editingId).select().single();
      if (error) {
        toast.error("حصل خطأ في التعديل");
      } else {
        toast.success("اتعدلت الدورة");
        setCourses((prev) => prev.map((c) => (c.id === data.id ? data : c)).sort(byOrderIndex));
        closeModal();
      }
    } else {
      const { data, error } = await supabase.from("courses").insert(payload).select().single();
      if (error) {
        toast.error("حصل خطأ في الإضافة");
      } else {
        toast.success("اتضافت الدورة");
        setCourses((prev) => [...prev, data].sort(byOrderIndex));
        closeModal();
      }
    }

    setSaving(false);
  }

  // ===== منطق الحذف =====
  function openDeleteModal(course: Course) {
    setCourseToDelete(course);
    setConfirmPhraseInput("");
    setConfirmNameInput("");
  }

  function closeDeleteModal() {
    setCourseToDelete(null);
    setConfirmPhraseInput("");
    setConfirmNameInput("");
  }

  const canDelete = courseToDelete !== null && confirmPhraseInput.trim() === CONFIRM_PHRASE && confirmNameInput.trim() === courseToDelete.title;

  async function handleConfirmDelete() {
    if (!courseToDelete || !canDelete) return;

    setDeleting(true);
    const { error } = await supabase.from("courses").delete().eq("id", courseToDelete.id);

    if (error) {
      toast.error("حصل خطأ في الحذف");
    } else {
      toast.success("اتمسحت الدورة");
      setCourses((prev) => prev.filter((c) => c.id !== courseToDelete.id));
      closeDeleteModal();
    }
    setDeleting(false);
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display font-black text-3xl text-primary mb-2">الدورات</h1>
          <p className="text-ink/60 text-lg">إضافة وتعديل وحذف الدورات المتاحة</p>
        </div>
        <button
          onClick={openAddModal}
          className="shrink-0 px-6 py-3.5 rounded-full bg-primary text-white font-display font-bold text-base hover:bg-pink transition-colors"
        >
          + إضافة دورة
        </button>
      </div>

      {loading ? (
        <p className="text-ink/40 text-lg">جاري التحميل...</p>
      ) : courses.length === 0 ? (
        <p className="text-ink/40 text-lg">لسه مفيش دورات، ابدأ بإضافة واحدة.</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <div key={course.id} className="rounded-2xl border-2 border-ink/10 bg-surface overflow-hidden hover:shadow-lg transition-shadow">
              <div className="aspect-video bg-primary/5 relative overflow-hidden">
                {course.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={course.image_url} alt={course.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-primary/20 font-display font-black text-2xl">الوجيز</div>
                )}
                {course.order_index !== null && (
                  <span className="absolute top-3 right-3 bg-white/90 text-primary text-sm font-bold px-3 py-1.5 rounded-full">
                    ترتيب {course.order_index}
                  </span>
                )}
              </div>

              <div className="p-6">
                <h3 className="font-display font-bold text-xl text-primary mb-2 leading-snug break-words">{course.title}</h3>
                <p className="text-ink/50 text-base mb-5 line-clamp-2 min-h-[3rem]">{course.description || "بدون وصف"}</p>

                <Link
                  href={`/admin/courses/${course.id}/content`}
                  className="block text-center py-3 mb-3 rounded-full bg-primary/10 text-primary font-bold text-base hover:bg-primary/20 transition-colors"
                >
                  إدارة المحتوى
                </Link>

                <div className="flex items-center gap-2.5">
                  <button
                    onClick={() => openEditModal(course)}
                    className="flex-1 py-3 rounded-full border-2 border-primary/20 text-primary font-bold text-base hover:bg-primary/5 transition-colors"
                  >
                    تعديل
                  </button>
                  <button
                    onClick={() => openDeleteModal(course)}
                    className="flex-1 py-3 rounded-full border-2 border-red-200 text-red-500 font-bold text-base hover:bg-red-50 transition-colors"
                  >
                    حذف
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ===== Modal إضافة/تعديل ===== */}
      <AnimatePresence>
        {modalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-ink/50 flex items-center justify-center p-4 z-50"
            onClick={closeModal}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-surface rounded-2xl p-8 w-full max-w-lg"
            >
              <h2 className="font-display font-black text-2xl text-primary mb-6">{editingId ? "تعديل الدورة" : "إضافة دورة جديدة"}</h2>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block font-bold text-base mb-2">العنوان *</label>
                  <input
                    type="text"
                    required
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    className="w-full rounded-2xl border-2 border-ink/10 px-5 py-3.5 text-base focus:border-primary outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block font-bold text-base mb-2">الوصف</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    rows={3}
                    className="w-full rounded-2xl border-2 border-ink/10 px-5 py-3.5 text-base focus:border-primary outline-none transition-colors resize-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-base mb-2">رابط الصورة</label>
                  <input
                    type="text"
                    value={form.image_url}
                    onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                    placeholder="https://..."
                    className="w-full rounded-2xl border-2 border-ink/10 px-5 py-3.5 text-base focus:border-primary outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block font-bold text-base mb-2">ترتيب الظهور</label>
                  <input
                    type="number"
                    value={form.order_index}
                    onChange={(e) => setForm({ ...form, order_index: e.target.value })}
                    className="w-full rounded-2xl border-2 border-ink/10 px-5 py-3.5 text-base focus:border-primary outline-none transition-colors"
                  />
                  <p className="text-sm text-ink/40 mt-2">الرقم الأصغر يظهر الأول في صفحة الدورات. بيتحدد تلقائي، وممكن تغيّره لو عايز.</p>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 py-3.5 rounded-full bg-primary text-white font-display font-bold text-base hover:bg-pink transition-colors disabled:opacity-60"
                  >
                    {saving ? "جاري الحفظ..." : editingId ? "حفظ التعديل" : "إضافة"}
                  </button>
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-7 py-3.5 rounded-full border-2 border-ink/10 font-bold text-base hover:bg-ink/5 transition-colors"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== Modal تأكيد الحذف ===== */}
      <AnimatePresence>
        {courseToDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-ink/50 flex items-center justify-center p-4 z-50"
            onClick={closeDeleteModal}
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
                    <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6" />
                  </svg>
                </div>
                <h2 className="font-display font-black text-xl text-primary">تأكيد حذف الدورة</h2>
              </div>

              <p className="text-ink/60 text-base mb-1">
                هل تريد مسح دورة <span className="font-bold text-ink">&quot;{courseToDelete.title}&quot;</span> فعلاً؟
              </p>
              <p className="text-ink/40 text-sm mb-6">الإجراء ده مش هينفع يترجع بعد كده.</p>

              <div className="space-y-5">
                <div>
                  <label className="block font-bold text-base mb-2">
                    اكتب: <span className="text-red-500">{CONFIRM_PHRASE}</span>
                  </label>
                  <input
                    type="text"
                    value={confirmPhraseInput}
                    onChange={(e) => setConfirmPhraseInput(e.target.value)}
                    className="w-full rounded-2xl border-2 border-ink/10 px-5 py-3.5 text-base focus:border-red-400 outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block font-bold text-base mb-2">
                    اكتب اسم الدورة بالظبط: <span className="text-red-500">{courseToDelete.title}</span>
                  </label>
                  <input
                    type="text"
                    value={confirmNameInput}
                    onChange={(e) => setConfirmNameInput(e.target.value)}
                    className="w-full rounded-2xl border-2 border-ink/10 px-5 py-3.5 text-base focus:border-red-400 outline-none transition-colors"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-6">
                <button
                  onClick={handleConfirmDelete}
                  disabled={!canDelete || deleting}
                  className="flex-1 py-3.5 rounded-full bg-red-500 text-white font-display font-bold text-base hover:bg-red-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {deleting ? "جاري الحذف..." : "احذف الدورة نهائيًا"}
                </button>
                <button
                  onClick={closeDeleteModal}
                  className="px-7 py-3.5 rounded-full border-2 border-ink/10 font-bold text-base hover:bg-ink/5 transition-colors"
                >
                  إلغاء
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
