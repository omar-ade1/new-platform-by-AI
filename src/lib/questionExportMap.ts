import { OPTION_LETTERS, type ParsedQuestionRow } from "@/lib/questionsCsv";

export type ExportQuestion = {
  id: string;
  question_text: string;
  order_index: number;
  question_options: { id: string; option_text: string; is_correct: boolean; order_index: number }[];
};

// بيحوّل أسئلة القاعدة لنفس شكل ParsedQuestionRow اللي buildQuestionsCsv وbuildQuestionMemoDocx بياخدوه.
// سؤال "غير محلول" (معندوش ولا اختيار عليه is_correct) بيتصدّر بعمود إجابة فاضي — مش بنفترض إجابة عشوائية.
export function toMemoRows(questions: ExportQuestion[]): ParsedQuestionRow[] {
  return questions.map((q, i) => {
    const sortedOptions = [...q.question_options].sort((a, b) => a.order_index - b.order_index).slice(0, OPTION_LETTERS.length);
    const options = sortedOptions.map((opt, idx) => ({ letter: OPTION_LETTERS[idx], text: opt.option_text }));
    const correctIdx = sortedOptions.findIndex((opt) => opt.is_correct);
    const solved = correctIdx !== -1;
    const correctLetter = solved ? OPTION_LETTERS[correctIdx] : "";
    return { rowNumber: i + 1, question_text: q.question_text, options, correctLetter, solved, errors: [] };
  });
}
