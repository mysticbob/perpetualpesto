#!/bin/bash

# Setup Google Cloud Secrets for Recipe Planner
set -e

PROJECT_ID=${GOOGLE_CLOUD_PROJECT:-""}

echo "🔐 Setting up Google Cloud secrets..."

# Get project ID
if [ -z "$PROJECT_ID" ]; then
    PROJECT_ID=$(gcloud config get-value project 2>/dev/null)
    if [ -z "$PROJECT_ID" ]; then
        echo "❌ No project ID found. Please set GOOGLE_CLOUD_PROJECT or run 'gcloud config set project YOUR_PROJECT_ID'"
        exit 1
    fi
fi

echo "✅ Using project: $PROJECT_ID"

# Load environment variables
if [ -f ".env.cloudrun" ]; then
    source .env.cloudrun
    echo "✅ Loaded environment variables from .env.cloudrun"
elif [ -f ".env" ]; then
    source .env
    echo "✅ Loaded environment variables from .env"
else
    echo "❌ No environment file found. Please create .env.cloudrun or .env with your values."
    exit 1
fi

# Enable Secret Manager API
echo "🔧 Enabling Secret Manager API..."
gcloud services enable secretmanager.googleapis.com

# Function to create or update secret
create_or_update_secret() {
    local secret_name=$1
    local secret_value=$2
    
    if [ -z "$secret_value" ]; then
        echo "⚠️ Skipping $secret_name (empty value)"
        return
    fi
    
    echo "Creating/updating secret: $secret_name"
    
    # Check if secret exists
    if gcloud secrets describe "$secret_name" --project="$PROJECT_ID" &>/dev/null; then
        # Update existing secret
        echo -n "$secret_value" | gcloud secrets versions add "$secret_name" --data-file=-
    else
        # Create new secret
        echo -n "$secret_value" | gcloud secrets create "$secret_name" --data-file=-
    fi
}

# Create secrets
echo "🔐 Creating secrets..."

create_or_update_secret "DATABASE_URL" "$DATABASE_URL"
create_or_update_secret "FIREBASE_API_KEY" "$FIREBASE_API_KEY"
create_or_update_secret "FIREBASE_AUTH_DOMAIN" "$FIREBASE_AUTH_DOMAIN"
create_or_update_secret "FIREBASE_PROJECT_ID" "$FIREBASE_PROJECT_ID"
create_or_update_secret "JWT_SECRET" "$JWT_SECRET"
create_or_update_secret "ENCRYPTION_KEY" "$ENCRYPTION_KEY"

echo ""
echo "🎉 Secrets setup complete!"
echo "📋 Created/updated secrets:"
gcloud secrets list --filter="name~recipe" --format="table(name,createTime)"

echo ""
echo "💡 To view a secret (be careful!):"
echo "   gcloud secrets versions access latest --secret=SECRET_NAME"