from fastapi import APIRouter, HTTPException
from app.models.schemas import MapsGeocodeRequest, MapsNearbyRequest, MapsResult
from app.services import maps_service

router = APIRouter(prefix="/maps", tags=["maps"])


@router.post("/geocode")
def geocode(req: MapsGeocodeRequest) -> dict:
    try:
        lat, lng = maps_service.geocode(req.address)
        return {"lat": lat, "lng": lng}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/nearby", response_model=list[MapsResult])
def nearby(req: MapsNearbyRequest) -> list[MapsResult]:
    try:
        return maps_service.nearby_search(req.location, req.keyword, req.radius_meters)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/directions")
def directions(origin: str, destination: str, mode: str = "driving") -> dict:
    try:
        return maps_service.directions(origin, destination, mode)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
