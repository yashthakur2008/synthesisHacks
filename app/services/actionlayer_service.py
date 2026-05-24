"""
ActionLayer integration — two responsibilities:

1. scrape(url)         → use ActionLayer as a real browser to extract clean page content
                          (handles JS-rendered SPAs that BeautifulSoup misses)
2. execute(url, ...)   → run an agentic action on behalf of the user
"""
import httpx
from app.config import settings
from app.models.schemas import TransformProfile

_BASE = "https://api.actionlayer.io/v1"


def _headers() -> dict:
    return {
        "Authorization": f"Bearer {settings.actionlayer_key}",
        "Content-Type": "application/json",
    }


async def scrape(url: str) -> str | None:
    """
    Ask ActionLayer to navigate to `url` and return the rendered page content.
    Falls back to None so the caller can fall back to BeautifulSoup.
    """
    if not settings.actionlayer_key:
        return None

    try:
        async with httpx.AsyncClient(timeout=45) as client:
            r = await client.post(
                f"{_BASE}/execute",
                headers=_headers(),
                json={
                    "url": url,
                    "instruction": (
                        "Navigate to this page. "
                        "Extract ALL visible text content, preserving headings, "
                        "paragraphs, links, buttons, and form labels. "
                        "Remove navigation menus, cookie banners, ads, and footers. "
                        "Return the cleaned content as plain HTML — no scripts, no styles."
                    ),
                    "output_format": "html",
                },
            )
            if r.status_code == 200:
                data = r.json()
                # ActionLayer may return content under different keys
                return (
                    data.get("content")
                    or data.get("html")
                    or data.get("result", {}).get("content")
                )
    except Exception:
        pass

    return None


async def execute(url: str, instruction: str, profile: TransformProfile) -> dict:
    """Perform an agentic action on behalf of the user (form fills, navigation, etc.)."""
    if not settings.actionlayer_key:
        raise RuntimeError("ACTIONLAYER_KEY is not configured")

    async with httpx.AsyncClient(timeout=45) as client:
        r = await client.post(
            f"{_BASE}/execute",
            headers=_headers(),
            json={
                "url": url,
                "instruction": (
                    f"User has {profile.disability} accessibility needs "
                    f"(age {profile.age}, country {profile.country}). "
                    f"Task: {instruction}"
                ),
                "context": {"profile": profile.model_dump()},
            },
        )
        r.raise_for_status()
        return r.json()
