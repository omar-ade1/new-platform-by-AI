import type { ParsedQuestionRow } from "./questionsCsv";
import { MEMO_THEMES, type MemoOptions } from "./questionMemoDocx";
import { escapeHtml, toSafeQuestionHtml } from "./questionTextHtml";

const TEACHER_NAME = "الأستاذ عادل فؤاد عاشور";

function optionsInlineHtml(row: ParsedQuestionRow, showAnswers: boolean): string {
  const cells = row.options
    .map((opt) => {
      const isCorrect = showAnswers && opt.letter === row.correctLetter;
      return `<div class="opt${isCorrect ? " correct" : ""}">${escapeHtml(opt.letter)}) ${escapeHtml(opt.text)}${isCorrect ? " ✓" : ""}</div>`;
    })
    .join("");
  return `<div class="options-inline">${cells}</div>`;
}

function optionsStackedHtml(row: ParsedQuestionRow, showAnswers: boolean): string {
  const items = row.options
    .map((opt) => {
      const isCorrect = showAnswers && opt.letter === row.correctLetter;
      return `<div class="opt${isCorrect ? " correct" : ""}">${escapeHtml(opt.letter)}) ${escapeHtml(opt.text)}${isCorrect ? " ✓" : ""}</div>`;
    })
    .join("");
  return `<div class="options-stacked">${items}</div>`;
}

// نسخة HTML من نفس شكل مذكرة buildQuestionMemoDocx — لأغراض الطباعة/تصدير PDF عن طريق
// نافذة طباعة المتصفح (بدون أي مكتبة PDF خارجية، نفس أسلوب صفحات الطباعة الموجودة في المنصة)
export function buildQuestionMemoHtml(rows: ParsedQuestionRow[], options: MemoOptions): string {
  const theme = MEMO_THEMES.find((t) => t.id === options.themeId) ?? MEMO_THEMES[0];
  const optionsInline = options.optionsInline ?? true;

  const questionsHtml = rows
    .map(
      (row, index) => `
        <div class="question-card">
          <div class="question-text"><span class="num">${index + 1}) </span>${toSafeQuestionHtml(row.question_text)}</div>
          ${optionsInline ? optionsInlineHtml(row, options.showAnswers) : optionsStackedHtml(row, options.showAnswers)}
        </div>`
    )
    .join("");

  return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(options.title)}</title>
<style>
  @page { size: A4; margin: 14mm; }
  * { box-sizing: border-box; }
  body { font-family: Tahoma, Arial, sans-serif; direction: rtl; color: #1A1033; margin: 0; }
  .banner { background: #${theme.primary}; color: #fff; padding: 18px 22px; border-radius: 10px 10px 0 0; }
  .banner .platform { font-weight: 900; font-size: 13px; margin-bottom: 4px; }
  .banner .title { font-weight: 900; font-size: 22px; margin-bottom: 6px; }
  .banner .teacher { font-weight: 700; font-size: 11px; }
  .accent { height: 6px; background: #${theme.accent}; border-radius: 0 0 10px 10px; margin-bottom: 18px; }
  .question-card {
    border: 2px solid #${theme.cardBorder};
    background: #${theme.cardBg};
    border-radius: 10px;
    padding: 12px 16px;
    margin-bottom: 12px;
    page-break-inside: avoid;
  }
  .question-text { font-weight: 900; font-size: 14px; margin-bottom: 8px; }
  .question-text .num { color: #${theme.primary}; }
  .options-inline { display: flex; border: 1px solid #${theme.divider}; border-radius: 6px; overflow: hidden; }
  .options-inline .opt {
    flex: 1;
    text-align: center;
    padding: 7px 5px;
    font-weight: 700;
    font-size: 11.5px;
    border-inline-start: 1px solid #${theme.divider};
  }
  .options-inline .opt:first-child { border-inline-start: none; }
  .options-stacked .opt {
    padding: 7px 12px;
    font-weight: 700;
    font-size: 12.5px;
    border-bottom: 1px solid #${theme.divider};
  }
  .options-stacked .opt:last-child { border-bottom: none; }
  .opt.correct { background: #${theme.correctBg}; color: #${theme.correct}; font-weight: 900; }
</style>
</head>
<body>
  <div class="banner">
    <div class="platform">الوجيز</div>
    <div class="title">${escapeHtml(options.title)}</div>
    <div class="teacher">إعداد: ${TEACHER_NAME}</div>
  </div>
  <div class="accent"></div>
  ${questionsHtml}
  <script>
    window.onload = function () { window.print(); };
  </script>
</body>
</html>`;
}
