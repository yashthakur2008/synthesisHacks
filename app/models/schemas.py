from pydantic import BaseModel
from typing import Any


class GeminiRequest(BaseModel):
    prompt: str
    system_prompt: str | None = None


class GeminiResponse(BaseModel):
    text: str


class MapsGeocodeRequest(BaseModel):
    address: str


class MapsNearbyRequest(BaseModel):
    location: str   # "lat,lng"
    keyword: str
    radius_meters: int = 1000


class MapsResult(BaseModel):
    name: str
    address: str
    lat: float
    lng: float
    rating: float | None = None
    extra: dict[str, Any] = {}
