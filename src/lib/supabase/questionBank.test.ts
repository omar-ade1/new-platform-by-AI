import { describe, expect, it } from "vitest";
import { buildCategoryTree, collectDescendantIds, flattenCategoryTree, type QuestionCategory } from "./questionBank";

// شجرة: A (جذر) -> A1 -> A1a ، A -> A2 ، B (جذر مستقل بلا أبناء)
// الترتيب في المصفوفة متعمّد عشوائي عشان نتأكد إن الترتيب النهائي بيعتمد على order_index مش على ترتيب الإدخال
const categories: QuestionCategory[] = [
  { id: "a2", parent_id: "a", title: "A2", order_index: 2 },
  { id: "b", parent_id: null, title: "B", order_index: 2 },
  { id: "a1a", parent_id: "a1", title: "A1a", order_index: 1 },
  { id: "a", parent_id: null, title: "A", order_index: 1 },
  { id: "a1", parent_id: "a", title: "A1", order_index: 1 },
];

describe("buildCategoryTree", () => {
  it("nests children under their parents and sorts every level by order_index", () => {
    const tree = buildCategoryTree(categories);

    expect(tree.map((n) => n.id)).toEqual(["a", "b"]);

    const nodeA = tree[0];
    expect(nodeA.children.map((n) => n.id)).toEqual(["a1", "a2"]);

    const nodeA1 = nodeA.children[0];
    expect(nodeA1.children.map((n) => n.id)).toEqual(["a1a"]);

    const nodeB = tree[1];
    expect(nodeB.children).toEqual([]);
  });
});

describe("flattenCategoryTree", () => {
  it("flattens the tree in depth-first order with correct depth per node", () => {
    const tree = buildCategoryTree(categories);
    const flat = flattenCategoryTree(tree);

    expect(flat).toEqual([
      { id: "a", title: "A", depth: 0 },
      { id: "a1", title: "A1", depth: 1 },
      { id: "a1a", title: "A1a", depth: 2 },
      { id: "a2", title: "A2", depth: 1 },
      { id: "b", title: "B", depth: 0 },
    ]);
  });
});

describe("collectDescendantIds", () => {
  it("collects every descendant across multiple levels", () => {
    expect(collectDescendantIds("a", categories)).toEqual(new Set(["a1", "a2", "a1a"]));
  });

  it("collects only the deeper descendants when starting from a nested category", () => {
    expect(collectDescendantIds("a1", categories)).toEqual(new Set(["a1a"]));
  });

  it("returns an empty set for a category with no children", () => {
    expect(collectDescendantIds("b", categories)).toEqual(new Set());
  });
});
