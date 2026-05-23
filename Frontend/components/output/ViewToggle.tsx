"use client";

export type RebuiltView = "original" | "simplified" | "screenReader";

const views: { id: RebuiltView; label: string; sub: string }[] = [
  { id: "original", label: "Original", sub: "As it was" },
  { id: "simplified", label: "Simplified", sub: "Plain language" },
  { id: "screenReader", label: "Screen-reader optimized", sub: "Semantic structure" },
];

export function ViewToggle({
  value,
  onChange,
}: {
  value: RebuiltView;
  onChange: (next: RebuiltView) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Choose how to view the rebuilt page"
      className="flex flex-wrap gap-2"
    >
      {views.map((v) => {
        const selected = value === v.id;
        return (
          <button
            key={v.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(v.id)}
            className={`flex flex-col items-start gap-0.5 rounded-[var(--radius-md)] border px-4 py-3 text-left transition ${selected ? "border-[var(--color-accent-strong)] bg-[var(--color-accent-soft)] text-[var(--color-accent-strong)]" : "border-[var(--color-rule)] bg-white text-[var(--color-ink-soft)] hover:border-[var(--color-ink-muted)]"}`}
          >
            <span className="font-[family-name:var(--font-display)] font-semibold">
              {v.label}
            </span>
            <span className="text-xs text-[var(--color-ink-muted)]">{v.sub}</span>
          </button>
        );
      })}
    </div>
  );
}
