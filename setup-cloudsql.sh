#!/bin/bash

# Setup Cloud SQL PostgreSQL instance for Recipe Planner
set -e

PROJECT_ID=${GOOGLE_CLOUD_PROJECT:-""}
REGION=${REGION:-"us-central1"}
INSTANCE_NAME="recipe-planner-db"
DATABASE_NAME="recipe_planner"
DB_USER="recipe_user"

echo "🗄️ Setting up Cloud SQL PostgreSQL instance..."

# Get project ID
if [ -z "$PROJECT_ID" ]; then
    PROJECT_ID=$(gcloud config get-value project 2>/dev/null)
    if [ -z "$PROJECT_ID" ]; then
        echo "❌ No project ID found. Please set GOOGLE_CLOUD_PROJECT or run 'gcloud config set project YOUR_PROJECT_ID'"
        exit 1
    fi
fi

echo "✅ Using project: $PROJECT_ID"
echo "✅ Using region: $REGION"

# Enable Cloud SQL API
echo "🔧 Enabling Cloud SQL API..."
gcloud services enable sqladmin.googleapis.com

# Check if instance already exists
if gcloud sql instances describe "$INSTANCE_NAME" --project="$PROJECT_ID" &>/dev/null; then
    echo "ℹ️ Cloud SQL instance '$INSTANCE_NAME' already exists"
    INSTANCE_EXISTS=true
else
    INSTANCE_EXISTS=false
fi

# Create Cloud SQL instance if it doesn't exist
if [ "$INSTANCE_EXISTS" = false ]; then
    echo "🏗️ Creating Cloud SQL PostgreSQL instance..."
    gcloud sql instances create "$INSTANCE_NAME" \
        --database-version=POSTGRES_15 \
        --tier=db-f1-micro \
        --region="$REGION" \
        --storage-type=SSD \
        --storage-size=10GB \
        --storage-auto-increase \
        --backup-start-time=03:00 \
        --enable-bin-log \
        --maintenance-window-day=SUN \
        --maintenance-window-hour=04 \
        --deletion-protection
    
    echo "⏳ Waiting for instance to be ready..."
    gcloud sql instances patch "$INSTANCE_NAME" --quiet
else
    echo "✅ Using existing Cloud SQL instance"
fi

# Generate a secure password
DB_PASSWORD=$(openssl rand -base64 32)

# Create database user
echo "👤 Creating database user..."
if gcloud sql users list --instance="$INSTANCE_NAME" --format="value(name)" | grep -q "^$DB_USER$"; then
    echo "ℹ️ User '$DB_USER' already exists, updating password..."
    gcloud sql users set-password "$DB_USER" \
        --instance="$INSTANCE_NAME" \
        --password="$DB_PASSWORD"
else
    gcloud sql users create "$DB_USER" \
        --instance="$INSTANCE_NAME" \
        --password="$DB_PASSWORD"
fi

# Create database
echo "🗄️ Creating database..."
if gcloud sql databases list --instance="$INSTANCE_NAME" --format="value(name)" | grep -q "^$DATABASE_NAME$"; then
    echo "ℹ️ Database '$DATABASE_NAME' already exists"
else
    gcloud sql databases create "$DATABASE_NAME" \
        --instance="$INSTANCE_NAME"
fi

# Get connection details
CONNECTION_NAME=$(gcloud sql instances describe "$INSTANCE_NAME" --format="value(connectionName)")
INSTANCE_IP=$(gcloud sql instances describe "$INSTANCE_NAME" --format="value(ipAddresses[0].ipAddress)")

# Create DATABASE_URL
DATABASE_URL="postgresql://$DB_USER:$DB_PASSWORD@$INSTANCE_IP:5432/$DATABASE_NAME"

echo ""
echo "🎉 Cloud SQL setup complete!"
echo ""
echo "📋 Connection details:"
echo "   Instance name: $INSTANCE_NAME"
echo "   Connection name: $CONNECTION_NAME"
echo "   Database: $DATABASE_NAME"
echo "   User: $DB_USER"
echo "   Password: $DB_PASSWORD"
echo "   Instance IP: $INSTANCE_IP"
echo ""
echo "🔐 DATABASE_URL for secrets:"
echo "   $DATABASE_URL"
echo ""
echo "💡 Next steps:"
echo "   1. Add DATABASE_URL to your secrets:"
echo "      echo '$DATABASE_URL' | gcloud secrets create DATABASE_URL --data-file=-"
echo "   2. Or update existing secret:"
echo "      echo '$DATABASE_URL' | gcloud secrets versions add DATABASE_URL --data-file=-"
echo "   3. For local development, add to .env.cloudrun:"
echo "      echo 'DATABASE_URL=\"$DATABASE_URL\"' >> .env.cloudrun"

# Automatically create/update the DATABASE_URL secret
echo ""
read -p "🤖 Would you like me to automatically create/update the DATABASE_URL secret? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    if gcloud secrets describe "DATABASE_URL" --project="$PROJECT_ID" &>/dev/null; then
        echo "🔄 Updating DATABASE_URL secret..."
        echo -n "$DATABASE_URL" | gcloud secrets versions add "DATABASE_URL" --data-file=-
    else
        echo "🆕 Creating DATABASE_URL secret..."
        echo -n "$DATABASE_URL" | gcloud secrets create "DATABASE_URL" --data-file=-
    fi
    echo "✅ DATABASE_URL secret updated!"
fi