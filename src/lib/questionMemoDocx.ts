import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  PageNumber,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
  type IParagraphOptions,
} from "docx";
import { FONT } from "./docxFont";
import { htmlToDocxRuns } from "./htmlToDocxRuns";
import type { ParsedQuestionRow } from "./questionsCsv";

const TEACHER_NAME = "الأستاذ عادل فؤاد عاشور";
const INK = "1A1033";
const WHITE = "FFFFFF";

export type MemoThemeId = "default" | "classic" | "warm" | "economical";

export type MemoTheme = {
  id: MemoThemeId;
  label: string;
  swatch: string;
  primary: string;
  accent: string;
  correct: string;
  cardBg: string;
  cardBorder: string;
  correctBg: string;
  divider: string;
};

// 4 ثيمات شائعة فعليًا في المذكرات والكتب التعليمية (مش اختيار شخصي): الافتراضي بهوية "الوجيز"،
// كلاسيكي (كحلي/ذهبي) شائع في الكتب المدرسية والمطبوعات الرسمية، دافئ (برتقالي/أخضر) شائع في
// المذكرات الحديثة الودودة للطلاب، واقتصادي (رمادي بلون واحد) لتوفير حبر الطباعة.
export const MEMO_THEMES: MemoTheme[] = [
  {
    id: "default",
    label: "الوجيز الافتراضي",
    swatch: "#2D1B69",
    primary: "2D1B69",
    accent: "FF5D8F",
    correct: "007566",
    cardBg: "F7F7FA",
    cardBorder: "E2E2E8",
    correctBg: "D8F5F0",
    divider: "E8E8EE",
  },
  {
    id: "classic",
    label: "كلاسيكي (كحلي وذهبي)",
    swatch: "#16294F",
    primary: "16294F",
    accent: "C9A227",
    correct: "2E7D32",
    cardBg: "F7F8FA",
    cardBorder: "DCE1E8",
    correctBg: "E3F1E4",
    divider: "E4E8ED",
  },
  {
    id: "warm",
    label: "دافئ (برتقالي وأخضر)",
    swatch: "#C1440E",
    primary: "C1440E",
    accent: "F2A541",
    correct: "2F855A",
    cardBg: "FBF6F0",
    cardBorder: "F0E0CF",
    correctBg: "E1F0E5",
    divider: "F1E4D4",
  },
  {
    id: "economical",
    label: "اقتصادي للطباعة (رمادي بلون واحد)",
    swatch: "#333333",
    primary: "333333",
    accent: "777777",
    correct: "333333",
    cardBg: "F5F5F5",
    cardBorder: "D9D9D9",
    correctBg: "E7E7E7",
    divider: "DDDDDD",
  },
];

const NO_BORDER = { style: BorderStyle.NONE, size: 0, color: WHITE };

// أي رن نص عربي لازم rightToLeft صريح (وإلا Word بيلخبط ترتيب الأرقام/الكلمات المختلطة)،
// وfont كـ object (مش string) عشان نضبط خط الـ complex-script (cs) بتاع العربي، مش بس اللاتيني.
function run(text: string, opts: { bold?: boolean; color?: string; size?: number } = {}): TextRun {
  return new TextRun({
    text,
    font: FONT,
    rightToLeft: true,
    bold: opts.bold,
    boldComplexScript: opts.bold,
    size: opts.size,
    sizeComplexScript: opts.size,
    color: opts.color,
  });
}

function rtlParagraph(children: TextRun[], extra: Omit<IParagraphOptions, "children"> = {}): Paragraph {
  return new Paragraph({ bidirectional: true, alignment: AlignmentType.RIGHT, children, ...extra });
}

// بانر رئيسي بلون الثيم (اسم المنصة + العنوان + اسم الأستاذ) + شريط رفيع بلون التمييز تحته —
// لمسة تصميم بسيطة (مش مجرد سطر نص) من غير ما نعتمد على أي صورة/شكل خارجي
function headerBanner(theme: MemoTheme, title: string): (Table | Paragraph)[] {
  const bannerCell = new TableCell({
    shading: { type: ShadingType.CLEAR, color: "auto", fill: theme.primary },
    margins: { top: 260, bottom: 220, left: 320, right: 320 },
    borders: { top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER },
    children: [
      rtlParagraph([run("الوجيز", { bold: true, color: WHITE, size: 24 })], { spacing: { after: 60 } }),
      rtlParagraph([run(title, { bold: true, color: WHITE, size: 38 })], { spacing: { after: 80 } }),
      rtlParagraph([run(`إعداد: ${TEACHER_NAME}`, { bold: true, color: WHITE, size: 18 })]),
    ],
  });

  const accentCell = new TableCell({
    shading: { type: ShadingType.CLEAR, color: "auto", fill: theme.accent },
    margins: { top: 30, bottom: 30, left: 0, right: 0 },
    borders: { top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER },
    children: [new Paragraph({ text: "" })],
  });

  return [
    new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [new TableRow({ children: [bannerCell] })] }),
    new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [new TableRow({ children: [accentCell] })] }),
    new Paragraph({ text: "", spacing: { after: 160 } }),
  ];
}

// الاختيارات جنب بعضها في صف واحد (توفير مساحة) — كل اختيار في خليته، وWord بيطوّل الصف
// لوحده تلقائي لو نص أي اختيار طويل، من غير ما يبوّظ باقي الصفحة
function optionsInlineRow(theme: MemoTheme, row: ParsedQuestionRow, showAnswers: boolean): Table {
  const cellBorder = { style: BorderStyle.SINGLE, size: 2, color: theme.divider };

  const cells = row.options.map((opt) => {
    const isCorrect = showAnswers && opt.letter === row.correctLetter;
    return new TableCell({
      width: { size: 100 / row.options.length, type: WidthType.PERCENTAGE },
      shading: isCorrect ? { type: ShadingType.CLEAR, color: "auto", fill: theme.correctBg } : undefined,
      margins: { top: 90, bottom: 90, left: 100, right: 100 },
      borders: { top: cellBorder, bottom: cellBorder, left: cellBorder, right: cellBorder },
      children: [
        rtlParagraph(
          [
            run(`${opt.letter}) `, { bold: true, color: isCorrect ? theme.correct : theme.primary, size: 22 }),
            run(opt.text, { bold: isCorrect, color: isCorrect ? theme.correct : INK, size: 22 }),
            ...(isCorrect ? [run(" ✓", { bold: true, color: theme.correct, size: 22 })] : []),
          ],
          { alignment: AlignmentType.CENTER }
        ),
      ],
    });
  });

  // من غير visuallyRightToLeft، Word بيرتب الخلايا فيزيائيًا من الشمال لليمين (زي أي جدول عادي)
  // فبيطلع معكوس لقارئ عربي — الخلية الأولى (أ) المفروض تبقى أقصى اليمين مش أقصى الشمال
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    visuallyRightToLeft: true,
    rows: [new TableRow({ children: cells })],
  });
}

// كل اختيار في سطر لوحده — بديل عن الصف الأفقي لمن يفضّل شكل الليستة التقليدي
function optionsStacked(theme: MemoTheme, row: ParsedQuestionRow, showAnswers: boolean): Paragraph[] {
  return row.options.map((opt, i) => {
    const isCorrect = showAnswers && opt.letter === row.correctLetter;
    const isLast = i === row.options.length - 1;
    return rtlParagraph(
      [
        run(`${opt.letter}) `, { bold: true, color: isCorrect ? theme.correct : theme.primary, size: 24 }),
        run(opt.text, { bold: isCorrect, color: isCorrect ? theme.correct : INK, size: 24 }),
        ...(isCorrect ? [run("  ✓", { bold: true, color: theme.correct, size: 24 })] : []),
      ],
      {
        indent: { start: 300 },
        spacing: { before: 90, after: 90 },
        shading: isCorrect ? { type: ShadingType.CLEAR, color: "auto", fill: theme.correctBg } : undefined,
        border: isLast ? undefined : { bottom: { style: BorderStyle.SINGLE, size: 2, color: theme.divider, space: 6 } },
      }
    );
  });
}

function questionCard(theme: MemoTheme, row: ParsedQuestionRow, index: number, showAnswers: boolean, optionsInline: boolean): Table {
  const cardBorder = { style: BorderStyle.SINGLE, size: 4, color: theme.cardBorder };

  const questionParagraph = rtlParagraph(
    [run(`${index + 1}) `, { bold: true, color: theme.primary, size: 28 }), ...htmlToDocxRuns(row.question_text, { bold: true, size: 25 })],
    { spacing: { after: 100 } }
  );

  const optionsChildren = optionsInline ? [optionsInlineRow(theme, row, showAnswers)] : optionsStacked(theme, row, showAnswers);

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            shading: { type: ShadingType.CLEAR, color: "auto", fill: theme.cardBg },
            margins: { top: 120, bottom: 120, left: 220, right: 220 },
            borders: { top: cardBorder, bottom: cardBorder, left: cardBorder, right: cardBorder },
            children: [questionParagraph, ...optionsChildren],
          }),
        ],
      }),
    ],
  });
}

function footer(): Footer {
  return new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [run("الوجيز — صفحة ", { color: "888888", size: 18 }), new TextRun({ children: [PageNumber.CURRENT], size: 18, color: "888888" })],
      }),
    ],
  });
}

export type MemoOptions = {
  title: string;
  showAnswers: boolean;
  themeId?: MemoThemeId;
  optionsInline?: boolean;
};

// بيبني ملف Word (مذكرة) من صفوف أسئلة CSV اتقرت أصلاً محليًا (نفس النوع المستخدم في استيراد
// الأسئلة للبنك).
export async function buildQuestionMemoDocx(rows: ParsedQuestionRow[], options: MemoOptions): Promise<Blob> {
  const theme = MEMO_THEMES.find((t) => t.id === options.themeId) ?? MEMO_THEMES[0];
  const optionsInline = options.optionsInline ?? true;

  const children: (Paragraph | Table)[] = [...headerBanner(theme, options.title)];

  rows.forEach((row, index) => {
    children.push(questionCard(theme, row, index, options.showAnswers, optionsInline));
    children.push(new Paragraph({ text: "", spacing: { after: 100 } }));
  });

  const pageBorder = { style: BorderStyle.SINGLE, size: 12, color: theme.primary, space: 24 };

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            borders: {
              pageBorderTop: pageBorder,
              pageBorderBottom: pageBorder,
              pageBorderLeft: pageBorder,
              pageBorderRight: pageBorder,
            },
          },
        },
        footers: { default: footer() },
        children,
      },
    ],
  });

  return Packer.toBlob(doc);
}
