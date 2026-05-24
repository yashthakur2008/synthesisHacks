import traceback
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.models.schemas import (
    TransformRequest,
    TransformResponse,
    SaveProfileRequest,
)
from app.services import transform_service, compliance_service, firebase_service, score_service

router = APIRouter(tags=["transform"])


# ── /transform ─────────────────────────────────────────────────────────────────

@router.post("/transform", response_model=TransformResponse)
async def transform(req: TransformRequest) -> TransformResponse:
    profile = req.profile
    compliance_note = compliance_service.get_compliance_note(profile.country)

    try:
        html, content_level, before_score, after_score = await transform_service.transform(
            req.url, profile, compliance_note
        )
    except Exception as e:
        detail = f"{type(e).__name__}: {e}\n{traceback.format_exc()}"
        print(detail)
        raise HTTPException(status_code=500, detail=f"{type(e).__name__}: {e}" or "Unknown error")

    # Fire-and-forget analytics log — never let this kill the response
    try:
        import time
        await firebase_service.set_document(
            "transform_logs",
            f"{int(time.time())}_{abs(hash(req.url)) % 99999}",
            {
                "url": req.url,
                "disability": profile.disability,
                "age": profile.age,
                "country": profile.country,
                "content_level": content_level,
                "success": True,
            },
        )
    except Exception:
        pass

    return TransformResponse(
        transformed_html=html,
        original_url=req.url,
        profile=profile,
        compliance_note=compliance_note,
        content_level=content_level,
        before_score=before_score,
        after_score=after_score,
    )


# ── /classify ─────────────────────────────────────────────────────────────────

class ClassifyRequest(BaseModel):
    url: str
    age: int = 30


class ClassifyResponse(BaseModel):
    level: str   # safe | mild | hardcore
    reason: str
    blocked: bool


@router.post("/classify", response_model=ClassifyResponse)
async def classify(req: ClassifyRequest) -> ClassifyResponse:
    """
    Quick pre-flight check — tells the extension whether a page is safe for
    this user's age BEFORE running the full transform. Useful for the extension
    to show a warning badge.
    """
    if req.age >= 18:
        return ClassifyResponse(level="safe", reason="User is an adult.", blocked=False)

    try:
        html = await transform_service.scrape(req.url)
        level, reason = await transform_service.classify_content(html)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    return ClassifyResponse(
        level=level,
        reason=reason,
        blocked=(level == "hardcore"),
    )


# ── /score ────────────────────────────────────────────────────────────────────

class ScoreRequest(BaseModel):
    url: str


@router.post("/score")
async def score_url(req: ScoreRequest) -> dict:
    """Score a URL's accessibility without transforming it."""
    try:
        html = await transform_service.scrape(req.url)
        return await score_service.score(html)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── /save-profile  /get-profile ────────────────────────────────────────────────

@router.post("/save-profile")
async def save_profile(req: SaveProfileRequest) -> dict:
    await firebase_service.set_document("users", req.uid, req.profile)
    return {"status": "saved"}


@router.get("/get-profile/{uid}")
async def get_profile(uid: str) -> dict:
    doc = await firebase_service.get_document("users", uid)
    return doc or {}
