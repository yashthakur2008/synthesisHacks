"""
Two-step pipeline:
  Step 1 — ActionLayer scrapes the live page (handles JS-rendered SPAs).
            Falls back to httpx + BeautifulSoup for simple pages or when
            ActionLayer is unavailable.
  Step 2 — Gemini classifies content safety, then transforms the HTML into
            an accessible rebuild tailored to the user's disability profile.

Minor protection is tiered:
  safe     → transform normally
  mild     → rephrase/sanitize profanity and mild violence, keep structure
  hardcore → block entire content sections, show a safe placeholder,
             but still render the rest of the page so the user isn't locked out
"""
import json
import re
import ssl
import httpx
from bs4 import BeautifulSoup, Comment

from app.services import gemini_service, actionlayer_service, score_service
from app.models.schemas import TransformProfile

_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0 Safari/537.36"
    )
}

_SCRUB_CLASSES = re.compile(
    r"ad[-_]|cookie|popup|banner|track|analytic|newsletter|overlay|modal",
    re.I,
)

# ── HTML scraping ──────────────────────────────────────────────────────────────

def _lenient_ssl() -> ssl.SSLContext:
    ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    ctx.set_ciphers("DEFAULT:@SECLEVEL=0")
    return ctx


async def _fetch_via_beautifulsoup(url: str) -> str:
    """Fallback scraper for simple, server-rendered pages."""
    async with httpx.AsyncClient(verify=_lenient_ssl(), follow_redirects=True, timeout=15) as client:
        r = await client.get(url, headers=_HEADERS)
        r.raise_for_status()

    soup = BeautifulSoup(r.text, "html.parser")

    for tag in soup(["script", "style", "noscript", "iframe",
                     "svg", "video", "audio", "canvas", "meta", "link"]):
        tag.decompose()

    for comment in soup.find_all(string=lambda t: isinstance(t, Comment)):
        comment.extract()

    for tag in soup.find_all(True):
        style = tag.get("style", "").replace(" ", "")
        if "display:none" in style or "visibility:hidden" in style:
            tag.decompose()

    for tag in soup.find_all(True):
        classes = " ".join(tag.get("class", []))
        if _SCRUB_CLASSES.search(classes):
            tag.decompose()

    main = (
        soup.find("main")
        or soup.find("article")
        or soup.find(id="content")
        or soup.find(id="main")
        or soup.find("body")
        or soup
    )
    return str(main)[:40_000]


async def scrape(url: str) -> str:
    """
    Step 1 — try ActionLayer first (handles JS, React, Next.js pages).
    Falls back to BeautifulSoup for simple HTML.
    """
    al_content = await actionlayer_service.scrape(url)
    if al_content and len(al_content) > 200:
        return al_content[:40_000]

    return await _fetch_via_beautifulsoup(url)


# ── Content classification ─────────────────────────────────────────────────────

_CLASSIFY_PROMPT = """Analyse the following HTML content and classify its safety for a minor (under 18).

Respond with ONLY a JSON object in this exact format — no markdown, no explanation:
{{"level": "<safe|mild|hardcore>", "reason": "<one sentence>"}}

Definitions:
- safe: no adult content, appropriate for all ages
- mild: contains profanity, suggestive themes, mild violence, or alcohol/drug references
- hardcore: contains explicit sexual content, graphic violence, pornography, or extreme hate speech

Content to classify:
"""


async def classify_content(html: str) -> tuple[str, str]:
    """
    Returns (level, reason).
    level is 'safe', 'mild', or 'hardcore'.
    Fast — uses only the first 8 000 chars to keep latency low.
    """
    snippet = html[:8_000]
    try:
        raw = await gemini_service.generate(_CLASSIFY_PROMPT + snippet)
        raw = raw.strip()
        if raw.startswith("```"):
            raw = raw.split("\n", 1)[1].rsplit("```", 1)[0]
        data = json.loads(raw)
        level = data.get("level", "safe")
        reason = data.get("reason", "")
        if level not in ("safe", "mild", "hardcore"):
            level = "safe"
        return level, reason
    except Exception:
        return "safe", ""


# ── Prompt building ────────────────────────────────────────────────────────────

def _complexity_label(level: int) -> str:
    return {1: "very simple (age 6)", 2: "simple (age 10)",
             3: "plain", 4: "standard", 5: "detailed"}.get(level, "plain")


def _build_transform_prompt(
    html: str,
    profile: TransformProfile,
    content_level: str,
    compliance_note: str | None,
) -> str:
    minor = profile.age < 18
    complexity = _complexity_label(profile.complexity)

    lines = [
        "You are an accessibility transformation engine.",
        "Rewrite the HTML below into a clean, fully accessible webpage.",
        "",
        "USER PROFILE:",
        f"  disability    : {profile.disability}",
        f"  age           : {profile.age}  (minor = {minor})",
        f"  country       : {profile.country}",
        f"  reading level : {complexity}",
        f"  simplify lang : {profile.simplify_language}",
        f"  content level : {content_level}",
        "",
        "RULES — apply ALL that match:",
        "1. Use semantic HTML5 (main, nav, h1–h3, p, button, a, section, article).",
        "2. Add descriptive ARIA labels to every interactive element.",
        "3. Remove ads, popups, cookie banners, and tracking noise. Keep all real content.",
        "4. Inject this base CSS in a <style> tag inside <head>:",
        "   body { font-family: Arial, sans-serif; max-width: 900px; margin: 0 auto;",
        "          padding: 20px; line-height: 1.8; }",
        "",
        "DISABILITY-SPECIFIC RULES:",
        "• dyslexia  → font-family: OpenDyslexic, Arial; letter-spacing: 0.1em;",
        "              max 2 sentences per paragraph; left-align; background: #fffdf0.",
        "• blind     → detailed alt text on ALL images (describe what is shown);",
        "              skip-to-main-content link at very top; logical tab order;",
        "              ARIA landmarks (banner, main, navigation, contentinfo).",
        "• elderly   → minimum font-size 20px; touch targets ≥ 48 × 48 px;",
        "              high contrast (black on white); bold labels; simple vocabulary.",
        "• deaf      → mark every audio/video element with [AUDIO CONTENT];",
        "              provide a full text description of what it contains.",
        "• none      → clean up clutter, ensure comfortable readability.",
        "",
        "MINOR CONTENT RULES (apply only when minor = True):",
    ]

    if minor and content_level == "mild":
        lines += [
            "• content_level = mild: REPHRASE all profanity, suggestive text, and",
            "  mild violence — replace individual words with clean alternatives.",
            "  Do NOT remove the surrounding paragraph; just clean the wording.",
        ]
    elif minor and content_level == "hardcore":
        lines += [
            "• content_level = hardcore: The entire body text of this page contains",
            "  content that must not be shown to a minor.",
            "  Replace ALL body content with this exact block:",
            "  <main>",
            "    <div style='max-width:600px;margin:60px auto;padding:32px;",
            "         background:#fff8f8;border:2px solid #c00;border-radius:12px;",
            "         font-family:Arial,sans-serif;text-align:center;'>",
            "      <h1 style='color:#c00;font-size:2rem;'>Access Restricted</h1>",
            "      <p style='font-size:1.1rem;line-height:1.8;margin-top:16px;'>",
            "        This page contains content that isn't suitable for your age group.",
            "        Ditto has blocked it to keep you safe.",
            "      </p>",
            "      <p style='color:#555;margin-top:12px;'>",
            "        You can still visit other websites — just paste a new link.",
            "      </p>",
            "    </div>",
            "  </main>",
            "  Keep the <head>, <title>, and any navigation links intact.",
        ]

    if profile.simplify_language or profile.complexity <= 2:
        lines.append(f"• Rewrite all body text at a {complexity} reading level.")

    if compliance_note:
        lines += ["", f"COUNTRY COMPLIANCE ({profile.country}): {compliance_note}"]

    lines += [
        "",
        "Return ONLY a complete valid HTML document starting with <!DOCTYPE html>.",
        "No markdown fences, no explanation — HTML only.",
        "",
        "HTML TO TRANSFORM:",
        html,
    ]
    return "\n".join(lines)


# ── Public API ─────────────────────────────────────────────────────────────────

async def transform(
    url: str,
    profile: TransformProfile,
    compliance_note: str | None = None,
) -> tuple[str, str, dict, dict]:
    """
    Returns (transformed_html, content_level, before_score, after_score).
    Scores are dicts from score_service.score().
    """
    import asyncio

    # Step 1 — ActionLayer scrapes the live page
    html = await scrape(url)

    async def _noop_classify():
        return ("safe", "")

    # Step 2a — classify content + score original page in parallel
    classify_coro = classify_content(html) if profile.age < 18 else _noop_classify()
    (content_level, _), before_score = await asyncio.gather(
        classify_coro,
        score_service.score(html),
    )

    # Step 2b — Gemini transforms the page
    prompt = _build_transform_prompt(html, profile, content_level, compliance_note)
    result = await gemini_service.generate(prompt)
    result = result.strip()
    if result.startswith("```"):
        result = result.split("\n", 1)[1].rsplit("```", 1)[0]

    # Step 3 — score the rebuilt page
    after_score = await score_service.score(result)

    return result, content_level, before_score, after_score
