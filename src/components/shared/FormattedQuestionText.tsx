import { toSafeQuestionHtml } from "@/lib/questionTextHtml";

export default function FormattedQuestionText({ html, className }: { html: string; className?: string }) {
  return <p className={className} dangerouslySetInnerHTML={{ __html: toSafeQuestionHtml(html) }} />;
}
