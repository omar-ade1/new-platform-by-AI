// نفس الـallowlist في كل مكان: نص السؤال المنسّق بيسمح بس بالتنسيق الإنلاين اللي محرر الأدمن
// (RichQuestionTextEditor) بيقدر ينتجه — bold/italic/underline/لون/حجم خط/سطر جديد. أي حاجة تانية
// (script, iframe, on* handlers...) بتتشال.
// ⚠️ strong/em مش b/i: TipTap's Bold/Italic extensions بتـserialize بالـtags الدلالية (strong/em)
// افتراضيًا، مش <b>/<i> القديمة — اتأكد منه عمليًا بالفحص في الـBrowser pane.
const ALLOWED_TAGS = ["strong", "em", "u", "span", "br"];
const ALLOWED_ATTR = ["style"];
const ALLOWED_STYLE_PROPS = new Set(["color", "font-size"]);

let styleHookInstalled = false;

// DOMPurify بينضّف الـstyle attribute من حاجات خطيرة زي expression()/url(javascript:) افتراضيًا،
// بس مبيقصرهوش على خصائص معينة — الـhook ده بيسيب color وfont-size بس، أي property تانية بتتشال.
function ensureStyleHook(DOMPurify: typeof import("isomorphic-dompurify").default) {
  if (styleHookInstalled) return;
  styleHookInstalled = true;
  DOMPurify.addHook("uponSanitizeAttribute", (_node, data) => {
    if (data.attrName !== "style") return;
    const keptDeclarations = data.attrValue
      .split(";")
      .map((decl) => decl.trim())
      .filter(Boolean)
      .filter((decl) => {
        const prop = decl.split(":")[0]?.trim().toLowerCase();
        return prop ? ALLOWED_STYLE_PROPS.has(prop) : false;
      });
    data.attrValue = keptDeclarations.join("; ");
  });
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const FORMATTED_TAG_PATTERN = /<(strong|em|u|span|br)\b/i;

// سؤال قديم (من قبل المحرر الجديد) نص عادي 100% — مفيش أي طريقة يحتوي بيها على الـtags دي إلا
// لو اتحفظ بالفعل عن طريق RichQuestionTextEditor.
export function isFormattedQuestionHtml(value: string): boolean {
  return FORMATTED_TAG_PATTERN.test(value);
}

// ⚠️ نادِ الدالة دي بس من كود شغال في متصفح حقيقي (event handler بعد submit مثلًا) — أبدًا وقت
// عرض/render. لو اتنادت من غير window (زي وقت SSR بتاع Next.js لـ"use client" components — دي
// بتتعمل لها SSR كمان مش بس الـclient components التفاعلية) isomorphic-dompurify بيحاول ينشئ
// jsdom instance داخليًا وده بيكسر (jsdom الحديثة بتعتمد على @csstools/css-calc وهو ESM-only).
// الـimport() هنا متعمد ديناميكي (async) — مش static import أعلى الملف — عشان كود isomorphic-dompurify
// نفسه (اللي بيحاول ينشئ jsdom لو window مش موجود) ميتنفذش أصلاً إلا وقت ما الدالة دي فعلاً تتنادى،
// مش مجرد ما questionTextHtml.ts يتـimport من أي مكان (زي وقت الـSSR أو وقت التست).
export async function sanitizeQuestionHtml(html: string): Promise<string> {
  const { default: DOMPurify } = await import("isomorphic-dompurify");
  ensureStyleHook(DOMPurify);
  return DOMPurify.sanitize(html, { ALLOWED_TAGS, ALLOWED_ATTR });
}

// نقطة الدخول الموحّدة لأي عرض لنص سؤال. القيمة بتتنقّى مرة واحدة بس وقت الحفظ
// (sanitizeQuestionHtml وقت submit الأدمن، دايمًا في متصفح حقيقي) — هنا وقت العرض بنثق في القيمة
// المخزّنة ومتعمدين نتجنب أي نداء لـDOMPurify، عشان الدالة دي بتتنادى من مكوّنات بتتعمل لها SSR.
// سؤال قديم (نص عادي) بيتـescape زي ما كان بيحصل تلقائي من React قبل كده.
export function toSafeQuestionHtml(value: string): string {
  return isFormattedQuestionHtml(value) ? value : escapeHtml(value);
}

// نقطة الدخول الموحّدة لأي حفظ لنص سؤال (من المحرر أو من استيراد CSV): نص عادي (الحالة الغالبة)
// بيتخزن زي ما هو، وأي حاجة شكلها HTML منسّق بتتنقّى بـsanitizeQuestionHtml قبل التخزين. نادِها
// بس من متصفح حقيقي (event handler)، زي sanitizeQuestionHtml بالظبط.
export async function prepareQuestionTextForSave(value: string): Promise<string> {
  return isFormattedQuestionHtml(value) ? sanitizeQuestionHtml(value) : value;
}
