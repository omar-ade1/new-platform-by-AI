import { describe, expect, it } from "vitest";
import { toMemoRows, type ExportQuestion } from "./questionExportMap";

describe("toMemoRows", () => {
  it("maps options to أ-د letters in order_index order and finds the correct letter", () => {
    const questions: ExportQuestion[] = [
      {
        id: "q1",
        question_text: "مرادف سعيد",
        order_index: 1,
        question_options: [
          { id: "o3", option_text: "غاضب", is_correct: false, order_index: 2 },
          { id: "o1", option_text: "حزين", is_correct: false, order_index: 0 },
          { id: "o2", option_text: "فرحان", is_correct: true, order_index: 1 },
          { id: "o4", option_text: "خائف", is_correct: false, order_index: 3 },
        ],
      },
    ];

    const rows = toMemoRows(questions);
    expect(rows).toHaveLength(1);
    expect(rows[0].question_text).toBe("مرادف سعيد");
    expect(rows[0].options).toEqual([
      { letter: "أ", text: "حزين" },
      { letter: "ب", text: "فرحان" },
      { letter: "ج", text: "غاضب" },
      { letter: "د", text: "خائف" },
    ]);
    expect(rows[0].correctLetter).toBe("ب");
  });

  it("numbers rows starting at 1", () => {
    const question = (id: string): ExportQuestion => ({
      id,
      question_text: id,
      order_index: 0,
      question_options: [{ id: `${id}-o`, option_text: "أ", is_correct: true, order_index: 0 }],
    });
    const rows = toMemoRows([question("q1"), question("q2")]);
    expect(rows.map((r) => r.rowNumber)).toEqual([1, 2]);
  });

  it("falls back to the first option's letter when no option is marked correct", () => {
    const questions: ExportQuestion[] = [
      {
        id: "q1",
        question_text: "سؤال بلا إجابة صح",
        order_index: 0,
        question_options: [
          { id: "o1", option_text: "حزين", is_correct: false, order_index: 0 },
          { id: "o2", option_text: "فرحان", is_correct: false, order_index: 1 },
        ],
      },
    ];
    expect(toMemoRows(questions)[0].correctLetter).toBe("أ");
  });

  it("caps options at 4 (أ-د) even if more are provided", () => {
    const questions: ExportQuestion[] = [
      {
        id: "q1",
        question_text: "سؤال بخيارات زيادة",
        order_index: 0,
        question_options: Array.from({ length: 5 }, (_, i) => ({
          id: `o${i}`,
          option_text: `اختيار ${i}`,
          is_correct: i === 4,
          order_index: i,
        })),
      },
    ];
    const rows = toMemoRows(questions);
    expect(rows[0].options).toHaveLength(4);
  });

  it("returns an empty array for no questions", () => {
    expect(toMemoRows([])).toEqual([]);
  });
});
