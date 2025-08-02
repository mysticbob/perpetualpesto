#!/bin/bash

# Debug Cloud Run deployment issues
set -e

echo "🔍 Debugging Cloud Run deployment..."

# Check service status
echo "📊 Service status:"
gcloud run services describe nochickenleftbehind --region us-central1 --format="value(status.conditions[0].message)"

echo ""
echo "📋 Recent logs:"
gcloud logs read "resource.type=cloud_run_revision AND resource.labels.service_name=nochickenleftbehind" \
    --limit=50 \
    --format="table(timestamp,severity,textPayload)" \
    --project=nochickenleftbehind

echo ""
echo "🔧 Service configuration:"
gcloud run services describe nochickenleftbehind --region us-central1 --format="export" | grep -E "(image|env|secrets|port)" || true

echo ""
echo "🔐 Checking secrets:"
gcloud secrets list --filter="name~nochickenleftbehind OR name~DATABASE_URL OR name~FIREBASE" --format="table(name,createTime)"