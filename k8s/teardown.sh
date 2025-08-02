#!/bin/bash

# Recipe Planner Kubernetes Teardown Script
set -e

echo "🗑️ Tearing down Recipe Planner from Kubernetes..."

# Check if kubectl is available
if ! command -v kubectl &> /dev/null; then
    echo "❌ kubectl not found. Please install kubectl first."
    exit 1
fi

# Check if namespace exists
if ! kubectl get namespace recipe-planner &> /dev/null; then
    echo "ℹ️ Recipe Planner namespace doesn't exist. Nothing to tear down."
    exit 0
fi

echo "⚠️ This will delete all Recipe Planner resources including data!"
read -p "Are you sure you want to continue? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Teardown cancelled."
    exit 1
fi

echo "🗑️ Deleting application..."
kubectl delete -f app.yaml --ignore-not-found=true

echo "🗑️ Deleting PostgreSQL..."
kubectl delete -f postgres.yaml --ignore-not-found=true

echo "🗑️ Deleting secrets..."
kubectl delete -f secrets.yaml --ignore-not-found=true

echo "🗑️ Deleting ConfigMap..."
kubectl delete -f configmap.yaml --ignore-not-found=true

echo "🗑️ Deleting namespace..."
kubectl delete -f namespace.yaml --ignore-not-found=true

echo "✅ Recipe Planner teardown complete!"