from fastapi import APIRouter, HTTPException
from app.models.schemas import GeminiRequest, GeminiResponse
from app.services import gemini_service

router = APIRouter(prefix="/gemini", tags=["gemini"])


@router.post("/generate", response_model=GeminiResponse)
async def generate(req: GeminiRequest) -> GeminiResponse:
    try:
        text = await gemini_service.generate(req.prompt, req.system_prompt)
        return GeminiResponse(text=text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
