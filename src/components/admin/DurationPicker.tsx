"use client";

import { DURATION_OPTIONS, type DurationValue } from "@/lib/enrollmentDuration";

export default function DurationPicker({ value, onChange }: { value: DurationValue; onChange: (value: DurationValue) => void }) {
  return (
    <div>
      <label className="block font-bold text-base mb-2">مدة الاشتراك</label>
      <select
        value={value.preset}
        onChange={(e) => onChange({ ...value, preset: e.target.value })}
        className="w-full rounded-2xl border-2 border-ink/10 px-5 py-3.5 text-base focus:border-primary outline-none transition-colors bg-surface"
      >
        {DURATION_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {value.preset === "custom" && (
        <div className="grid grid-cols-3 gap-3 mt-3">
          <div>
            <label className="block text-sm text-ink/50 mb-1.5">أيام</label>
            <input
              type="number"
              min={0}
              value={value.days}
              onChange={(e) => onChange({ ...value, days: Math.max(0, Number(e.target.value) || 0) })}
              className="w-full rounded-xl border-2 border-ink/10 px-4 py-3 text-base focus:border-primary outline-none transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm text-ink/50 mb-1.5">ساعات</label>
            <input
              type="number"
              min={0}
              max={23}
              value={value.hours}
              onChange={(e) => onChange({ ...value, hours: Math.min(23, Math.max(0, Number(e.target.value) || 0)) })}
              className="w-full rounded-xl border-2 border-ink/10 px-4 py-3 text-base focus:border-primary outline-none transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm text-ink/50 mb-1.5">دقايق</label>
            <input
              type="number"
              min={0}
              max={59}
              value={value.minutes}
              onChange={(e) => onChange({ ...value, minutes: Math.min(59, Math.max(0, Number(e.target.value) || 0)) })}
              className="w-full rounded-xl border-2 border-ink/10 px-4 py-3 text-base focus:border-primary outline-none transition-colors"
            />
          </div>
        </div>
      )}

      <p className="text-sm text-ink/40 mt-2">لو حددت مدة، هتتقفل الدورة تلقائي بعدها.</p>
    </div>
  );
}
