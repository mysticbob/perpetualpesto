#!/bin/bash

# Setup Kubernetes Secrets from Environment Variables
set -e

echo "🔐 Setting up Kubernetes secrets..."

# Load environment variables
if [ -f ".env.k8s" ]; then
    source .env.k8s
    echo "✅ Loaded environment variables from .env.k8s"
else
    echo "❌ .env.k8s file not found. Please copy .env.k8s.example to .env.k8s and fill in your values."
    exit 1
fi

# Check required variables
required_vars=("POSTGRES_PASSWORD" "FIREBASE_API_KEY" "FIREBASE_AUTH_DOMAIN" "FIREBASE_PROJECT_ID" "JWT_SECRET" "ENCRYPTION_KEY")
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo "❌ Required environment variable $var is not set"
        exit 1
    fi
done

echo "✅ All required environment variables are set"

# Create namespace if it doesn't exist
kubectl apply -f k8s/namespace.yaml

# Delete existing secret if it exists
kubectl delete secret recipe-planner-secrets -n recipe-planner --ignore-not-found=true

# Create new secret with base64 encoded values
kubectl create secret generic recipe-planner-secrets \
    --namespace=recipe-planner \
    --from-literal=POSTGRES_PASSWORD="$POSTGRES_PASSWORD" \
    --from-literal=FIREBASE_API_KEY="$FIREBASE_API_KEY" \
    --from-literal=FIREBASE_AUTH_DOMAIN="$FIREBASE_AUTH_DOMAIN" \
    --from-literal=FIREBASE_PROJECT_ID="$FIREBASE_PROJECT_ID" \
    --from-literal=JWT_SECRET="$JWT_SECRET" \
    --from-literal=ENCRYPTION_KEY="$ENCRYPTION_KEY"

echo "🎉 Kubernetes secrets created successfully!"

# Show secret (without values)
kubectl get secret recipe-planner-secrets -n recipe-planner -o yaml | grep -E "^(apiVersion|kind|metadata|type):"