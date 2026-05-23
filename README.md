# Google Hackathon — Python API Prebuild

FastAPI backend wired to Gemini, Firebase/Firestore, Google Maps, and Cloud Run.

## Quick start (local)

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

cp .env.example .env
# fill in your keys in .env
# download your Firebase service account JSON → service-account.json

uvicorn app.main:app --reload --port 8080
```

Interactive docs → http://localhost:8080/docs

## Project layout

```
app/
  main.py              FastAPI entry point + CORS
  config.py            Pydantic settings (reads .env)
  routers/
    health.py          GET /health
    gemini.py          POST /gemini/generate
    maps.py            POST /maps/geocode  /maps/nearby  GET /maps/directions
    firebase.py        CRUD /db/{collection}/{doc_id}
  services/
    gemini_service.py  Gemini async wrapper
    firebase_service.py Firestore async helpers
    maps_service.py    Maps / Places / Directions helpers
  models/schemas.py    Pydantic request/response models
Dockerfile             Cloud Run–ready container
cloudbuild.yaml        CI/CD trigger via Cloud Build
deploy.sh              One-shot manual deploy script
```

## APIs at a glance

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Liveness check |
| POST | `/gemini/generate` | Text generation via Gemini |
| POST | `/maps/geocode` | Address → lat/lng |
| POST | `/maps/nearby` | Places nearby a coordinate |
| GET | `/maps/directions` | Driving/walking directions |
| PUT | `/db/{col}/{id}` | Upsert Firestore document |
| GET | `/db/{col}/{id}` | Read Firestore document |
| GET | `/db/{col}` | List Firestore collection |

## Deploy to Cloud Run

```bash
# Manual (one-shot)
./deploy.sh your-gcp-project-id

# Via Cloud Build trigger (commit-driven CI/CD)
# Set up a trigger in GCP Console pointing to this repo + cloudbuild.yaml
```

Store secrets in **Secret Manager** and reference them via `--set-secrets` in `deploy.sh`.
