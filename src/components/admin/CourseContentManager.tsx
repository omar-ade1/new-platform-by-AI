"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { contentTypeIcons } from "@/components/courses/contentTypeIcons";
import ExportQuestionsModal from "@/components/admin/ExportQuestionsModal";
import ConfirmModal from "@/components/shared/ConfirmModal";
import CourseSectionModal from "@/components/admin/CourseSectionModal";
import CourseUnitModal from "@/components/admin/CourseUnitModal";
import CourseItemModal from "@/components/admin/CourseItemModal";
import CourseMoveItemModal from "@/components/admin/CourseMoveItemModal";
import { supabase } from "@/lib/supabase/client";
import { uploadFileWithProgress } from "@/lib/uploadWithProgress";
import { fetchQuestionsForTestIds, getTestContentItemIds, type ExportScope } from "@/lib/supabase/questionExport";

export type ContentType = "video" | "file" | "note" | "test";

export type ContentItem = {
  id: string;
  unit_id: string;
  item_group_id: string | null;
  type: ContentType;
  title: string;
  order_index: number;
  videos: { video_url: string; duration_seconds: number | null } | null;
  files: { file_url: string; file_type: string | null; file_size_kb: number | null } | null;
  notes: { body: string } | null;
  tests: { time_limit_minutes: number | null } | null;
};

type ItemGroup = { id: string; unit_id: string; color: string; order_index: number };
export type MoveOption = { id: string; title: string };

export type Unit = {
  id: string;
  section_id: string;
  title: string;
  order_index: number;
  item_groups: ItemGroup[];
  content_items: ContentItem[];
};

export type Section = {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  order_index: number;
  units: Unit[];
};

const typeLabels: Record<ContentType, string> = { video: "فيديو", file: "ملف", note: "ملاحظة", test: "اختبار" };

function getNextOrderIndex<T extends { order_index: number }>(list: T[]) {
  return list.length > 0 ? Math.max(...list.map((x) => x.order_index)) + 1 : 1;
}

function sortTree(sections: Section[]): Section[] {
  return [...sections]
    .sort((a, b) => a.order_index - b.order_index)
    .map((section) => ({
      ...section,
      units: [...section.units]
        .sort((a, b) => a.order_index - b.order_index)
        .map((unit) => ({
          ...unit,
          item_groups: [...unit.item_groups].sort((a, b) => a.order_index - b.order_index),
          content_items: [...unit.content_items].sort((a, b) => a.order_index - b.order_index),
        })),
    }));
}

async function fetchTree(courseId: string): Promise<Section[]> {
  const { data, error } = await supabase
    .from("sections")
    .select(
      `
      id, course_id, title, description, order_index,
      units (
        id, section_id, title, order_index,
        item_groups ( id, unit_id, color, order_index ),
        content_items (
          id, unit_id, item_group_id, type, title, order_index,
          videos ( video_url, duration_seconds ),
          files ( file_url, file_type, file_size_kb ),
          notes ( body ),
          tests ( time_limit_minutes )
        )
      )
    `
    )
    .eq("course_id", courseId);

  if (error) {
    toast.error("حصل خطأ في تحميل المحتوى");
    return [];
  }

  return sortTree((data as unknown as Section[]) ?? []);
}

const emptyItemForm = {
  title: "",
  type: "video" as ContentType,
  item_group_id: "",
  video_url: "",
  duration_seconds: "",
  note_body: "",
  time_limit_minutes: "",
};

export type ItemFormState = typeof emptyItemForm;

export default function CourseContentManager({ courseId, courseTitle }: { courseId: string; courseTitle: string }) {
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [expandedUnits, setExpandedUnits] = useState<Set<string>>(new Set());
  const [exportModal, setExportModal] = useState<{ scope: ExportScope; title: string } | null>(null);

  const [sectionModal, setSectionModal] = useState<{ open: boolean; editing: Section | null; title: string; description: string }>({
    open: false,
    editing: null,
    title: "",
    description: "",
  });

  const [unitModal, setUnitModal] = useState<{ open: boolean; sectionId: string | null; editing: Unit | null; title: string }>({
    open: false,
    sectionId: null,
    editing: null,
    title: "",
  });

  const [itemModal, setItemModal] = useState<{ open: boolean; unit: Unit | null; editing: ContentItem | null; form: ItemFormState }>({
    open: false,
    unit: null,
    editing: null,
    form: emptyItemForm,
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  const [savingSection, setSavingSection] = useState(false);
  const [savingUnit, setSavingUnit] = useState(false);
  const [savingItem, setSavingItem] = useState(false);

  // ===== تأكيد الحذف (بوب أب مخصص، مش confirm() المتصفح) =====
  const [deleteSectionTarget, setDeleteSectionTarget] = useState<Section | null>(null);
  const [deletingSection, setDeletingSection] = useState(false);
  const [deleteUnitTarget, setDeleteUnitTarget] = useState<Unit | null>(null);
  const [deletingUnit, setDeletingUnit] = useState(false);
  const [deleteItemGroupTarget, setDeleteItemGroupTarget] = useState<ItemGroup | null>(null);
  const [deletingItemGroup, setDeletingItemGroup] = useState(false);
  const [deleteItemTarget, setDeleteItemTarget] = useState<ContentItem | null>(null);
  const [deletingItem, setDeletingItem] = useState(false);

  const [moveModal, setMoveModal] = useState<{
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
  }>({
    open: false,
    item: null,
    courses: [],
    sections: [],
    units: [],
    courseId: "",
    sectionId: "",
    unitId: "",
    loading: false,
    moving: false,
  });

  const [newGroupColor, setNewGroupColor] = useState("#FF5D8F");

  async function reload() {
    setSections(await fetchTree(courseId));
  }

  useEffect(() => {
    reload().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  function toggleSet(setFn: React.Dispatch<React.SetStateAction<Set<string>>>, id: string) {
    setFn((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // ===== أقسام =====
  function openAddSection() {
    setSectionModal({ open: true, editing: null, title: "", description: "" });
  }
  function openEditSection(section: Section) {
    setSectionModal({ open: true, editing: section, title: section.title, description: section.description ?? "" });
  }
  function closeSectionModal() {
    setSectionModal({ open: false, editing: null, title: "", description: "" });
  }

  async function submitSection(e: React.FormEvent) {
    e.preventDefault();
    if (savingSection) return;
    if (!sectionModal.title.trim()) {
      toast.error("العنوان مطلوب");
      return;
    }

    setSavingSection(true);
    try {
      const error = sectionModal.editing
        ? (
            await supabase
              .from("sections")
              .update({ title: sectionModal.title.trim(), description: sectionModal.description.trim() || null })
              .eq("id", sectionModal.editing.id)
          ).error
        : (
            await supabase.from("sections").insert({
              course_id: courseId,
              title: sectionModal.title.trim(),
              description: sectionModal.description.trim() || null,
              order_index: getNextOrderIndex(sections),
            })
          ).error;

      if (error) {
        toast.error("حصل خطأ في الحفظ");
        return;
      }

      toast.success(sectionModal.editing ? "اتعدل القسم" : "اتضاف القسم");
      closeSectionModal();
      reload();
    } finally {
      setSavingSection(false);
    }
  }

  function openDeleteSectionModal(section: Section) {
    setDeleteSectionTarget(section);
  }
  function closeDeleteSectionModal() {
    setDeleteSectionTarget(null);
  }
  async function confirmDeleteSection() {
    if (!deleteSectionTarget) return;
    setDeletingSection(true);
    const { error } = await supabase.from("sections").delete().eq("id", deleteSectionTarget.id);
    if (error) {
      toast.error("حصل خطأ في الحذف");
    } else {
      toast.success("اتمسح القسم");
      closeDeleteSectionModal();
      reload();
    }
    setDeletingSection(false);
  }

  // ===== وحدات =====
  function openAddUnit(section: Section) {
    setUnitModal({ open: true, sectionId: section.id, editing: null, title: "" });
  }
  function openEditUnit(unit: Unit) {
    setUnitModal({ open: true, sectionId: unit.section_id, editing: unit, title: unit.title });
  }
  function closeUnitModal() {
    setUnitModal({ open: false, sectionId: null, editing: null, title: "" });
  }

  async function submitUnit(e: React.FormEvent) {
    e.preventDefault();
    if (savingUnit) return;
    if (!unitModal.title.trim()) {
      toast.error("العنوان مطلوب");
      return;
    }

    setSavingUnit(true);
    try {
      let error;
      if (unitModal.editing) {
        ({ error } = await supabase.from("units").update({ title: unitModal.title.trim() }).eq("id", unitModal.editing.id));
      } else {
        const section = sections.find((s) => s.id === unitModal.sectionId);
        ({ error } = await supabase.from("units").insert({
          section_id: unitModal.sectionId,
          title: unitModal.title.trim(),
          order_index: getNextOrderIndex(section?.units ?? []),
        }));
      }

      if (error) {
        toast.error("حصل خطأ في الحفظ");
        return;
      }

      toast.success(unitModal.editing ? "اتعدلت الوحدة" : "اتضافت الوحدة");
      closeUnitModal();
      reload();
    } finally {
      setSavingUnit(false);
    }
  }

  function openDeleteUnitModal(unit: Unit) {
    setDeleteUnitTarget(unit);
  }
  function closeDeleteUnitModal() {
    setDeleteUnitTarget(null);
  }
  async function confirmDeleteUnit() {
    if (!deleteUnitTarget) return;
    setDeletingUnit(true);
    const { error } = await supabase.from("units").delete().eq("id", deleteUnitTarget.id);
    if (error) {
      toast.error("حصل خطأ في الحذف");
    } else {
      toast.success("اتمسحت الوحدة");
      closeDeleteUnitModal();
      reload();
    }
    setDeletingUnit(false);
  }

  // ===== جروبات لونية =====
  async function addItemGroup(unit: Unit) {
    const { error } = await supabase.from("item_groups").insert({
      unit_id: unit.id,
      color: newGroupColor,
      order_index: getNextOrderIndex(unit.item_groups),
    });
    if (error) {
      toast.error("حصل خطأ في إضافة الجروب");
      return;
    }
    reload();
  }

  function openDeleteItemGroupModal(group: ItemGroup) {
    setDeleteItemGroupTarget(group);
  }
  function closeDeleteItemGroupModal() {
    setDeleteItemGroupTarget(null);
  }
  async function confirmDeleteItemGroup() {
    if (!deleteItemGroupTarget) return;
    setDeletingItemGroup(true);
    const { error } = await supabase.from("item_groups").delete().eq("id", deleteItemGroupTarget.id);
    if (error) {
      toast.error("حصل خطأ في الحذف");
    } else {
      closeDeleteItemGroupModal();
      reload();
    }
    setDeletingItemGroup(false);
  }

  // ===== عناصر المحتوى =====
  function openAddItem(unit: Unit) {
    setItemModal({ open: true, unit, editing: null, form: emptyItemForm });
    setSelectedFile(null);
  }

  function openEditItem(unit: Unit, item: ContentItem) {
    setItemModal({
      open: true,
      unit,
      editing: item,
      form: {
        title: item.title,
        type: item.type,
        item_group_id: item.item_group_id ?? "",
        video_url: item.videos?.video_url ?? "",
        duration_seconds: item.videos?.duration_seconds?.toString() ?? "",
        note_body: item.notes?.body ?? "",
        time_limit_minutes: item.tests?.time_limit_minutes?.toString() ?? "",
      },
    });
    setSelectedFile(null);
  }

  function closeItemModal() {
    setItemModal({ open: false, unit: null, editing: null, form: emptyItemForm });
    setSelectedFile(null);
  }

  async function submitItem(e: React.FormEvent) {
    e.preventDefault();
    if (savingItem) return;

    const { form, unit, editing } = itemModal;
    if (!unit) return;

    if (!form.title.trim()) {
      toast.error("العنوان مطلوب");
      return;
    }
    if (form.type === "video" && !form.video_url.trim()) {
      toast.error("رابط الفيديو مطلوب");
      return;
    }
    if (form.type === "file" && !editing && !selectedFile) {
      toast.error("لازم ترفع ملف");
      return;
    }
    if (form.type === "note" && !form.note_body.trim()) {
      toast.error("نص الملاحظة مطلوب");
      return;
    }

    setSavingItem(true);
    try {
      const basePayload = { title: form.title.trim(), item_group_id: form.item_group_id || null };
      let contentItemId = editing?.id ?? null;

      if (editing) {
        const { error } = await supabase.from("content_items").update(basePayload).eq("id", editing.id);
        if (error) {
          toast.error("حصل خطأ في التعديل");
          return;
        }
      } else {
        const { data, error } = await supabase
          .from("content_items")
          .insert({ ...basePayload, unit_id: unit.id, type: form.type, order_index: getNextOrderIndex(unit.content_items) })
          .select()
          .single();
        if (error || !data) {
          toast.error("حصل خطأ في الإضافة");
          return;
        }
        contentItemId = data.id;
      }

      if (!contentItemId) return;

      const type = editing?.type ?? form.type; // النوع مايتغيّرش بعد الإنشاء
      let detailError = null;

      if (type === "video") {
        const payload = { video_url: form.video_url.trim(), duration_seconds: form.duration_seconds ? parseInt(form.duration_seconds, 10) : null };
        detailError = editing
          ? (await supabase.from("videos").update(payload).eq("content_item_id", contentItemId)).error
          : (await supabase.from("videos").insert({ content_item_id: contentItemId, ...payload })).error;
      } else if (type === "file") {
        let filePath = editing?.files?.file_url ?? null;

        if (selectedFile) {
          setUploadProgress(0);
          const safeName = selectedFile.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
          const path = `${courseId}/${Date.now()}_${safeName}`;
          const { error: uploadError } = await uploadFileWithProgress(supabase, "course-files", path, selectedFile, setUploadProgress);
          if (uploadError) {
            toast.error(uploadError);
            return;
          }
          filePath = path;
        }

        if (!filePath) {
          toast.error("لازم ترفع ملف");
          return;
        }

        const payload = {
          file_url: filePath,
          file_type: selectedFile ? (selectedFile.name.split(".").pop() ?? null) : (editing?.files?.file_type ?? null),
          file_size_kb: selectedFile ? Math.round(selectedFile.size / 1024) : (editing?.files?.file_size_kb ?? null),
        };
        detailError = editing
          ? (await supabase.from("files").update(payload).eq("content_item_id", contentItemId)).error
          : (await supabase.from("files").insert({ content_item_id: contentItemId, ...payload })).error;
      } else if (type === "note") {
        const payload = { body: form.note_body.trim() };
        detailError = editing
          ? (await supabase.from("notes").update(payload).eq("content_item_id", contentItemId)).error
          : (await supabase.from("notes").insert({ content_item_id: contentItemId, ...payload })).error;
      } else if (type === "test") {
        const payload = { time_limit_minutes: form.time_limit_minutes ? parseInt(form.time_limit_minutes, 10) : null };
        detailError = editing
          ? (await supabase.from("tests").update(payload).eq("content_item_id", contentItemId)).error
          : (await supabase.from("tests").insert({ content_item_id: contentItemId, ...payload })).error;
      }

      if (detailError) {
        toast.error("حصل خطأ في حفظ تفاصيل العنصر");
        return;
      }

      toast.success(editing ? "اتعدل العنصر" : "اتضاف العنصر");
      closeItemModal();
      reload();
    } finally {
      setSavingItem(false);
      setUploadProgress(null);
    }
  }

  function openDeleteItemModal(item: ContentItem) {
    setDeleteItemTarget(item);
  }
  function closeDeleteItemModal() {
    setDeleteItemTarget(null);
  }
  async function confirmDeleteItem() {
    if (!deleteItemTarget) return;
    setDeletingItem(true);
    const { error } = await supabase.from("content_items").delete().eq("id", deleteItemTarget.id);
    if (error) {
      toast.error("حصل خطأ في الحذف");
    } else {
      toast.success("اتمسح العنصر");
      closeDeleteItemModal();
      reload();
    }
    setDeletingItem(false);
  }

  async function reorderContentItem(unit: Unit, item: ContentItem, direction: "up" | "down") {
    const items = unit.content_items;
    const index = items.findIndex((i) => i.id === item.id);
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= items.length) return;

    const other = items[swapIndex];
    const [{ error: e1 }, { error: e2 }] = await Promise.all([
      supabase.from("content_items").update({ order_index: other.order_index }).eq("id", item.id),
      supabase.from("content_items").update({ order_index: item.order_index }).eq("id", other.id),
    ]);

    if (e1 || e2) {
      toast.error("حصل خطأ في إعادة الترتيب");
      return;
    }
    reload();
  }

  // ===== نقل عنصر لدورة/قسم/وحدة تانية =====
  async function openMoveItem(unit: Unit, item: ContentItem) {
    setMoveModal({
      open: true,
      item,
      courses: [],
      sections: [],
      units: [],
      courseId,
      sectionId: unit.section_id,
      unitId: unit.id,
      loading: true,
      moving: false,
    });

    const [{ data: courses }, { data: sectionsData }, { data: unitsData }] = await Promise.all([
      supabase.from("courses").select("id, title").order("order_index"),
      supabase.from("sections").select("id, title").eq("course_id", courseId).order("order_index"),
      supabase.from("units").select("id, title").eq("section_id", unit.section_id).order("order_index"),
    ]);

    setMoveModal((prev) => ({
      ...prev,
      courses: (courses as MoveOption[]) ?? [],
      sections: (sectionsData as MoveOption[]) ?? [],
      units: (unitsData as MoveOption[]) ?? [],
      loading: false,
    }));
  }

  function closeMoveModal() {
    setMoveModal({
      open: false,
      item: null,
      courses: [],
      sections: [],
      units: [],
      courseId: "",
      sectionId: "",
      unitId: "",
      loading: false,
      moving: false,
    });
  }

  // بعد أي جلب لقائمة (أقسام/وحدات)، بنختار أول عنصر فيها تلقائي — لو القائمة عنصر واحد بس،
  // المتصفح بيحدده افتراضيًا من غير ما يطلق onChange، فلازم نعمل الاختيار واختيار المستوى اللي بعده يدويًا هنا.
  async function changeMoveCourse(newCourseId: string) {
    setMoveModal((prev) => ({ ...prev, courseId: newCourseId, sectionId: "", unitId: "", sections: [], units: [], loading: true }));
    const { data } = await supabase.from("sections").select("id, title").eq("course_id", newCourseId).order("order_index");
    const sections = (data as MoveOption[]) ?? [];
    const firstSectionId = sections[0]?.id ?? "";

    if (!firstSectionId) {
      setMoveModal((prev) => ({ ...prev, sections, loading: false }));
      return;
    }

    const { data: unitsData } = await supabase.from("units").select("id, title").eq("section_id", firstSectionId).order("order_index");
    const units = (unitsData as MoveOption[]) ?? [];
    setMoveModal((prev) => ({ ...prev, sections, sectionId: firstSectionId, units, unitId: units[0]?.id ?? "", loading: false }));
  }

  async function changeMoveSection(newSectionId: string) {
    setMoveModal((prev) => ({ ...prev, sectionId: newSectionId, unitId: "", units: [], loading: true }));
    const { data } = await supabase.from("units").select("id, title").eq("section_id", newSectionId).order("order_index");
    const units = (data as MoveOption[]) ?? [];
    setMoveModal((prev) => ({ ...prev, units, unitId: units[0]?.id ?? "", loading: false }));
  }

  async function confirmMove() {
    if (!moveModal.item || !moveModal.unitId || moveModal.moving) return;

    setMoveModal((prev) => ({ ...prev, moving: true }));
    try {
      const { data: existingItems } = await supabase.from("content_items").select("order_index").eq("unit_id", moveModal.unitId);

      const { error } = await supabase
        .from("content_items")
        .update({ unit_id: moveModal.unitId, item_group_id: null, order_index: getNextOrderIndex((existingItems as { order_index: number }[]) ?? []) })
        .eq("id", moveModal.item.id);

      if (error) {
        toast.error("حصل خطأ في النقل");
        return;
      }

      toast.success("اتنقل العنصر");
      closeMoveModal();
      reload();
    } finally {
      setMoveModal((prev) => ({ ...prev, moving: false }));
    }
  }

  if (loading) return <p className="text-ink/40 text-lg">جاري التحميل...</p>;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={openAddSection}
          className="px-6 py-3.5 rounded-full bg-primary text-white font-display font-bold text-base hover:bg-pink transition-colors"
        >
          + إضافة قسم
        </button>
        <button
          onClick={() => setExportModal({ scope: { courseId }, title: courseTitle })}
          className="px-6 py-3.5 rounded-full border-2 border-primary/20 text-primary font-display font-bold text-base hover:bg-primary/5 transition-colors"
        >
          تصدير كل أسئلة الدورة
        </button>
      </div>

      {sections.length === 0 ? (
        <p className="text-ink/40 text-lg">لسه مفيش أقسام، ابدأ بإضافة واحد.</p>
      ) : (
        sections.map((section) => {
          const sectionOpen = expandedSections.has(section.id);
          return (
            <div key={section.id} className="bg-surface rounded-2xl border-2 border-ink/10 overflow-hidden">
              <div className="flex flex-wrap items-center gap-3 px-6 py-5">
                <button
                  onClick={() => toggleSet(setExpandedSections, section.id)}
                  className="w-full sm:w-auto sm:flex-1 min-w-0 text-right"
                >
                  <p className="font-display font-bold text-primary text-xl break-words">{section.title}</p>
                  {section.description && <p className="text-base text-ink/50 mt-1 break-words">{section.description}</p>}
                </button>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => setExportModal({ scope: { sectionId: section.id }, title: section.title })}
                    className="px-4 py-2.5 rounded-lg border-2 border-ink/10 text-base font-bold text-primary hover:border-primary/40 hover:bg-primary/5 transition-colors"
                  >
                    تصدير
                  </button>
                  <button
                    onClick={() => openEditSection(section)}
                    className="px-4 py-2.5 rounded-lg border-2 border-ink/10 text-base font-bold text-primary hover:border-primary/40 hover:bg-primary/5 transition-colors"
                  >
                    تعديل
                  </button>
                  <button
                    onClick={() => openDeleteSectionModal(section)}
                    className="px-4 py-2.5 rounded-lg border-2 border-red-200 text-base font-bold text-red-500 hover:border-red-400 hover:bg-red-50 transition-colors"
                  >
                    حذف
                  </button>
                </div>
              </div>

              {sectionOpen && (
                <div className="border-t-2 border-ink/10 p-5 space-y-4 bg-ink/[0.015]">
                  {section.units.map((unit) => {
                    const unitOpen = expandedUnits.has(unit.id);
                    return (
                      <div key={unit.id} className="rounded-2xl border-2 border-ink/10 bg-surface">
                        <div className="flex flex-wrap items-center gap-3 px-5 py-4">
                          <button
                            onClick={() => toggleSet(setExpandedUnits, unit.id)}
                            className="w-full sm:w-auto sm:flex-1 min-w-0 text-right font-bold text-lg break-words"
                          >
                            {unit.title}
                          </button>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => setExportModal({ scope: { unitId: unit.id }, title: unit.title })}
                              className="px-4 py-2.5 rounded-lg border-2 border-ink/10 text-base font-bold text-primary hover:border-primary/40 hover:bg-primary/5 transition-colors"
                            >
                              تصدير
                            </button>
                            <button
                              onClick={() => openEditUnit(unit)}
                              className="px-4 py-2.5 rounded-lg border-2 border-ink/10 text-base font-bold text-primary hover:border-primary/40 hover:bg-primary/5 transition-colors"
                            >
                              تعديل
                            </button>
                            <button
                              onClick={() => openDeleteUnitModal(unit)}
                              className="px-4 py-2.5 rounded-lg border-2 border-red-200 text-base font-bold text-red-500 hover:border-red-400 hover:bg-red-50 transition-colors"
                            >
                              حذف
                            </button>
                          </div>
                        </div>

                        {unitOpen && (
                          <div className="border-t-2 border-ink/10 p-4 space-y-4">
                            {/* الجروبات اللونية */}
                            <div className="flex items-center gap-2.5 flex-wrap">
                              <span className="text-base text-ink/50">الجروبات اللونية:</span>
                              {unit.item_groups.map((g) => (
                                <button
                                  key={g.id}
                                  onClick={() => openDeleteItemGroupModal(g)}
                                  title="اضغط للحذف"
                                  className="w-10 h-10 rounded-full border-2 border-white shadow"
                                  style={{ background: g.color }}
                                />
                              ))}
                              <input
                                type="color"
                                value={newGroupColor}
                                onChange={(e) => setNewGroupColor(e.target.value)}
                                className="w-10 h-10 rounded-lg border-2 border-ink/10"
                              />
                              <button
                                onClick={() => addItemGroup(unit)}
                                className="text-base font-bold text-primary border-2 border-primary/20 hover:border-primary hover:bg-primary/5 transition-colors px-4 py-2 rounded-lg"
                              >
                                + إضافة جروب
                              </button>
                            </div>

                            {/* عناصر المحتوى */}
                            <div className="space-y-2">
                              {unit.content_items.length === 0 ? (
                                <p className="text-base text-ink/40">لسه مفيش عناصر في الوحدة دي.</p>
                              ) : (
                                unit.content_items.map((item, index) => {
                                  const group = unit.item_groups.find((g) => g.id === item.item_group_id);
                                  return (
                                    <div
                                      key={item.id}
                                      className={`flex flex-wrap items-center gap-3 px-4 py-3 rounded-xl transition-colors ${group ? "" : "hover:bg-primary/5"}`}
                                      style={group ? { background: `${group.color}33` } : undefined}
                                    >
                                      <div className="flex items-center gap-3 w-full sm:w-auto sm:flex-1 min-w-0">
                                        <span
                                          className={group ? "shrink-0" : "text-primary/50 shrink-0"}
                                          style={group ? { color: group.color } : undefined}
                                        >
                                          {contentTypeIcons[item.type]}
                                        </span>
                                        <div className="flex-1 min-w-0">
                                          <p className="font-bold text-base break-words">{item.title}</p>
                                          <p className="text-sm text-ink/40">{typeLabels[item.type]}</p>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-1 shrink-0">
                                        <button
                                          onClick={() => reorderContentItem(unit, item, "up")}
                                          disabled={index === 0}
                                          title="لأعلى"
                                          className="w-10 h-10 flex items-center justify-center rounded-lg border-2 border-ink/10 text-ink/40 hover:text-primary hover:border-primary/40 hover:bg-white/60 disabled:opacity-20 disabled:hover:bg-transparent transition-colors"
                                        >
                                          ↑
                                        </button>
                                        <button
                                          onClick={() => reorderContentItem(unit, item, "down")}
                                          disabled={index === unit.content_items.length - 1}
                                          title="لأسفل"
                                          className="w-10 h-10 flex items-center justify-center rounded-lg border-2 border-ink/10 text-ink/40 hover:text-primary hover:border-primary/40 hover:bg-white/60 disabled:opacity-20 disabled:hover:bg-transparent transition-colors"
                                        >
                                          ↓
                                        </button>
                                      </div>
                                      {item.type === "test" && (
                                        <Link
                                          href={`/admin/courses/${courseId}/content/${item.id}/questions`}
                                          className="px-4 py-2.5 rounded-lg border-2 border-ink/10 text-base font-bold text-primary hover:border-primary/40 hover:bg-primary/5 transition-colors shrink-0"
                                        >
                                          الأسئلة
                                        </Link>
                                      )}
                                      <button
                                        onClick={() => openMoveItem(unit, item)}
                                        className="px-4 py-2.5 rounded-lg border-2 border-ink/10 text-base font-bold text-primary hover:border-primary/40 hover:bg-primary/5 transition-colors shrink-0"
                                      >
                                        نقل
                                      </button>
                                      <button
                                        onClick={() => openEditItem(unit, item)}
                                        className="px-4 py-2.5 rounded-lg border-2 border-ink/10 text-base font-bold text-primary hover:border-primary/40 hover:bg-primary/5 transition-colors shrink-0"
                                      >
                                        تعديل
                                      </button>
                                      <button
                                        onClick={() => openDeleteItemModal(item)}
                                        className="px-4 py-2.5 rounded-lg border-2 border-red-200 text-base font-bold text-red-500 hover:border-red-400 hover:bg-red-50 transition-colors shrink-0"
                                      >
                                        حذف
                                      </button>
                                    </div>
                                  );
                                })
                              )}
                            </div>

                            <button
                              onClick={() => openAddItem(unit)}
                              className="text-base font-bold text-primary border-2 border-primary/20 hover:border-primary hover:bg-primary/5 transition-colors px-4 py-2 rounded-lg"
                            >
                              + إضافة عنصر
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  <button
                    onClick={() => openAddUnit(section)}
                    className="text-base font-bold text-primary border-2 border-primary/20 hover:border-primary hover:bg-primary/5 transition-colors px-4 py-2 rounded-lg"
                  >
                    + إضافة وحدة
                  </button>
                </div>
              )}
            </div>
          );
        })
      )}

      <CourseSectionModal modal={sectionModal} onModalChange={setSectionModal} saving={savingSection} onSave={submitSection} onClose={closeSectionModal} />

      <CourseUnitModal modal={unitModal} onModalChange={setUnitModal} saving={savingUnit} onSave={submitUnit} onClose={closeUnitModal} />

      <CourseItemModal
        modal={itemModal}
        onModalChange={setItemModal}
        selectedFile={selectedFile}
        onFileChange={setSelectedFile}
        uploadProgress={uploadProgress}
        saving={savingItem}
        onSave={submitItem}
        onClose={closeItemModal}
      />

      <CourseMoveItemModal
        modal={moveModal}
        onUnitIdChange={(unitId) => setMoveModal((prev) => ({ ...prev, unitId }))}
        onCourseChange={changeMoveCourse}
        onSectionChange={changeMoveSection}
        onConfirm={confirmMove}
        onClose={closeMoveModal}
      />

      {exportModal && (
        <ExportQuestionsModal
          open={!!exportModal}
          onClose={() => setExportModal(null)}
          defaultTitle={exportModal.title}
          loadQuestions={() => getTestContentItemIds(exportModal.scope).then(fetchQuestionsForTestIds)}
        />
      )}

      <ConfirmModal
        open={!!deleteSectionTarget}
        onClose={closeDeleteSectionModal}
        onConfirm={confirmDeleteSection}
        busy={deletingSection}
        title="تأكيد حذف القسم"
        body={`متأكد إنك عايز تمسح قسم "${deleteSectionTarget?.title ?? ""}"؟ هيتمسح كل اللي جواه (وحدات وعناصر).`}
        confirmLabel="احذف القسم"
      />

      <ConfirmModal
        open={!!deleteUnitTarget}
        onClose={closeDeleteUnitModal}
        onConfirm={confirmDeleteUnit}
        busy={deletingUnit}
        title="تأكيد حذف الوحدة"
        body={`متأكد إنك عايز تمسح وحدة "${deleteUnitTarget?.title ?? ""}"؟ هيتمسح كل اللي جواها.`}
        confirmLabel="احذف الوحدة"
      />

      <ConfirmModal
        open={!!deleteItemGroupTarget}
        onClose={closeDeleteItemGroupModal}
        onConfirm={confirmDeleteItemGroup}
        busy={deletingItemGroup}
        title="تأكيد حذف الجروب اللوني"
        body="متأكد إنك عايز تمسح الجروب اللوني ده؟ العناصر اللي جواه هتفضل موجودة من غير جروب."
        confirmLabel="احذف الجروب"
      />

      <ConfirmModal
        open={!!deleteItemTarget}
        onClose={closeDeleteItemModal}
        onConfirm={confirmDeleteItem}
        busy={deletingItem}
        title="تأكيد حذف العنصر"
        body={`متأكد إنك عايز تمسح "${deleteItemTarget?.title ?? ""}"؟`}
        confirmLabel="احذف العنصر"
      />
    </div>
  );
}
