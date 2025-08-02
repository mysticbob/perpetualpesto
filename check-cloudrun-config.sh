#!/bin/bash

# Check Cloud Run configuration for missing secrets
set -e

echo "🔍 Checking Cloud Run service configuration..."

# Check if service exists
if ! gcloud run services describe nochickenleftbehind --region us-central1 &>/dev/null; then
    echo "❌ Service 'nochickenleftbehind' not found in us-central1"
    echo "Available services:"
    gcloud run services list
    exit 1
fi

echo "✅ Service found"

# Get current service configuration
echo ""
echo "📋 Current environment variables and secrets:"
gcloud run services describe nochickenleftbehind --region us-central1 --format="export" > /tmp/service-config.yaml

# Check if secrets are configured
if grep -q "secretKeyRef" /tmp/service-config.yaml; then
    echo "✅ Secrets are configured:"
    grep -A 2 "secretKeyRef" /tmp/service-config.yaml
else
    echo "❌ No secrets configured in the service"
fi

# Check available secrets
echo ""
echo "🔐 Available secrets in Secret Manager:"
gcloud secrets list --format="table(name,createTime)"

echo ""
echo "🔧 To fix the deployment, you need to either:"
echo "   1. Run the deployment script: ./deploy-cloudrun.sh"
echo "   2. Or manually configure secrets:"
echo "      gcloud run services update nochickenleftbehind \\"
echo "        --region us-central1 \\"
echo "        --set-secrets 'DATABASE_URL=DATABASE_URL:latest,FIREBASE_API_KEY=FIREBASE_API_KEY:latest,FIREBASE_AUTH_DOMAIN=FIREBASE_AUTH_DOMAIN:latest,FIREBASE_PROJECT_ID=FIREBASE_PROJECT_ID:latest,JWT_SECRET=JWT_SECRET:latest,ENCRYPTION_KEY=ENCRYPTION_KEY:latest'"

# Clean up
rm -f /tmp/service-config.yaml