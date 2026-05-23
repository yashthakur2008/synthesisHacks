import type { RebuiltBlock, RebuiltView } from "@/lib/types";

export function RebuiltFrame({
  view,
  viewKind,
}: {
  view: RebuiltView;
  viewKind: "original" | "simplified" | "screenReader";
}) {
  return (
    <article
      aria-label={`Rebuilt page — ${labelFor(viewKind)}`}
      className="rounded-[var(--radius-lg)] border border-[var(--color-rule)] bg-white"
    >
      <header className="border-b border-[var(--color-rule)] px-6 py-4 sm:px-10">
        <p className="text-[var(--color-ink-muted)] text-xs uppercase tracking-wider">
          Rebuilt page · {labelFor(viewKind)}
        </p>
      </header>
      <div
        className={`px-6 py-8 sm:px-10 sm:py-12 ${viewKind === "screenReader" ? "max-w-[60ch]" : "max-w-[68ch]"}`}
      >
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold leading-tight text-[var(--color-ink)] sm:text-3xl">
          {view.title}
        </h2>
        <div className="mt-6 flex flex-col gap-5">
          {view.body.map((block, i) => (
            <Block key={i} block={block} />
          ))}
        </div>
      </div>
    </article>
  );
}

function labelFor(k: "original" | "simplified" | "screenReader") {
  if (k === "original") return "Original";
  if (k === "simplified") return "Simplified";
  return "Screen-reader optimized";
}

function Block({ block }: { block: RebuiltBlock }) {
  if (block.kind === "heading") {
    if (block.level === 2) {
      return (
        <h3 className="font-[family-name:var(--font-display)] mt-4 text-xl font-semibold text-[var(--color-ink)]">
          {block.text}
        </h3>
      );
    }
    return (
      <h4 className="font-[family-name:var(--font-display)] mt-3 text-lg font-semibold text-[var(--color-ink)]">
        {block.text}
      </h4>
    );
  }
  if (block.kind === "paragraph") {
    return (
      <p className="text-[1.05rem] leading-[1.75] text-[var(--color-ink-soft)]">
        {block.text}
      </p>
    );
  }
  if (block.kind === "list") {
    return (
      <ul className="ml-5 flex list-disc flex-col gap-2 text-[1.05rem] leading-[1.75] text-[var(--color-ink-soft)] marker:text-[var(--color-ink-faint)]">
        {block.items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    );
  }
  if (block.kind === "callout") {
    const palette =
      block.tone === "warm"
        ? "bg-[var(--color-warm-soft)] border-[var(--color-warm)]"
        : block.tone === "grow"
          ? "bg-[var(--color-grow-soft)] border-[var(--color-grow)]"
          : "bg-[var(--color-accent-soft)] border-[var(--color-accent)]";
    return (
      <aside
        className={`rounded-[var(--radius-md)] border-l-4 px-5 py-4 ${palette}`}
      >
        <p className="text-[var(--color-ink)]">{block.text}</p>
      </aside>
    );
  }
  return (
    <figure className="rounded-[var(--radius-md)] border border-dashed border-[var(--color-rule)] p-5">
      <p className="font-[family-name:var(--font-display)] text-sm font-semibold text-[var(--color-ink)]">
        {block.label}
      </p>
      <figcaption className="mt-1 text-sm text-[var(--color-ink-muted)]">
        {block.caption}
      </figcaption>
    </figure>
  );
}
