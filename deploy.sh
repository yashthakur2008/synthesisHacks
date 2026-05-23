#!/usr/bin/env bash
# Quick one-shot deploy to Cloud Run (no Cloud Build trigger needed)
set -euo pipefail

PROJECT_ID="${1:-$(gcloud config get-value project)}"
REGION="us-central1"
SERVICE="synthesishacks"
IMAGE="gcr.io/${PROJECT_ID}/${SERVICE}"

echo "Building image..."
docker build -t "${IMAGE}" .

echo "Pushing to Container Registry..."
docker push "${IMAGE}"

echo "Deploying to Cloud Run..."
gcloud run deploy "${SERVICE}" \
  --image="${IMAGE}" \
  --region="${REGION}" \
  --platform=managed \
  --allow-unauthenticated \
  --project="${PROJECT_ID}" \
  --set-secrets="GEMINI_API_KEY=GEMINI_API_KEY:latest,GOOGLE_MAPS_API_KEY=GOOGLE_MAPS_API_KEY:latest" \
  --set-env-vars="FIREBASE_PROJECT_ID=${PROJECT_ID}"

echo "Done! Service URL:"
gcloud run services describe "${SERVICE}" --region="${REGION}" --project="${PROJECT_ID}" \
  --format="value(status.url)"
