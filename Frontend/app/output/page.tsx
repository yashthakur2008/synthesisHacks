"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Container } from "@/components/layout/Container";
import { StepHeader } from "@/components/layout/StepHeader";
import { StepGuard } from "@/components/flow/StepGuard";
import { useFlow } from "@/components/flow/FlowProvider";
import { RebuiltFrame } from "@/components/output/RebuiltFrame";

export default function OutputPage() {
  return (
    <StepGuard require="output">
      <OutputContent />
    </StepGuard>
  );
}

function profileBlurb(d: string) {
  switch (d) {
    case "blind":
      return "Restructured for screen readers, with image descriptions and clear landmark roles.";
    case "dyslexia":
      return "Wider spacing, shorter lines, and plainer phrasing — typography that doesn't fight you.";
    case "deaf":
      return "Captions and transcripts surfaced where they were missing.";
    case "elderly":
      return "Larger type, calmer contrast, and clearer language.";
    default:
      return "Adapted for easier, calmer reading.";
  }
}

function OutputContent() {
  const router = useRouter();
  const { state, patch, reset } = useFlow();
  const rebuilt = state.rebuilt;
  if (!rebuilt) return null;

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

  return (
    <Container size="lg">
      <StepHeader current="output" />

      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
        Here&rsquo;s your easier version.
      </h1>
      <p className="prose-measure mt-4 text-[var(--color-ink-soft)] text-lg leading-relaxed">
        {profileBlurb(rebuilt.profileApplied.disability)}
      </p>

      <div className="mt-8">
        <RebuiltFrame
          html={rebuilt.transformedHtml}
          originalUrl={rebuilt.originalUrl}
        />
      </div>

      <section
        aria-labelledby="summary"
        className="surface-soft mt-10 flex flex-col gap-3 p-6 sm:p-8"
      >
        <h2 id="summary" className="text-xl font-semibold">
          What Ditto did
        </h2>
        <dl className="grid gap-3 text-[var(--color-ink-soft)] sm:grid-cols-3">
          <div>
            <dt className="text-xs uppercase tracking-wider text-[var(--color-ink-muted)]">
              Profile sent
            </dt>
            <dd className="font-[family-name:var(--font-display)] mt-1 text-base font-semibold text-[var(--color-ink)]">
              {rebuilt.profileApplied.disability}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wider text-[var(--color-ink-muted)]">
              Age
            </dt>
            <dd className="font-[family-name:var(--font-display)] mt-1 text-base font-semibold text-[var(--color-ink)]">
              {rebuilt.profileApplied.age}
            </dd>
          </div>
          <div className="break-all">
            <dt className="text-xs uppercase tracking-wider text-[var(--color-ink-muted)]">
              Original
            </dt>
            <dd className="mt-1">
              <a
                href={rebuilt.originalUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="text-[var(--color-accent-strong)] underline-offset-4 hover:underline"
              >
                {rebuilt.originalUrl}
              </a>
            </dd>
          </div>
        </dl>
      </section>

      <div className="mt-12 flex flex-wrap items-center gap-4 border-t border-[var(--color-rule)] pt-8">
        <button type="button" onClick={tryAnother} className="btn-primary">
          Try another page
        </button>
        <Link
          href="/settings"
          className="btn-quiet underline-offset-4 hover:underline"
        >
          Adjust my needs
        </Link>
        <button
          type="button"
          onClick={() => {
            reset();
            window.location.href = "/";
          }}
          className="btn-quiet ml-auto underline-offset-4 hover:underline"
        >
          Start over
        </button>
      </div>
    </Container>
  );
}
