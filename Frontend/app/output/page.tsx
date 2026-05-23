"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Container } from "@/components/layout/Container";
import { StepHeader } from "@/components/layout/StepHeader";
import { StepGuard } from "@/components/flow/StepGuard";
import { useFlow } from "@/components/flow/FlowProvider";
import { ViewToggle } from "@/components/output/ViewToggle";
import { RebuiltFrame } from "@/components/output/RebuiltFrame";
import type { RebuiltView } from "@/components/output/ViewToggle";

export default function OutputPage() {
  return (
    <StepGuard require="output">
      <OutputContent />
    </StepGuard>
  );
}

function OutputContent() {
  const router = useRouter();
  const { state, patch, reset } = useFlow();
  const rebuilt = state.rebuilt;
  const [view, setView] = useState<RebuiltView>("simplified");

  function tryAnother() {
    patch({
      messages: [],
      analysis: null,
      source: null,
      intent: "",
      rebuilt: null,
    });
    router.push("/chat");
  }

  if (!rebuilt) return null;

  const grouped = {
    readability: rebuilt.improvements.filter((i) => i.category === "readability"),
    a11y: rebuilt.improvements.filter((i) => i.category === "a11y"),
    structure: rebuilt.improvements.filter((i) => i.category === "structure"),
  };

  return (
    <Container size="lg">
      <StepHeader current="output" />

      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
        Here’s your easier version.
      </h1>
      <p className="mt-4 max-w-prose text-[var(--color-ink-soft)] text-lg leading-relaxed">
        Switch between views to see how the page changes. The simplified view is
        usually a good starting point.
      </p>

      <div className="mt-10 flex flex-col gap-6">
        <ViewToggle value={view} onChange={setView} />
        <RebuiltFrame view={rebuilt.views[view]} viewKind={view} />
      </div>

      <section
        aria-labelledby="summary"
        className="surface mt-12 grid gap-8 p-6 sm:p-8 md:grid-cols-2"
      >
        <div>
          <h2 id="summary" className="text-2xl font-semibold">
            What changed
          </h2>
          <p className="mt-2 max-w-prose text-[var(--color-ink-muted)]">
            A plain-language summary of what Ditto improved.
          </p>

          <dl className="mt-6 flex flex-col gap-5">
            <SummaryGroup
              term="Readability"
              items={grouped.readability.map((i) => i.summary)}
            />
            <SummaryGroup
              term="Accessibility"
              items={grouped.a11y.map((i) => i.summary)}
            />
            <SummaryGroup
              term="Structure"
              items={grouped.structure.map((i) => i.summary)}
            />
          </dl>
        </div>

        <div className="surface-soft self-start p-6">
          <h3 className="text-lg font-semibold">Reading level</h3>
          <p className="mt-2 text-[var(--color-ink-soft)] leading-relaxed">
            {rebuilt.readabilityDelta.note}
          </p>
          <p className="mt-4 text-sm text-[var(--color-ink-muted)]">
            Before:{" "}
            <span className="font-semibold text-[var(--color-ink-soft)]">
              grade {rebuilt.readabilityDelta.before}
            </span>
            <span aria-hidden="true"> · </span>
            After:{" "}
            <span className="font-semibold text-[var(--color-grow)]">
              grade {rebuilt.readabilityDelta.after}
            </span>
          </p>
        </div>
      </section>

      <div className="mt-12 flex flex-wrap items-center gap-4 border-t border-[var(--color-rule)] pt-8">
        <button type="button" onClick={tryAnother} className="btn-primary">
          Try another page
        </button>
        <Link href="/preferences" className="btn-quiet underline-offset-4 hover:underline">
          Adjust my needs
        </Link>
        <button
          type="button"
          onClick={() => {
            reset();
            window.location.href = "/welcome";
          }}
          className="btn-quiet ml-auto underline-offset-4 hover:underline"
        >
          Start over
        </button>
      </div>
    </Container>
  );
}

function SummaryGroup({ term, items }: { term: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <dt className="font-[family-name:var(--font-display)] text-[var(--color-ink)] font-semibold">
        {term}
      </dt>
      <dd>
        <ul className="mt-2 flex flex-col gap-2">
          {items.map((s, i) => (
            <li
              key={i}
              className="border-l-2 border-[var(--color-grow)] pl-3 text-[var(--color-ink-soft)] leading-relaxed"
            >
              {s}
            </li>
          ))}
        </ul>
      </dd>
    </div>
  );
}
