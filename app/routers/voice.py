from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from app.models.schemas import TTSRequest
from app.services import elevenlabs_service

router = APIRouter(prefix="/voice", tags=["voice"])


@router.post("/tts")
async def tts(req: TTSRequest) -> Response:
    """Returns MP3 audio for the given text. Frontend plays it via <audio>."""
    try:
        audio = await elevenlabs_service.synthesize(req.text, req.voice_id)
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    return Response(content=audio, media_type="audio/mpeg")
