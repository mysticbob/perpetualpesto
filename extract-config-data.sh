#!/bin/bash

# Extract Configuration Data for Cloud Run Deployment
# This script helps you gather all the necessary data from your local project

set -e

echo "🔍 Extracting configuration data for Cloud Run deployment..."
echo "=================================================="
echo ""

# Check for local environment files
echo "📁 STEP 1: Local Environment Files"
echo "----------------------------------"

if [ -f ".env" ]; then
    echo "✅ Found .env file"
    echo "📋 Current .env contents (secrets will be masked):"
    while IFS= read -r line; do
        if [[ $line =~ ^[A-Z_]+=.* ]]; then
            key=$(echo "$line" | cut -d'=' -f1)
            echo "   $key=[SET]"
        fi
    done < .env
else
    echo "❌ No .env file found"
fi

if [ -f ".env.local" ]; then
    echo "✅ Found .env.local file"
    echo "📋 .env.local contents (secrets will be masked):"
    while IFS= read -r line; do
        if [[ $line =~ ^[A-Z_]+=.* ]]; then
            key=$(echo "$line" | cut -d'=' -f1)
            echo "   $key=[SET]"
        fi
    done < .env.local
else
    echo "❌ No .env.local file found"
fi

echo ""
echo "🔥 STEP 2: Firebase Configuration"
echo "--------------------------------"

# Check for Firebase config
if [ -f "src/lib/firebase.ts" ] || [ -f "src/lib/firebase.js" ]; then
    echo "✅ Found Firebase configuration file"
    echo "🔍 Extracting Firebase project details..."
    
    # Look for Firebase config
    config_file=$(find src -name "*firebase*" -type f | head -1)
    if [ -n "$config_file" ]; then
        echo "📄 Config file: $config_file"
        if grep -q "apiKey" "$config_file"; then
            echo "✅ Firebase config found in file"
            echo "📋 Required Firebase values to extract:"
            echo "   - apiKey"
            echo "   - authDomain" 
            echo "   - projectId"
            echo "   - (these are in your Firebase config object)"
        fi
    fi
else
    echo "❌ No Firebase configuration file found"
fi

echo ""
echo "🗄️ STEP 3: Database Configuration"
echo "--------------------------------"

# Check Prisma schema for database info
if [ -f "prisma/schema.prisma" ]; then
    echo "✅ Found Prisma schema"
    echo "📋 Current database configuration:"
    grep -A 5 "datasource db" prisma/schema.prisma || echo "   No datasource block found"
else
    echo "❌ No Prisma schema found"
fi

# Check for local database
if [ -f "docker-compose.yml" ]; then
    echo "✅ Found docker-compose.yml"
    echo "📋 Local database configuration:"
    grep -A 10 "postgres\|database" docker-compose.yml | grep -E "(POSTGRES_|environment)" || echo "   No database config found"
fi

echo ""
echo "🔐 STEP 4: Security Keys"
echo "-----------------------"

echo "📋 You need to generate or provide these security keys:"
echo "   JWT_SECRET: A random string (32+ characters)"
echo "   ENCRYPTION_KEY: A random string (exactly 32 characters)"
echo ""
echo "💡 You can generate them with:"
echo "   JWT_SECRET: openssl rand -base64 32"
echo "   ENCRYPTION_KEY: openssl rand -hex 16"

echo ""
echo "☁️ STEP 5: Google Cloud Setup"
echo "----------------------------"

# Check if gcloud is configured
if command -v gcloud &> /dev/null; then
    echo "✅ gcloud CLI is installed"
    
    current_project=$(gcloud config get-value project 2>/dev/null || echo "")
    if [ -n "$current_project" ]; then
        echo "📋 Current project: $current_project"
    else
        echo "❌ No current project set"
    fi
    
    current_account=$(gcloud config get-value account 2>/dev/null || echo "")
    if [ -n "$current_account" ]; then
        echo "📋 Current account: $current_account"
    else
        echo "❌ Not authenticated"
    fi
else
    echo "❌ gcloud CLI not installed"
fi

echo ""
echo "📝 SUMMARY: Data Collection Checklist"
echo "====================================="
echo ""
echo "✅ REQUIRED DATA TO COLLECT:"
echo ""
echo "🔥 FROM FIREBASE CONSOLE (https://console.firebase.google.com):"
echo "   1. Go to your project settings"
echo "   2. Copy these values from 'Web app' config:"
echo "      • FIREBASE_API_KEY=your-api-key"
echo "      • FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com"
echo "      • FIREBASE_PROJECT_ID=your-project-id"
echo ""
echo "🗄️ FOR DATABASE:"
echo "   • Will be generated when you run ./setup-cloudsql.sh"
echo "   • Creates Cloud SQL PostgreSQL instance"
echo "   • Generates DATABASE_URL automatically"
echo ""
echo "🔐 SECURITY KEYS (generate new ones):"
echo "   • JWT_SECRET (run: openssl rand -base64 32)"
echo "   • ENCRYPTION_KEY (run: openssl rand -hex 16)"
echo ""
echo "☁️ GOOGLE CLOUD:"
echo "   • PROJECT_ID: Your Google Cloud project ID"
echo "   • Make sure billing is enabled"
echo "   • Make sure you have Cloud Run API enabled"
echo ""
echo "📋 NEXT STEPS:"
echo "1. Collect the Firebase values from Firebase Console"
echo "2. Generate security keys with the commands above"
echo "3. Copy .env.cloudrun.example to .env.cloudrun"
echo "4. Fill in .env.cloudrun with your values"
echo "5. Run ./setup-cloudsql.sh (creates database)"
echo "6. Run ./setup-gcp-secrets.sh (uploads secrets)"
echo "7. Run ./deploy-cloudrun.sh (deploys app)"