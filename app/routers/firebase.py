from fastapi import APIRouter, HTTPException
from app.services import firebase_service
from typing import Any

router = APIRouter(prefix="/db", tags=["firebase"])


@router.put("/{collection}/{doc_id}")
async def upsert(collection: str, doc_id: str, data: dict[str, Any]) -> dict:
    await firebase_service.set_document(collection, doc_id, data)
    return {"ok": True}


@router.get("/{collection}/{doc_id}")
async def get(collection: str, doc_id: str) -> dict[str, Any]:
    doc = await firebase_service.get_document(collection, doc_id)
    if doc is None:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc


@router.get("/{collection}")
async def list_docs(collection: str, limit: int = 20) -> list[dict[str, Any]]:
    return await firebase_service.list_collection(collection, limit)
