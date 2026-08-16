// خط ثابت مستخدم في كل TextRun بتاعت مذكرات Word (questionMemoDocx.ts وhtmlToDocxRuns.ts) — في
// ملف منفصل عشان يتشارك بين الاتنين من غير circular import.
// ملحوظة: خط Changa ExtraBold ده مش مثبّت افتراضيًا على كل جهاز ويندوز — لو مش مثبّت عند اللي
// هيفتح الملف، Word هيستبدله بخط تاني تلقائي من غير تحذير.
export const FONT = { ascii: "Changa ExtraBold", hAnsi: "Changa ExtraBold", cs: "Changa ExtraBold" };
