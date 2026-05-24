import googlemaps
from app.config import settings
from app.models.schemas import MapsResult

_client: googlemaps.Client | None = None


def _maps() -> googlemaps.Client:
    global _client
    if _client is None:
        key = settings.google_maps_api_key
        if not key or key.startswith("your_"):
            raise ValueError("Google Maps API key not configured — set GOOGLE_MAPS_API_KEY in .env")
        _client = googlemaps.Client(key=key)
    return _client


def geocode(address: str) -> tuple[float, float]:
    results = _maps().geocode(address)
    if not results:
        raise ValueError(f"No geocode results for: {address}")
    loc = results[0]["geometry"]["location"]
    return loc["lat"], loc["lng"]


def nearby_search(location: str, keyword: str, radius_meters: int = 1000) -> list[MapsResult]:
    lat, lng = (float(x) for x in location.split(","))
    results = _maps().places_nearby(
        location=(lat, lng),
        keyword=keyword,
        radius=radius_meters,
    )
    places = []
    for place in results.get("results", []):
        loc = place["geometry"]["location"]
        places.append(
            MapsResult(
                name=place.get("name", ""),
                address=place.get("vicinity", ""),
                lat=loc["lat"],
                lng=loc["lng"],
                rating=place.get("rating"),
                extra={"place_id": place.get("place_id", "")},
            )
        )
    return places


def directions(origin: str, destination: str, mode: str = "driving") -> dict:
    result = _maps().directions(origin, destination, mode=mode)
    if not result:
        raise ValueError("No directions found")
    leg = result[0]["legs"][0]
    return {
        "distance": leg["distance"]["text"],
        "duration": leg["duration"]["text"],
        "steps": [s["html_instructions"] for s in leg["steps"]],
    }
