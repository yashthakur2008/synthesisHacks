import type { Preferences } from "./types";

/**
 * Mirrors the pre-hydration script in components/a11y/PrefThemeScript.tsx.
 * Applies the user's preferences to <html> data-* attributes so CSS in
 * globals.css can retheme the entire app.
 */
export function applyPreferencesToDocument(prefs: Preferences | null): void {
  if (typeof document === "undefined") return;
  const html = document.documentElement;
  const vision = prefs?.vision ?? [];
  const set = (attr: string, value: string | null) => {
    if (value) html.setAttribute(attr, value);
    else html.removeAttribute(attr);
  };
  set("data-contrast", vision.includes("high-contrast") ? "high" : null);
  set("data-text-size", vision.includes("larger-text") ? "large" : null);
  set("data-motion", vision.includes("reduced-motion") ? "reduced" : null);
  set(
    "data-dyslexia",
    prefs?.dyslexia && prefs.dyslexia !== "none" ? prefs.dyslexia : null,
  );
}
