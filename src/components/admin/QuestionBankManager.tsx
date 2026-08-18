"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import ImportQuestionsModal from "@/components/admin/ImportQuestionsModal";
import ExportQuestionsModal from "@/components/admin/ExportQuestionsModal";
import QuestionBankCategoryModal from "@/components/admin/QuestionBankCategoryModal";
import QuestionBankDeleteCategoryModal from "@/components/admin/QuestionBankDeleteCategoryModal";
import QuestionBankQuestionModal from "@/components/admin/QuestionBankQuestionModal";
import QuestionBankDeleteQuestionModal from "@/components/admin/QuestionBankDeleteQuestionModal";
import QuestionBankPassageModal from "@/components/admin/QuestionBankPassageModal";
import QuestionBankDeletePassageModal from "@/components/admin/QuestionBankDeletePassageModal";
import FormattedQuestionText from "@/components/shared/FormattedQuestionText";
import Pagination from "@/components/shared/Pagination";
import type { ParsedQuestionRow } from "@/lib/questionsCsv";
import { prepareQuestionTextForSave } from "@/lib/questionTextHtml";
import { buildCategoryTree, collectDescendantIds, flattenCategoryTree, type CategoryNode, type QuestionCategory } from "@/lib/supabase/questionBank";
import { fetchQuestionsByCategoryIds } from "@/lib/supabase/questionExport";
import { supabase } from "@/lib/supabase/client";

export type Question = { id: string; question_text: string; order_index: number; category_id: string; passage_id: string | null };
type Option = { id: string; question_id: string; option_text: string; is_correct: boolean; order_index: number };
export type Passage = { id: string; category_id: string; title: string; body: string; order_index: number };
type QuestionWithOptions = Question & { question_options: Option[] };

const PAGE_SIZE = 50;

function getNextOrderIndex<T extends { order_index: number }>(list: T[]) {
  return list.length > 0 ? Math.max(...list.map((x) => x.order_index)) + 1 : 1;
}

// بيرجع أعلى order_index موجود فعليًا في القاعدة (مش بس المحمّل في المتصفح) — عشان صفحات الأسئلة المقسّمة (pagination)
async function nextOrderIndexOnServer(table: "questions" | "reading_passages", column: string, value: string) {
  const { data } = await supabase.from(table).select("order_index").eq(column, value).order("order_index", { ascending: false }).limit(1);
  return (data?.[0]?.order_index ?? 0) + 1;
}

const optionLetters = ["أ", "ب", "ج", "د", "هـ", "و", "ز", "ح"];

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      className={`shrink-0 transition-transform ${open ? "" : "-rotate-90"}`}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export default function QuestionBankManager() {
  const [categories, setCategories] = useState<QuestionCategory[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);

  // ===== محتوى التصنيف المفتوح بس (مش البنك كله) — أسئلته، اختياراته، نصوصه، مع pagination =====
  const [categoryQuestions, setCategoryQuestions] = useState<Question[]>([]);
  const [options, setOptions] = useState<Option[]>([]);
  const [categoryPassages, setCategoryPassages] = useState<Passage[]>([]);
  const [loadingCategoryContent, setLoadingCategoryContent] = useState(false);
  const [questionsPage, setQuestionsPage] = useState(1);
  const [questionsTotalCount, setQuestionsTotalCount] = useState(0);

  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [expandedCategoryIds, setExpandedCategoryIds] = useState<Set<string>>(new Set());
  const [expandedQuestionIds, setExpandedQuestionIds] = useState<Set<string>>(new Set());
  const [expandedPassageIds, setExpandedPassageIds] = useState<Set<string>>(new Set());
  const [newOptionText, setNewOptionText] = useState<Record<string, string>>({});

  // ===== بحث عن أي سؤال/نص في كل البنك (استعلام سيرفر، مش فلترة محلية) =====
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<{
    questions: { id: string; question_text: string; category_id: string }[];
    passages: { id: string; title: string; category_id: string }[];
  } | null>(null);

  // ===== Modal تصنيف =====
  const [categoryModal, setCategoryModal] = useState<{ mode: "add" | "edit"; category: QuestionCategory | null; parentId: string | null } | null>(
    null
  );
  const [categoryTitle, setCategoryTitle] = useState("");
  const [categoryParentId, setCategoryParentId] = useState("");
  const [savingCategory, setSavingCategory] = useState(false);
  const [deleteCategoryTarget, setDeleteCategoryTarget] = useState<QuestionCategory | null>(null);
  const [deleteCategoryBlockedReason, setDeleteCategoryBlockedReason] = useState<string | null>(null);
  const [checkingDeleteCategory, setCheckingDeleteCategory] = useState(false);
  const [deletingCategory, setDeletingCategory] = useState(false);

  // ===== Modal سؤال =====
  const [questionModal, setQuestionModal] = useState<{ mode: "add" | "edit"; question: Question | null } | null>(null);
  const [questionText, setQuestionText] = useState("");
  const [questionPassageId, setQuestionPassageId] = useState("");
  const [savingQuestion, setSavingQuestion] = useState(false);
  const [deleteQuestionTarget, setDeleteQuestionTarget] = useState<Question | null>(null);
  const [deletingQuestion, setDeletingQuestion] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [exportModal, setExportModal] = useState<{ categoryId: string; title: string } | null>(null);

  // ===== Modal نص قراءة مشترك =====
  const [passageModal, setPassageModal] = useState<{ mode: "add" | "edit"; passage: Passage | null } | null>(null);
  const [passageTitle, setPassageTitle] = useState("");
  const [passageBody, setPassageBody] = useState("");
  const [savingPassage, setSavingPassage] = useState(false);
  const [deletePassageTarget, setDeletePassageTarget] = useState<Passage | null>(null);
  const [deletingPassage, setDeletingPassage] = useState(false);

  async function fetchCategories() {
    setLoadingCategories(true);
    const { data, error } = await supabase
      .from("question_categories")
      .select("id, parent_id, title, order_index")
      .order("order_index", { ascending: true });

    if (error) {
      toast.error("حصل خطأ في تحميل التصنيفات");
    } else {
      setCategories(data || []);
    }
    setLoadingCategories(false);
  }

  useEffect(() => {
    fetchCategories();
  }, []);

  // بيجيب أسئلة (باختياراتها مدمجة في نفس الطلب) واختياراتها لتصنيف واحد بس، صفحة واحدة في المرة —
  // ترقيم صفحات بالرقم (مش "تحميل أكتر")، عشان البنك بقى فيه آلاف الأسئلة
  async function fetchCategoryContent(categoryId: string, pageNum: number) {
    setLoadingCategoryContent(true);
    const offset = (pageNum - 1) * PAGE_SIZE;

    const [{ data: rows, count, error }, passagesResult] = await Promise.all([
      supabase
        .from("questions")
        .select("id, question_text, order_index, category_id, passage_id, question_options(id, question_id, option_text, is_correct, order_index)", {
          count: "exact",
        })
        .eq("category_id", categoryId)
        .order("order_index", { ascending: true })
        .range(offset, offset + PAGE_SIZE - 1),
      supabase.from("reading_passages").select("id, category_id, title, body, order_index").eq("category_id", categoryId).order("order_index"),
    ]);

    if (error) {
      toast.error("حصل خطأ في تحميل الأسئلة");
      setLoadingCategoryContent(false);
      return;
    }

    // لو الصفحة بقت مش موجودة (بعد حذف سؤال مثلًا)، نرجع لآخر صفحة صحيحة
    const total = count ?? 0;
    const maxPage = Math.max(1, Math.ceil(total / PAGE_SIZE));
    if (pageNum > maxPage) {
      setLoadingCategoryContent(false);
      fetchCategoryContent(categoryId, maxPage);
      return;
    }

    const list = (rows as unknown as QuestionWithOptions[]) ?? [];
    const newQuestions: Question[] = list.map((q) => ({
      id: q.id,
      question_text: q.question_text,
      order_index: q.order_index,
      category_id: q.category_id,
      passage_id: q.passage_id,
    }));
    const newOptions: Option[] = list.flatMap((q) => q.question_options ?? []);
    setCategoryQuestions(newQuestions);
    setOptions(newOptions);
    setQuestionsTotalCount(total);
    setQuestionsPage(pageNum);
    if (!passagesResult.error) setCategoryPassages(passagesResult.data ?? []);

    setLoadingCategoryContent(false);
  }

  const categoryTree = useMemo(() => buildCategoryTree(categories), [categories]);
  const flattenedCategories = useMemo(() => flattenCategoryTree(categoryTree), [categoryTree]);
  const categoriesById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  const optionsByQuestion = useMemo(() => {
    const map = new Map<string, Option[]>();
    for (const o of options) {
      const list = map.get(o.question_id) ?? [];
      list.push(o);
      map.set(o.question_id, list);
    }
    return map;
  }, [options]);

  const questionsByPassage = useMemo(() => {
    const map = new Map<string, Question[]>();
    for (const q of categoryQuestions) {
      if (!q.passage_id) continue;
      const list = map.get(q.passage_id) ?? [];
      list.push(q);
      map.set(q.passage_id, list);
    }
    return map;
  }, [categoryQuestions]);

  const selectedCategory = selectedCategoryId ? categoriesById.get(selectedCategoryId) ?? null : null;

  const standaloneCategoryQuestions = useMemo(() => categoryQuestions.filter((q) => !q.passage_id), [categoryQuestions]);

  function categoryPath(categoryId: string): string {
    const chain: string[] = [];
    let current: string | undefined = categoryId;
    while (current) {
      const category = categoriesById.get(current);
      if (!category) break;
      chain.unshift(category.title);
      current = category.parent_id ?? undefined;
    }
    return chain.join(" › ");
  }

  const trimmedSearch = searchQuery.trim();

  function handleSearchChange(value: string) {
    setSearchQuery(value);
    if (value.trim().length < 2) setSearchResults(null);
  }

  // بحث سيرفر (مش فلترة محلية) في كل البنك، بعد ما المستخدم يوقف عن الكتابة شوية
  useEffect(() => {
    if (trimmedSearch.length < 2) return;
    const timeout = setTimeout(async () => {
      setSearching(true);
      const [{ data: qData }, { data: pByTitle }, { data: pByBody }] = await Promise.all([
        supabase.from("questions").select("id, question_text, category_id").ilike("question_text", `%${trimmedSearch}%`).limit(50),
        supabase.from("reading_passages").select("id, title, category_id").ilike("title", `%${trimmedSearch}%`).limit(50),
        supabase.from("reading_passages").select("id, title, category_id").ilike("body", `%${trimmedSearch}%`).limit(50),
      ]);
      const passageMap = new Map([...(pByTitle ?? []), ...(pByBody ?? [])].map((p) => [p.id, p]));
      setSearchResults({ questions: qData ?? [], passages: [...passageMap.values()] });
      setSearching(false);
    }, 300);
    return () => clearTimeout(timeout);
  }, [trimmedSearch]);

  function expandAncestors(categoryId: string) {
    setExpandedCategoryIds((prev) => {
      const next = new Set(prev);
      let current: string | undefined = categoryId;
      while (current) {
        next.add(current);
        current = categoriesById.get(current)?.parent_id ?? undefined;
      }
      return next;
    });
  }

  function jumpToCategory(categoryId: string) {
    setSearchQuery("");
    setSearchResults(null);
    selectCategory(categoryId);
  }

  function toggleCategoryExpanded(id: string) {
    setExpandedCategoryIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleQuestionExpanded(id: string) {
    setExpandedQuestionIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function togglePassageExpanded(id: string) {
    setExpandedPassageIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectCategory(id: string) {
    setSearchQuery("");
    setSearchResults(null);
    setSelectedCategoryId(id);
    expandAncestors(id);
    setCategoryQuestions([]);
    setOptions([]);
    setCategoryPassages([]);
    setQuestionsTotalCount(0);
    fetchCategoryContent(id, 1);
  }

  // ===== تصنيفات =====
  function openAddCategoryModal(parentId: string | null) {
    setCategoryModal({ mode: "add", category: null, parentId });
    setCategoryTitle("");
    setCategoryParentId(parentId || "");
  }

  function openEditCategoryModal(category: QuestionCategory) {
    setCategoryModal({ mode: "edit", category, parentId: category.parent_id });
    setCategoryTitle(category.title);
    setCategoryParentId(category.parent_id || "");
  }

  function closeCategoryModal() {
    setCategoryModal(null);
    setCategoryTitle("");
    setCategoryParentId("");
  }

  const parentOptionsForModal = useMemo(() => {
    if (!categoryModal || categoryModal.mode === "add") return categories;
    const blocked = collectDescendantIds(categoryModal.category!.id, categories);
    blocked.add(categoryModal.category!.id);
    return categories.filter((c) => !blocked.has(c.id));
  }, [categoryModal, categories]);

  async function handleSaveCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!categoryModal || !categoryTitle.trim()) return;

    setSavingCategory(true);
    const parentId = categoryParentId || null;

    if (categoryModal.mode === "add") {
      const siblingCount = getNextOrderIndex(categories.filter((c) => c.parent_id === parentId));
      const { data, error } = await supabase
        .from("question_categories")
        .insert({ title: categoryTitle.trim(), parent_id: parentId, order_index: siblingCount })
        .select()
        .single();

      if (error) {
        toast.error("حصل خطأ في إضافة التصنيف");
      } else {
        toast.success("اتضاف التصنيف");
        setCategories((prev) => [...prev, data]);
        if (parentId) setExpandedCategoryIds((prev) => new Set(prev).add(parentId));
        closeCategoryModal();
      }
    } else {
      const { data, error } = await supabase
        .from("question_categories")
        .update({ title: categoryTitle.trim(), parent_id: parentId })
        .eq("id", categoryModal.category!.id)
        .select()
        .single();

      if (error) {
        toast.error("حصل خطأ في تعديل التصنيف");
      } else {
        toast.success("اتعدل التصنيف");
        setCategories((prev) => prev.map((c) => (c.id === data.id ? data : c)));
        closeCategoryModal();
      }
    }
    setSavingCategory(false);
  }

  async function openDeleteCategoryModal(category: QuestionCategory) {
    setDeleteCategoryTarget(category);
    setDeleteCategoryBlockedReason(null);
    setCheckingDeleteCategory(true);

    const hasChildren = categories.some((c) => c.parent_id === category.id);
    const { count } = await supabase.from("questions").select("id", { count: "exact", head: true }).eq("category_id", category.id);
    const hasQuestions = (count ?? 0) > 0;

    if (hasChildren && hasQuestions) setDeleteCategoryBlockedReason("التصنيف ده فيه تصنيفات فرعية وأسئلة، لازم تشيلهم الأول.");
    else if (hasChildren) setDeleteCategoryBlockedReason("التصنيف ده فيه تصنيفات فرعية، لازم تشيلها أو تنقلها الأول.");
    else if (hasQuestions) setDeleteCategoryBlockedReason("التصنيف ده فيه أسئلة، لازم تشيلها أو تنقلها الأول.");
    setCheckingDeleteCategory(false);
  }

  function closeDeleteCategoryModal() {
    setDeleteCategoryTarget(null);
    setDeleteCategoryBlockedReason(null);
  }

  async function handleConfirmDeleteCategory() {
    if (!deleteCategoryTarget || deleteCategoryBlockedReason) return;

    setDeletingCategory(true);
    const { error } = await supabase.from("question_categories").delete().eq("id", deleteCategoryTarget.id);

    if (error) {
      toast.error("حصل خطأ في حذف التصنيف");
    } else {
      toast.success("اتمسح التصنيف");
      setCategories((prev) => prev.filter((c) => c.id !== deleteCategoryTarget.id));
      if (selectedCategoryId === deleteCategoryTarget.id) setSelectedCategoryId(null);
      closeDeleteCategoryModal();
    }
    setDeletingCategory(false);
  }

  async function reorderCategory(category: QuestionCategory, direction: "up" | "down") {
    const siblings = categories.filter((c) => c.parent_id === category.parent_id).sort((a, b) => a.order_index - b.order_index);
    const index = siblings.findIndex((c) => c.id === category.id);
    const swapWith = direction === "up" ? siblings[index - 1] : siblings[index + 1];
    if (!swapWith) return;

    const [{ error: e1 }, { error: e2 }] = await Promise.all([
      supabase.from("question_categories").update({ order_index: swapWith.order_index }).eq("id", category.id),
      supabase.from("question_categories").update({ order_index: category.order_index }).eq("id", swapWith.id),
    ]);

    if (e1 || e2) {
      toast.error("حصل خطأ في إعادة الترتيب");
    } else {
      setCategories((prev) =>
        prev.map((c) => {
          if (c.id === category.id) return { ...c, order_index: swapWith.order_index };
          if (c.id === swapWith.id) return { ...c, order_index: category.order_index };
          return c;
        })
      );
    }
  }

  // ===== أسئلة =====
  function openAddQuestionModal(passageId?: string) {
    setQuestionModal({ mode: "add", question: null });
    setQuestionText("");
    setQuestionPassageId(passageId || "");
  }

  function openEditQuestionModal(question: Question) {
    setQuestionModal({ mode: "edit", question });
    setQuestionText(question.question_text);
    setQuestionPassageId(question.passage_id || "");
  }

  function closeQuestionModal() {
    setQuestionModal(null);
    setQuestionText("");
    setQuestionPassageId("");
  }

  async function handleSaveQuestion(e: React.FormEvent) {
    e.preventDefault();
    if (!questionModal || !selectedCategoryId) return;
    if (!questionText.trim()) {
      toast.error("لازم تكتب نص السؤال");
      return;
    }

    setSavingQuestion(true);
    const passageId = questionPassageId || null;
    const safeText = await prepareQuestionTextForSave(questionText.trim());

    if (questionModal.mode === "add") {
      const orderIndex = await nextOrderIndexOnServer("questions", "category_id", selectedCategoryId);
      const { data, error } = await supabase
        .from("questions")
        .insert({ question_text: safeText, category_id: selectedCategoryId, order_index: orderIndex, passage_id: passageId })
        .select()
        .single();

      if (error) {
        toast.error("حصل خطأ في إضافة السؤال");
      } else {
        toast.success("اتضاف السؤال");
        setExpandedQuestionIds((prev) => new Set(prev).add(data.id));
        closeQuestionModal();
        // السؤال الجديد بيتحط آخر التصنيف (order_index أعلى)، فهو دايمًا هيكون في آخر صفحة
        const lastPage = Math.max(1, Math.ceil((questionsTotalCount + 1) / PAGE_SIZE));
        fetchCategoryContent(selectedCategoryId, lastPage);
      }
    } else {
      const { data, error } = await supabase
        .from("questions")
        .update({ question_text: safeText, passage_id: passageId })
        .eq("id", questionModal.question!.id)
        .select()
        .single();

      if (error) {
        toast.error("حصل خطأ في تعديل السؤال");
      } else {
        toast.success("اتعدل السؤال");
        setCategoryQuestions((prev) => prev.map((q) => (q.id === data.id ? data : q)));
        closeQuestionModal();
      }
    }
    setSavingQuestion(false);
  }

  function openDeleteQuestionModal(question: Question) {
    setDeleteQuestionTarget(question);
  }

  function closeDeleteQuestionModal() {
    setDeleteQuestionTarget(null);
  }

  async function handleConfirmDeleteQuestion() {
    if (!deleteQuestionTarget) return;

    setDeletingQuestion(true);
    const questionId = deleteQuestionTarget.id;

    // بننضف الروابط والاختيارات الأول عشان الحذف يعدي أيًا كان سلوك الـ FK
    await supabase.from("test_questions").delete().eq("question_id", questionId);
    await supabase.from("question_options").delete().eq("question_id", questionId);
    const { error } = await supabase.from("questions").delete().eq("id", questionId);

    if (error) {
      toast.error("حصل خطأ في حذف السؤال");
    } else {
      toast.success("اتمسح السؤال");
      closeDeleteQuestionModal();
      if (selectedCategoryId) fetchCategoryContent(selectedCategoryId, questionsPage);
    }
    setDeletingQuestion(false);
  }

  // استيراد أسئلة بالجملة من CSV — بتتضاف للتصنيف اللي الأدمن يختاره في نافذة الاستيراد نفسها
  // (ممكن يكون مختلف عن التصنيف المفتوح في الشجرة دلوقتي). أسئلة من غير إجابة صح بتتضاف "غير محلولة"
  // (كل اختياراتها is_correct: false) — هتظهر كده لحد ما الأدمن يراجعها ويحدد الصح.
  async function handleImportQuestions(rows: ParsedQuestionRow[], categoryId: string) {
    const orderStart = await nextOrderIndexOnServer("questions", "category_id", categoryId);
    const questionRows = await Promise.all(
      rows.map(async (r, i) => ({
        question_text: await prepareQuestionTextForSave(r.question_text),
        category_id: categoryId,
        order_index: orderStart + i,
      }))
    );

    const { data: inserted, error } = await supabase.from("questions").insert(questionRows).select();
    if (error || !inserted) {
      toast.error("حصل خطأ في استيراد الأسئلة");
      return;
    }

    const idByOrderIndex = new Map(inserted.map((q) => [q.order_index as number, q.id as string]));
    const optionRows = rows.flatMap((r, i) => {
      const questionId = idByOrderIndex.get(orderStart + i);
      if (!questionId) return [];
      return r.options.map((opt, optIdx) => ({
        question_id: questionId,
        option_text: opt.text,
        is_correct: opt.letter === r.correctLetter,
        order_index: optIdx + 1,
      }));
    });

    const { error: optError } = await supabase.from("question_options").insert(optionRows);
    if (optError) {
      toast.error("الأسئلة اتضافت بس حصل خطأ في اختياراتها");
    } else {
      const unsolvedCount = rows.filter((r) => !r.solved).length;
      toast.success(`اتضاف ${rows.length} سؤال${unsolvedCount > 0 ? ` (${unsolvedCount} منهم غير محلول)` : ""}`);
    }

    if (categoryId === selectedCategoryId) {
      const lastPage = Math.max(1, Math.ceil((questionsTotalCount + rows.length) / PAGE_SIZE));
      fetchCategoryContent(selectedCategoryId, lastPage);
    }
  }

  async function reorderQuestion(question: Question, direction: "up" | "down", siblingsList: Question[]) {
    const siblings = [...siblingsList].sort((a, b) => a.order_index - b.order_index);
    const index = siblings.findIndex((q) => q.id === question.id);
    const swapWith = direction === "up" ? siblings[index - 1] : siblings[index + 1];
    if (!swapWith) return;

    const [{ error: e1 }, { error: e2 }] = await Promise.all([
      supabase.from("questions").update({ order_index: swapWith.order_index }).eq("id", question.id),
      supabase.from("questions").update({ order_index: question.order_index }).eq("id", swapWith.id),
    ]);

    if (e1 || e2) {
      toast.error("حصل خطأ في إعادة الترتيب");
    } else {
      setCategoryQuestions((prev) =>
        prev.map((q) => {
          if (q.id === question.id) return { ...q, order_index: swapWith.order_index };
          if (q.id === swapWith.id) return { ...q, order_index: question.order_index };
          return q;
        })
      );
    }
  }

  // ===== نصوص قراءة مشتركة =====
  function openAddPassageModal() {
    setPassageModal({ mode: "add", passage: null });
    setPassageTitle("");
    setPassageBody("");
  }

  function openEditPassageModal(passage: Passage) {
    setPassageModal({ mode: "edit", passage });
    setPassageTitle(passage.title);
    setPassageBody(passage.body);
  }

  function closePassageModal() {
    setPassageModal(null);
    setPassageTitle("");
    setPassageBody("");
  }

  async function handleSavePassage(e: React.FormEvent) {
    e.preventDefault();
    if (!passageModal || !passageTitle.trim() || !passageBody.trim() || !selectedCategoryId) return;

    setSavingPassage(true);

    if (passageModal.mode === "add") {
      const { data, error } = await supabase
        .from("reading_passages")
        .insert({
          title: passageTitle.trim(),
          body: passageBody.trim(),
          category_id: selectedCategoryId,
          order_index: getNextOrderIndex(categoryPassages),
        })
        .select()
        .single();

      if (error) {
        toast.error("حصل خطأ في إضافة النص");
      } else {
        toast.success("اتضاف النص");
        setCategoryPassages((prev) => [...prev, data]);
        setExpandedPassageIds((prev) => new Set(prev).add(data.id));
        closePassageModal();
      }
    } else {
      const { data, error } = await supabase
        .from("reading_passages")
        .update({ title: passageTitle.trim(), body: passageBody.trim() })
        .eq("id", passageModal.passage!.id)
        .select()
        .single();

      if (error) {
        toast.error("حصل خطأ في تعديل النص");
      } else {
        toast.success("اتعدل النص");
        setCategoryPassages((prev) => prev.map((p) => (p.id === data.id ? data : p)));
        closePassageModal();
      }
    }
    setSavingPassage(false);
  }

  function openDeletePassageModal(passage: Passage) {
    setDeletePassageTarget(passage);
  }

  function closeDeletePassageModal() {
    setDeletePassageTarget(null);
  }

  async function handleConfirmDeletePassage() {
    if (!deletePassageTarget) return;

    setDeletingPassage(true);
    const { error } = await supabase.from("reading_passages").delete().eq("id", deletePassageTarget.id);

    if (error) {
      toast.error("حصل خطأ في حذف النص");
    } else {
      toast.success("اتمسح النص، وأسئلته فضلت من غير نص");
      setCategoryPassages((prev) => prev.filter((p) => p.id !== deletePassageTarget.id));
      setCategoryQuestions((prev) => prev.map((q) => (q.passage_id === deletePassageTarget.id ? { ...q, passage_id: null } : q)));
      closeDeletePassageModal();
    }
    setDeletingPassage(false);
  }

  async function reorderPassage(passage: Passage, direction: "up" | "down") {
    const siblings = [...categoryPassages].sort((a, b) => a.order_index - b.order_index);
    const index = siblings.findIndex((p) => p.id === passage.id);
    const swapWith = direction === "up" ? siblings[index - 1] : siblings[index + 1];
    if (!swapWith) return;

    const [{ error: e1 }, { error: e2 }] = await Promise.all([
      supabase.from("reading_passages").update({ order_index: swapWith.order_index }).eq("id", passage.id),
      supabase.from("reading_passages").update({ order_index: passage.order_index }).eq("id", swapWith.id),
    ]);

    if (e1 || e2) {
      toast.error("حصل خطأ في إعادة الترتيب");
    } else {
      setCategoryPassages((prev) =>
        prev.map((p) => {
          if (p.id === passage.id) return { ...p, order_index: swapWith.order_index };
          if (p.id === swapWith.id) return { ...p, order_index: passage.order_index };
          return p;
        })
      );
    }
  }

  // ===== اختيارات =====
  async function addOption(question: Question) {
    const text = (newOptionText[question.id] || "").trim();
    if (!text) return;

    const existing = optionsByQuestion.get(question.id) ?? [];
    const { data, error } = await supabase
      .from("question_options")
      .insert({ question_id: question.id, option_text: text, is_correct: existing.length === 0, order_index: getNextOrderIndex(existing) })
      .select()
      .single();

    if (error) {
      toast.error("حصل خطأ في إضافة الاختيار");
    } else {
      setOptions((prev) => [...prev, data]);
      setNewOptionText((prev) => ({ ...prev, [question.id]: "" }));
    }
  }

  async function updateOptionText(option: Option, text: string) {
    if (text.trim() === option.option_text || !text.trim()) return;

    const { error } = await supabase.from("question_options").update({ option_text: text.trim() }).eq("id", option.id);
    if (error) {
      toast.error("حصل خطأ في تعديل الاختيار");
    } else {
      setOptions((prev) => prev.map((o) => (o.id === option.id ? { ...o, option_text: text.trim() } : o)));
    }
  }

  async function setCorrectOption(question: Question, option: Option) {
    if (option.is_correct) return;

    // لازم بالترتيب مش Promise.all: الاستعلامين بيلمسوا صفوف متداخلة (الأول بيمسح كل اختيارات
    // السؤال بما فيهم الاختيار المستهدف، والتاني بيحطه صح) — لو اتنفذوا بالتوازي وترتيب وصولهم
    // لقاعدة البيانات اتقلب، الاستعلام الأول ممكن يمسح تحديد الإجابة اللي التاني حطّه لسه.
    const { error: e1 } = await supabase.from("question_options").update({ is_correct: false }).eq("question_id", question.id);
    const { error: e2 } = await supabase.from("question_options").update({ is_correct: true }).eq("id", option.id);

    if (e1 || e2) {
      toast.error("حصل خطأ في تحديد الإجابة الصحيحة");
    } else {
      setOptions((prev) => prev.map((o) => (o.question_id === question.id ? { ...o, is_correct: o.id === option.id } : o)));
    }
  }

  async function deleteOption(option: Option) {
    const { error } = await supabase.from("question_options").delete().eq("id", option.id);
    if (error) {
      toast.error("حصل خطأ في حذف الاختيار");
    } else {
      setOptions((prev) => prev.filter((o) => o.id !== option.id));
    }
  }

  async function reorderOption(question: Question, option: Option, direction: "up" | "down") {
    const siblings = (optionsByQuestion.get(question.id) ?? []).slice().sort((a, b) => a.order_index - b.order_index);
    const index = siblings.findIndex((o) => o.id === option.id);
    const swapWith = direction === "up" ? siblings[index - 1] : siblings[index + 1];
    if (!swapWith) return;

    const [{ error: e1 }, { error: e2 }] = await Promise.all([
      supabase.from("question_options").update({ order_index: swapWith.order_index }).eq("id", option.id),
      supabase.from("question_options").update({ order_index: option.order_index }).eq("id", swapWith.id),
    ]);

    if (e1 || e2) {
      toast.error("حصل خطأ في إعادة الترتيب");
    } else {
      setOptions((prev) =>
        prev.map((o) => {
          if (o.id === option.id) return { ...o, order_index: swapWith.order_index };
          if (o.id === swapWith.id) return { ...o, order_index: option.order_index };
          return o;
        })
      );
    }
  }

  function renderCategoryNode(node: CategoryNode, depth: number) {
    const isExpanded = expandedCategoryIds.has(node.id);
    const isSelected = selectedCategoryId === node.id;
    const siblings = categories.filter((c) => c.parent_id === node.parent_id).sort((a, b) => a.order_index - b.order_index);
    const siblingIndex = siblings.findIndex((c) => c.id === node.id);
    const actionBtn = `w-10 h-10 flex items-center justify-center rounded-lg border-2 shrink-0 transition-colors disabled:opacity-30 ${
      isSelected ? "border-white/25 hover:bg-white/20" : "border-ink/10 hover:border-primary/40 hover:bg-primary/15"
    }`;
    return (
      <div key={node.id}>
        <div
          className={`flex flex-wrap items-center gap-1.5 rounded-xl px-2.5 py-2.5 cursor-pointer transition-colors ${
            isSelected ? "bg-primary text-white" : "hover:bg-primary/10"
          }`}
          style={{ paddingInlineStart: 10 + depth * 18 }}
          onClick={() => selectCategory(node.id)}
        >
          <div className="flex items-center gap-1.5 w-full min-w-0">
            {node.children.length > 0 ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleCategoryExpanded(node.id);
                }}
                className={`w-6 h-6 flex items-center justify-center shrink-0 text-lg transition-transform ${isExpanded ? "rotate-90" : ""}`}
              >
                ‹
              </button>
            ) : (
              <span className="w-6 shrink-0" />
            )}
            <span className="flex-1 min-w-0 break-words text-base font-bold">{node.title}</span>
          </div>
          <div className={`flex items-center gap-0.5 shrink-0 ${isSelected ? "text-white" : "text-primary"}`}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                reorderCategory(node, "up");
              }}
              disabled={siblingIndex === 0}
              title="لأعلى"
              className={actionBtn}
            >
              ↑
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                reorderCategory(node, "down");
              }}
              disabled={siblingIndex === siblings.length - 1}
              title="لأسفل"
              className={actionBtn}
            >
              ↓
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                openAddCategoryModal(node.id);
              }}
              title="إضافة تصنيف فرعي"
              className={actionBtn}
            >
              +
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setExportModal({ categoryId: node.id, title: node.title });
              }}
              title="تصدير الأسئلة"
              className={actionBtn}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 3v12m0 0 4-4m-4 4-4-4M4 21h16" />
              </svg>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                openEditCategoryModal(node);
              }}
              title="تعديل"
              className={actionBtn}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
              </svg>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                openDeleteCategoryModal(node);
              }}
              title="حذف"
              className={actionBtn}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6" />
              </svg>
            </button>
          </div>
        </div>
        {isExpanded && node.children.map((child) => renderCategoryNode(child, depth + 1))}
      </div>
    );
  }

  function renderQuestionRow(question: Question, siblingsList: Question[]) {
    const siblings = [...siblingsList].sort((a, b) => a.order_index - b.order_index);
    const index = siblings.findIndex((q) => q.id === question.id);
    const isExpanded = expandedQuestionIds.has(question.id);
    const questionOptions = (optionsByQuestion.get(question.id) ?? []).slice().sort((a, b) => a.order_index - b.order_index);
    return (
      <div key={question.id} className="rounded-2xl border-2 border-ink/10 overflow-hidden hover:shadow-sm transition-shadow">
        <div className="flex flex-wrap items-center gap-3 px-4 py-4 bg-ink/[0.02]">
          <button
            onClick={() => toggleQuestionExpanded(question.id)}
            className="w-full sm:w-auto sm:flex-1 min-w-0 flex items-center gap-3 text-right"
          >
            <ChevronIcon open={isExpanded} />
            <span className="w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm flex items-center justify-center shrink-0">
              {index + 1}
            </span>
            <div className="flex-1 min-w-0">
              <FormattedQuestionText html={question.question_text} className="text-base font-bold break-words" />
              <p className="text-sm text-ink/40">{questionOptions.length} اختيار</p>
            </div>
          </button>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => reorderQuestion(question, "up", siblings)}
              disabled={index === 0}
              title="لأعلى"
              className="w-10 h-10 flex items-center justify-center rounded-lg border-2 border-ink/10 text-ink/40 hover:text-primary hover:border-primary/40 hover:bg-surface disabled:opacity-20 transition-colors"
            >
              ↑
            </button>
            <button
              onClick={() => reorderQuestion(question, "down", siblings)}
              disabled={index === siblings.length - 1}
              title="لأسفل"
              className="w-10 h-10 flex items-center justify-center rounded-lg border-2 border-ink/10 text-ink/40 hover:text-primary hover:border-primary/40 hover:bg-surface disabled:opacity-20 transition-colors"
            >
              ↓
            </button>
            <button
              onClick={() => openEditQuestionModal(question)}
              className="px-4 py-2.5 rounded-lg border-2 border-primary/20 text-base font-bold text-primary hover:bg-primary/5 transition-colors"
            >
              تعديل
            </button>
            <button
              onClick={() => openDeleteQuestionModal(question)}
              className="px-4 py-2.5 rounded-lg border-2 border-red-200 text-base font-bold text-red-500 hover:bg-red-50 transition-colors"
            >
              حذف
            </button>
          </div>
        </div>

        {isExpanded && (
          <div className="p-4 space-y-2.5 border-t-2 border-ink/10 bg-surface">
            {questionOptions.map((option, optIndex) => (
              <div
                key={option.id}
                className={`flex flex-wrap items-center gap-3 rounded-xl border-2 px-3 py-2.5 transition-colors ${
                  option.is_correct ? "bg-teal/10 border-teal/40" : "bg-ink/[0.015] border-ink/10"
                }`}
              >
                <div className="flex items-center gap-3 w-full sm:w-auto sm:flex-1 min-w-0">
                  <span
                    className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-base shrink-0 ${
                      option.is_correct ? "bg-teal text-white" : "bg-surface text-ink/50 border-2 border-ink/10"
                    }`}
                  >
                    {optionLetters[optIndex] ?? optIndex + 1}
                  </span>
                  <input
                    defaultValue={option.option_text}
                    onBlur={(e) => updateOptionText(option, e.target.value)}
                    className="flex-1 min-w-0 bg-transparent text-base font-bold outline-none border-b-2 border-transparent focus:border-primary transition-colors py-1"
                  />
                </div>
                <div className="flex items-center gap-2 flex-wrap shrink-0">
                  {option.is_correct ? (
                    <span className="shrink-0 text-sm font-bold text-teal bg-teal/15 rounded-full px-3 py-1.5">✓ الإجابة الصحيحة</span>
                  ) : (
                    <button
                      onClick={() => setCorrectOption(question, option)}
                      className="shrink-0 text-sm font-bold text-primary border-2 border-primary/20 hover:bg-primary/10 rounded-full px-3.5 py-2 transition-colors"
                    >
                      حدد كصحيح
                    </button>
                  )}
                  <button
                    onClick={() => reorderOption(question, option, "up")}
                    disabled={optIndex === 0}
                    className="w-10 h-10 flex items-center justify-center rounded-lg border-2 border-ink/10 text-ink/40 hover:text-primary hover:border-primary/40 hover:bg-surface disabled:opacity-20 transition-colors shrink-0"
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => reorderOption(question, option, "down")}
                    disabled={optIndex === questionOptions.length - 1}
                    className="w-10 h-10 flex items-center justify-center rounded-lg border-2 border-ink/10 text-ink/40 hover:text-primary hover:border-primary/40 hover:bg-surface disabled:opacity-20 transition-colors shrink-0"
                  >
                    ↓
                  </button>
                  <button
                    onClick={() => deleteOption(option)}
                    title="حذف الاختيار"
                    className="w-10 h-10 flex items-center justify-center rounded-lg border-2 border-red-200 text-red-400 hover:text-red-600 hover:border-red-400 hover:bg-red-50 transition-colors shrink-0"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M18 6 6 18M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <span className="w-9 h-9 rounded-full border-2 border-dashed border-ink/20 flex items-center justify-center text-ink/30 shrink-0">
                +
              </span>
              <input
                value={newOptionText[question.id] || ""}
                onChange={(e) => setNewOptionText((prev) => ({ ...prev, [question.id]: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addOption(question);
                  }
                }}
                placeholder="اختيار جديد..."
                className="flex-1 min-w-0 rounded-xl border-2 border-dashed border-ink/15 px-3.5 py-2.5 text-base focus:border-primary outline-none transition-colors"
              />
              <button
                onClick={() => addOption(question)}
                className="text-base font-bold text-primary border-2 border-primary/20 hover:border-primary hover:bg-primary/5 transition-colors shrink-0 px-4 py-2 rounded-lg"
              >
                + إضافة
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  function renderPassage(passage: Passage) {
    const siblings = [...categoryPassages].sort((a, b) => a.order_index - b.order_index);
    const index = siblings.findIndex((p) => p.id === passage.id);
    const isExpanded = expandedPassageIds.has(passage.id);
    const passageQuestions = (questionsByPassage.get(passage.id) ?? []).slice().sort((a, b) => a.order_index - b.order_index);

    return (
      <div key={passage.id} className="rounded-2xl border-2 border-primary/25 bg-primary/[0.04] overflow-hidden hover:shadow-sm transition-shadow">
        <div className="flex flex-wrap items-center gap-3 px-4 py-4">
          <button
            onClick={() => togglePassageExpanded(passage.id)}
            className="w-full sm:w-auto sm:flex-1 min-w-0 flex items-center gap-3 text-right"
          >
            <ChevronIcon open={isExpanded} />
            <span className="shrink-0 text-xs font-bold text-primary bg-primary/15 rounded-full px-3 py-1.5">نص قراءة</span>
            <div className="flex-1 min-w-0">
              <p className="text-base font-bold break-words">{passage.title}</p>
              <p className="text-sm text-ink/40">{passageQuestions.length} سؤال مرتبط</p>
            </div>
          </button>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => reorderPassage(passage, "up")}
              disabled={index === 0}
              title="لأعلى"
              className="w-10 h-10 flex items-center justify-center rounded-lg border-2 border-ink/10 text-ink/40 hover:text-primary hover:border-primary/40 hover:bg-surface disabled:opacity-20 transition-colors"
            >
              ↑
            </button>
            <button
              onClick={() => reorderPassage(passage, "down")}
              disabled={index === siblings.length - 1}
              title="لأسفل"
              className="w-10 h-10 flex items-center justify-center rounded-lg border-2 border-ink/10 text-ink/40 hover:text-primary hover:border-primary/40 hover:bg-surface disabled:opacity-20 transition-colors"
            >
              ↓
            </button>
            <button
              onClick={() => openEditPassageModal(passage)}
              className="px-4 py-2.5 rounded-lg border-2 border-primary/20 text-base font-bold text-primary hover:bg-primary/5 transition-colors"
            >
              تعديل
            </button>
            <button
              onClick={() => openDeletePassageModal(passage)}
              className="px-4 py-2.5 rounded-lg border-2 border-red-200 text-base font-bold text-red-500 hover:bg-red-50 transition-colors"
            >
              حذف
            </button>
          </div>
        </div>

        {isExpanded && (
          <div className="p-4 border-t-2 border-primary/10 space-y-4">
            <p className="text-base text-ink/70 leading-relaxed whitespace-pre-wrap">{passage.body}</p>

            {passageQuestions.length > 0 && (
              <div className="space-y-2.5">{passageQuestions.map((q) => renderQuestionRow(q, passageQuestions))}</div>
            )}

            <button
              onClick={() => openAddQuestionModal(passage.id)}
              className="text-base font-bold text-primary border-2 border-primary/20 hover:border-primary hover:bg-primary/5 transition-colors px-4 py-2 rounded-lg"
            >
              + سؤال على النص ده
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <AdminPageHeader title="بنك الأسئلة" description="تصنيفات وأسئلة مستقلة عن الدورات، بتتربط بالاختبارات لما تحب" />

      <div className="mb-5 relative max-w-sm">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="دور على سؤال أو نص... (حرفين على الأقل)"
          className="w-full rounded-lg border border-ink/15 px-4 py-3 text-base focus:border-primary outline-none transition-colors"
        />
        {searchQuery && (
          <button
            onClick={() => handleSearchChange("")}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-ink/40 hover:text-ink transition-colors text-xl"
          >
            ×
          </button>
        )}
      </div>

      {loadingCategories ? (
        <p className="text-ink/40 text-base">جاري التحميل...</p>
      ) : (
        <div className="grid md:grid-cols-[320px_minmax(0,1fr)] gap-5 items-start">
          <div className="rounded-xl border border-ink/10 bg-surface p-4 min-w-0 overflow-x-auto">
            <div className="flex items-center justify-between mb-3 px-1 gap-2">
              <p className="font-display font-bold text-base">التصنيفات</p>
              <button
                onClick={() => openAddCategoryModal(null)}
                className="text-sm font-bold text-primary border border-primary/20 hover:border-primary hover:bg-primary/5 transition-colors px-3 py-1.5 rounded-lg shrink-0"
              >
                + تصنيف رئيسي
              </button>
            </div>
            {categoryTree.length === 0 ? (
              <p className="text-ink/40 text-sm px-1">لسه مفيش تصنيفات.</p>
            ) : (
              <div className="space-y-1">{categoryTree.map((node) => renderCategoryNode(node, 0))}</div>
            )}
          </div>

          <div className="rounded-xl border border-ink/10 bg-surface p-6 min-h-[300px] min-w-0">
            {trimmedSearch.length >= 2 ? (
              searching && !searchResults ? (
                <p className="text-ink/40 text-lg">جاري البحث...</p>
              ) : !searchResults || (searchResults.questions.length === 0 && searchResults.passages.length === 0) ? (
                <p className="text-ink/40 text-lg">مفيش نتايج لـ &quot;{trimmedSearch}&quot;.</p>
              ) : (
                <div className="space-y-6">
                  {searchResults.passages.length > 0 && (
                    <div>
                      <p className="font-bold text-base text-ink/50 mb-3">نصوص ({searchResults.passages.length})</p>
                      <div className="space-y-2.5">
                        {searchResults.passages.map((p) => (
                          <button
                            key={p.id}
                            onClick={() => jumpToCategory(p.category_id)}
                            className="w-full text-right rounded-2xl border-2 border-ink/10 px-4 py-3.5 hover:border-primary/40 transition-colors"
                          >
                            <p className="text-base font-bold break-words">نص: {p.title}</p>
                            <p className="text-sm text-ink/40 break-words">{categoryPath(p.category_id)}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {searchResults.questions.length > 0 && (
                    <div>
                      <p className="font-bold text-base text-ink/50 mb-3">أسئلة ({searchResults.questions.length})</p>
                      <div className="space-y-2.5">
                        {searchResults.questions.map((q) => (
                          <button
                            key={q.id}
                            onClick={() => jumpToCategory(q.category_id)}
                            className="w-full text-right rounded-2xl border-2 border-ink/10 px-4 py-3.5 hover:border-primary/40 transition-colors"
                          >
                            <FormattedQuestionText html={q.question_text} className="text-base font-bold break-words" />
                            <p className="text-sm text-ink/40 break-words">{categoryPath(q.category_id)}</p>
                          </button>
                        ))}
                      </div>
                      {searchResults.questions.length === 50 && (
                        <p className="text-sm text-ink/40 mt-3">في نتايج أكتر — زوّد كلمة البحث لنتائج أدق.</p>
                      )}
                    </div>
                  )}
                </div>
              )
            ) : !selectedCategory ? (
              <p className="text-ink/40 text-lg">اختار تصنيف من القايمة عشان تشوف أسئلته.</p>
            ) : loadingCategoryContent ? (
              <p className="text-ink/40 text-lg">جاري التحميل...</p>
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between mb-5 gap-3">
                  <h2 className="font-display font-bold text-lg w-full sm:w-auto break-words">{selectedCategory.title}</h2>
                  <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    <button
                      onClick={() => setImportModalOpen(true)}
                      className="px-4 py-2.5 rounded-lg border border-primary/20 text-primary font-display font-bold text-sm hover:bg-primary/5 transition-colors"
                    >
                      استيراد من CSV
                    </button>
                    <button
                      onClick={openAddPassageModal}
                      className="px-4 py-2.5 rounded-lg border border-primary/20 text-primary font-display font-bold text-sm hover:bg-primary/5 transition-colors"
                    >
                      + نص قراءة
                    </button>
                    <button
                      onClick={() => openAddQuestionModal()}
                      className="px-4 py-2.5 rounded-lg bg-primary text-white font-display font-bold text-sm hover:bg-pink transition-colors"
                    >
                      + سؤال جديد
                    </button>
                  </div>
                </div>

                {categoryPassages.length === 0 && standaloneCategoryQuestions.length === 0 ? (
                  <p className="text-ink/40 text-lg">لسه مفيش أسئلة ولا نصوص في التصنيف ده.</p>
                ) : (
                  <>
                    <p className="text-ink/40 text-sm mb-3">
                      {questionsTotalCount} سؤال في التصنيف ده — صفحة {questionsPage} من {Math.max(1, Math.ceil(questionsTotalCount / PAGE_SIZE))}
                    </p>
                    <div className="space-y-3">
                      {[...categoryPassages].sort((a, b) => a.order_index - b.order_index).map((passage) => renderPassage(passage))}
                      {[...standaloneCategoryQuestions]
                        .sort((a, b) => a.order_index - b.order_index)
                        .map((question) => renderQuestionRow(question, standaloneCategoryQuestions))}
                    </div>
                  </>
                )}

                <div className="mt-5">
                  <Pagination
                    page={questionsPage}
                    totalPages={Math.max(1, Math.ceil(questionsTotalCount / PAGE_SIZE))}
                    onChange={(p) => selectedCategoryId && fetchCategoryContent(selectedCategoryId, p)}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <QuestionBankCategoryModal
        modal={categoryModal}
        title={categoryTitle}
        onTitleChange={setCategoryTitle}
        parentId={categoryParentId}
        onParentIdChange={setCategoryParentId}
        parentOptions={parentOptionsForModal}
        saving={savingCategory}
        onSave={handleSaveCategory}
        onClose={closeCategoryModal}
      />

      <QuestionBankDeleteCategoryModal
        target={deleteCategoryTarget}
        checking={checkingDeleteCategory}
        blockedReason={deleteCategoryBlockedReason}
        deleting={deletingCategory}
        onConfirm={handleConfirmDeleteCategory}
        onClose={closeDeleteCategoryModal}
      />

      <QuestionBankQuestionModal
        modal={questionModal}
        text={questionText}
        onTextChange={setQuestionText}
        passageId={questionPassageId}
        onPassageIdChange={setQuestionPassageId}
        passages={categoryPassages}
        saving={savingQuestion}
        onSave={handleSaveQuestion}
        onClose={closeQuestionModal}
      />

      <QuestionBankDeleteQuestionModal
        target={deleteQuestionTarget}
        deleting={deletingQuestion}
        onConfirm={handleConfirmDeleteQuestion}
        onClose={closeDeleteQuestionModal}
      />

      <QuestionBankPassageModal
        modal={passageModal}
        title={passageTitle}
        onTitleChange={setPassageTitle}
        body={passageBody}
        onBodyChange={setPassageBody}
        saving={savingPassage}
        onSave={handleSavePassage}
        onClose={closePassageModal}
      />

      <QuestionBankDeletePassageModal
        target={deletePassageTarget}
        deleting={deletingPassage}
        onConfirm={handleConfirmDeletePassage}
        onClose={closeDeletePassageModal}
      />

      <ImportQuestionsModal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onConfirm={handleImportQuestions}
        categories={flattenedCategories}
        defaultCategoryId={selectedCategoryId}
      />
      {exportModal && (
        <ExportQuestionsModal
          open={!!exportModal}
          onClose={() => setExportModal(null)}
          defaultTitle={exportModal.title}
          loadQuestions={() =>
            fetchQuestionsByCategoryIds([exportModal.categoryId, ...collectDescendantIds(exportModal.categoryId, categories)])
          }
        />
      )}
    </div>
  );
}
