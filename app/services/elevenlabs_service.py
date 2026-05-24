"""
ElevenLabs text-to-speech integration.
Returns raw MP3 bytes — the router streams them back as audio/mpeg.
"""
import httpx
from app.config import settings

_BASE = "https://api.elevenlabs.io/v1"


async def synthesize(text: str, voice_id: str | None = None) -> bytes:
    if not settings.elevenlabs_api_key:
        raise RuntimeError("ELEVENLABS_API_KEY is not configured")

    vid = voice_id or settings.elevenlabs_voice_id

    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.post(
            f"{_BASE}/text-to-speech/{vid}",
            headers={
                "xi-api-key": settings.elevenlabs_api_key,
                "Content-Type": "application/json",
            },
            json={
                "text": text[:5000],  # ElevenLabs hard limit per call
                "model_id": "eleven_multilingual_v2",
                "voice_settings": {
                    "stability": 0.5,
                    "similarity_boost": 0.75,
                    "style": 0.0,
                    "use_speaker_boost": True,
                },
            },
        )
        r.raise_for_status()
        return r.content
