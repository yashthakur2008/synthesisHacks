"""
Ditto Accessibility Backend
Gemini 2.5 Flash + ElevenLabs + ActionLayer + BeautifulSoup
"""
import json
import os
import time
import traceback
import requests
import httpx
from flask import Flask, request, jsonify, Response
from flask_cors import CORS
from bs4 import BeautifulSoup, Comment
import google.generativeai as genai
import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

app = Flask(__name__)
CORS(app)

# ── Keys ───────────────────────────────────────────────────────────────────────
GEMINI_API_KEY    = os.getenv("GEMINI_API_KEY",    "AIzaSyCeMqVEuzDn5DOLmojHi1qgLxSwBuI3fWQ")
ACTIONLAYER_KEY   = os.getenv("ACTIONLAYER_KEY",   "ak_p4SlYFTug3Os3rUWembJZw")
ELEVENLABS_KEY    = os.getenv("ELEVENLABS_KEY",    "727ee5b70a86428c10686040341468abf009591d6760cb3e3543899a61071282")
ELEVENLABS_VOICE  = os.getenv("ELEVENLABS_VOICE",  "21m00Tcm4TlvDq8ikWAM")  # Rachel
PROJECT_ID        = os.getenv("FIREBASE_PROJECT_ID","synthesis-hack26svl-106")

genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel("gemini-2.5-flash")

# Lazy Firebase — never crash startup over missing credentials
_db = None
def get_db():
    global _db
    if _db is None:
        try:
            from google.cloud import firestore
            _db = firestore.Client(project=PROJECT_ID)
        except Exception:
            pass
    return _db


# ══════════════════════════════════════════════════════════════════════════════
# SCRAPING
# ══════════════════════════════════════════════════════════════════════════════

_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
    "Mozilla/5.0 (X11; Linux x86_64; rv:125.0) Gecko/20100101 Firefox/125.0",
]

def _scrape_requests(url: str) -> str | None:
    """Fast path — plain HTTP for server-rendered pages."""
    for agent in _AGENTS:
        try:
            r = requests.get(
                url, timeout=15, verify=False,
                headers={
                    "User-Agent": agent,
                    "Accept": "text/html,application/xhtml+xml,*/*;q=0.9",
                    "Accept-Language": "en-US,en;q=0.9",
                    "Accept-Encoding": "gzip, deflate",
                    "Cache-Control": "no-cache",
                }
            )
            if r.status_code == 200 and len(r.text) > 500:
                return r.text
        except Exception:
            continue
    return None


def _scrape_actionlayer(url: str) -> str | None:
    """
    ActionLayer cloud browser — handles JS-rendered SPAs, React, Next.js sites.
    Returns the fully rendered HTML or None on failure.
    """
    if not ACTIONLAYER_KEY:
        return None
    try:
        r = httpx.post(
            "https://api.actionlayer.io/v1/execute",
            headers={
                "Authorization": f"Bearer {ACTIONLAYER_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "url": url,
                "instruction": (
                    "Navigate to this URL and wait for the page to fully load. "
                    "Extract all visible text content as HTML, preserving headings, "
                    "paragraphs, links, lists, buttons, images (keep src and alt), "
                    "and form elements. Remove cookie banners, ads, and popups. "
                    "Return clean semantic HTML."
                ),
                "output_format": "html",
                "wait_for": "networkidle",
            },
            timeout=45,
        )
        if r.status_code == 200:
            try:
                data = r.json()
            except Exception:
                data = None
            if data and isinstance(data, dict):
                result = data.get("result") or {}
                if not isinstance(result, dict):
                    result = {}
                content = (
                    data.get("content")
                    or data.get("html")
                    or data.get("output")
                    or result.get("content")
                    or result.get("html")
                    or result.get("output")
                )
                if content and isinstance(content, str) and len(content) > 200:
                    return content
    except Exception:
        pass
    return None


def extract_meaningful_html(soup: BeautifulSoup) -> str:
    # Remove noise
    for tag in soup(["script", "style", "noscript", "iframe",
                     "canvas", "meta", "link"]):
        tag.decompose()

    for comment in soup.find_all(string=lambda t: isinstance(t, Comment)):
        comment.extract()

    for tag in list(soup.find_all(True)):
        if not getattr(tag, "attrs", None):
            continue
        style = (tag.attrs.get("style") or "").replace(" ", "")
        if "display:none" in style or "visibility:hidden" in style:
            tag.decompose()

    for tag in list(soup.find_all(True)):
        if not getattr(tag, "attrs", None):
            continue
        classes = " ".join(tag.attrs.get("class") or [])
        if any(x in classes.lower() for x in
               ["ad-", "cookie", "popup", "banner", "tracking",
                "analytics", "newsletter", "overlay", "modal", "gdpr"]):
            tag.decompose()

    main = (soup.find("main") or soup.find("article") or
            soup.find(id="content") or soup.find(id="main") or
            soup.find("body") or soup)
    return str(main)[:50_000]


def scrape(url: str) -> str:
    """
    Multi-strategy scraper:
    1. Try fast requests (3 user-agents)
    2. Fall back to ActionLayer cloud browser for JS-heavy sites
    Returns cleaned HTML content.
    """
    raw = _scrape_requests(url)

    if raw and len(raw) > 500:
        soup = BeautifulSoup(raw, "html.parser")
        content = extract_meaningful_html(soup)
        # Only escalate to ActionLayer if we got almost no real text (JS shell)
        text_only = BeautifulSoup(content, "html.parser").get_text(separator=" ", strip=True)
        if len(text_only) >= 200:
            return content  # plain HTTP worked fine — use it
        # Looks like a JS-only shell, try ActionLayer
        al = _scrape_actionlayer(url)
        if al:
            soup2 = BeautifulSoup(al, "html.parser")
            return extract_meaningful_html(soup2)
        return content  # return what we have

    # Plain HTTP got nothing — try ActionLayer
    al = _scrape_actionlayer(url)
    if al:
        soup = BeautifulSoup(al, "html.parser")
        return extract_meaningful_html(soup)

    # Last resort — use whatever requests got
    if raw:
        soup = BeautifulSoup(raw, "html.parser")
        return extract_meaningful_html(soup)

    raise RuntimeError(f"Could not fetch {url} — the site may block automated access.")


# ══════════════════════════════════════════════════════════════════════════════
# ACCESSIBILITY SCORING
# ══════════════════════════════════════════════════════════════════════════════

_SCORE_PROMPT = """You are a WCAG 2.1 accessibility auditor. Score this HTML page 0-100 across five axes (20 pts each):
1. Images & Media      — meaningful alt text, image descriptions, captions
2. Semantic Structure  — heading levels, landmarks (main/nav/footer), lists
3. Readability         — font size ≥16px, line height ≥1.5, contrast ratio
4. Interactive Elements — button/link labels, focus states, ARIA roles
5. Content Clarity     — plain language, logical order, no jargon

Return ONLY valid JSON — no markdown, no prose:
{"total":<0-100>,"images":{"score":<0-20>,"note":"<sentence>"},"structure":{"score":<0-20>,"note":"<sentence>"},"readability":{"score":<0-20>,"note":"<sentence>"},"interactive":{"score":<0-20>,"note":"<sentence>"},"clarity":{"score":<0-20>,"note":"<sentence>"}}

HTML:
"""

def score_html(html: str) -> dict:
    try:
        resp = model.generate_content(_SCORE_PROMPT + html[:10_000])
        raw = resp.text.strip().lstrip("```json").lstrip("```").rstrip("```")
        data = json.loads(raw)
        for axis in ("images", "structure", "readability", "interactive", "clarity"):
            data.setdefault(axis, {"score": 10, "note": "Could not evaluate."})
            data[axis]["score"] = max(0, min(20, int(data[axis]["score"])))
        data["total"] = sum(data[ax]["score"] for ax in
                            ("images", "structure", "readability", "interactive", "clarity"))
        return data
    except Exception:
        return {
            "total": 50,
            "images":      {"score": 10, "note": "Could not evaluate."},
            "structure":   {"score": 10, "note": "Could not evaluate."},
            "readability": {"score": 10, "note": "Could not evaluate."},
            "interactive": {"score": 10, "note": "Could not evaluate."},
            "clarity":     {"score": 10, "note": "Could not evaluate."},
        }


# ══════════════════════════════════════════════════════════════════════════════
# TRANSFORM PROMPT — full disability support + image descriptions
# ══════════════════════════════════════════════════════════════════════════════

_DISABILITY_RULES = {
    "blind": """
BLIND / SCREEN-READER:
- Add a skip-to-main link at top: <a href="#main" class="skip">Skip to main content</a>
- ARIA landmarks on every section: role="banner" role="main" role="navigation" role="contentinfo"
- Every <img>: write a 1–2 sentence alt describing exactly what is shown (colour, people, action, objects, text in image)
- Replace <img> tags with: <figure><img src="..." alt="[your description]"><figcaption>[same description]</figcaption></figure>
- All buttons/links: aria-label describing the action, not just "click here"
- Logical tab order; add tabindex where flow breaks
- Set data-ditto-autoplay="true" on <body> so voice auto-starts""",

    "dyslexia": """
DYSLEXIA:
- Add to <head>: <link href="https://fonts.cdnfonts.com/css/opendyslexic" rel="stylesheet">
- body CSS: font-family:'OpenDyslexic',Arial,sans-serif; letter-spacing:0.12em; word-spacing:0.16em; line-height:2; background:#fffdf0; text-align:left
- Max 2 sentences per paragraph — split longer ones, no exceptions
- Replace ALL italic text with bold
- Wide margins: max-width:700px; padding:32px
- Extra paragraph spacing: p { margin-bottom:1.6em }
- Every image: add a <p class="img-desc"> tag below it describing what the image shows""",

    "adhd": """
ADHD:
- Break ALL body text into bullet points or numbered steps wherever possible
- Max 3 sentences per paragraph, then create a new paragraph with a subheading
- Bold the first 3–5 words of every paragraph
- Remove every sidebar, related article block, and off-topic widget
- background:#f9fafb; focus ring: *:focus{outline:3px solid #f59e0b!important}
- Add <hr> dividers between every major section
- font-size:17px; line-height:1.8
- Every image: describe it in a <p> below: "Image shows: [description]"
- Headings must be short, specific, and action-oriented""",

    "low_vision": """
LOW VISION:
- font-size minimum 22px everywhere; headings minimum 30px; use rem units
- Colour contrast: black #000 on white #fff only (WCAG AAA)
- line-height:2; letter-spacing:0.05em
- All links: always underlined, colour #0000EE visited #551A8B
- Buttons: min 56×56px touch target; font-size:18px; font-weight:bold
- Visible focus ring: *:focus{outline:4px solid #005fcc!important;outline-offset:2px}
- Every image: write a detailed alt + <figcaption> describing colours, shapes, text in the image
- No colour-only info — always pair with text or icons""",

    "tremor": """
MOTOR / TREMOR:
- ALL clickable elements: min 64×64px; padding:20px 28px minimum
- Space between any two interactive elements: margin:20px
- No hover-only interactions — every action must work on click/tap/keyboard
- Replace all small checkboxes with large CSS toggles (height:40px width:72px)
- Form fields: height:60px; font-size:20px; border:2px solid #333
- Disable any auto-scrolling, carousels, or timed UI
- Sticky header with large nav buttons — never hide on scroll
- Every image: add a <p> below describing what it shows so tremor users can skip misclicks""",

    "deaf": """
DEAF / HARD OF HEARING:
- Find every <video> and <audio> element — add a visible label above: <p class="media-label">🔇 Audio/Video content:</p>
- Below every media element add a <details><summary>Read transcript / description</summary>[full written description of what the media contains]</details>
- Add note near YouTube embeds: <p>📝 Transcript available — click ⋮ in the player and select 'Open transcript'</p>
- Every image: write alt text + <figcaption> describing what is shown visually
- Never convey information through sound alone — pair all audio cues with visible text""",

    "elderly": """
ELDERLY:
- font-size: 22px body; 28px headings; use system-ui or Arial (no decorative fonts)
- High contrast: #111 on #fff; never use grey text below #555
- All buttons: min 56×56px; font-weight:bold; clear verb labels ("Download PDF", "Call us")
- line-height:2; generous padding (24px section padding)
- Rewrite ALL complex sentences to Grade 6 reading level — short subject-verb-object
- Spell out abbreviations: NHS → National Health Service
- Large tappable phone numbers: <a href="tel:..." style="font-size:24px;font-weight:bold">
- Every image: write a clear description in a <p> below it""",

    "none": """
GENERAL CLEANUP:
- Remove ads, popups, cookie notices, subscription prompts
- font-size:17px; line-height:1.7; max-width:860px; margin:0 auto; padding:24px
- Every image: ensure alt text exists; add a short <figcaption> if the image is content-relevant""",
}

_READ_ALOUD_BAR = """
<style>
#ditto-bar{position:fixed;bottom:0;left:0;right:0;z-index:99999;display:flex;align-items:center;gap:10px;background:#1a1a2e;color:#fff;padding:10px 18px;font-family:Arial,sans-serif;font-size:14px;box-shadow:0 -2px 10px rgba(0,0,0,.5)}
#ditto-bar button{padding:8px 16px;border:none;border-radius:6px;font-size:14px;cursor:pointer;font-weight:700}
#ditto-play{background:#4ade80;color:#000}#ditto-pause{background:#facc15;color:#000;display:none}
#ditto-stop{background:#f87171;color:#000}#ditto-spd{background:#60a5fa;color:#000}
#ditto-lbl{flex:1;font-size:12px;opacity:.75;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
</style>
<div id="ditto-bar" role="region" aria-label="Ditto Read Aloud">
  <button id="ditto-play" aria-label="Start reading page aloud">🔊 Read Aloud</button>
  <button id="ditto-pause" aria-label="Pause reading">⏸ Pause</button>
  <button id="ditto-stop" aria-label="Stop reading">⏹ Stop</button>
  <button id="ditto-spd" aria-label="Change speed">1×</button>
  <span id="ditto-lbl">Ditto · Accessible reading assistant</span>
</div>
<script>
(function(){
  var synth=window.speechSynthesis,utt=null,speeds=[0.8,1,1.25,1.5,2],si=1;
  var play=document.getElementById('ditto-play'),
      pause=document.getElementById('ditto-pause'),
      stop=document.getElementById('ditto-stop'),
      spd=document.getElementById('ditto-spd'),
      lbl=document.getElementById('ditto-lbl');
  if(!synth){document.getElementById('ditto-bar').style.display='none';return;}
  function getText(){
    var main=document.querySelector('main')||document.querySelector('article')||document.body;
    var w=document.createTreeWalker(main,NodeFilter.SHOW_TEXT,{acceptNode:function(n){
      return n.parentElement.closest('#ditto-bar')?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT;
    }});
    var parts=[],n;
    while((n=w.nextNode())){var t=n.textContent.trim();if(t.length>2)parts.push(t);}
    return parts.join(' ');
  }
  function speak(){
    synth.cancel();
    utt=new SpeechSynthesisUtterance(getText());
    utt.rate=speeds[si];utt.lang=document.documentElement.lang||'en-US';
    var voices=synth.getVoices();
    var v=voices.find(function(x){return x.name.includes('Samantha')||x.name.includes('Google US')||x.name.includes('Karen');});
    if(v)utt.voice=v;
    utt.onstart=function(){play.style.display='none';pause.style.display='';lbl.textContent='Reading…';};
    utt.onend=utt.onerror=function(){play.style.display='';pause.style.display='none';lbl.textContent='Ditto · Accessible reading assistant';};
    synth.speak(utt);
  }
  play.onclick=speak;
  pause.onclick=function(){if(synth.paused){synth.resume();pause.textContent='⏸ Pause';}else{synth.pause();pause.textContent='▶ Resume';}};
  stop.onclick=function(){synth.cancel();play.style.display='';pause.style.display='none';};
  spd.onclick=function(){si=(si+1)%speeds.length;spd.textContent=speeds[si]+'×';if(synth.speaking&&!synth.paused)speak();};
  if(document.body&&document.body.dataset.dittoAutoplay==='true'){
    setTimeout(function(){synth.getVoices();setTimeout(speak,600);},200);
  }
})();
</script>
"""


def build_transform_prompt(html: str, disability: str, minor: bool) -> str:
    rules = _DISABILITY_RULES.get(disability, _DISABILITY_RULES["none"])

    minor_rules = ""
    if minor:
        minor_rules = """
MINOR PROTECTION (age < 18):
- Scan all body text for: profanity, sexual content, graphic violence, drug glorification
- Replace any such paragraph/section entirely with:
  <div style="background:#fff0f0;border:2px solid #c00;border-radius:8px;padding:16px;margin:16px 0">
    <strong>⚠ Content not shown</strong> — this section contains material not suitable for your age group.
  </div>
- Do NOT remove navigation, headers, or unrelated content — only the specific offending sections."""

    return f"""You are Ditto, an advanced AI accessibility transformation engine.

Your job: take the raw HTML below and rewrite it into a clean, fully accessible webpage
tailored precisely to this user's needs. Be thorough — do not cut corners.

═══ USER PROFILE ═══
Disability : {disability}
Minor (<18): {minor}

═══ UNIVERSAL RULES (always apply) ═══
1. Output a COMPLETE, valid HTML document starting with <!DOCTYPE html>
2. Inject base CSS in <head>:
   body{{font-family:Arial,sans-serif;max-width:900px;margin:0 auto;padding:24px;line-height:1.8}}
   img{{max-width:100%;height:auto}}
   .skip{{position:absolute;top:-40px;left:0;background:#000;color:#fff;padding:8px;z-index:100}}
   .skip:focus{{top:0}}
3. Remove ALL ads, cookie banners, newsletter pop-ups, GDPR notices, tracking scripts
4. Keep ALL real content: headings, paragraphs, links, tables, forms, images
5. IMAGES — for every <img> tag you encounter:
   a. Write a detailed, vivid description of what the image likely shows based on
      its src URL, alt text, surrounding text, and page context
   b. Set that as the alt attribute (1–2 sentences)
   c. Add a <figcaption> or <p class="img-desc"> immediately after the image
      with the same description, so sighted AND non-sighted users both get it
   d. Example: if src contains "team-photo", write "Group photo of the company team,
      approximately 12 people smiling in front of a modern office building."
6. For charts, graphs, infographics: add a <p> summary of what the data shows

═══ DISABILITY-SPECIFIC RULES ═══
{rules}

{minor_rules}

═══ OUTPUT ═══
Return ONLY the complete HTML document. No markdown fences. No explanation. No preamble.
Start your response with: <!DOCTYPE html>

HTML TO TRANSFORM:
{html}"""


def inject_voice_bar(html: str) -> str:
    if "</body>" in html:
        return html.replace("</body>", _READ_ALOUD_BAR + "\n</body>", 1)
    return html + _READ_ALOUD_BAR


# ══════════════════════════════════════════════════════════════════════════════
# ELEVENLABS TTS
# ══════════════════════════════════════════════════════════════════════════════

def elevenlabs_tts(text: str) -> bytes:
    r = httpx.post(
        f"https://api.elevenlabs.io/v1/text-to-speech/{ELEVENLABS_VOICE}",
        headers={
            "xi-api-key": ELEVENLABS_KEY,
            "Content-Type": "application/json",
        },
        json={
            "text": text[:4000],
            "model_id": "eleven_turbo_v2",
            "voice_settings": {"stability": 0.45, "similarity_boost": 0.80},
        },
        timeout=30,
    )
    r.raise_for_status()
    return r.content


# ══════════════════════════════════════════════════════════════════════════════
# GEMINI CHAT
# ══════════════════════════════════════════════════════════════════════════════

_CHAT_SYSTEM = """You are Ditto, a warm and clever AI accessibility companion built to help people
access the web on their own terms. You rebuild websites to match each person's unique needs —
whether they're blind, deaf, have dyslexia, ADHD, tremors, low vision, or are elderly.

Personality: friendly, concise, never condescending. You speak in short sentences.
You don't just answer — you show you understand the user's situation.

When a user shares a URL, tell them you're rebuilding it.
When they share accessibility challenges, empathize briefly then pivot to action.
When they ask general questions, answer helpfully and tie back to how Ditto can help.
Keep responses under 3 sentences unless the user asks for detail.
Never say "As an AI" or "I'm just a language model"."""


def gemini_chat(messages: list[dict], preferences: dict) -> str:
    disability  = preferences.get("disability", "none")
    name        = preferences.get("name", "")
    age         = preferences.get("age", "")

    context = _CHAT_SYSTEM
    if disability != "none":
        context += f"\nUser has {disability} accessibility needs."
    if name:
        context += f"\nUser's name is {name}."
    if age:
        context += f"\nUser is {age} years old."

    # Build conversation string for Gemini
    convo = context + "\n\n---\n"
    for m in messages[-12:]:  # last 12 messages for context
        role = "User" if m.get("role") == "user" else "Ditto"
        convo += f"{role}: {m.get('text', '')}\n"
    convo += "Ditto:"

    resp = model.generate_content(
        convo,
        generation_config={"max_output_tokens": 200, "temperature": 0.7},
    )
    return resp.text.strip()


# ══════════════════════════════════════════════════════════════════════════════
# ROUTES
# ══════════════════════════════════════════════════════════════════════════════

@app.route("/transform", methods=["POST"])
def transform():
    data       = request.json or {}
    url        = data.get("url")
    profile    = data.get("profile", {})
    disability = profile.get("disability", "none")
    minor      = profile.get("age", 99) < 18

    if not url:
        return jsonify({"error": "No URL provided"}), 400

    try:
        html = scrape(url)
    except Exception as e:
        return jsonify({"error": f"Could not fetch page: {e}"}), 400

    try:
        before_score = score_html(html)

        prompt      = build_transform_prompt(html, disability, minor)
        response    = model.generate_content(
            prompt,
            generation_config={"max_output_tokens": 8192, "temperature": 0.2},
        )
        transformed = response.text.strip()
        if transformed.startswith("```"):
            transformed = transformed.split("\n", 1)[1].rsplit("```", 1)[0].strip()

        transformed = inject_voice_bar(transformed)
        after_score = score_html(transformed)

        try:
            db = get_db()
            if db:
                db.collection("transform_logs").add({
                    "url": url, "disability": disability, "minor": minor,
                    "before": before_score["total"], "after": after_score["total"],
                    "ts": int(time.time()),
                })
        except Exception:
            pass

        return jsonify({
            "transformed_html": transformed,
            "profile": profile,
            "original_url": url,
            "before_score": before_score,
            "after_score":  after_score,
            "content_level": "safe",
        })
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": f"Transform failed: {e}"}), 500


@app.route("/chat", methods=["POST"])
def chat():
    """
    Gemini-powered chat. Frontend sends conversation history + preferences.
    Returns Ditto's next reply as text + optional ElevenLabs audio URL.
    """
    data        = request.json or {}
    messages    = data.get("messages", [])
    preferences = data.get("preferences", {})

    if not messages:
        return jsonify({"error": "No messages provided"}), 400

    try:
        reply = gemini_chat(messages, preferences)
        return jsonify({"reply": reply})
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.route("/voice/tts", methods=["POST"])
def tts():
    """
    ElevenLabs TTS. Body: {"text": "..."}.
    Returns MP3 audio stream.
    """
    data = request.json or {}
    text = data.get("text", "").strip()

    if not text:
        return jsonify({"error": "No text provided"}), 400

    try:
        audio = elevenlabs_tts(text)
        return Response(audio, mimetype="audio/mpeg",
                        headers={"Content-Disposition": "inline; filename=ditto.mp3"})
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": f"TTS failed: {e}"}), 500


@app.route("/classify", methods=["POST"])
def classify():
    data = request.json or {}
    url  = data.get("url", "")
    age  = data.get("age", 30)

    if age >= 18:
        return jsonify({"level": "safe", "reason": "Adult user.", "blocked": False})

    try:
        html           = scrape(url)
        prompt         = f"Classify this page's content safety for a minor (under 18).\nRespond ONLY with JSON: {{\"level\":\"safe|mild|hardcore\",\"reason\":\"one sentence\"}}\n\n{html[:6000]}"
        resp           = model.generate_content(prompt)
        raw            = resp.text.strip().lstrip("```json").lstrip("```").rstrip("```")
        d              = json.loads(raw)
        level          = d.get("level", "safe")
        return jsonify({"level": level, "reason": d.get("reason", ""), "blocked": level == "hardcore"})
    except Exception as e:
        return jsonify({"level": "safe", "reason": str(e), "blocked": False})


@app.route("/save-profile", methods=["POST"])
def save_profile():
    data    = request.json or {}
    uid     = data.get("uid")
    profile = data.get("profile")
    if not uid or not profile:
        return jsonify({"error": "Missing uid or profile"}), 400
    db = get_db()
    if db:
        db.collection("users").document(uid).set(profile)
    return jsonify({"status": "saved"})


@app.route("/get-profile/<uid>", methods=["GET"])
def get_profile(uid):
    db = get_db()
    if not db:
        return jsonify({})
    doc = db.collection("users").document(uid).get()
    return jsonify(doc.to_dict() if doc.exists else {})


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "model": "gemini-2.5-flash", "voice": "elevenlabs"})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080, debug=False)
