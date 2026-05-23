import google.generativeai as genai
from app.config import settings

genai.configure(api_key=settings.gemini_api_key)
_model = genai.GenerativeModel(settings.gemini_model)


async def generate(prompt: str, system_prompt: str | None = None) -> str:
    full_prompt = f"{system_prompt}\n\n{prompt}" if system_prompt else prompt
    response = await _model.generate_content_async(full_prompt)
    return response.text


async def generate_with_image(prompt: str, image_bytes: bytes, mime_type: str = "image/jpeg") -> str:
    image_part = {"mime_type": mime_type, "data": image_bytes}
    response = await _model.generate_content_async([prompt, image_part])
    return response.text
