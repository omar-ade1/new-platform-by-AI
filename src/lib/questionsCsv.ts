export const OPTION_LETTERS = ["أ", "ب", "ج", "د"] as const;

export type ParsedQuestionRow = {
  rowNumber: number;
  question_text: string;
  options: { letter: string; text: string }[];
  correctLetter: string;
  errors: string[];
};

// بارسر CSV بسيط (بدون مكتبة خارجية) — بيتعامل مع حقول متحاطة بـ"" وفيها فواصل أو أسطر جديدة
// جواها (زي ما إكسل بيصدّرها لما يكون فيه فاصلة داخل الخلية نفسها)
function parseCsv(text: string): string[][] {
  const clean = text.replace(/^﻿/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (inQuotes) {
      if (ch === '"') {
        if (clean[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += ch;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((r) => !(r.length === 1 && r[0].trim() === ""));
}

// بيقرأ ملف CSV فيه: نص السؤال، اختيار أ، اختيار ب، اختيار ج، اختيار د، الإجابة الصح
// (أول سطر عناوين، بيتشال). كل صف بيرجع مع أي أخطاء تحقق (نص فاضي، إجابة صح مش موجودة... إلخ)
export function parseQuestionsCsv(text: string): ParsedQuestionRow[] {
  const rows = parseCsv(text);
  if (rows.length === 0) return [];

  return rows
    .slice(1)
    .filter((cells) => cells.some((c) => c.trim() !== ""))
    .map((cells, i) => {
      const questionText = (cells[0] ?? "").trim();
      const options = OPTION_LETTERS.map((letter, idx) => ({ letter, text: (cells[idx + 1] ?? "").trim() }));
      const correctLetter = (cells[5] ?? "").trim();

      const errors: string[] = [];
      if (!questionText) errors.push("نص السؤال فاضي");
      for (const opt of options) {
        if (!opt.text) errors.push(`الاختيار (${opt.letter}) فاضي`);
      }
      if (!(OPTION_LETTERS as readonly string[]).includes(correctLetter)) {
        errors.push('عمود "الإجابة الصح" لازم يكون أ أو ب أو ج أو د');
      }

      return { rowNumber: i + 2, question_text: questionText, options, correctLetter, errors };
    });
}

export function buildQuestionsCsvTemplate(): string {
  const header = "نص السؤال,اختيار أ,اختيار ب,اختيار ج,اختيار د,الإجابة الصح";
  const example = 'مرادف كلمة "سعيد",حزين,فرحان,غاضب,خائف,ب';
  return `${header}\n${example}\n`;
}

function csvEscape(field: string): string {
  if (/[",\n]/.test(field)) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

// عكس parseQuestionsCsv — بيبني نص CSV من أسئلة جاهزة (تصدير مباشر من القاعدة، مش رفع ملف)
export function buildQuestionsCsv(rows: { question_text: string; options: { letter: string; text: string }[]; correctLetter: string }[]): string {
  const header = "نص السؤال,اختيار أ,اختيار ب,اختيار ج,اختيار د,الإجابة الصح";
  const lines = rows.map((row) => {
    const optionTexts = OPTION_LETTERS.map((letter) => row.options.find((o) => o.letter === letter)?.text ?? "");
    return [row.question_text, ...optionTexts, row.correctLetter].map(csvEscape).join(",");
  });
  return [header, ...lines].join("\n") + "\n";
}
