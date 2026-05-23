/**
 * Pre-hydration script: reads stored preferences from localStorage and
 * applies data-* attributes to <html> BEFORE React hydrates. This avoids
 * a flash of unstyled (low-contrast / wrong-size) content for users who
 * have set strong accessibility preferences.
 */
const script = `
(function () {
  try {
    var raw = localStorage.getItem("ditto.flow.v1");
    if (!raw) return;
    var flow = JSON.parse(raw);
    var p = flow && flow.preferences;
    if (!p) return;
    var html = document.documentElement;
    var vision = Array.isArray(p.vision) ? p.vision : [];
    if (vision.indexOf("high-contrast") > -1) html.setAttribute("data-contrast", "high");
    if (vision.indexOf("larger-text") > -1) html.setAttribute("data-text-size", "large");
    if (vision.indexOf("reduced-motion") > -1) html.setAttribute("data-motion", "reduced");
    if (p.dyslexia && p.dyslexia !== "none") html.setAttribute("data-dyslexia", p.dyslexia);
  } catch (e) { /* localStorage unavailable — fall through to defaults */ }
})();
`.trim();

export function PrefThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
