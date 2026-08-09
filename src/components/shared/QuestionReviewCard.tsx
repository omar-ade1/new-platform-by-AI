const optionLetters = ["أ", "ب", "ج", "د", "هـ", "و", "ز", "ح"];

export type ReviewPassage = { id: string; title: string; body: string };
export type ReviewOption = { id: string; option_text: string; order_index: number; is_correct: boolean };
export type ReviewQuestion = {
  id: string;
  question_text: string;
  order_index: number;
  passage: ReviewPassage | null;
  options: ReviewOption[];
  selected_option_id: string | null;
};

// بيوري سؤال واحد بعد التصحيح: الإجابة الصح ملوّنة تركواز، واختيار الطالب لو غلط ملوّن وردي.
// showPassage بيتحدد بره الكومبوننت (بمقارنة passage.id مع السؤال اللي قبله في نفس القايمة).
export default function QuestionReviewCard({
  question,
  index,
  showPassage,
}: {
  question: ReviewQuestion;
  index: number;
  showPassage: boolean;
}) {
  return (
    <div className="space-y-3 print:space-y-1.5 print:break-inside-avoid">
      {showPassage && question.passage && (
        <div className="rounded-2xl bg-primary/5 border-2 border-primary/15 p-5 print:rounded-lg print:border print:p-2.5">
          <span className="text-xs font-bold text-primary bg-primary/15 rounded-full px-3 py-1.5 print:px-2 print:py-0.5">نص قراءة</span>
          <p className="text-base text-ink/70 leading-relaxed whitespace-pre-wrap mt-2.5 print:mt-1.5 print:leading-snug">
            {question.passage.body}
          </p>
        </div>
      )}
      <div
        className={`rounded-2xl border-2 p-5 space-y-3.5 print:rounded-lg print:border print:p-2.5 print:space-y-1.5 ${
          question.selected_option_id === null ? "bg-yellow/[0.07] border-yellow/50" : "bg-surface border-ink/10"
        }`}
      >
        {question.selected_option_id === null && (
          <div className="flex items-center gap-2.5 rounded-xl bg-yellow/25 px-4 py-2.5 print:hidden">
            <span className="w-7 h-7 rounded-full bg-yellow flex items-center justify-center text-primary font-black text-sm shrink-0">
              ⊘
            </span>
            <p className="text-sm font-bold text-primary">سبتها من غير إجابة</p>
          </div>
        )}
        <div className="flex items-start gap-3 print:gap-2">
          <span className="w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm flex items-center justify-center shrink-0 print:w-5 print:h-5 print:text-xs">
            {index + 1}
          </span>
          <p className="flex-1 text-base font-bold leading-relaxed print:leading-snug">{question.question_text}</p>
          {question.selected_option_id === null && (
            <span className="hidden shrink-0 print:inline text-primary font-black text-xs">⊘</span>
          )}
        </div>
        <div className="space-y-2 print:space-y-0 print:grid print:grid-cols-2 print:gap-x-2.5 print:gap-y-1.5">
          {question.options.map((option, optIndex) => {
            const isSelected = question.selected_option_id === option.id;
            const rowClass = option.is_correct
              ? "bg-teal/10 border-teal/40"
              : isSelected
                ? "bg-pink/10 border-pink/40"
                : "bg-ink/[0.015] border-ink/10";
            const badgeClass = option.is_correct
              ? "bg-teal text-white"
              : isSelected
                ? "bg-pink text-white"
                : "bg-surface text-ink/50 border-2 border-ink/10";
            return (
              <div
                key={option.id}
                className={`flex items-center gap-3 rounded-xl border-2 px-4 py-3.5 print:gap-1.5 print:rounded-md print:border print:px-2 print:py-1 ${rowClass}`}
              >
                <span
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-base shrink-0 print:w-5 print:h-5 print:text-xs ${badgeClass}`}
                >
                  {optionLetters[optIndex] ?? optIndex + 1}
                </span>
                <span className="flex-1 min-w-0 text-base font-bold print:text-sm">{option.option_text}</span>
                {option.is_correct && (
                  <span className="shrink-0 text-sm font-bold text-teal bg-teal/15 rounded-full px-3 py-1.5 print:hidden">
                    ✓ الإجابة الصحيحة
                  </span>
                )}
                {option.is_correct && <span className="hidden shrink-0 print:inline text-teal font-black text-xs">✓</span>}
                {!option.is_correct && isSelected && (
                  <span className="shrink-0 text-sm font-bold text-pink bg-pink/15 rounded-full px-3 py-1.5 print:hidden">إجابتك</span>
                )}
                {!option.is_correct && isSelected && <span className="hidden shrink-0 print:inline text-pink font-black text-xs">✗</span>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
