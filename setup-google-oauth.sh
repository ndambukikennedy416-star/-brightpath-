#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="brightpath-kenya"
SUPABASE_REF="ejwrkgwspmwulaniwdoj"
REDIRECT_URI="https://${SUPABASE_REF}.supabase.co/auth/v1/callback"

# 1. Authenticate (a browser window opens; complete the login there)
gcloud auth login

# 2. Select the project (creates it if missing)
gcloud projects describe "$PROJECT_ID" >/dev/null 2>&1 \
  || gcloud projects create "$PROJECT_ID" --name="Brightpath Kenya"
gcloud config set project "$PROJECT_ID"

# 3. Enable the APIs the consent screen needs
gcloud services enable iamcredentials.googleapis.com oauth2.googleapis.com

echo ""
echo "=== MANUAL STEP (no CLI exists for this) ==="
echo "Open: https://console.cloud.google.com/auth/clients?project=${PROJECT_ID}"
echo "1. Click 'Create Client', type: Web application, name: Brightpath Kenya"
echo "2. Under 'Authorized redirect URIs' click 'Add URI' and paste:"
echo "   ${REDIRECT_URI}"
echo "3. Click Create, then copy the Client ID + Secret."
echo "=== END MANUAL STEP ==="
