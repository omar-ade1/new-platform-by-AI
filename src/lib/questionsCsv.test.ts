import { describe, expect, it } from "vitest";
import { buildQuestionsCsv, parseQuestionsCsv } from "./questionsCsv";

const HEADER = "نص السؤال,اختيار أ,اختيار ب,اختيار ج,اختيار د,الإجابة الصح";

describe("parseQuestionsCsv", () => {
  it("parses a valid row with no errors", () => {
    const csv = `${HEADER}\nمرادف سعيد,حزين,فرحان,غاضب,خائف,ب`;
    const rows = parseQuestionsCsv(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0].errors).toEqual([]);
    expect(rows[0].question_text).toBe("مرادف سعيد");
    expect(rows[0].options).toEqual([
      { letter: "أ", text: "حزين" },
      { letter: "ب", text: "فرحان" },
      { letter: "ج", text: "غاضب" },
      { letter: "د", text: "خائف" },
    ]);
    expect(rows[0].correctLetter).toBe("ب");
  });

  it("handles a quoted field containing a comma", () => {
    const csv = `${HEADER}\n"مرادف كلمة, بمعنى وصفي",حزين,فرحان,غاضب,خائف,أ`;
    const rows = parseQuestionsCsv(csv);
    expect(rows[0].question_text).toBe("مرادف كلمة, بمعنى وصفي");
    expect(rows[0].errors).toEqual([]);
  });

  it("strips a leading UTF-8 BOM", () => {
    const csv = `﻿${HEADER}\nسؤال,أ,ب,ج,د,أ`;
    const rows = parseQuestionsCsv(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0].question_text).toBe("سؤال");
  });

  it("flags an empty question text", () => {
    const csv = `${HEADER}\n,حزين,فرحان,غاضب,خائف,أ`;
    const rows = parseQuestionsCsv(csv);
    expect(rows[0].errors).toContain("نص السؤال فاضي");
  });

  it("flags empty options", () => {
    const csv = `${HEADER}\nسؤال,حزين,,غاضب,خائف,أ`;
    const rows = parseQuestionsCsv(csv);
    expect(rows[0].errors).toContain("الاختيار (ب) فاضي");
  });

  it("flags a correct-answer letter outside أ-د", () => {
    const csv = `${HEADER}\nسؤال,حزين,فرحان,غاضب,خائف,هـ`;
    const rows = parseQuestionsCsv(csv);
    expect(rows[0].errors).toContain('عمود "الإجابة الصح" لازم يكون أ أو ب أو ج أو د');
  });

  it("flags a missing correct-answer letter", () => {
    const csv = `${HEADER}\nسؤال,حزين,فرحان,غاضب,خائف,`;
    const rows = parseQuestionsCsv(csv);
    expect(rows[0].errors).toContain('عمود "الإجابة الصح" لازم يكون أ أو ب أو ج أو د');
  });

  it("skips fully blank rows", () => {
    const csv = `${HEADER}\nسؤال,أ,ب,ج,د,أ\n,,,,,\n`;
    const rows = parseQuestionsCsv(csv);
    expect(rows).toHaveLength(1);
  });

  it("numbers rows starting at 2 (after the header)", () => {
    const csv = `${HEADER}\nسؤال ١,أ,ب,ج,د,أ\nسؤال ٢,أ,ب,ج,د,ب`;
    const rows = parseQuestionsCsv(csv);
    expect(rows[0].rowNumber).toBe(2);
    expect(rows[1].rowNumber).toBe(3);
  });

  it("returns an empty array for an empty file", () => {
    expect(parseQuestionsCsv("")).toEqual([]);
  });
});

describe("buildQuestionsCsv", () => {
  it("builds a header row plus one row per question", () => {
    const csv = buildQuestionsCsv([
      {
        question_text: "مرادف سعيد",
        options: [
          { letter: "أ", text: "حزين" },
          { letter: "ب", text: "فرحان" },
          { letter: "ج", text: "غاضب" },
          { letter: "د", text: "خائف" },
        ],
        correctLetter: "ب",
      },
    ]);
    expect(csv).toBe(`${HEADER}\nمرادف سعيد,حزين,فرحان,غاضب,خائف,ب\n`);
  });

  it("quotes a field containing a comma", () => {
    const csv = buildQuestionsCsv([
      {
        question_text: "مرادف كلمة, بمعنى وصفي",
        options: [
          { letter: "أ", text: "حزين" },
          { letter: "ب", text: "فرحان" },
          { letter: "ج", text: "غاضب" },
          { letter: "د", text: "خائف" },
        ],
        correctLetter: "أ",
      },
    ]);
    expect(csv).toContain('"مرادف كلمة, بمعنى وصفي"');
  });

  it("escapes an embedded double quote by doubling it", () => {
    const csv = buildQuestionsCsv([
      {
        question_text: 'مرادف كلمة "سعيد"',
        options: [
          { letter: "أ", text: "حزين" },
          { letter: "ب", text: "فرحان" },
          { letter: "ج", text: "غاضب" },
          { letter: "د", text: "خائف" },
        ],
        correctLetter: "ب",
      },
    ]);
    expect(csv).toContain('"مرادف كلمة ""سعيد"""');
  });

  it("fills a blank string for a missing option letter", () => {
    const csv = buildQuestionsCsv([
      {
        question_text: "سؤال ناقص",
        options: [{ letter: "أ", text: "حزين" }],
        correctLetter: "أ",
      },
    ]);
    expect(csv).toBe(`${HEADER}\nسؤال ناقص,حزين,,,,أ\n`);
  });

  it("produces just the header for an empty list", () => {
    expect(buildQuestionsCsv([])).toBe(`${HEADER}\n`);
  });
});
