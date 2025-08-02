#!/bin/bash

# Recipe Planner Kubernetes Deployment Script
set -e

echo "🚀 Deploying Recipe Planner to Kubernetes..."

# Check if kubectl is available
if ! command -v kubectl &> /dev/null; then
    echo "❌ kubectl not found. Please install kubectl first."
    exit 1
fi

# Check if we're connected to a cluster
if ! kubectl cluster-info &> /dev/null; then
    echo "❌ Not connected to a Kubernetes cluster. Please configure kubectl."
    exit 1
fi

echo "✅ Connected to Kubernetes cluster"

# Apply manifests in correct order
echo "📦 Creating namespace..."
kubectl apply -f namespace.yaml

echo "🔧 Creating ConfigMap..."
kubectl apply -f configmap.yaml

echo "🔐 Creating Secrets..."
kubectl apply -f secrets.yaml

echo "🗄️ Deploying PostgreSQL..."
kubectl apply -f postgres.yaml

echo "⏳ Waiting for PostgreSQL to be ready..."
kubectl wait --for=condition=ready pod -l app=postgres -n recipe-planner --timeout=300s

echo "🚀 Deploying Application..."
kubectl apply -f app.yaml

echo "⏳ Waiting for application to be ready..."
kubectl wait --for=condition=ready pod -l app=recipe-planner-app -n recipe-planner --timeout=300s

echo "✅ Deployment complete!"

# Show status
echo ""
echo "📊 Deployment Status:"
kubectl get pods -n recipe-planner
echo ""
kubectl get services -n recipe-planner
echo ""
kubectl get ingress -n recipe-planner

echo ""
echo "🎉 Recipe Planner deployed successfully!"
echo "📋 Next steps:"
echo "   1. Update your DNS to point to the ingress IP"
echo "   2. Ensure cert-manager is installed for SSL certificates"
echo "   3. Monitor pods: kubectl logs -f -l app=recipe-planner-app -n recipe-planner"