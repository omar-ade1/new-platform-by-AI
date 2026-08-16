import { TextRun } from "docx";
import { FONT } from "./docxFont";
import { isFormattedQuestionHtml } from "./questionTextHtml";

export type RunStyle = { bold?: boolean; italic?: boolean; underline?: boolean; color?: string; size?: number };
export type RunSegment = { text?: string; break?: true } & RunStyle;

// 1px = 0.75pt، والوحدة اللي docx بياخدها half-points (نص نقطة) — يعني px * 0.75 * 2
function pxToHalfPoints(px: number): number {
  return Math.round(px * 1.5);
}

// المتصفح بيطبّع أي لون بيتحط بـ.style.color لصيغة rgb(...) (وليس الـhex الأصلي اللي انبعت) —
// اتأكدنا منه عمليًا بالفحص في الـBrowser pane (swatch بلون #FF5D8F طلع style="color: rgb(255,
// 93, 143)" في الـHTML المخزّن فعليًا). docx محتاج hex من غير # (زي "FF5D8F")، فلازم نحوّل الصيغتين.
function cssColorToHex(value: string): string | undefined {
  const hexMatch = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value);
  if (hexMatch) {
    const hex = hexMatch[1];
    const full =
      hex.length === 3
        ? hex
            .split("")
            .map((c) => c + c)
            .join("")
        : hex;
    return full.toUpperCase();
  }
  const rgbMatch = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i.exec(value);
  if (rgbMatch) {
    const [, r, g, b] = rgbMatch;
    return [r, g, b]
      .map((n) => Number(n).toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase();
  }
  return undefined;
}

function parseStyleAttr(styleAttr: string): { color?: string; fontSize?: number } {
  const result: { color?: string; fontSize?: number } = {};
  styleAttr.split(";").forEach((decl) => {
    const [rawProp, rawValue] = decl.split(":");
    if (!rawProp || !rawValue) return;
    const prop = rawProp.trim().toLowerCase();
    const value = rawValue.trim();
    if (prop === "color") {
      const hex = cssColorToHex(value);
      if (hex) result.color = hex;
    } else if (prop === "font-size") {
      const px = Number.parseFloat(value);
      if (!Number.isNaN(px)) result.fontSize = pxToHalfPoints(px);
    }
  });
  return result;
}

function decodeEntities(text: string): string {
  return text.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&");
}

const TAG_PATTERN = /<(\/?)(strong|em|u|span|br)((?:\s+[a-z-]+="[^"]*")*)\s*\/?>/gi;

// بارسر خالص (من غير أي اعتماد على مكتبة docx) بيحوّل نص سؤال لمصفوفة "segments" بالتنسيق
// (bold/italic/underline/color/size) بتاعت كل جزء. سؤال قديم (مش HTML منسّق) بيرجّع segment واحد
// بالظبط زي السلوك القديم قبل الميزة دي. الـallowlist محدود بـstrong/em/u/span[style]/br بالظبط،
// نفس اللي RichQuestionTextEditor بينتجه وsanitizeQuestionHtml بيسمح بيه.
export function parseQuestionTextRuns(html: string, baseStyle: RunStyle = {}): RunSegment[] {
  if (!isFormattedQuestionHtml(html)) {
    return [{ text: html, ...baseStyle }];
  }

  const segments: RunSegment[] = [];
  const styleStack: RunStyle[] = [{ ...baseStyle }];

  const pushText = (text: string) => {
    const decoded = decodeEntities(text);
    if (!decoded) return;
    segments.push({ text: decoded, ...styleStack[styleStack.length - 1] });
  };

  let lastIndex = 0;
  TAG_PATTERN.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = TAG_PATTERN.exec(html))) {
    pushText(html.slice(lastIndex, match.index));
    lastIndex = TAG_PATTERN.lastIndex;
    const [, closing, tagName, attrs] = match;

    if (tagName === "br") {
      segments.push({ break: true });
      continue;
    }

    if (closing) {
      if (styleStack.length > 1) styleStack.pop();
      continue;
    }

    const current = styleStack[styleStack.length - 1];
    const next: RunStyle = { ...current };
    if (tagName === "strong") next.bold = true;
    if (tagName === "em") next.italic = true;
    if (tagName === "u") next.underline = true;
    if (tagName === "span") {
      const styleMatch = /style="([^"]*)"/i.exec(attrs);
      if (styleMatch) {
        const parsed = parseStyleAttr(styleMatch[1]);
        if (parsed.color) next.color = parsed.color;
        if (parsed.fontSize) next.size = parsed.fontSize;
      }
    }
    styleStack.push(next);
  }
  pushText(html.slice(lastIndex));

  return segments.length > 0 ? segments : [{ text: "", ...baseStyle }];
}

function segmentToRun(segment: RunSegment): TextRun {
  if (segment.break) {
    return new TextRun({ text: "", break: 1, font: FONT });
  }
  return new TextRun({
    text: segment.text,
    font: FONT,
    rightToLeft: true,
    bold: segment.bold,
    boldComplexScript: segment.bold,
    italics: segment.italic,
    underline: segment.underline ? {} : undefined,
    size: segment.size,
    sizeComplexScript: segment.size,
    color: segment.color,
  });
}

// بيحوّل نص سؤال (ممكن يكون HTML منسّق من RichQuestionTextEditor، أو نص عادي قديم) لمصفوفة
// TextRun بنفس تنسيق (bold/italic/underline/color/size) اللي المستخدم اختاره وقت التحرير.
export function htmlToDocxRuns(html: string, baseOpts: RunStyle = {}): TextRun[] {
  return parseQuestionTextRuns(html, baseOpts).map(segmentToRun);
}
