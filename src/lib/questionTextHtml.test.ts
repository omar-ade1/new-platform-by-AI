import { describe, expect, it } from "vitest";
import { escapeHtml, isFormattedQuestionHtml } from "./questionTextHtml";

// ⚠️ sanitizeQuestionHtml مش متغطية هنا عمدًا: بتعتمد على isomorphic-dompurify، واللي لما window
// مش موجود (بيئة Node العادية بتاعة Vitest) بيحاول ينشئ jsdom instance داخليًا — وjsdom 27
// (المتثبتة حاليًا) بقت بتعتمد على @asamuzakjp/css-color/@csstools/css-calc وهي ESM-only، وNode
// 20.13 (المتاح هنا) لسه معندوش دعم require(esm) مستقر، فبيكسر بـERR_REQUIRE_ESM. لنفس السبب ده
// toSafeQuestionHtml بقت متعمدة متناديش DOMPurify خالص وقت العرض (شوف تعليقها في questionTextHtml.ts)
// — sanitizeQuestionHtml بتتنادى مرة واحدة بس وقت الحفظ من متصفح حقيقي، فاتفحصت بصريًا في الـBrowser
// pane بدل الـunit test.
describe("isFormattedQuestionHtml", () => {
  it("returns false for plain legacy text", () => {
    expect(isFormattedQuestionHtml("مرادف كلمة سعيد")).toBe(false);
    expect(isFormattedQuestionHtml("5 < 10 & كذا")).toBe(false);
  });

  it("returns true when an allowed tag is present", () => {
    expect(isFormattedQuestionHtml("نص <strong>مهم</strong>")).toBe(true);
    expect(isFormattedQuestionHtml('نص <span style="color:red">ملوّن</span>')).toBe(true);
    expect(isFormattedQuestionHtml("سطر<br>تاني")).toBe(true);
  });
});

describe("escapeHtml", () => {
  it("escapes html-significant characters", () => {
    expect(escapeHtml(`<a href="x">'y'</a> & b`)).toBe("&lt;a href=&quot;x&quot;&gt;&#39;y&#39;&lt;/a&gt; &amp; b");
  });
});
