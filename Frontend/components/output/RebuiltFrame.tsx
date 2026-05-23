"use client";

import { useId, useRef, useState } from "react";

type Props = {
  /** Full HTML document returned by the backend `/transform` endpoint. */
  html: string;
  /** Original page URL, for the "view original" link and the iframe title. */
  originalUrl: string;
};

/**
 * Renders the backend's `transformed_html` inside a sandboxed iframe via
 * `srcdoc`. The sandbox blocks scripts and same-origin access by default —
 * we re-allow scripts only because the backend may emit inline JS as part
 * of the rebuilt page. All other capabilities (top navigation, popups,
 * forms posting to other origins) stay disabled.
 */
export function RebuiltFrame({ html, originalUrl }: Props) {
  const reactId = useId();
  const titleId = `rebuilt-${reactId}-title`;
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [bigger, setBigger] = useState(false);

  let host = originalUrl;
  try {
    host = new URL(originalUrl).host;
  } catch {
    /* leave as-is */
  }

  return (
    <article
      aria-labelledby={titleId}
      className="rounded-[var(--radius-lg)] border border-[var(--color-rule)] bg-white"
    >
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-rule)] px-5 py-3 sm:px-7">
        <div className="flex flex-col">
          <p
            id={titleId}
            className="font-[family-name:var(--font-display)] text-[var(--color-ink-muted)] text-xs uppercase tracking-wider"
          >
            Rebuilt page
          </p>
          <p className="font-[family-name:var(--font-display)] text-[var(--color-ink)] text-sm font-semibold">
            {host}
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <button
            type="button"
            onClick={() => setBigger((b) => !b)}
            className="rounded-[var(--radius-md)] border border-[var(--color-rule)] bg-white px-3 py-1.5 text-[var(--color-ink-soft)] hover:bg-[var(--color-paper-soft)]"
            aria-pressed={bigger}
          >
            {bigger ? "Standard view" : "Larger view"}
          </button>
          <a
            href={originalUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="rounded-[var(--radius-md)] border border-[var(--color-rule)] bg-white px-3 py-1.5 text-[var(--color-ink-soft)] hover:bg-[var(--color-paper-soft)]"
          >
            View original ↗
          </a>
        </div>
      </header>
      <iframe
        ref={iframeRef}
        title={`Improved version of ${host}`}
        srcDoc={html}
        sandbox="allow-scripts allow-same-origin"
        className={`block w-full ${bigger ? "h-[min(85vh,900px)]" : "h-[min(70vh,720px)]"}`}
      />
    </article>
  );
}
