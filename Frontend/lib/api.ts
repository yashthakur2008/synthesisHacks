import type { Preferences } from "./types";

const DEFAULT_BACKEND =
  "https://accessweb-backend-513795216401.us-central1.run.app";

/**
 * Where the backend lives. Set NEXT_PUBLIC_BACKEND_URL in `.env.local` to
 * point at a different deployment (staging, your partner's local dev, etc.).
 */
export const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/$/, "") || DEFAULT_BACKEND;

/** Shape the backend expects on `/transform`. */
export type BackendProfile = {
  disability: "blind" | "dyslexia" | "deaf" | "elderly" | "none";
  age: number;
};

/** Shape the backend returns. Only `transformed_html` is guaranteed. */
export type TransformResponse = {
  transformed_html: string;
  // Anything else the backend chooses to add later (findings, summary) is
  // forwarded through but optional from the frontend's perspective.
  [extra: string]: unknown;
};

/**
 * Collapse the user's richer Preferences into the single-axis profile the
 * backend wants. Priority order picks the strongest signal — e.g. a user
 * who is both deaf and dyslexic will be sent as deaf because the backend
 * adjusts media/captions, which dyslexia adaptations can't cover.
 */
export function preferencesToProfile(prefs: Preferences | null): BackendProfile {
  const age = prefs?.age ?? (prefs?.childSafe ? 10 : 30);

  if (!prefs) return { disability: "none", age };

  // Hearing needs > anything else, since dyslexia adaptations alone can't
  // surface captions or transcripts.
  if (prefs.hearing.length > 0) return { disability: "deaf", age };

  // Blind / screen-reader users get dedicated structural adaptation.
  if (prefs.vision.includes("screen-reader")) return { disability: "blind", age };

  // Dyslexia level set above "none" → dyslexia adaptations.
  if (prefs.dyslexia !== "none") return { disability: "dyslexia", age };

  // Larger text + high contrast often correlate with elderly users.
  if (
    prefs.vision.includes("larger-text") ||
    prefs.vision.includes("high-contrast")
  ) {
    return { disability: "elderly", age };
  }

  return { disability: "none", age };
}

/** Friendly error wrapper so callers can show a message. */
export class TransformError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/**
 * Hit the backend's `/transform` endpoint with the user's URL + profile.
 * Throws `TransformError` on non-2xx so chat can render a friendly message.
 */
export async function transform(
  url: string,
  profile: BackendProfile,
  signal?: AbortSignal,
): Promise<TransformResponse> {
  let res: Response;
  try {
    res = await fetch(`${BACKEND_URL}/transform`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, profile }),
      signal,
    });
  } catch (err) {
    throw new TransformError(
      err instanceof Error ? err.message : "Could not reach the backend.",
      0,
    );
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new TransformError(
      `The backend returned ${res.status}. ${detail.slice(0, 240)}`.trim(),
      res.status,
    );
  }

  const data = (await res.json()) as TransformResponse;
  if (typeof data.transformed_html !== "string") {
    throw new TransformError(
      "The backend reply was missing `transformed_html`.",
      res.status,
    );
  }
  return data;
}
