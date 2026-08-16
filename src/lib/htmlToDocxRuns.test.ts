import { describe, expect, it } from "vitest";
import { parseQuestionTextRuns } from "./htmlToDocxRuns";

describe("parseQuestionTextRuns", () => {
  it("returns a single segment for plain legacy text", () => {
    expect(parseQuestionTextRuns("مرادف كلمة سعيد", { bold: true, size: 25 })).toEqual([
      { text: "مرادف كلمة سعيد", bold: true, size: 25 },
    ]);
  });

  it("splits bold text into separate segments", () => {
    const segments = parseQuestionTextRuns("قبل <strong>غامق</strong> بعد", { size: 25 });
    expect(segments).toEqual([
      { text: "قبل ", size: 25 },
      { text: "غامق", size: 25, bold: true },
      { text: " بعد", size: 25 },
    ]);
  });

  it("handles nested marks (italic inside bold)", () => {
    const segments = parseQuestionTextRuns("<strong>غامق <em>ومائل</em></strong>");
    expect(segments).toEqual([
      { text: "غامق ", bold: true },
      { text: "ومائل", bold: true, italic: true },
    ]);
  });

  it("applies underline", () => {
    expect(parseQuestionTextRuns("<u>مسطّر</u>")).toEqual([{ text: "مسطّر", underline: true }]);
  });

  it("reads color and font-size from a span style attribute", () => {
    const segments = parseQuestionTextRuns('<span style="color:#ff0000;font-size:20px">ملوّن</span>');
    expect(segments).toEqual([{ text: "ملوّن", color: "FF0000", size: 30 }]);
  });

  it("converts a browser-normalized rgb() color to hex (real stored format from the editor)", () => {
    const segments = parseQuestionTextRuns('<span style="color: rgb(255, 93, 143);">ملوّن</span>');
    expect(segments).toEqual([{ text: "ملوّن", color: "FF5D8F" }]);
  });

  it("emits a break segment for <br>", () => {
    expect(parseQuestionTextRuns("سطر<br>تاني")).toEqual([{ text: "سطر" }, { break: true }, { text: "تاني" }]);
  });

  it("decodes html entities in text nodes", () => {
    expect(parseQuestionTextRuns("<strong>5 &lt; 10 &amp; كذا</strong>")).toEqual([{ text: "5 < 10 & كذا", bold: true }]);
  });
});
