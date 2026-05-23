import Link from "next/link";
import type { ReactNode } from "react";
import { SkipLink } from "@/components/a11y/SkipLink";
import { DittoWordmark } from "@/components/identity/DittoMark";

export function Shell({ children }: { children: ReactNode }) {
  return (
    <>
      <SkipLink />
      <header className="border-b border-[var(--color-rule)] bg-[var(--color-paper)]">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-6 px-6 py-5 sm:px-8">
          <Link
            href="/"
            aria-label="Ditto — home"
            className="rounded-md text-[var(--color-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-accent-strong)] focus-visible:outline-offset-4"
          >
            <DittoWordmark />
          </Link>
          <p className="hidden text-[var(--color-ink-muted)] text-sm sm:block">
            Read the web the way that works for you.
          </p>
        </div>
      </header>
      <main id="main" className="flex-1 pb-24">
        {children}
      </main>
      <footer className="border-t border-[var(--color-rule)]">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-6 py-6 text-sm text-[var(--color-ink-muted)] sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p>
            Ditto is a research project exploring more accessible reading on
            the web.
          </p>
          <p>Built with care for everyone who uses the web differently.</p>
        </div>
      </footer>
    </>
  );
}
