import { supabase } from "@/lib/supabase/client";
import { toMemoRows, type ExportQuestion } from "@/lib/questionExportMap";

export { toMemoRows, type ExportQuestion };

const CHUNK_SIZE = 300;

function chunk<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size));
  }
  return result;
}

// جلب أسئلة تصنيف (أو مجموعة تصنيفات) — بيتخطى حد الـ1000 صف الافتراضي في PostgREST بحلقة .range()
export async function fetchQuestionsByCategoryIds(categoryIds: string[]): Promise<ExportQuestion[]> {
  if (categoryIds.length === 0) return [];
  const all: ExportQuestion[] = [];

  for (const categoryChunk of chunk(categoryIds, CHUNK_SIZE)) {
    const pageSize = 1000;
    let offset = 0;
    for (;;) {
      const { data, error } = await supabase
        .from("questions")
        .select("id, question_text, order_index, question_options(id, question_id, option_text, is_correct, order_index)")
        .in("category_id", categoryChunk)
        .order("order_index")
        .range(offset, offset + pageSize - 1);

      if (error) throw error;
      all.push(...((data ?? []) as ExportQuestion[]));
      if (!data || data.length < pageSize) break;
      offset += pageSize;
    }
  }

  return all;
}

// جلب أسئلة بمعرّفاتها (مقسّمة لدفعات لتفادي URL طويل أوي)
export async function fetchQuestionsByIds(ids: string[]): Promise<ExportQuestion[]> {
  if (ids.length === 0) return [];
  const byId = new Map<string, ExportQuestion>();

  for (const idsChunk of chunk(ids, CHUNK_SIZE)) {
    const { data, error } = await supabase
      .from("questions")
      .select("id, question_text, order_index, question_options(id, question_id, option_text, is_correct, order_index)")
      .in("id", idsChunk);

    if (error) throw error;
    for (const q of (data ?? []) as ExportQuestion[]) byId.set(q.id, q);
  }

  return ids.map((id) => byId.get(id)).filter((q): q is ExportQuestion => q != null);
}

export type ExportScope = { unitId: string } | { sectionId: string } | { courseId: string };

// كل الاختبارات (content_items من نوع test) جوه نطاق معين، مرتبة هرميًا (قسم ثم وحدة ثم ترتيب العنصر)
export async function getTestContentItemIds(scope: ExportScope): Promise<string[]> {
  let unitIds: string[];

  if ("unitId" in scope) {
    unitIds = [scope.unitId];
  } else if ("sectionId" in scope) {
    const { data, error } = await supabase.from("units").select("id, order_index").eq("section_id", scope.sectionId).order("order_index");
    if (error) throw error;
    unitIds = (data ?? []).map((u) => u.id);
  } else {
    const { data: sections, error: sectionsError } = await supabase
      .from("sections")
      .select("id, order_index")
      .eq("course_id", scope.courseId)
      .order("order_index");
    if (sectionsError) throw sectionsError;
    const sectionIds = (sections ?? []).map((s) => s.id);
    if (sectionIds.length === 0) return [];

    const unitRows: { id: string; section_id: string; order_index: number }[] = [];
    for (const sectionChunk of chunk(sectionIds, CHUNK_SIZE)) {
      const { data, error } = await supabase.from("units").select("id, section_id, order_index").in("section_id", sectionChunk);
      if (error) throw error;
      unitRows.push(...(data ?? []));
    }
    const sectionOrder = new Map(sectionIds.map((id, i) => [id, i]));
    unitRows.sort((a, b) => (sectionOrder.get(a.section_id)! - sectionOrder.get(b.section_id)!) || a.order_index - b.order_index);
    unitIds = unitRows.map((u) => u.id);
  }

  if (unitIds.length === 0) return [];

  const itemRows: { id: string; unit_id: string; order_index: number }[] = [];
  for (const unitChunk of chunk(unitIds, CHUNK_SIZE)) {
    const { data, error } = await supabase.from("content_items").select("id, unit_id, order_index").eq("type", "test").in("unit_id", unitChunk);
    if (error) throw error;
    itemRows.push(...(data ?? []));
  }

  const unitOrder = new Map(unitIds.map((id, i) => [id, i]));
  itemRows.sort((a, b) => (unitOrder.get(a.unit_id)! - unitOrder.get(b.unit_id)!) || a.order_index - b.order_index);
  return itemRows.map((item) => item.id);
}

// كل أسئلة مجموعة اختبارات، بترتيب الاختبارات المُعطى ثم ترتيب السؤال جوه كل اختبار، من غير تكرار
export async function fetchQuestionsForTestIds(testContentItemIds: string[]): Promise<ExportQuestion[]> {
  if (testContentItemIds.length === 0) return [];

  // كل اختبار عنده عشرات الأسئلة (مش 1-لـ1 زي فلترة بـ id) — لازم .range() هنا برضو
  // وإلا نطاق كبير (قسم/دورة) هيرجع أكتر من 1000 صف وPostgREST هيقطعه بصمت
  const links: { test_id: string; question_id: string; order_index: number }[] = [];
  for (const testChunk of chunk(testContentItemIds, CHUNK_SIZE)) {
    const pageSize = 1000;
    let offset = 0;
    for (;;) {
      const { data, error } = await supabase
        .from("test_questions")
        .select("test_id, question_id, order_index")
        .in("test_id", testChunk)
        .range(offset, offset + pageSize - 1);

      if (error) throw error;
      links.push(...(data ?? []));
      if (!data || data.length < pageSize) break;
      offset += pageSize;
    }
  }

  const testOrder = new Map(testContentItemIds.map((id, i) => [id, i]));
  links.sort((a, b) => (testOrder.get(a.test_id)! - testOrder.get(b.test_id)!) || a.order_index - b.order_index);

  const orderedQuestionIds: string[] = [];
  const seen = new Set<string>();
  for (const link of links) {
    if (!seen.has(link.question_id)) {
      seen.add(link.question_id);
      orderedQuestionIds.push(link.question_id);
    }
  }

  return fetchQuestionsByIds(orderedQuestionIds);
}
