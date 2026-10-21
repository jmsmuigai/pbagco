#!/usr/bin/env bash
# Deploy pbagco.com to Google Cloud Run. Run from this folder after `gcloud auth login`.
# Usage: PROJECT=your-gcp-project ./deploy.sh
set -euo pipefail
PROJECT="${PROJECT:?set PROJECT=<gcp project id>}"
REGION="${REGION:-africa-south1}"       # Johannesburg — closest Cloud Run region to Kenya
SERVICE="${SERVICE:-pbagco-web}"

gcloud config set project "$PROJECT"
gcloud services enable run.googleapis.com cloudbuild.googleapis.com firestore.googleapis.com secretmanager.googleapis.com artifactregistry.googleapis.com

# Firestore (Native mode) — first time only
gcloud firestore databases describe --database='(default)' >/dev/null 2>&1 || gcloud firestore databases create --location="$REGION" --type=firestore-native

# Secrets (GEMINI_API_KEY already exists). Create the others once:
for s in TICKET_SECRET STAFF_PIN; do
  gcloud secrets describe "$s" >/dev/null 2>&1 || { echo "Creating secret $s"; if [ "$s" = TICKET_SECRET ]; then openssl rand -base64 32 | tr -d '\n' | gcloud secrets create "$s" --data-file=-; else read -rsp "Staff PIN: " PIN; echo; printf %s "$PIN" | gcloud secrets create "$s" --data-file=-; fi; }
done

SA="$(gcloud projects describe "$PROJECT" --format='value(projectNumber)')-compute@developer.gserviceaccount.com"
for s in GEMINI_API_KEY TICKET_SECRET STAFF_PIN; do
  gcloud secrets add-iam-policy-binding "$s" --member="serviceAccount:$SA" --role=roles/secretmanager.secretAccessor >/dev/null
done
gcloud projects add-iam-policy-binding "$PROJECT" --member="serviceAccount:$SA" --role=roles/datastore.user >/dev/null

gcloud run deploy "$SERVICE" --source . --region "$REGION" --allow-unauthenticated \
  --min-instances 0 --max-instances 4 --cpu 1 --memory 512Mi --concurrency 80 \
  --set-env-vars "DB=firestore,PAYMENTS_MODE=${PAYMENTS_MODE:-mock},PUBLIC_URL=https://pbagco.com" \
  --set-secrets "GEMINI_API_KEY=GEMINI_API_KEY:latest,TICKET_SECRET=TICKET_SECRET:latest,STAFF_PIN=STAFF_PIN:latest"

echo "Deployed. Next: map pbagco.com (see docs/DEPLOYMENT.md)."
