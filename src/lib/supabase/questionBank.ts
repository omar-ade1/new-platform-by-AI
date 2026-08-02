export type QuestionCategory = {
  id: string;
  parent_id: string | null;
  title: string;
  order_index: number;
};

export type CategoryNode = QuestionCategory & { children: CategoryNode[] };

// التصنيف الافتراضي اللي بتتحط فيه أي أسئلة اتضافت من غير ما الأدمن يختار تصنيف بنفسه
export const DEFAULT_CATEGORY_TITLE = "أسئلة عامة";

// شجرة التصنيفات كقايمة مسطحة بترتيب العرض، كل عنصر عارف عمقه — عشان نعمل بيها <select> بمسافات بادئة
export function flattenCategoryTree(nodes: CategoryNode[], depth = 0): { id: string; title: string; depth: number }[] {
  return nodes.flatMap((node) => [{ id: node.id, title: node.title, depth }, ...flattenCategoryTree(node.children, depth + 1)]);
}

export function buildCategoryTree(categories: QuestionCategory[]): CategoryNode[] {
  const byId = new Map<string, CategoryNode>(categories.map((c) => [c.id, { ...c, children: [] }]));
  const roots: CategoryNode[] = [];

  for (const category of byId.values()) {
    const parent = category.parent_id ? byId.get(category.parent_id) : undefined;
    if (parent) {
      parent.children.push(category);
    } else {
      roots.push(category);
    }
  }

  const sortRec = (nodes: CategoryNode[]) => {
    nodes.sort((a, b) => a.order_index - b.order_index);
    nodes.forEach((n) => sortRec(n.children));
  };
  sortRec(roots);

  return roots;
}

// كل التصنيفات الفرعية (على أي مستوى) تحت تصنيف معين — بنستخدمها عشان نمنع لفّة (تصنيف يبقى أب لنفسه)
export function collectDescendantIds(categoryId: string, categories: QuestionCategory[]): Set<string> {
  const childrenByParent = new Map<string, string[]>();
  for (const c of categories) {
    if (!c.parent_id) continue;
    const list = childrenByParent.get(c.parent_id) ?? [];
    list.push(c.id);
    childrenByParent.set(c.parent_id, list);
  }

  const result = new Set<string>();
  const stack = [categoryId];
  while (stack.length > 0) {
    const current = stack.pop()!;
    for (const childId of childrenByParent.get(current) ?? []) {
      if (!result.has(childId)) {
        result.add(childId);
        stack.push(childId);
      }
    }
  }
  return result;
}
