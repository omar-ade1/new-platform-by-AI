// شريط ترقيم صفحات — بيسمح بالوصول لأي صفحة (بالأخص آخر واحدة) بضغطة واحدة، بدل "تحميل أكتر" المتكرر.
function pageWindow(current: number, total: number): (number | "gap")[] {
  const pages = new Set<number>([1, total, current, current - 1, current + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);

  const result: (number | "gap")[] = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) result.push("gap");
    result.push(sorted[i]);
  }
  return result;
}

export default function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  const btn = "min-w-10 h-10 px-2 rounded-xl font-display font-bold text-base transition-colors disabled:opacity-30";

  return (
    <div className="flex items-center justify-center gap-1.5 flex-wrap">
      <button onClick={() => onChange(page - 1)} disabled={page === 1} className={`${btn} text-primary hover:bg-primary/10`} title="السابق">
        ‹
      </button>

      {pageWindow(page, totalPages).map((p, i) =>
        p === "gap" ? (
          <span key={`gap-${i}`} className="px-1 text-ink/30">
            …
          </span>
        ) : (
          <button
            key={p}
            onClick={() => onChange(p)}
            className={`${btn} ${p === page ? "bg-primary text-white" : "text-ink/70 hover:bg-primary/10"}`}
          >
            {p}
          </button>
        )
      )}

      <button
        onClick={() => onChange(page + 1)}
        disabled={page === totalPages}
        className={`${btn} text-primary hover:bg-primary/10`}
        title="التالي"
      >
        ›
      </button>
    </div>
  );
}
