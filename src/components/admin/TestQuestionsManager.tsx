"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import ImportQuestionsModal from "@/components/admin/ImportQuestionsModal";
import ExportQuestionsModal from "@/components/admin/ExportQuestionsModal";
import TestEditQuestionModal from "@/components/admin/TestEditQuestionModal";
import TestQuickAddQuestionModal from "@/components/admin/TestQuickAddQuestionModal";
import TestRandomBuilderModal from "@/components/admin/TestRandomBuilderModal";
import FormattedQuestionText from "@/components/shared/FormattedQuestionText";
import Pagination from "@/components/shared/Pagination";
import type { ExportQuestion } from "@/lib/questionExportMap";
import type { ParsedQuestionRow } from "@/lib/questionsCsv";
import { prepareQuestionTextForSave } from "@/lib/questionTextHtml";
import {
  buildCategoryTree,
  collectDescendantIds,
  DEFAULT_CATEGORY_TITLE,
  flattenCategoryTree,
  type CategoryNode,
  type QuestionCategory,
} from "@/lib/supabase/questionBank";
import { supabase } from "@/lib/supabase/client";

export type Question = { id: string; question_text: string; order_index: number; category_id: string; passage_id: string | null };
type TestQuestion = { id: string; test_id: string; question_id: string; order_index: number };
type Option = { id: string; question_id: string; option_text: string; is_correct: boolean; order_index: number };
export type Passage = { id: string; category_id: string; title: string; body: string };
type QuestionWithOptions = Question & { question_options: Option[] };

const PAGE_SIZE = 50;
const RANDOM_POOL_LIMIT = 3000;

const optionLetters = ["أ", "ب", "ج", "د", "هـ", "و", "ز", "ح"];

function shuffle<T>(list: T[]): T[] {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// بيجمع الأسئلة في "وحدات" — كل أسئلة نص قراءة مشترك بتتسحب مع بعض دايمًا عشان النص متتقسمش
function groupIntoDrawUnits(pool: Question[]): Question[][] {
  const passageGroups = new Map<string, Question[]>();
  const units: Question[][] = [];

  for (const q of pool) {
    if (q.passage_id) {
      const list = passageGroups.get(q.passage_id) ?? [];
      list.push(q);
      passageGroups.set(q.passage_id, list);
    } else {
      units.push([q]);
    }
  }
  units.push(...passageGroups.values());
  return units;
}

const emptyQuickOptions = [{ text: "" }, { text: "" }];

function getNextOrderIndex<T extends { order_index: number }>(list: T[]) {
  return list.length > 0 ? Math.max(...list.map((x) => x.order_index)) + 1 : 1;
}

// بيرجع أعلى order_index موجود فعليًا في القاعدة (مش بس المحمّل في المتصفح) — عشان صفحات الأسئلة المقسّمة (pagination)
async function nextOrderIndexOnServer(table: "questions", column: string, value: string) {
  const { data } = await supabase.from(table).select("order_index").eq(column, value).order("order_index", { ascending: false }).limit(1);
  return (data?.[0]?.order_index ?? 0) + 1;
}

function splitQuestionWithOptions(rows: QuestionWithOptions[]) {
  const questions: Question[] = rows.map((q) => ({
    id: q.id,
    question_text: q.question_text,
    order_index: q.order_index,
    category_id: q.category_id,
    passage_id: q.passage_id,
  }));
  const options: Option[] = rows.flatMap((q) => q.question_options ?? []);
  return { questions, options };
}

export default function TestQuestionsManager({ testId, testTitle }: { testId: string; testTitle?: string }) {
  const [categories, setCategories] = useState<QuestionCategory[]>([]);
  const [testQuestions, setTestQuestions] = useState<TestQuestion[]>([]);
  const [loading, setLoading] = useState(true);

  // ===== الأسئلة المضافة فعليًا للاختبار ده (عددها محدود بحجم الاختبار، مش البنك كله) =====
  const [attachedQuestions, setAttachedQuestions] = useState<Question[]>([]);
  const [attachedOptions, setAttachedOptions] = useState<Option[]>([]);
  const [attachedPassages, setAttachedPassages] = useState<Passage[]>([]);

  // ===== تصفح البنك — تصنيف واحد بس في كل مرة، صفحة صفحة =====
  const [categoryQuestions, setCategoryQuestions] = useState<Question[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<Option[]>([]);
  const [categoryPassages, setCategoryPassages] = useState<Passage[]>([]);
  const [loadingCategoryContent, setLoadingCategoryContent] = useState(false);
  const [questionsPage, setQuestionsPage] = useState(1);
  const [questionsTotalCount, setQuestionsTotalCount] = useState(0);

  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [expandedCategoryIds, setExpandedCategoryIds] = useState<Set<string>>(new Set());
  const [busyQuestionId, setBusyQuestionId] = useState<string | null>(null);
  const [newOptionText, setNewOptionText] = useState<Record<string, string>>({});

  // ===== Modal تعديل سؤال (نص + نص القراءة المرتبط) =====
  const [editQuestionModal, setEditQuestionModal] = useState<Question | null>(null);
  const [editQuestionText, setEditQuestionText] = useState("");
  const [editQuestionPassageId, setEditQuestionPassageId] = useState("");
  const [editModalPassages, setEditModalPassages] = useState<Passage[]>([]);
  const [savingQuestionEdit, setSavingQuestionEdit] = useState(false);

  // ===== Modal سؤال جديد مباشر (من غير رجوع للبنك) =====
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [quickQuestionText, setQuickQuestionText] = useState("");
  const [quickOptions, setQuickOptions] = useState(emptyQuickOptions);
  const [quickCorrectIndex, setQuickCorrectIndex] = useState(0);
  const [quickCategoryId, setQuickCategoryId] = useState("");
  const [creatingQuickQuestion, setCreatingQuickQuestion] = useState(false);

  // ===== Modal اختبار عشوائي =====
  const [randomModalOpen, setRandomModalOpen] = useState(false);
  const [randomCategoryIds, setRandomCategoryIds] = useState<Set<string>>(new Set());
  const [randomPool, setRandomPool] = useState<Question[]>([]);
  const [loadingRandomPool, setLoadingRandomPool] = useState(false);
  const [randomCount, setRandomCount] = useState(10);
  const [randomPreview, setRandomPreview] = useState<Question[] | null>(null);
  const [addingRandom, setAddingRandom] = useState(false);

  async function fetchAttachedQuestionsData(ids: string[]) {
    if (ids.length === 0) {
      setAttachedQuestions([]);
      setAttachedOptions([]);
      setAttachedPassages([]);
      return;
    }

    const { data, error } = await supabase
      .from("questions")
      .select("id, question_text, order_index, category_id, passage_id, question_options(id, question_id, option_text, is_correct, order_index)")
      .in("id", ids);

    if (error) {
      toast.error("حصل خطأ في تحميل أسئلة الاختبار");
      return;
    }

    const { questions, options } = splitQuestionWithOptions((data as unknown as QuestionWithOptions[]) ?? []);
    setAttachedQuestions(questions);
    setAttachedOptions(options);

    const passageIds = [...new Set(questions.map((q) => q.passage_id).filter((id): id is string => !!id))];
    if (passageIds.length > 0) {
      const { data: passagesData } = await supabase.from("reading_passages").select("id, category_id, title, body").in("id", passageIds);
      setAttachedPassages(passagesData ?? []);
    } else {
      setAttachedPassages([]);
    }
  }

  useEffect(() => {
    async function init() {
      setLoading(true);
      const [{ data: categoriesData, error }, { data: tqData }] = await Promise.all([
        supabase.from("question_categories").select("id, parent_id, title, order_index").order("order_index", { ascending: true }),
        supabase.from("test_questions").select("id, test_id, question_id, order_index").eq("test_id", testId).order("order_index", { ascending: true }),
      ]);

      if (error) toast.error("حصل خطأ في تحميل التصنيفات");
      setCategories(categoriesData || []);
      const tq = tqData || [];
      setTestQuestions(tq);
      await fetchAttachedQuestionsData(tq.map((t) => t.question_id));
      setLoading(false);
    }
    init();
  }, [testId]);

  // بيجيب أسئلة (باختياراتها مدمجة) لتصنيف واحد بس، صفحة واحدة في المرة (ترقيم صفحات بالرقم مش "تحميل أكتر")
  async function fetchCategoryContent(categoryId: string, pageNum: number) {
    setLoadingCategoryContent(true);
    const offset = (pageNum - 1) * PAGE_SIZE;

    const [{ data: rows, count, error }, { data: passagesData, error: passagesError }] = await Promise.all([
      supabase
        .from("questions")
        .select("id, question_text, order_index, category_id, passage_id, question_options(id, question_id, option_text, is_correct, order_index)", {
          count: "exact",
        })
        .eq("category_id", categoryId)
        .order("order_index", { ascending: true })
        .range(offset, offset + PAGE_SIZE - 1),
      supabase.from("reading_passages").select("id, category_id, title, body").eq("category_id", categoryId).order("order_index"),
    ]);

    if (error) {
      toast.error("حصل خطأ في تحميل الأسئلة");
      setLoadingCategoryContent(false);
      return;
    }

    // لو الصفحة بقت مش موجودة (بعد حذف سؤال من مكان تاني مثلًا)، نرجع لآخر صفحة صحيحة
    const total = count ?? 0;
    const maxPage = Math.max(1, Math.ceil(total / PAGE_SIZE));
    if (pageNum > maxPage) {
      setLoadingCategoryContent(false);
      fetchCategoryContent(categoryId, maxPage);
      return;
    }

    const { questions: newQuestions, options: newOptions } = splitQuestionWithOptions((rows as unknown as QuestionWithOptions[]) ?? []);
    setCategoryQuestions(newQuestions);
    setCategoryOptions(newOptions);
    setQuestionsTotalCount(total);
    setQuestionsPage(pageNum);
    if (!passagesError) setCategoryPassages(passagesData ?? []);

    setLoadingCategoryContent(false);
  }

  const categoryTree = useMemo(() => buildCategoryTree(categories), [categories]);
  const flattenedCategories = useMemo(() => flattenCategoryTree(categoryTree), [categoryTree]);
  const attachedQuestionIds = useMemo(() => new Set(testQuestions.map((tq) => tq.question_id)), [testQuestions]);

  const passagesById = useMemo(() => {
    const map = new Map<string, Passage>();
    for (const p of [...attachedPassages, ...categoryPassages, ...editModalPassages]) map.set(p.id, p);
    return map;
  }, [attachedPassages, categoryPassages, editModalPassages]);

  const optionsByQuestion = useMemo(() => {
    const merged = new Map<string, Option>();
    for (const o of [...attachedOptions, ...categoryOptions]) merged.set(o.id, o);
    const map = new Map<string, Option[]>();
    for (const o of merged.values()) {
      const list = map.get(o.question_id) ?? [];
      list.push(o);
      map.set(o.question_id, list);
    }
    return map;
  }, [attachedOptions, categoryOptions]);

  const attachedQuestionsById = useMemo(() => new Map(attachedQuestions.map((q) => [q.id, q])), [attachedQuestions]);

  const attachedList = useMemo(
    () =>
      [...testQuestions]
        .sort((a, b) => a.order_index - b.order_index)
        .map((tq) => ({ testQuestion: tq, question: attachedQuestionsById.get(tq.question_id) })),
    [testQuestions, attachedQuestionsById]
  );

  const attachedExportQuestions = useMemo(
    (): ExportQuestion[] =>
      attachedList
        .filter((item): item is typeof item & { question: Question } => item.question != null)
        .map(({ question }) => ({ ...question, question_options: optionsByQuestion.get(question.id) ?? [] })),
    [attachedList, optionsByQuestion]
  );

  const selectedCategory = selectedCategoryId ? categories.find((c) => c.id === selectedCategoryId) ?? null : null;

  // بيحدّث السؤال في أي حتة موجود فيها (الأسئلة المضافة و/أو تصفح البنك) — نفس السؤال ممكن يكون في الاتنين
  function patchQuestionEverywhere(id: string, updater: (q: Question) => Question) {
    setAttachedQuestions((prev) => prev.map((q) => (q.id === id ? updater(q) : q)));
    setCategoryQuestions((prev) => prev.map((q) => (q.id === id ? updater(q) : q)));
  }

  // بيحدّث الاختيارات في أي حتة موجودة فيها
  function patchOptionsEverywhere(updater: (list: Option[]) => Option[]) {
    setAttachedOptions(updater);
    setCategoryOptions(updater);
  }

  function toggleCategoryExpanded(id: string) {
    setExpandedCategoryIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectCategory(id: string) {
    setSelectedCategoryId(id);
    setExpandedCategoryIds((prev) => new Set(prev).add(id));
    setCategoryQuestions([]);
    setCategoryOptions([]);
    setCategoryPassages([]);
    setQuestionsTotalCount(0);
    fetchCategoryContent(id, 1);
  }

  async function attachQuestion(question: Question) {
    setBusyQuestionId(question.id);
    const { data, error } = await supabase
      .from("test_questions")
      .insert({ test_id: testId, question_id: question.id, order_index: getNextOrderIndex(testQuestions) })
      .select()
      .single();

    if (error) {
      toast.error("حصل خطأ في إضافة السؤال للاختبار");
    } else {
      setTestQuestions((prev) => [...prev, data]);
      // السؤال ده أصلاً محمّل في تصفح البنك — ننسخه لقايمة "الأسئلة المضافة" من غير طلب جديد
      setAttachedQuestions((prev) => (prev.some((q) => q.id === question.id) ? prev : [...prev, question]));
      const opts = optionsByQuestion.get(question.id) ?? [];
      setAttachedOptions((prev) => {
        const existingIds = new Set(prev.map((o) => o.id));
        return [...prev, ...opts.filter((o) => !existingIds.has(o.id))];
      });
      if (question.passage_id) {
        const passage = passagesById.get(question.passage_id);
        if (passage) setAttachedPassages((prev) => (prev.some((p) => p.id === passage.id) ? prev : [...prev, passage]));
      }
    }
    setBusyQuestionId(null);
  }

  async function detachQuestion(testQuestion: TestQuestion) {
    setBusyQuestionId(testQuestion.question_id);
    const { error } = await supabase.from("test_questions").delete().eq("id", testQuestion.id);
    if (error) {
      toast.error("حصل خطأ في إزالة السؤال من الاختبار");
    } else {
      setTestQuestions((prev) => prev.filter((tq) => tq.id !== testQuestion.id));
      setAttachedQuestions((prev) => prev.filter((q) => q.id !== testQuestion.question_id));
    }
    setBusyQuestionId(null);
  }

  async function reorderAttached(testQuestion: TestQuestion, direction: "up" | "down") {
    const siblings = [...testQuestions].sort((a, b) => a.order_index - b.order_index);
    const index = siblings.findIndex((tq) => tq.id === testQuestion.id);
    const swapWith = direction === "up" ? siblings[index - 1] : siblings[index + 1];
    if (!swapWith) return;

    const [{ error: e1 }, { error: e2 }] = await Promise.all([
      supabase.from("test_questions").update({ order_index: swapWith.order_index }).eq("id", testQuestion.id),
      supabase.from("test_questions").update({ order_index: testQuestion.order_index }).eq("id", swapWith.id),
    ]);

    if (e1 || e2) {
      toast.error("حصل خطأ في إعادة الترتيب");
    } else {
      setTestQuestions((prev) =>
        prev.map((tq) => {
          if (tq.id === testQuestion.id) return { ...tq, order_index: swapWith.order_index };
          if (tq.id === swapWith.id) return { ...tq, order_index: testQuestion.order_index };
          return tq;
        })
      );
    }
  }

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
      patchOptionsEverywhere((prev) => [...prev, data]);
      setNewOptionText((prev) => ({ ...prev, [question.id]: "" }));
    }
  }

  async function updateOptionText(option: Option, text: string) {
    if (text.trim() === option.option_text || !text.trim()) return;

    const { error } = await supabase.from("question_options").update({ option_text: text.trim() }).eq("id", option.id);
    if (error) {
      toast.error("حصل خطأ في تعديل الاختيار");
    } else {
      patchOptionsEverywhere((prev) => prev.map((o) => (o.id === option.id ? { ...o, option_text: text.trim() } : o)));
    }
  }

  async function setCorrectOption(question: Question, option: Option) {
    if (option.is_correct) return;

    const [{ error: e1 }, { error: e2 }] = await Promise.all([
      supabase.from("question_options").update({ is_correct: false }).eq("question_id", question.id),
      supabase.from("question_options").update({ is_correct: true }).eq("id", option.id),
    ]);

    if (e1 || e2) {
      toast.error("حصل خطأ في تحديد الإجابة الصحيحة");
    } else {
      patchOptionsEverywhere((prev) => prev.map((o) => (o.question_id === question.id ? { ...o, is_correct: o.id === option.id } : o)));
    }
  }

  async function deleteOption(option: Option) {
    const { error } = await supabase.from("question_options").delete().eq("id", option.id);
    if (error) {
      toast.error("حصل خطأ في حذف الاختيار");
    } else {
      patchOptionsEverywhere((prev) => prev.filter((o) => o.id !== option.id));
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
      patchOptionsEverywhere((prev) =>
        prev.map((o) => {
          if (o.id === option.id) return { ...o, order_index: swapWith.order_index };
          if (o.id === swapWith.id) return { ...o, order_index: option.order_index };
          return o;
        })
      );
    }
  }

  async function openEditQuestionModal(question: Question) {
    setEditQuestionModal(question);
    setEditQuestionText(question.question_text);
    setEditQuestionPassageId(question.passage_id || "");
    const { data } = await supabase.from("reading_passages").select("id, category_id, title, body").eq("category_id", question.category_id);
    setEditModalPassages(data ?? []);
  }

  function closeEditQuestionModal() {
    setEditQuestionModal(null);
    setEditQuestionText("");
    setEditQuestionPassageId("");
    setEditModalPassages([]);
  }

  async function handleSaveQuestionEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editQuestionModal) return;
    if (!editQuestionText.trim()) {
      toast.error("لازم تكتب نص السؤال");
      return;
    }

    setSavingQuestionEdit(true);
    const safeText = await prepareQuestionTextForSave(editQuestionText.trim());
    const { data, error } = await supabase
      .from("questions")
      .update({ question_text: safeText, passage_id: editQuestionPassageId || null })
      .eq("id", editQuestionModal.id)
      .select()
      .single();

    if (error) {
      toast.error("حصل خطأ في تعديل السؤال");
    } else {
      toast.success("اتعدل السؤال");
      patchQuestionEverywhere(data.id, () => data);
      closeEditQuestionModal();
    }
    setSavingQuestionEdit(false);
  }

  function openQuickAddModal() {
    setQuickQuestionText("");
    setQuickOptions(emptyQuickOptions);
    setQuickCorrectIndex(0);
    setQuickCategoryId(selectedCategoryId || "");
    setQuickAddOpen(true);
  }

  function closeQuickAddModal() {
    setQuickAddOpen(false);
  }

  function updateQuickOptionText(index: number, text: string) {
    setQuickOptions((prev) => prev.map((o, i) => (i === index ? { text } : o)));
  }

  function addQuickOptionRow() {
    setQuickOptions((prev) => [...prev, { text: "" }]);
  }

  function removeQuickOptionRow(index: number) {
    setQuickOptions((prev) => prev.filter((_, i) => i !== index));
    setQuickCorrectIndex((prev) => (prev === index ? 0 : prev > index ? prev - 1 : prev));
  }

  async function handleCreateAndAttachQuestion(e: React.FormEvent) {
    e.preventDefault();
    const trimmedOptions = quickOptions.map((o) => o.text.trim());
    if (!quickQuestionText.trim() || trimmedOptions.filter(Boolean).length < 2) {
      toast.error("لازم نص السؤال واختيارين على الأقل");
      return;
    }

    setCreatingQuickQuestion(true);

    // متختارش تصنيف؟ نستخدم تصنيف افتراضي، ونعمله لو مش موجود أصلاً
    let categoryId = quickCategoryId;
    if (!categoryId) {
      const existingDefault = categories.find((c) => c.title === DEFAULT_CATEGORY_TITLE && c.parent_id === null);
      if (existingDefault) {
        categoryId = existingDefault.id;
      } else {
        const rootSiblings = categories.filter((c) => c.parent_id === null);
        const { data: newCategory, error: catError } = await supabase
          .from("question_categories")
          .insert({ title: DEFAULT_CATEGORY_TITLE, parent_id: null, order_index: getNextOrderIndex(rootSiblings) })
          .select()
          .single();

        if (catError || !newCategory) {
          toast.error("حصل خطأ في إنشاء التصنيف الافتراضي");
          setCreatingQuickQuestion(false);
          return;
        }
        categoryId = newCategory.id;
        setCategories((prev) => [...prev, newCategory]);
      }
    }

    const orderIndex = await nextOrderIndexOnServer("questions", "category_id", categoryId);
    const safeText = await prepareQuestionTextForSave(quickQuestionText.trim());
    const { data: newQuestion, error: qError } = await supabase
      .from("questions")
      .insert({ question_text: safeText, category_id: categoryId, order_index: orderIndex })
      .select()
      .single();

    if (qError || !newQuestion) {
      toast.error("حصل خطأ في إضافة السؤال");
      setCreatingQuickQuestion(false);
      return;
    }
    setAttachedQuestions((prev) => [...prev, newQuestion]);

    const optionRows = trimmedOptions
      .map((text, index) => ({ text, index }))
      .filter((o) => o.text)
      .map((o, i) => ({ question_id: newQuestion.id, option_text: o.text, is_correct: o.index === quickCorrectIndex, order_index: i + 1 }));

    const { data: newOptions, error: optError } = await supabase.from("question_options").insert(optionRows).select();
    if (optError) {
      toast.error("السؤال اتضاف للبنك بس حصل خطأ في الاختيارات");
      setCreatingQuickQuestion(false);
      return;
    }
    if (newOptions) {
      setAttachedOptions((prev) => [...prev, ...newOptions]);
    }

    // السؤال الجديد بيتحط آخر التصنيف (order_index أعلى)، فهو دايمًا هيكون في آخر صفحة — نروح لها على طول
    if (categoryId === selectedCategoryId) {
      const lastPage = Math.max(1, Math.ceil((questionsTotalCount + 1) / PAGE_SIZE));
      fetchCategoryContent(selectedCategoryId, lastPage);
    }

    const { data: newTestQuestion, error: tqError } = await supabase
      .from("test_questions")
      .insert({ test_id: testId, question_id: newQuestion.id, order_index: getNextOrderIndex(testQuestions) })
      .select()
      .single();

    if (tqError) {
      toast.error("السؤال اتضاف للبنك بس حصل خطأ في ضمه للاختبار");
    } else {
      toast.success("اتضاف السؤال للبنك ولاختبار كمان");
      setTestQuestions((prev) => [...prev, newTestQuestion]);
      closeQuickAddModal();
    }
    setCreatingQuickQuestion(false);
  }

  // استيراد أسئلة بالجملة من CSV — بتتحط في التصنيف اللي الأدمن يختاره في نافذة الاستيراد، وتتضاف
  // للاختبار ده على طول. أسئلة من غير إجابة صح بتتضاف "غير محلولة" (كل اختياراتها is_correct: false).
  async function handleImportQuestions(rows: ParsedQuestionRow[], categoryId: string) {
    const orderStart = await nextOrderIndexOnServer("questions", "category_id", categoryId);
    const questionRows = await Promise.all(
      rows.map(async (r, i) => ({
        question_text: await prepareQuestionTextForSave(r.question_text),
        category_id: categoryId,
        order_index: orderStart + i,
      }))
    );

    const { data: insertedQuestions, error } = await supabase.from("questions").insert(questionRows).select();
    if (error || !insertedQuestions) {
      toast.error("حصل خطأ في استيراد الأسئلة");
      return;
    }

    const idByOrderIndex = new Map(insertedQuestions.map((q) => [q.order_index as number, q.id as string]));
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
      return;
    }

    const startIndex = getNextOrderIndex(testQuestions);
    const testQuestionRows = insertedQuestions.map((q, i) => ({ test_id: testId, question_id: q.id, order_index: startIndex + i }));
    const { data: newTestQuestions, error: tqBulkError } = await supabase.from("test_questions").insert(testQuestionRows).select();

    if (tqBulkError) {
      toast.error("الأسئلة اتضافت للبنك بس حصل خطأ في ضمها للاختبار");
    } else {
      const unsolvedCount = rows.filter((r) => !r.solved).length;
      toast.success(
        `اتضاف ${rows.length} سؤال للبنك ولاختبار كمان${
          unsolvedCount > 0 ? ` (${unsolvedCount} منهم غير محلول — الاختبار هيفضل مخفي عن الطلبة لحد ما تحلهم)` : ""
        }`
      );
      setTestQuestions((prev) => [...prev, ...(newTestQuestions ?? [])]);
      await fetchAndMergeAttachedQuestions(insertedQuestions.map((q) => q.id as string));
    }

    if (categoryId === selectedCategoryId) {
      const lastPage = Math.max(1, Math.ceil((questionsTotalCount + rows.length) / PAGE_SIZE));
      fetchCategoryContent(selectedCategoryId, lastPage);
    }
  }

  async function fetchRandomPool(categoryIds: Set<string>) {
    if (categoryIds.size === 0) {
      setRandomPool([]);
      return;
    }
    setLoadingRandomPool(true);
    const expandedIds = new Set<string>();
    for (const id of categoryIds) {
      expandedIds.add(id);
      for (const descId of collectDescendantIds(id, categories)) expandedIds.add(descId);
    }
    const { data, error } = await supabase
      .from("questions")
      .select("id, question_text, order_index, category_id, passage_id")
      .in("category_id", [...expandedIds])
      .limit(RANDOM_POOL_LIMIT);

    if (error) {
      toast.error("حصل خطأ في تحميل الأسئلة");
      setRandomPool([]);
    } else {
      setRandomPool((data ?? []).filter((q) => !attachedQuestionIds.has(q.id)));
    }
    setLoadingRandomPool(false);
  }

  function openRandomModal() {
    setRandomCategoryIds(new Set());
    setRandomPool([]);
    setRandomCount(10);
    setRandomPreview(null);
    setRandomModalOpen(true);
  }

  function closeRandomModal() {
    setRandomModalOpen(false);
    setRandomPreview(null);
  }

  function toggleRandomCategory(id: string) {
    setRandomCategoryIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      fetchRandomPool(next);
      return next;
    });
    setRandomPreview(null);
  }

  function handleDrawRandom() {
    if (randomPool.length === 0) {
      toast.error("مفيش أسئلة متاحة في التصنيفات المختارة");
      return;
    }

    const units = shuffle(groupIntoDrawUnits(randomPool));
    const drawn: Question[] = [];
    for (const unit of units) {
      if (drawn.length >= randomCount) break;
      drawn.push(...unit);
    }
    setRandomPreview(drawn);
  }

  async function handleConfirmAddRandom() {
    if (!randomPreview || randomPreview.length === 0) return;

    setAddingRandom(true);
    const startIndex = getNextOrderIndex(testQuestions);
    const rows = randomPreview.map((q, i) => ({ test_id: testId, question_id: q.id, order_index: startIndex + i }));

    const { data, error } = await supabase.from("test_questions").insert(rows).select();

    if (error) {
      toast.error("حصل خطأ في إضافة الأسئلة");
    } else {
      toast.success(`اتضاف ${randomPreview.length} سؤال للاختبار`);
      const newTq = data ?? [];
      setTestQuestions((prev) => [...prev, ...newTq]);
      // الأسئلة دي اتسحبت من غير اختياراتها (مكنّاش محتاجينها للمعاينة) — نجيبها كاملة دلوقتي عشان تظهر صح في "الأسئلة المضافة"
      await fetchAndMergeAttachedQuestions(randomPreview.map((q) => q.id));
      closeRandomModal();
    }
    setAddingRandom(false);
  }

  async function fetchAndMergeAttachedQuestions(ids: string[]) {
    if (ids.length === 0) return;
    const { data } = await supabase
      .from("questions")
      .select("id, question_text, order_index, category_id, passage_id, question_options(id, question_id, option_text, is_correct, order_index)")
      .in("id", ids);

    const { questions, options } = splitQuestionWithOptions((data as unknown as QuestionWithOptions[]) ?? []);
    setAttachedQuestions((prev) => {
      const existingIds = new Set(prev.map((q) => q.id));
      return [...prev, ...questions.filter((q) => !existingIds.has(q.id))];
    });
    setAttachedOptions((prev) => {
      const existingIds = new Set(prev.map((o) => o.id));
      return [...prev, ...options.filter((o) => !existingIds.has(o.id))];
    });

    const passageIds = [...new Set(questions.map((q) => q.passage_id).filter((id): id is string => !!id))];
    if (passageIds.length > 0) {
      const { data: passagesData } = await supabase.from("reading_passages").select("id, category_id, title, body").in("id", passageIds);
      setAttachedPassages((prev) => {
        const existingIds = new Set(prev.map((p) => p.id));
        return [...prev, ...(passagesData ?? []).filter((p) => !existingIds.has(p.id))];
      });
    }
  }

  function renderCategoryNode(node: CategoryNode, depth: number) {
    const isExpanded = expandedCategoryIds.has(node.id);
    const isSelected = selectedCategoryId === node.id;
    return (
      <div key={node.id}>
        <div
          className={`flex items-center gap-2 rounded-xl px-2.5 py-2.5 cursor-pointer transition-colors ${
            isSelected ? "bg-primary text-white" : "hover:bg-primary/10"
          }`}
          style={{ paddingInlineStart: 10 + depth * 18 }}
          onClick={() => selectCategory(node.id)}
        >
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
        {isExpanded && node.children.map((child) => renderCategoryNode(child, depth + 1))}
      </div>
    );
  }

  // بيوري نص القراءة (لو موجود) واختيارات السؤال كاملة وقابلة للتعديل المباشر، بنفس شكل بنك الأسئلة
  function renderQuestionEditor(question: Question) {
    const questionOptions = (optionsByQuestion.get(question.id) ?? []).slice().sort((a, b) => a.order_index - b.order_index);
    const passage = question.passage_id ? passagesById.get(question.passage_id) : null;

    return (
      <div className="p-4 border-t-2 border-ink/10 bg-surface space-y-3">
        {passage && (
          <div className="rounded-xl bg-primary/5 border-2 border-primary/15 p-4">
            <span className="text-xs font-bold text-primary bg-primary/15 rounded-full px-3 py-1.5">نص قراءة</span>
            <p className="text-base text-ink/70 leading-relaxed whitespace-pre-wrap mt-2.5">{passage.body}</p>
          </div>
        )}

        <div className="space-y-2">
          {questionOptions.map((option, optIndex) => (
            <div
              key={option.id}
              className={`flex flex-wrap items-center gap-3 rounded-xl border-2 px-3.5 py-2.5 transition-colors ${
                option.is_correct ? "bg-teal/10 border-teal/40" : "bg-ink/[0.015] border-ink/10"
              }`}
            >
              <div className="flex items-center gap-3 w-full sm:w-auto sm:flex-1 min-w-0">
                <span
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-base shrink-0 ${
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
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
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
      </div>
    );
  }

  if (loading) return <p className="text-ink/40 text-lg">جاري التحميل...</p>;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-ink/10 bg-surface p-6">
        <div className="flex flex-wrap items-center justify-between mb-5 gap-3">
          <h2 className="font-display font-bold text-lg w-full sm:w-auto break-words">أسئلة الاختبار الحالية ({attachedList.length})</h2>
          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            <button
              onClick={() => setImportModalOpen(true)}
              className="px-4 py-2.5 rounded-lg border border-primary/20 text-primary font-display font-bold text-sm hover:bg-primary/5 transition-colors"
            >
              استيراد من CSV
            </button>
            <button
              onClick={() => setExportModalOpen(true)}
              className="px-4 py-2.5 rounded-lg border border-primary/20 text-primary font-display font-bold text-sm hover:bg-primary/5 transition-colors"
            >
              تصدير
            </button>
            <button
              onClick={openRandomModal}
              className="px-4 py-2.5 rounded-lg border border-primary/20 text-primary font-display font-bold text-sm hover:bg-primary/5 transition-colors"
            >
              اختبار عشوائي
            </button>
            <button
              onClick={openQuickAddModal}
              className="px-4 py-2.5 rounded-lg bg-primary text-white font-display font-bold text-sm hover:bg-pink transition-colors"
            >
              + سؤال جديد
            </button>
          </div>
        </div>
        {attachedList.length === 0 ? (
          <p className="text-ink/40 text-lg">لسه مفيش أسئلة مضافة، اختار من بنك الأسئلة تحت.</p>
        ) : (
          <div className="space-y-2.5">
            {attachedList.map(({ testQuestion, question }, index) => {
              const solved = !!question && (optionsByQuestion.get(question.id) ?? []).some((o) => o.is_correct);
              return (
                <div
                  key={testQuestion.id}
                  className={`rounded-2xl border-2 overflow-hidden ${question && !solved ? "border-yellow/50" : "border-ink/10"}`}
                >
                  <div className={`flex flex-wrap items-center gap-3 px-4 py-3.5 ${question && !solved ? "bg-yellow/[0.07]" : "bg-ink/[0.02]"}`}>
                    <div className="w-full sm:w-auto sm:flex-1 min-w-0 flex items-center gap-3">
                      <span className="w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm flex items-center justify-center shrink-0">
                        {index + 1}
                      </span>
                      <FormattedQuestionText html={question?.question_text || "سؤال محذوف"} className="flex-1 min-w-0 text-base font-bold break-words" />
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => reorderAttached(testQuestion, "up")}
                        disabled={index === 0}
                        className="w-10 h-10 flex items-center justify-center rounded-lg border-2 border-ink/10 text-ink/40 hover:text-primary hover:border-primary/40 hover:bg-surface disabled:opacity-20 transition-colors"
                      >
                        ↑
                      </button>
                      <button
                        onClick={() => reorderAttached(testQuestion, "down")}
                        disabled={index === attachedList.length - 1}
                        className="w-10 h-10 flex items-center justify-center rounded-lg border-2 border-ink/10 text-ink/40 hover:text-primary hover:border-primary/40 hover:bg-surface disabled:opacity-20 transition-colors"
                      >
                        ↓
                      </button>
                      {question && (
                        <button
                          onClick={() => openEditQuestionModal(question)}
                          className="px-4 py-2.5 rounded-full border-2 border-primary/20 text-base font-bold text-primary hover:bg-surface transition-colors"
                        >
                          تعديل
                        </button>
                      )}
                      <button
                        onClick={() => detachQuestion(testQuestion)}
                        disabled={busyQuestionId === testQuestion.question_id}
                        className="px-4 py-2.5 rounded-full border-2 border-red-200 text-base font-bold text-red-500 hover:border-red-400 hover:bg-red-50 transition-colors disabled:opacity-40"
                      >
                        إزالة
                      </button>
                    </div>
                  </div>
                  {question && !solved && (
                    <div className="flex items-center gap-2.5 bg-yellow/25 px-4 py-3">
                      <span className="w-7 h-7 rounded-full bg-yellow flex items-center justify-center text-primary font-black text-sm shrink-0">
                        ⊘
                      </span>
                      <p className="text-sm font-bold text-primary">السؤال ده لسه غير محلول — مفيش إجابة متحددة كصح، والاختبار مخفي عن الطلبة لحد ما تحله</p>
                    </div>
                  )}
                  {question && renderQuestionEditor(question)}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-[320px_minmax(0,1fr)] gap-5 items-start">
        <div className="rounded-xl border border-ink/10 bg-surface p-4 min-w-0 overflow-x-auto">
          <p className="font-display font-bold text-base mb-3 px-1">تصفح بنك الأسئلة</p>
          {categoryTree.length === 0 ? (
            <p className="text-ink/40 text-base px-1">لسه مفيش تصنيفات في البنك.</p>
          ) : (
            <div className="space-y-1">{categoryTree.map((node) => renderCategoryNode(node, 0))}</div>
          )}
        </div>

        <div className="rounded-xl border border-ink/10 bg-surface p-6 min-h-[200px] min-w-0">
          {!selectedCategory ? (
            <p className="text-ink/40 text-lg">اختار تصنيف عشان تشوف أسئلته وتضيفها للاختبار.</p>
          ) : loadingCategoryContent ? (
            <p className="text-ink/40 text-lg">جاري التحميل...</p>
          ) : categoryQuestions.length === 0 ? (
            <p className="text-ink/40 text-lg">مفيش أسئلة في التصنيف ده.</p>
          ) : (
            <>
              <p className="text-ink/40 text-sm mb-3">
                {questionsTotalCount} سؤال في التصنيف ده — صفحة {questionsPage} من {Math.max(1, Math.ceil(questionsTotalCount / PAGE_SIZE))}
              </p>
              <div className="space-y-2.5">
                {[...categoryQuestions]
                  .sort((a, b) => a.order_index - b.order_index)
                  .map((question) => {
                    const isAttached = attachedQuestionIds.has(question.id);
                    const solved = (optionsByQuestion.get(question.id) ?? []).some((o) => o.is_correct);
                    return (
                      <div key={question.id} className={`rounded-2xl border-2 overflow-hidden ${solved ? "border-ink/10" : "border-yellow/50"}`}>
                        <div className={`flex flex-wrap items-center gap-3 px-4 py-3.5 ${solved ? "" : "bg-yellow/[0.07]"}`}>
                          <div className="w-full sm:w-auto sm:flex-1 min-w-0 flex items-center gap-3">
                            <FormattedQuestionText html={question.question_text} className="flex-1 min-w-0 text-base font-bold break-words" />
                          </div>
                          <button
                            onClick={() => openEditQuestionModal(question)}
                            className="shrink-0 px-4 py-2.5 rounded-full border-2 border-primary/20 text-sm font-bold text-primary hover:bg-primary/5 transition-colors"
                          >
                            تعديل
                          </button>
                          {isAttached ? (
                            <span className="shrink-0 inline-flex items-center gap-1.5 text-sm font-bold text-teal bg-teal/10 rounded-full px-4 py-2">
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5">
                                <path d="M20 6 9 17l-5-5" />
                              </svg>
                              مضاف
                            </span>
                          ) : (
                            <button
                              onClick={() => attachQuestion(question)}
                              disabled={busyQuestionId === question.id}
                              className="shrink-0 px-4 py-2 rounded-full bg-primary text-white text-sm font-bold hover:bg-pink transition-colors disabled:opacity-40"
                            >
                              + إضافة
                            </button>
                          )}
                        </div>
                        {!solved && (
                          <div className="flex items-center gap-2.5 bg-yellow/25 px-4 py-3">
                            <span className="w-7 h-7 rounded-full bg-yellow flex items-center justify-center text-primary font-black text-sm shrink-0">
                              ⊘
                            </span>
                            <p className="text-sm font-bold text-primary">السؤال ده لسه غير محلول — مفيش إجابة متحددة كصح</p>
                          </div>
                        )}
                        {renderQuestionEditor(question)}
                      </div>
                    );
                  })}
              </div>

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

      <TestQuickAddQuestionModal
        open={quickAddOpen}
        text={quickQuestionText}
        onTextChange={setQuickQuestionText}
        options={quickOptions}
        onOptionTextChange={updateQuickOptionText}
        onAddOption={addQuickOptionRow}
        onRemoveOption={removeQuickOptionRow}
        correctIndex={quickCorrectIndex}
        onCorrectIndexChange={setQuickCorrectIndex}
        categoryId={quickCategoryId}
        onCategoryIdChange={setQuickCategoryId}
        flattenedCategories={flattenedCategories}
        creating={creatingQuickQuestion}
        onSave={handleCreateAndAttachQuestion}
        onClose={closeQuickAddModal}
      />

      <TestRandomBuilderModal
        open={randomModalOpen}
        flattenedCategories={flattenedCategories}
        selectedCategoryIds={randomCategoryIds}
        onToggleCategory={toggleRandomCategory}
        pool={randomPool}
        loadingPool={loadingRandomPool}
        count={randomCount}
        onCountChange={setRandomCount}
        preview={randomPreview}
        onDraw={handleDrawRandom}
        adding={addingRandom}
        onConfirmAdd={handleConfirmAddRandom}
        onBackToSelection={() => setRandomPreview(null)}
        onClose={closeRandomModal}
      />

      <TestEditQuestionModal
        modal={editQuestionModal}
        text={editQuestionText}
        onTextChange={setEditQuestionText}
        passageId={editQuestionPassageId}
        onPassageIdChange={setEditQuestionPassageId}
        passages={editModalPassages}
        saving={savingQuestionEdit}
        onSave={handleSaveQuestionEdit}
        onClose={closeEditQuestionModal}
      />

      <ImportQuestionsModal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onConfirm={handleImportQuestions}
        categories={flattenedCategories}
        defaultCategoryId={selectedCategoryId}
      />
      <ExportQuestionsModal
        open={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        defaultTitle={testTitle ?? "أسئلة الاختبار"}
        loadQuestions={async () => attachedExportQuestions}
      />
    </div>
  );
}
