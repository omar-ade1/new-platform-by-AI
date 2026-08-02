import { scoreTier } from "@/lib/format";

export type TopicStat = { category_id: string; category_title: string; total: number; correct: number };

// بيوري نسبة الصح لكل تصنيف رئيسي، الأضعف الأول (الأكثر فايدة إنه يتشاف الأول)
export default function TopicPerformance({ topics }: { topics: TopicStat[] }) {
  if (topics.length === 0) {
    return <p className="text-ink/50 text-base">لسه معندناش بيانات كفاية لتحليل نقاط القوة والضعف.</p>;
  }

  const sorted = [...topics].sort((a, b) => a.correct / a.total - b.correct / b.total);

  return (
    <div className="space-y-3 print:space-y-0 print:grid print:grid-cols-2 print:gap-2">
      {sorted.map((t) => {
        const pct = Math.round((t.correct / t.total) * 100);
        const tier = scoreTier(pct);
        return (
          <div
            key={t.category_id}
            className="bg-surface rounded-2xl border-2 border-ink/10 p-4 print:break-inside-avoid print:rounded-lg print:border print:p-2"
          >
            <div className="flex items-center justify-between gap-3 mb-2 print:mb-1">
              <p className="font-display font-bold text-base print:text-sm">{t.category_title}</p>
              <span
                className={`font-display font-black text-base rounded-full px-3 py-1 shrink-0 print:text-sm print:px-2 print:py-0.5 ${tier.text} ${tier.bg}`}
              >
                {pct}%
              </span>
            </div>
            <div className="h-2 rounded-full bg-ink/10 overflow-hidden print:h-1.5">
              <div className={`h-full rounded-full ${tier.bar}`} style={{ width: `${pct}%` }} />
            </div>
            <p className="text-xs text-ink/40 mt-1.5 print:mt-1">
              {t.correct} من {t.total} سؤال صح
            </p>
          </div>
        );
      })}
    </div>
  );
}
