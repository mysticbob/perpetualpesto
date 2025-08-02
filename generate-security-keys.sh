#!/bin/bash

# Generate Security Keys for Cloud Run Deployment
set -e

echo "🔐 Generating security keys for Cloud Run deployment..."

# Generate keys
JWT_SECRET=$(openssl rand -base64 32)
ENCRYPTION_KEY=$(openssl rand -hex 16)

echo ""
echo "✅ Generated security keys:"
echo "JWT_SECRET=$JWT_SECRET"
echo "ENCRYPTION_KEY=$ENCRYPTION_KEY"

# Update .env.cloudrun file if it exists
if [ -f ".env.cloudrun" ]; then
    echo ""
    echo "📝 Updating .env.cloudrun file..."
    
    # Create temporary file
    cp .env.cloudrun .env.cloudrun.tmp
    
    # Update or add JWT_SECRET
    if grep -q "^JWT_SECRET=" .env.cloudrun.tmp; then
        sed -i.bak "s|^JWT_SECRET=.*|JWT_SECRET=$JWT_SECRET|" .env.cloudrun.tmp
    else
        echo "JWT_SECRET=$JWT_SECRET" >> .env.cloudrun.tmp
    fi
    
    # Update or add ENCRYPTION_KEY
    if grep -q "^ENCRYPTION_KEY=" .env.cloudrun.tmp; then
        sed -i.bak "s|^ENCRYPTION_KEY=.*|ENCRYPTION_KEY=$ENCRYPTION_KEY|" .env.cloudrun.tmp
    else
        echo "ENCRYPTION_KEY=$ENCRYPTION_KEY" >> .env.cloudrun.tmp
    fi
    
    # Replace original file
    mv .env.cloudrun.tmp .env.cloudrun
    rm -f .env.cloudrun.tmp.bak
    
    echo "✅ Updated .env.cloudrun with new security keys"
else
    echo "❌ .env.cloudrun file not found"
    echo "💡 Create it by copying .env.cloudrun.example:"
    echo "   cp .env.cloudrun.example .env.cloudrun"
fi

echo ""
echo "🔐 Security keys generated successfully!"
echo "📋 Next steps:"
echo "   1. Verify .env.cloudrun has all required values"
echo "   2. Run ./setup-cloudsql.sh (creates database)"
echo "   3. Run ./setup-gcp-secrets.sh (uploads secrets)"
echo "   4. Run ./deploy-cloudrun.sh (deploys app)"