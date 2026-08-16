"use client";

import { Extension } from "@tiptap/core";
import Bold from "@tiptap/extension-bold";
import Document from "@tiptap/extension-document";
import HardBreak from "@tiptap/extension-hard-break";
import Italic from "@tiptap/extension-italic";
import Paragraph from "@tiptap/extension-paragraph";
import Text from "@tiptap/extension-text";
import { Color, FontSize, TextStyle } from "@tiptap/extension-text-style";
import Underline from "@tiptap/extension-underline";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import { escapeHtml, isFormattedQuestionHtml } from "@/lib/questionTextHtml";

const FONT_SIZES = [
  { label: "صغير", value: "14px" },
  { label: "عادي", value: "16px" },
  { label: "كبير", value: "20px" },
  { label: "أكبر", value: "24px" },
];

const COLOR_SWATCHES = [
  { label: "أساسي", value: "#2D1B69" },
  { label: "وردي", value: "#FF5D8F" },
  { label: "أصفر", value: "#B8860B" },
  { label: "تركواز", value: "#00897B" },
  { label: "أحمر", value: "#DC2626" },
  { label: "أزرق", value: "#2563EB" },
];

// بيمنع Enter من عمل فقرة جديدة (splitBlock الافتراضي في @tiptap/core) ويحوّله لسطر جديد جوه
// نفس الفقرة — عشان نص السؤال يفضل فقرة واحدة دايمًا (شرط أساسي لتفادي <p> جوه <p> وقت العرض).
const EnterAsHardBreak = Extension.create({
  name: "enterAsHardBreak",
  addKeyboardShortcuts() {
    return { Enter: () => this.editor.commands.setHardBreak() };
  },
});

function toEditorInitialHtml(value: string): string {
  const inner = isFormattedQuestionHtml(value) ? value : escapeHtml(value).replace(/\n/g, "<br>");
  return `<p>${inner}</p>`;
}

function stripOuterParagraph(html: string): string {
  const match = /^<p>([\s\S]*)<\/p>$/.exec(html.trim());
  return match ? match[1] : html;
}

function ToolbarButton({
  active,
  disabled,
  onClick,
  title,
  className = "",
  children,
}: {
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  title: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      // مهم: preventDefault على mousedown، وإلا الضغط على الزرار بيعمل blur للمحرر ويشيل
      // التحديد الحالي قبل ما الأمر يتنفذ (أشهر باگ في بناء toolbar مخصص لـTipTap)
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`min-w-[30px] h-[30px] px-1.5 rounded-md text-sm font-bold flex items-center justify-center transition-colors disabled:opacity-40 ${
        active ? "bg-primary text-white" : "text-ink/70 hover:bg-ink/10"
      } ${className}`}
    >
      {children}
    </button>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const activeFontSize = editor.getAttributes("textStyle").fontSize ?? "";
  const activeColor = editor.getAttributes("textStyle").color ?? "";

  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-ink/10 bg-ink/[0.03] px-2 py-1.5">
      <ToolbarButton title="غامق" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
        B
      </ToolbarButton>
      <ToolbarButton title="مائل" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} className="italic">
        I
      </ToolbarButton>
      <ToolbarButton
        title="تسطير"
        active={editor.isActive("underline")}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        className="underline"
      >
        U
      </ToolbarButton>

      <span className="w-px h-5 bg-ink/10 mx-1" />

      <select
        title="حجم الخط"
        value={activeFontSize}
        onMouseDown={(e) => e.stopPropagation()}
        onChange={(e) => {
          const value = e.target.value;
          if (value) {
            editor.chain().focus().setFontSize(value).run();
          } else {
            editor.chain().focus().unsetFontSize().run();
          }
        }}
        className="h-[30px] rounded-md border border-ink/15 bg-surface px-1.5 text-sm outline-none"
      >
        <option value="">حجم الخط</option>
        {FONT_SIZES.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>

      <span className="w-px h-5 bg-ink/10 mx-1" />

      <div className="flex items-center gap-1">
        {COLOR_SWATCHES.map((c) => (
          <button
            key={c.value}
            type="button"
            title={c.label}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().setColor(c.value).run()}
            style={{ backgroundColor: c.value }}
            className={`w-[22px] h-[22px] rounded-full border-2 transition-transform ${
              activeColor.toLowerCase() === c.value.toLowerCase() ? "border-ink scale-110" : "border-transparent hover:scale-105"
            }`}
          />
        ))}
        <input
          type="color"
          title="لون مخصص"
          value={activeColor || "#2D1B69"}
          onMouseDown={(e) => e.preventDefault()}
          onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
          className="w-[26px] h-[26px] rounded-md border border-ink/15 cursor-pointer bg-transparent p-0.5"
        />
      </div>

      <span className="w-px h-5 bg-ink/10 mx-1" />

      <ToolbarButton
        title="مسح التنسيق"
        onClick={() => editor.chain().focus().unsetBold().unsetItalic().unsetUnderline().unsetColor().unsetFontSize().run()}
      >
        ⌫
      </ToolbarButton>
    </div>
  );
}

export default function RichQuestionTextEditor({ value, onChange }: { value: string; onChange: (html: string) => void }) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [Document, Paragraph, Text, Bold, Italic, Underline, HardBreak, TextStyle, Color, FontSize, EnterAsHardBreak],
    content: toEditorInitialHtml(value),
    editorProps: {
      attributes: {
        dir: "rtl",
        class: "min-h-[72px] px-4 py-3 text-base outline-none",
      },
    },
    onUpdate: ({ editor }) => {
      onChange(stripOuterParagraph(editor.getHTML()));
    },
  });

  if (!editor) {
    return <div className="w-full rounded-lg border border-ink/15 px-4 py-3 text-base text-ink/40">جاري تحميل المحرر...</div>;
  }

  return (
    <div className="w-full rounded-lg border border-ink/15 focus-within:border-primary transition-colors overflow-hidden">
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}
